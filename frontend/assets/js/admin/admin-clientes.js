/**
 * @file admin-clientes.js
 * @description Funciones para gestionar clientes desde el panel admin (filtros, ver perfil)
 *
 * Deepwiki: metadata
 * - propósito: gestión de usuarios con rol cliente
 * - variables DOM esperadas: .clientes-table, .cliente-actions
 */

/**
 * @fileoverview
 * Panel de administración para gestión de clientes puros (solo rol "cliente").
 * Lista, pagina, agrega, edita, ve y elimina clientes desde el admin.
 */

document.addEventListener("DOMContentLoaded", function () {
  cargarClientes(1); // Carga inicial página 1

  // Modal agregar cliente
  const btnAddClient = document.getElementById("btnAddClient");
  const modalAgregar = document.getElementById("modalAgregarCliente");
  const closeAgregar = modalAgregar.querySelector(".btn-close");
  const cancelarAgregar = modalAgregar.querySelector(
    ".modal-cliente-agregar-cancelar"
  );
  const formAgregar = document.getElementById("formAgregarCliente");

  btnAddClient.addEventListener("click", () => {
    modalAgregar.style.display = "flex";
  });
  closeAgregar.addEventListener("click", () => {
    modalAgregar.style.display = "none";
    formAgregar.reset();
  });
  cancelarAgregar.addEventListener("click", () => {
    modalAgregar.style.display = "none";
    formAgregar.reset();
  });
  window.addEventListener("click", (e) => {
    if (e.target === modalAgregar) modalAgregar.style.display = "none";
  });
  formAgregar.addEventListener("submit", async function (e) {
    e.preventDefault();
    // limpieza defensiva final de nombres antes de validar/enviar
    try {
      sanitizeNamesForSubmit();
    } catch (err) {}
    // limpiar errores previos
    [
      "agregarNombreClienteError",
      "agregarApellidoClienteError",
      "agregarCorreoClienteError",
      "agregarFotoClienteError",
      "agregarPasswordClienteError",
      "agregarConfirmPasswordClienteError",
    ].forEach(clearInlineError);

    // realtime checks
    const emailOk = (function () {
      const v = (agregarCorreoEl && agregarCorreoEl.value) || "";
      if (!v.includes("@")) {
        showInlineError(
          "agregarCorreoClienteError",
          "El correo debe contener '@'."
        );
        agregarCorreoEl && agregarCorreoEl.classList.add("invalid");
        return false;
      }
      return true;
    })();

    // actualizar UI de criterios de contraseña antes de enviar
    try {
      const pw =
        (document.getElementById("agregarPasswordCliente") || {}).value || "";
      if (pw) updatePasswordCriteriaUI(pw);
    } catch (e) {}

    if (!emailOk) return; // no enviar

    const created = await agregarCliente();
    if (created) {
      modalAgregar.style.display = "none";
      formAgregar.reset();
      cargarClientes(1);
    } else {
      // dejar el modal abierto para correcciones
    }
  });

  // Input sanitization: bloquear pegar / escribir caracteres inválidos en nombre/apellido
  const agregarNombreEl = document.getElementById("agregarNombreCliente");
  const agregarApellidoEl = document.getElementById("agregarApellidoCliente");
  const agregarCorreoEl = document.getElementById("agregarCorreoCliente");

  function allowOnlyNameChars(e) {
    // permitir control keys
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const allowed = /[A-Za-zÁÉÍÓÚáéíóúÑñ ]/;
    // prefer e.key cuando esté disponible (incluye soporte para IME/composition)
    const key = e.key || String.fromCharCode(e.which || e.keyCode || 0);
    if (key && key.length === 1 && !allowed.test(key)) {
      e.preventDefault();
    }
  }
  // limpieza defensiva final (por si algún método de entrada logró insertar dígitos)
  function sanitizeNamesForSubmit() {
    try {
      [
        document.getElementById("agregarNombreCliente"),
        document.getElementById("agregarApellidoCliente"),
        document.getElementById("editarNombreCliente"),
        document.getElementById("editarApellidoCliente"),
      ].forEach((el) => {
        if (!el) return;
        const before = el.value || "";
        const cleaned = before.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ '\-]/g, "");
        if (cleaned !== before) el.value = cleaned;
      });
    } catch (err) {}
  }
  function sanitizePastedName(e) {
    const text = (e.clipboardData || window.clipboardData).getData("text");
    const clean = text.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ]/g, "");
    e.preventDefault();
    const el = e.target;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const value = el.value || "";
    el.value = value.slice(0, start) + clean + value.slice(end);
    el.setSelectionRange(start + clean.length, start + clean.length);
  }
  if (agregarNombreEl) {
    agregarNombreEl.addEventListener("keypress", allowOnlyNameChars);
    agregarNombreEl.addEventListener("paste", sanitizePastedName);
    // Sanitizar también en input para cubrir todos los métodos de entrada
    agregarNombreEl.addEventListener("input", function (e) {
      const el = e.target;
      const before = el.value;
      const cleaned = before.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ]/g, "");
      if (cleaned !== before) {
        const pos = el.selectionStart || 0;
        el.value = cleaned;
        const newPos = Math.max(0, pos - (before.length - cleaned.length));
        el.setSelectionRange(newPos, newPos);
      }
    });
    // onbeforeinput para bloquear inserciones (IME, arrastrar, pegar avanzados)
    agregarNombreEl.addEventListener("beforeinput", function (e) {
      try {
        const data = e.data || "";
        // bloquear si contiene dígitos o caracteres no permitidos
        if (/[^A-Za-zÁÉÍÓÚáéíóúÑñ ]/.test(data)) {
          e.preventDefault();
        }
      } catch (err) {}
    });
  }
  if (agregarApellidoEl) {
    agregarApellidoEl.addEventListener("keypress", allowOnlyNameChars);
    agregarApellidoEl.addEventListener("paste", sanitizePastedName);
    agregarApellidoEl.addEventListener("input", function (e) {
      const el = e.target;
      const before = el.value;
      const cleaned = before.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ' \-]/g, "");
      if (cleaned !== before) {
        const pos = el.selectionStart || 0;
        el.value = cleaned;
        const newPos = Math.max(0, pos - (before.length - cleaned.length));
        el.setSelectionRange(newPos, newPos);
      }
    });
    agregarApellidoEl.addEventListener("beforeinput", function (e) {
      try {
        const data = e.data || "";
        if (/[^A-Za-zÁÉÍÓÚáéíóúÑñ ' \-]/.test(data)) {
          e.preventDefault();
        }
      } catch (err) {}
    });
  }

  // Edit modal name fields sanitization
  const editarNombreEl = document.getElementById("editarNombreCliente");
  const editarApellidoEl = document.getElementById("editarApellidoCliente");
  if (editarNombreEl) {
    editarNombreEl.addEventListener("keypress", allowOnlyNameChars);
    editarNombreEl.addEventListener("paste", sanitizePastedName);
    editarNombreEl.addEventListener("input", function (e) {
      const el = e.target;
      const before = el.value;
      const cleaned = before.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ' \-]/g, "");
      if (cleaned !== before) {
        const pos = el.selectionStart || 0;
        el.value = cleaned;
        const newPos = Math.max(0, pos - (before.length - cleaned.length));
        el.setSelectionRange(newPos, newPos);
      }
    });
    editarNombreEl.addEventListener("beforeinput", function (e) {
      try {
        const data = e.data || "";
        if (/[^A-Za-zÁÉÍÓÚáéíóúÑñ ' \-]/.test(data)) {
          e.preventDefault();
        }
      } catch (err) {}
    });
  }
  if (editarApellidoEl) {
    editarApellidoEl.addEventListener("keypress", allowOnlyNameChars);
    editarApellidoEl.addEventListener("paste", sanitizePastedName);
    editarApellidoEl.addEventListener("input", function (e) {
      const el = e.target;
      const before = el.value;
      const cleaned = before.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ' \-]/g, "");
      if (cleaned !== before) {
        const pos = el.selectionStart || 0;
        el.value = cleaned;
        const newPos = Math.max(0, pos - (before.length - cleaned.length));
        el.setSelectionRange(newPos, newPos);
      }
    });
    editarApellidoEl.addEventListener("beforeinput", function (e) {
      try {
        const data = e.data || "";
        if (/[^A-Za-zÁÉÍÓÚáéíóúÑñ ' \-]/.test(data)) {
          e.preventDefault();
        }
      } catch (err) {}
    });
  }

  // Validación inline helpers
  function showInlineError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
  }
  function clearInlineError(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = "";
    el.style.display = "none";
  }

  // limpiar errores al abrir modal
  btnAddClient.addEventListener("click", () => {
    [
      "agregarNombreClienteError",
      "agregarApellidoClienteError",
      "agregarCorreoClienteError",
      "agregarFotoClienteError",
      "agregarPasswordClienteError",
      "agregarConfirmPasswordClienteError",
    ].forEach(clearInlineError);
  });

  // limpiar errores y clases invalid en tiempo real
  const agregarPasswordEl = document.getElementById("agregarPasswordCliente");
  const agregarConfirmPasswordEl = document.getElementById(
    "agregarConfirmPasswordCliente"
  );
  // Password criteria UI wiring using PasswordUtils if available
  const pwCriteriaList = document.getElementById("agregarPasswordCriteria");
  const pwNodes = {
    minLengthItem: document.getElementById("agregarMinLengthCriteria"),
    uppercaseItem: document.getElementById("agregarUppercaseCriteria"),
    lowercaseItem: document.getElementById("agregarLowercaseCriteria"),
    numberItem: document.getElementById("agregarNumberCriteria"),
  };
  function updatePasswordCriteriaUI(pw) {
    if (!pwCriteriaList) return;
    pwCriteriaList.style.display = pw ? "block" : "none";
    if (window.PasswordUtils) {
      window.PasswordUtils.updateCriteriaNodes(pw, pwNodes);
    } else {
      pwNodes.minLengthItem &&
        pwNodes.minLengthItem.classList.toggle(
          "invalid",
          !(pw && pw.length >= 8)
        );
      pwNodes.minLengthItem &&
        pwNodes.minLengthItem.classList.toggle(
          "valid",
          !!(pw && pw.length >= 8)
        );
      pwNodes.uppercaseItem &&
        pwNodes.uppercaseItem.classList.toggle(
          "invalid",
          !/[A-Z]/.test(pw || "")
        );
      pwNodes.uppercaseItem &&
        pwNodes.uppercaseItem.classList.toggle("valid", /[A-Z]/.test(pw || ""));
      pwNodes.lowercaseItem &&
        pwNodes.lowercaseItem.classList.toggle(
          "invalid",
          !/[a-z]/.test(pw || "")
        );
      pwNodes.lowercaseItem &&
        pwNodes.lowercaseItem.classList.toggle("valid", /[a-z]/.test(pw || ""));
      pwNodes.numberItem &&
        pwNodes.numberItem.classList.toggle("invalid", !/[0-9]/.test(pw || ""));
      pwNodes.numberItem &&
        pwNodes.numberItem.classList.toggle("valid", /[0-9]/.test(pw || ""));
    }
  }
  if (agregarNombreEl)
    agregarNombreEl.addEventListener("input", () => {
      clearInlineError("agregarNombreClienteError");
      agregarNombreEl.classList.remove("invalid");
    });
  if (agregarApellidoEl)
    agregarApellidoEl.addEventListener("input", () => {
      clearInlineError("agregarApellidoClienteError");
      agregarApellidoEl.classList.remove("invalid");
    });
  if (agregarCorreoEl)
    agregarCorreoEl.addEventListener("input", () => {
      clearInlineError("agregarCorreoClienteError");
      agregarCorreoEl.classList.remove("invalid");
    });
  const agregarFotoEl = document.getElementById("agregarFotoCliente");
  if (agregarFotoEl)
    agregarFotoEl.addEventListener("input", () => {
      clearInlineError("agregarFotoClienteError");
      agregarFotoEl.classList.remove("invalid");
    });
  if (agregarPasswordEl)
    agregarPasswordEl.addEventListener("input", () => {
      clearInlineError("agregarPasswordClienteError");
      agregarPasswordEl.classList.remove("invalid");
      // actualizar UI de criterios mientras el usuario escribe
      try {
        updatePasswordCriteriaUI(agregarPasswordEl.value || "");
      } catch (err) {}
      // comprobar en tiempo real el confirm
      try {
        const pw = agregarPasswordEl.value || "";
        const confirm =
          (agregarConfirmPasswordEl && agregarConfirmPasswordEl.value) || "";
        const confirmErrEl = document.getElementById(
          "agregarConfirmPasswordClienteError"
        );
        if (window.PasswordUtils) {
          window.PasswordUtils.validateConfirmAndShow(
            pw,
            confirm,
            confirmErrEl
          );
        } else {
          if (confirm && pw !== confirm) {
            if (confirmErrEl) {
              confirmErrEl.textContent = "Las contraseñas no coinciden.";
              confirmErrEl.style.display = "block";
            }
            agregarConfirmPasswordEl &&
              agregarConfirmPasswordEl.classList.add("invalid");
          } else {
            if (confirmErrEl) {
              confirmErrEl.textContent = "";
              confirmErrEl.style.display = "none";
            }
            agregarConfirmPasswordEl &&
              agregarConfirmPasswordEl.classList.remove("invalid");
          }
        }
      } catch (err) {}
    });
  if (agregarConfirmPasswordEl)
    agregarConfirmPasswordEl.addEventListener("input", () => {
      clearInlineError("agregarConfirmPasswordClienteError");
      agregarConfirmPasswordEl.classList.remove("invalid");
      // validar en vivo si coincide con la contraseña
      try {
        const pw = (agregarPasswordEl && agregarPasswordEl.value) || "";
        const confirm = agregarConfirmPasswordEl.value || "";
        const confirmErrEl = document.getElementById(
          "agregarConfirmPasswordClienteError"
        );
        if (window.PasswordUtils) {
          window.PasswordUtils.validateConfirmAndShow(
            pw,
            confirm,
            confirmErrEl
          );
        } else {
          if (confirm && pw !== confirm) {
            if (confirmErrEl) {
              confirmErrEl.textContent = "Las contraseñas no coinciden.";
              confirmErrEl.style.display = "block";
            }
            agregarConfirmPasswordEl.classList.add("invalid");
          } else {
            if (confirmErrEl) {
              confirmErrEl.textContent = "";
              confirmErrEl.style.display = "none";
            }
            agregarConfirmPasswordEl.classList.remove("invalid");
          }
        }
      } catch (err) {}
    });

  // Delegación de eventos para acciones en tabla
  const tbody = document.querySelector(
    ".clientes-grid__tabla .admin-table tbody"
  );
  let rowInactivar = null;

  if (tbody) {
    tbody.addEventListener("click", function (e) {
      const btn = e.target.closest(".btn-icon");
      if (!btn) return;
      const row = btn.closest("tr");
      if (!row) return;

      // EDITAR
      if (btn.title === "Editar") {
        abrirModalEditarCliente(row);
        return;
      }

      // VER PERFIL
      if (btn.title === "Ver perfil") {
        abrirModalVerCliente(row);
        return;
      }

      // ELIMINAR/INACTIVAR
      if (btn.title === "Eliminar") {
        document.getElementById("modalInactivarClienteNombre").textContent =
          row.children[2].textContent.trim();
        rowInactivar = row;
        document.getElementById("modalInactivarCliente").style.display = "flex";
        return;
      }
    });
  }

  // MODAL EDITAR CLIENTE
  const modalEditar = document.getElementById("modalEditarCliente");
  const closeEditar = modalEditar.querySelector(".btn-close");
  const cancelarEditar = modalEditar.querySelector(".modal-cliente-cancelar");
  const formEditar = document.getElementById("formEditarCliente");

  closeEditar.addEventListener(
    "click",
    () => (modalEditar.style.display = "none")
  );
  cancelarEditar.addEventListener(
    "click",
    () => (modalEditar.style.display = "none")
  );
  window.addEventListener("click", (e) => {
    if (e.target === modalEditar) modalEditar.style.display = "none";
  });
  formEditar.addEventListener("submit", async function (e) {
    e.preventDefault();
    await editarCliente();
    modalEditar.style.display = "none";
    cargarClientes(1);
  });

  // MODAL VER CLIENTE
  const modalVer = document.getElementById("modalVerCliente");
  const closeVer = modalVer.querySelector(".btn-close");
  const cerrarVer = modalVer.querySelector(".modal-cliente-ver-cerrar");
  closeVer.addEventListener("click", () => (modalVer.style.display = "none"));
  cerrarVer.addEventListener("click", () => (modalVer.style.display = "none"));
  window.addEventListener("click", (e) => {
    if (e.target === modalVer) modalVer.style.display = "none";
  });

  // MODAL INACTIVAR CLIENTE
  const modalInactivar = document.getElementById("modalInactivarCliente");
  const closeInactivar = modalInactivar.querySelector(".btn-close");
  const cancelarInactivar = modalInactivar.querySelector(
    ".modal-cliente-inactivar-cancelar"
  );
  const confirmarInactivar = modalInactivar.querySelector(
    ".modal-cliente-inactivar-confirmar"
  );

  closeInactivar.addEventListener(
    "click",
    () => (modalInactivar.style.display = "none")
  );
  cancelarInactivar.addEventListener(
    "click",
    () => (modalInactivar.style.display = "none")
  );
  window.addEventListener("click", (e) => {
    if (e.target === modalInactivar) modalInactivar.style.display = "none";
  });
  confirmarInactivar.addEventListener("click", async () => {
    if (rowInactivar) {
      const email = rowInactivar.children[3].textContent.trim();
      await inactivarCliente(email);
    }
    modalInactivar.style.display = "none";
    cargarClientes(1);
  });
});

/**
 * Lógica de paginación y carga de clientes
 */
let clientes = [];
let totalClientes = 0;
let currentPage = 1;
const limit = 10;

async function cargarClientes(page) {
  try {
    currentPage = page;
    const headers = {
      Authorization: "Bearer " + (localStorage.getItem("token") || ""),
      "Content-Type": "application/json",
    };
    if (window.API_KEY) headers["x-api-key"] = window.API_KEY;

    const res = await fetch(
      `/api/usuarios?roles=usuario&page=${page}&limit=${limit}`,
      {
        credentials: "same-origin",
        headers,
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => null);
      console.error(
        `cargarClientes: fetch failed status=${res.status} text=`,
        text
      );
      throw new Error(
        "Error al obtener clientes: " + (res.status || "unknown")
      );
    }
    const data = await res.json();
    clientes = data.usuarios || [];
    totalClientes = data.total || 0;
    renderizarTablaClientes();
    renderizarPaginacionClientes();
    renderizarEstadisticasClientes();
  } catch (err) {
    console.error("Error:", err);
  }
}

/**
 * Renderiza la tabla principal de clientes
 */
function renderizarTablaClientes() {
  const tbody = document.querySelector(
    ".clientes-grid__tabla .admin-table tbody"
  );
  tbody.innerHTML = "";
  clientes.forEach((cliente) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" class="clientes-checkbox" /></td>
      <td>
        <img src="${
          cliente.avatarUrl ||
          "https://ui-avatars.com/api/?name=" + cliente.nombre
        }" alt="Cliente" class="clientes-avatar" />
      </td>
      <td>${cliente.nombre} ${cliente.apellido}</td>
      <td>${cliente.email}</td>
      <td><span class="status ${cliente.estado}">${
      cliente.estado.charAt(0).toUpperCase() + cliente.estado.slice(1)
    }</span></td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon" title="Editar"><i class="fas fa-edit"></i></button>
          <button class="btn-icon" title="Ver perfil"><i class="fas fa-eye"></i></button>
          <button class="btn-icon" title="Eliminar"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Renderiza la paginación adaptativa
 */
function renderizarPaginacionClientes() {
  const info = document.getElementById("clientesPaginacionInfo");
  const controles = document.getElementById("clientesPaginacionControles");
  const totalPages = Math.ceil(totalClientes / limit);
  info.textContent = `Mostrando ${(currentPage - 1) * limit + 1}-${Math.min(
    currentPage * limit,
    totalClientes
  )} de ${totalClientes} clientes`;
  controles.innerHTML = "";

  // Botón anterior
  const btnPrev = document.createElement("button");
  btnPrev.className = "clientes-paginacion__btn";
  btnPrev.disabled = currentPage === 1;
  btnPrev.innerHTML = '<i class="fas fa-chevron-left"></i>';
  btnPrev.onclick = () => {
    if (currentPage > 1) cargarClientes(currentPage - 1);
  };
  controles.appendChild(btnPrev);

  // Páginas
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
      const btn = document.createElement("button");
      btn.className =
        "clientes-paginacion__btn" +
        (i === currentPage ? " clientes-paginacion__btn--active" : "");
      btn.textContent = i;
      btn.onclick = () => cargarClientes(i);
      controles.appendChild(btn);
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      const ellipsis = document.createElement("span");
      ellipsis.className = "clientes-paginacion__ellipsis";
      ellipsis.textContent = "...";
      controles.appendChild(ellipsis);
    }
  }

  // Botón siguiente
  const btnNext = document.createElement("button");
  btnNext.className = "clientes-paginacion__btn";
  btnNext.disabled = currentPage === totalPages;
  btnNext.innerHTML = '<i class="fas fa-chevron-right"></i>';
  btnNext.onclick = () => {
    if (currentPage < totalPages) cargarClientes(currentPage + 1);
  };
  controles.appendChild(btnNext);
}

/**
 * Muestra estadísticas básicas de clientes
 */
function renderizarEstadisticasClientes() {
  document.getElementById("clientesTotalCount").textContent = totalClientes;
  document.getElementById("clientesActivosCount").textContent = clientes.filter(
    (c) => c.estado === "activo"
  ).length;
  document.getElementById("clientesNuevosMesCount").textContent = "-";
}

/**
 * Modal editar cliente (rellena y abre el modal)
 */
function abrirModalEditarCliente(row) {
  const modal = document.getElementById("modalEditarCliente");
  document.getElementById("editarNombreCliente").value =
    row.children[2].textContent.trim().split(" ")[0];
  document.getElementById("editarApellidoCliente").value =
    row.children[2].textContent.trim().split(" ")[1] || "";
  document.getElementById("editarCorreoCliente").value =
    row.children[3].textContent.trim();
  document.getElementById("editarEstadoCliente").value = row
    .querySelector(".status")
    .textContent.trim()
    .toLowerCase();
  document.getElementById("editarFotoCliente").value =
    row.children[1].querySelector("img").src;
  modal.style.display = "flex";
}

/**
 * Editar cliente (enviar cambios al backend)
 */
async function editarCliente() {
  const nombre = document.getElementById("editarNombreCliente").value.trim();
  const apellido = document
    .getElementById("editarApellidoCliente")
    .value.trim();
  const email = document.getElementById("editarCorreoCliente").value.trim();
  const estado = document.getElementById("editarEstadoCliente").value;
  const avatarUrl = document.getElementById("editarFotoCliente").value.trim();
  // validations inline
  const namePattern = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s'\-]+$/;
  let hasErr = false;
  // clear previous
  clearInlineError("editarNombreClienteError");
  clearInlineError("editarApellidoClienteError");
  clearInlineError("editarCorreoClienteError");
  if (!nombre || !namePattern.test(nombre)) {
    showInlineError(
      "editarNombreClienteError",
      "Nombre inválido. Solo letras, espacios, guiones o apóstrofes."
    );
    document.getElementById("editarNombreCliente").classList.add("invalid");
    hasErr = true;
  }
  if (!apellido || !namePattern.test(apellido)) {
    showInlineError(
      "editarApellidoClienteError",
      "Apellido inválido. Solo letras, espacios, guiones o apóstrofes."
    );
    document.getElementById("editarApellidoCliente").classList.add("invalid");
    hasErr = true;
  }
  if (!email || !email.includes("@")) {
    showInlineError(
      "editarCorreoClienteError",
      "Correo inválido. Debe contener '@'."
    );
    document.getElementById("editarCorreoCliente").classList.add("invalid");
    hasErr = true;
  }
  if (hasErr) return;

  const body = { nombre, apellido, estado, avatarUrl, roles: ["cliente"] };
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: "Bearer " + (localStorage.getItem("token") || ""),
    };
    if (window.API_KEY) headers["x-api-key"] = window.API_KEY;

    const res = await fetch(`/api/usuarios/${email}`, {
      method: "PUT",
      credentials: "same-origin",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => null);
      console.error(
        `editarCliente: PUT /api/usuarios/${email} failed status=${res.status} text=`,
        text
      );
      throw new Error("Error al editar cliente: " + (res.status || "unknown"));
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

/**
 * Modal ver cliente (rellena y abre el modal)
 */
function abrirModalVerCliente(row) {
  document.getElementById("verNombreCliente").value =
    row.children[2].textContent.trim().split(" ")[0];
  document.getElementById("verApellidoCliente").value =
    row.children[2].textContent.trim().split(" ")[1] || "";
  document.getElementById("verCorreoCliente").value =
    row.children[3].textContent.trim();
  document.getElementById("verEstadoCliente").value = row
    .querySelector(".status")
    .textContent.trim();
  document.getElementById("verFotoCliente").value =
    row.children[1].querySelector("img").src;
  document.getElementById("modalVerCliente").style.display = "flex";
}

/**
 * Inactivar cliente (enviar cambio al backend)
 */
async function inactivarCliente(email) {
  try {
    const headers = {
      Authorization: "Bearer " + (localStorage.getItem("token") || ""),
    };
    if (window.API_KEY) headers["x-api-key"] = window.API_KEY;

    const res = await fetch(`/api/usuarios/${email}`, {
      method: "DELETE",
      credentials: "same-origin",
      headers,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => null);
      console.error(
        `inactivarCliente: DELETE /api/usuarios/${email} failed status=${res.status} text=`,
        text
      );
      throw new Error(
        "Error al inactivar cliente: " + (res.status || "unknown")
      );
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

/**
 * Crear cliente (desde modal) - valida localmente y llama al endpoint de registro
 */
async function agregarCliente() {
  const nombre = document.getElementById("agregarNombreCliente").value.trim();
  const apellido = document
    .getElementById("agregarApellidoCliente")
    .value.trim();
  const email = document.getElementById("agregarCorreoCliente").value.trim();
  const estado = document.getElementById("agregarEstadoCliente").value;
  const avatarUrl = document.getElementById("agregarFotoCliente").value.trim();
  const password =
    (document.getElementById("agregarPasswordCliente") || {}).value || "";
  const confirmPassword =
    (document.getElementById("agregarConfirmPasswordCliente") || {}).value ||
    "";

  // Validaciones: nombre/apellido no vacíos y solo letras (permitir espacios, guiones y apóstrofe)
  const namePattern = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s'\-]+$/;
  let hasError = false;
  if (!nombre || !namePattern.test(nombre)) {
    showInlineError(
      "agregarNombreClienteError",
      "Nombre inválido. Solo letras, espacios, guiones o apóstrofes."
    );
    document.getElementById("agregarNombreCliente").classList.add("invalid");
    hasError = true;
  }
  if (!apellido || !namePattern.test(apellido)) {
    showInlineError(
      "agregarApellidoClienteError",
      "Apellido inválido. Solo letras, espacios, guiones o apóstrofes."
    );
    document.getElementById("agregarApellidoCliente").classList.add("invalid");
    hasError = true;
  }
  if (!email || !email.includes("@")) {
    showInlineError(
      "agregarCorreoClienteError",
      "Correo inválido. Debe incluir un '@' válido."
    );
    document.getElementById("agregarCorreoCliente").classList.add("invalid");
    hasError = true;
  }
  if (hasError) return false;

  // Validación de contraseña usando PasswordUtils si está disponible
  if (window.PasswordUtils) {
    if (!window.PasswordUtils.isPasswordValid(password)) {
      showInlineError(
        "agregarPasswordClienteError",
        "La contraseña no cumple los requisitos (mínimo 8 caracteres, mayúscula, minúscula y número)."
      );
      document
        .getElementById("agregarPasswordCliente")
        .classList.add("invalid");
      return false;
    }
    if (
      !window.PasswordUtils.validateConfirmAndShow(
        password,
        confirmPassword,
        document.getElementById("agregarConfirmPasswordClienteError")
      )
    ) {
      document
        .getElementById("agregarConfirmPasswordCliente")
        .classList.add("invalid");
      return false;
    }
  } else {
    // Fallback: mínimo 8 caracteres y existencia de '@' ya validada
    if (!password || password.length < 8) {
      showInlineError(
        "agregarPasswordClienteError",
        "La contraseña debe tener al menos 8 caracteres."
      );
      document
        .getElementById("agregarPasswordCliente")
        .classList.add("invalid");
      return false;
    }
    if (password !== confirmPassword) {
      showInlineError(
        "agregarConfirmPasswordClienteError",
        "Las contraseñas no coinciden."
      );
      document
        .getElementById("agregarConfirmPasswordCliente")
        .classList.add("invalid");
      return false;
    }
  }

  // Preparar payload y enviar a /api/usuarios/registro (igual que el registro público)
  const payload = {
    nombre,
    apellido,
    email,
    password,
    roles: ["cliente"],
    estado,
    avatarUrl,
  };

  try {
    const headers = { "Content-Type": "application/json" };
    if (window.API_KEY) headers["x-api-key"] = window.API_KEY;
    // Incluir token de sesión si existe
    const token = localStorage.getItem("token");
    if (token) headers["Authorization"] = "Bearer " + token;

    const res = await fetch("/api/usuarios/registro", {
      method: "POST",
      credentials: "same-origin",
      headers,
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error((body && body.mensaje) || res.status);
    }
    try {
      const msg = (body && body.mensaje) || "Cliente creado correctamente.";
      showInlineError("agregarNombreClienteError", msg);
      // mostrar mensaje verde temporal en el footer del modal sería ideal; por ahora lo mostramos en el primer error node
    } catch (e) {
      console.log("Cliente creado");
    }
    return true;
  } catch (err) {
    console.error("agregarCliente error:", err);
    showInlineError(
      "agregarNombreClienteError",
      "Error creando cliente: " + (err && err.message ? err.message : err)
    );
    return false;
  }
}
