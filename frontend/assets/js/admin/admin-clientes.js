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
    await agregarCliente();
    modalAgregar.style.display = "none";
    formAgregar.reset();
    cargarClientes(1);
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
