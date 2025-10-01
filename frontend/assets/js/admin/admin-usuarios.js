/**
 * @fileoverview
 * Funcionalidad para la página de administración de usuarios.
 * Carga y muestra una lista de todos los usuarios del sistema.
 */

document.addEventListener("DOMContentLoaded", function () {
  // Asegura que el contenedor de mensajes exista (si se usa admin-common.js)
  if (typeof ensureAdminMessageContainer === "function") {
    ensureAdminMessageContainer();
  }

  // Carga inicial de usuarios
  loadUsuarios();
  // Inicializar manejo de modales y delegación de botones
  initUserModals();
});

/**
 * Obtiene los encabezados de autenticación necesarios para las peticiones a la API.
 * @returns {HeadersInit} Un objeto con los encabezados, incluyendo el token de autorización.
 */
function getAuthHeaders() {
  const headers = {
    "Content-Type": "application/json",
  };
  const token = localStorage.getItem("token");
  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }
  // Si usas una API Key para rutas de admin, también se puede añadir aquí.
  if (window.API_KEY) {
    headers["x-api-key"] = window.API_KEY;
  }
  return headers;
}

// Estado de paginación global para la página
const usuariosPaginationState = {
  page: 1,
  limit: 10,
  // total puede ser null si el backend no lo devuelve — usamos lastCount para inferir
  total: null,
  lastCount: 0,
  isLoading: false,
};

/**
 * Carga la lista de usuarios desde la API y la renderiza en la tabla.
 */
async function loadUsuarios(
  page = usuariosPaginationState.page,
  limit = usuariosPaginationState.limit
) {
  const tbody = document.getElementById("usuarios-tbody");
  if (!tbody) return;

  // Normalizar página
  page = Math.max(1, Number(page) || 1);
  usuariosPaginationState.page = page;
  usuariosPaginationState.limit =
    Number(limit) || usuariosPaginationState.limit;
  usuariosPaginationState.isLoading = true;
  // mostrar fila de carga
  tbody.innerHTML =
    '<tr><td colspan="5" style="text-align: center;">Cargando usuarios...</td></tr>';
  // refrescar controles para que se muestren deshabilitados mientras cargamos
  renderPaginationControls();

  try {
    console.debug(
      `[admin-usuarios] fetch /api/usuarios?page=${page}&limit=${limit}`
    );
    const response = await fetch(`/api/usuarios?page=${page}&limit=${limit}`, {
      method: "GET",
      headers: getAuthHeaders(),
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.mensaje || "Error al cargar los usuarios.");
    }

    const data = await response.json();
    // data puede venir como { usuarios, total } o como array
    const usuarios = data.usuarios || data || [];
    usuariosPaginationState.page = Number(
      data.page || page || usuariosPaginationState.page
    );
    usuariosPaginationState.limit = Number(
      data.limit || limit || usuariosPaginationState.limit
    );
    // Si el backend nos devuelve total lo usamos; si no, lo dejamos como null y guardamos el count
    usuariosPaginationState.lastCount = Array.isArray(usuarios)
      ? usuarios.length
      : 0;
    usuariosPaginationState.total =
      typeof data.total !== "undefined" && data.total !== null
        ? Number(data.total)
        : null;

    console.debug("[admin-usuarios] datos recibidos", {
      page: usuariosPaginationState.page,
      limit: usuariosPaginationState.limit,
      total: usuariosPaginationState.total,
      lastCount: usuariosPaginationState.lastCount,
    });

    renderUsuarios(usuarios);
    usuariosPaginationState.isLoading = false;
    renderPaginationControls();
  } catch (error) {
    console.error("Error en loadUsuarios:", error);
    usuariosPaginationState.isLoading = false;
    renderPaginationControls();
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">${error.message}</td></tr>`;
  }
}

/**
 * Renderiza las filas de la tabla de usuarios.
 * @param {Array} usuarios - Un array de objetos de usuario.
 */
function renderUsuarios(usuarios) {
  const tbody = document.getElementById("usuarios-tbody");
  if (!tbody) return;

  if (usuarios.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align: center;">No se encontraron usuarios.</td></tr>';
    return;
  }

  tbody.innerHTML = usuarios.map((user) => createUserRow(user)).join("");
}

/** Renderiza los controles de paginación debajo de la tabla */
function renderPaginationControls() {
  const container = document.getElementById("usuarios-pagination");
  if (!container) return;
  const { page, limit, total, lastCount } = usuariosPaginationState;
  // Si total es null, el backend no lo devolvió; inferimos comportamiento usando lastCount
  let totalPages;
  if (total === null) {
    // Si el número de resultados devueltos alcanza el límite, asumimos que puede haber al menos otra página
    totalPages = lastCount === 0 ? 1 : lastCount === limit ? page + 1 : page;
  } else {
    totalPages = Math.max(1, Math.ceil(total / limit));
  }

  let html = "";
  html += `<button class="btn-outline" data-pg="prev" ${
    page <= 1 ? "disabled" : ""
  }>Anterior</button>`;

  // Si no conocemos total, mostramos controles simplificados: página anterior (si aplica), página actual, posible siguiente
  if (total === null) {
    if (page > 1) {
      html += `<button class="btn-outline" data-pg="${page - 1}">${
        page - 1
      }</button>`;
    }
    html += `<button class="btn-outline" data-pg="${page}" aria-current="page" style="background:var(--admin-accent-color); color:#072034;">${page}</button>`;
    if (lastCount === limit) {
      html += `<button class="btn-outline" data-pg="${page + 1}">${
        page + 1
      }</button>`;
    }
  } else {
    // Mostramos hasta 5 botones centrados en la página actual
    const maxButtons = 5;
    let start = Math.max(1, page - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);
    for (let p = start; p <= end; p++) {
      html += `<button class="btn-outline" data-pg="${p}" ${
        p === page
          ? 'aria-current="page" style="background:var(--admin-accent-color); color:#072034;"'
          : ""
      }>${p}</button>`;
    }
  }

  html += `<button class="btn-outline" data-pg="next" ${
    page >= totalPages ? "disabled" : ""
  }>Siguiente</button>`;

  container.innerHTML = html;

  // attach events
  console.debug("[admin-usuarios] renderPaginationControls state=", {
    page,
    limit,
    total,
    lastCount,
    isLoading: usuariosPaginationState.isLoading,
    totalPages,
  });
  container.querySelectorAll("button[data-pg]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const v = btn.getAttribute("data-pg");
      console.debug("[admin-usuarios] pagination click", {
        v,
        state: usuariosPaginationState,
      });
      // si estamos cargando, ignorar clicks
      if (usuariosPaginationState.isLoading) return;
      if (v === "prev") {
        if (usuariosPaginationState.page > 1) {
          usuariosPaginationState.page -= 1;
          loadUsuarios(
            usuariosPaginationState.page,
            usuariosPaginationState.limit
          );
        }
      } else if (v === "next") {
        // calcular página máxima disponible: usar total si está, o permitir avanzar si lastCount === limit
        const { total, lastCount, limit } = usuariosPaginationState;
        const maxIfKnown = total ? Math.ceil(total / limit) : null;
        const canAdvance = maxIfKnown
          ? usuariosPaginationState.page < maxIfKnown
          : lastCount === limit;
        if (canAdvance) {
          usuariosPaginationState.page = usuariosPaginationState.page + 1;
          loadUsuarios(
            usuariosPaginationState.page,
            usuariosPaginationState.limit
          );
        }
      } else {
        const np = Number(v);
        if (!isNaN(np) && np !== usuariosPaginationState.page) {
          usuariosPaginationState.page = np;
          loadUsuarios(
            usuariosPaginationState.page,
            usuariosPaginationState.limit
          );
        }
      }
    });
  });

  // mientras isLoading true, deshabilitar botones
  if (usuariosPaginationState.isLoading) {
    container
      .querySelectorAll("button")
      .forEach((b) => b.setAttribute("disabled", ""));
  }
}

// manejar cambios de tamaño de página
document.addEventListener("DOMContentLoaded", function () {
  const pageSize = document.getElementById("usuarios-page-size");
  if (pageSize) {
    pageSize.addEventListener("change", function () {
      usuariosPaginationState.limit = Number(this.value) || 10;
      usuariosPaginationState.page = 1;
      // cuando cambia el tamaño de página, invalidamos total conocido para forzar recálculo desde el servidor
      usuariosPaginationState.total = null;
      loadUsuarios(usuariosPaginationState.page, usuariosPaginationState.limit);
    });
  }
});

/**
 * Crea el HTML para una fila de la tabla de un usuario.
 * @param {object} user - El objeto del usuario.
 * @returns {string} El string HTML para la fila (<tr>).
 */
function createUserRow(user) {
  const nombreCompleto = `${user.nombre || ""} ${user.apellido || ""}`.trim();
  const avatarUrl =
    user.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      nombreCompleto || user.email
    )}&background=random`;
  const roles = (user.roles || []).join(", ") || "usuario";
  const estado = user.estado || "inactivo";

  return `
    <tr data-user-id="${user._id}" ${
    user.infoExperto
      ? `data-info-experto='${escapeHtml(JSON.stringify(user.infoExperto))}'`
      : ""
  }>
      <td>
        <div class="user-info">
          <img src="${avatarUrl}" alt="Avatar de ${nombreCompleto}" class="clientes-avatar" />
          <div class="user-details">
            <h4>${nombreCompleto}</h4>
            <span class="user-sub">ID: ${user._id.slice(-6)}</span>
          </div>
        </div>
      </td>
      <td>${user.email || "-"}</td>
      <td>${roles}</td>
      <td>
        <span class="status ${
          estado === "activo" ? "active" : "inactive"
        }">${estado}</span>
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon" data-action="view" title="Ver perfil"><i class="fas fa-eye"></i></button>
          <button class="btn-icon" data-action="edit" title="Editar"><i class="fas fa-edit"></i></button>
          <button class="btn-icon" data-action="delete" title="Eliminar"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `;
}

// Helper simple para escapar texto cuando inyectamos JSON en atributos
function escapeHtml(str) {
  if (str === null || typeof str === "undefined") return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// -----------------------
// Modales y comportamiento
// -----------------------
function openModalById(id) {
  const m = document.getElementById(id);
  if (!m) return;
  // Ensure backdrop and dialog are visible and on top
  m.style.display = "block";
  try {
    const dialog = m.querySelector(".admin-modal__dialog");
    const backdrop = m.querySelector(".admin-modal__backdrop");
    if (backdrop) {
      backdrop.style.display = "block";
      backdrop.style.position = "fixed";
      backdrop.style.left = "0";
      backdrop.style.top = "0";
      backdrop.style.width = "100%";
      backdrop.style.height = "100%";
      backdrop.style.background = "rgba(0,0,0,0.4)";
      backdrop.style.zIndex = "9998";
    }
    if (dialog) {
      dialog.style.position = "fixed";
      dialog.style.left = "50%";
      dialog.style.top = "50%";
      dialog.style.transform = "translate(-50%, -50%)";
      dialog.style.zIndex = "9999";
      dialog.style.maxHeight = "90vh";
      dialog.style.overflow = "auto";
    }
  } catch (e) {}
  document.body.classList.add("modal-open");
}

function closeModalByElement(el) {
  if (!el) return;
  const modal = el.closest(".admin-modal");
  if (!modal) return;
  modal.style.display = "none";
  document.body.classList.remove("modal-open");
}

function initUserModals() {
  // Delegación en el tbody para actions (view/edit/delete)
  const tbody = document.getElementById("usuarios-tbody");
  if (tbody && !tbody.__userDelegation) {
    tbody.__userDelegation = true;
    tbody.addEventListener("click", function (e) {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      // debug
      try {
        console.debug(
          "[admin-usuarios] tbody click action=",
          btn.getAttribute("data-action")
        );
      } catch (e) {}
      const action = btn.getAttribute("data-action");
      const row = btn.closest("tr");
      if (!row) return;
      const cols = row.children;
      const nombre = cols[0] ? cols[0].innerText.trim() : "";
      const email = cols[1] ? cols[1].innerText.trim() : "";
      const roles = cols[2] ? cols[2].innerText.trim() : "";
      const estado = cols[3] ? cols[3].innerText.trim() : "";

      if (action === "view") {
        const viewNombre = document.getElementById("view-nombre");
        const viewEmail = document.getElementById("view-email");
        const viewRoles = document.getElementById("view-roles");
        const viewEstado = document.getElementById("view-estado");
        const viewAvatar = document.getElementById("view-avatar");
        if (viewNombre) viewNombre.innerText = nombre;
        if (viewEmail) viewEmail.innerText = email;
        if (viewRoles) viewRoles.innerText = roles;
        if (viewEstado) viewEstado.innerText = estado;
        const img = row.querySelector("img");
        if (viewAvatar) viewAvatar.src = img ? img.src : "";
        // infoExperto
        const infoExp = row.getAttribute("data-info-experto") || "";
        if (infoExp) {
          try {
            const parsed = JSON.parse(infoExp);
            const descEl = document.getElementById("view-descripcion");
            const catsEl = document.getElementById("view-categorias");
            const infoWrap = document.getElementById("view-infoExperto");
            if (descEl) descEl.innerText = parsed.descripcion || "";
            if (catsEl) catsEl.innerText = (parsed.categorias || []).join(", ");
            if (infoWrap) infoWrap.style.display = "";
          } catch (err) {
            const infoWrap = document.getElementById("view-infoExperto");
            if (infoWrap) infoWrap.style.display = "none";
          }
        }
        openModalById("modalViewUser");
      }

      if (action === "edit") {
        const editId = document.getElementById("edit-user-id");
        const editNombre = document.getElementById("edit-nombre");
        const editApellido = document.getElementById("edit-apellido");
        const editEmail = document.getElementById("edit-email");
        const editRoles = document.getElementById("edit-roles");
        const editEstado = document.getElementById("edit-estado");
        if (editId) editId.value = row.getAttribute("data-user-id") || "";
        const parts = (nombre || "").split("\n")[0] || nombre;
        if (editNombre) editNombre.value = parts || "";
        const nameParts = parts.split(" ");
        if (editApellido)
          editApellido.value =
            nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
        if (editEmail) editEmail.value = email || "";
        if (editRoles) editRoles.value = roles || "";
        if (editEstado) editEstado.value = estado || "activo";
        openModalById("modalEditUser");
      }

      if (action === "delete") {
        if (!confirm("¿Desactivar usuario?")) return;
        const emailEnc = encodeURIComponent(email);
        const headers = getAuthHeaders();
        fetch("/api/usuarios/" + emailEnc, {
          method: "DELETE",
          credentials: "same-origin",
          headers,
        })
          .then(async (r) => {
            const body = await r.json().catch(() => null);
            if (r.ok) {
              row.remove();
            } else {
              alert(
                "Error al desactivar: " +
                  (body && body.mensaje ? body.mensaje : JSON.stringify(body))
              );
            }
          })
          .catch((err) => {
            console.error(err);
            alert("Error al desactivar usuario");
          });
      }
    });
  }

  // Document-level fallback delegation (covers cases where event doesn't reach tbody)
  if (!document.__userDelegationGlobal) {
    document.__userDelegationGlobal = true;
    document.addEventListener("click", function (e) {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      // If the tbody handler already processed, this will still be idempotent
      try {
        console.debug(
          "[admin-usuarios] document click action=",
          btn.getAttribute("data-action")
        );
      } catch (e) {}
      // reuse same behavior: simulate a click on tbody to reuse code path by calling the handler directly
      // We'll find the nearest row and call the same logic inline
      const row = btn.closest("tr");
      if (!row) return;
      const cols = row.children;
      const nombre = cols[0] ? cols[0].innerText.trim() : "";
      const email = cols[1] ? cols[1].innerText.trim() : "";
      const roles = cols[2] ? cols[2].innerText.trim() : "";
      const estado = cols[3] ? cols[3].innerText.trim() : "";
      const action = btn.getAttribute("data-action");
      // handle actions (duplicate of tbody handler)
      if (action === "view") {
        const viewNombre = document.getElementById("view-nombre");
        const viewEmail = document.getElementById("view-email");
        const viewRoles = document.getElementById("view-roles");
        const viewEstado = document.getElementById("view-estado");
        const viewAvatar = document.getElementById("view-avatar");
        if (viewNombre) viewNombre.innerText = nombre;
        if (viewEmail) viewEmail.innerText = email;
        if (viewRoles) viewRoles.innerText = roles;
        if (viewEstado) viewEstado.innerText = estado;
        const img = row.querySelector("img");
        if (viewAvatar) viewAvatar.src = img ? img.src : "";
        openModalById("modalViewUser");
        return;
      }
      if (action === "edit") {
        const editId = document.getElementById("edit-user-id");
        const editNombre = document.getElementById("edit-nombre");
        const editApellido = document.getElementById("edit-apellido");
        const editEmail = document.getElementById("edit-email");
        const editRoles = document.getElementById("edit-roles");
        const editEstado = document.getElementById("edit-estado");
        if (editId) editId.value = row.getAttribute("data-user-id") || "";
        const parts = (nombre || "").split("\n")[0] || nombre;
        if (editNombre) editNombre.value = parts || "";
        const nameParts = parts.split(" ");
        if (editApellido)
          editApellido.value =
            nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
        if (editEmail) editEmail.value = email || "";
        if (editRoles) editRoles.value = roles || "";
        if (editEstado) editEstado.value = estado || "activo";
        openModalById("modalEditUser");
        return;
      }
      if (action === "delete") {
        if (!confirm("¿Desactivar usuario?")) return;
        const emailEnc = encodeURIComponent(email);
        const headers = getAuthHeaders();
        fetch("/api/usuarios/" + emailEnc, {
          method: "DELETE",
          credentials: "same-origin",
          headers,
        })
          .then(async (r) => {
            const body = await r.json().catch(() => null);
            if (r.ok) {
              row.remove();
            } else {
              alert(
                "Error al desactivar: " +
                  (body && body.mensaje ? body.mensaje : JSON.stringify(body))
              );
            }
          })
          .catch((err) => {
            console.error(err);
            alert("Error al desactivar usuario");
          });
      }
    });
  }

  // Cierre de modales por botones data-close
  document.addEventListener("click", function (e) {
    const cl = e.target.closest("[data-close]");
    if (cl) {
      closeModalByElement(cl);
    }
  });

  // Guardar edición
  const saveBtn = document.getElementById("btnSaveEditUser");
  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      const id = document.getElementById("edit-user-id").value;
      const email = document.getElementById("edit-email").value;
      const nombre = document.getElementById("edit-nombre").value;
      const apellido = document.getElementById("edit-apellido").value;
      const roles = document
        .getElementById("edit-roles")
        .value.split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const estado = document.getElementById("edit-estado").value;
      const payload = { nombre, apellido, roles, estado };
      const headers = getAuthHeaders();
      fetch("/api/usuarios/" + encodeURIComponent(email), {
        method: "PUT",
        credentials: "same-origin",
        headers,
        body: JSON.stringify(payload),
      })
        .then(async (r) => {
          const body = await r.json().catch(() => null);
          if (!r.ok) throw new Error((body && body.mensaje) || r.status);
          // actualizar fila
          const rows = Array.from(
            document.querySelectorAll("#usuarios-tbody tr")
          );
          const row = rows.find(
            (tr) =>
              (tr.getAttribute("data-user-id") || "") === id ||
              (tr.children[1] && tr.children[1].innerText.trim() === email)
          );
          if (row) {
            row.children[0].querySelector(".user-details h4").innerText =
              nombre + " " + apellido;
            row.children[2].innerText = roles.join(", ");
            row.children[3].innerHTML = `<span class="status ${
              estado === "activo" ? "active" : "inactive"
            }">${estado}</span>`;
          }
          // cerrar modal
          const closeEl = saveBtn.closest(".admin-modal");
          if (closeEl)
            closeModalByElement(
              closeEl.querySelector("[data-close]") || closeEl
            );
        })
        .catch((err) => {
          console.error(err);
          alert("Error guardando usuario: " + (err && err.message));
        });
    });
  }
}
