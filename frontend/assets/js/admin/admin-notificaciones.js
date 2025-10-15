/**
 * @file admin-notificaciones.js
 * @description Manejo de notificaciones en el panel admin (lista, marcar leídas, filtros)
 *
 * Deepwiki: metadata
 * - propósito: gestionar notificaciones administrativas
 * - variables DOM esperadas: .notifications-list, .notification-filter
 */

// admin-notificaciones.js
// Script para la gestión del historial de asesorías y notificaciones en el panel de administración

/**
 * Carga el historial de notificaciones/asesorías desde el backend y las muestra en la tabla.
 */

let notificacionesCache = [];

function renderNotificaciones(filtrarEstado = "") {
  const tbody = document.getElementById("tbodyNotificaciones");
  let filtradas = notificacionesCache;
  if (filtrarEstado && filtrarEstado !== "") {
    filtradas = notificacionesCache.filter((n) => n.estado === filtrarEstado);
  }
  if (!filtradas.length) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="admin-notificaciones__vacio">No hay historial de asesorías.</td></tr>';
    return;
  }
  tbody.innerHTML = "";
  filtradas.forEach((n, idx) => {
    const estadoClase =
      "admin-notificaciones__estado--" + (n.estado || "pendiente");
    tbody.innerHTML += `
      <tr>
        <td>${idx + 1}</td>
        <td>${n.email || ""}</td>
        <td>${n.asunto || ""}</td>
        <td>${
          n.mensaje
            ? n.mensaje.substring(0, 60) + (n.mensaje.length > 60 ? "..." : "")
            : ""
        }</td>
        <td><span class="admin-notificaciones__estado ${estadoClase}">${
      n.estado || ""
    }</span></td>
        <td>${n.tipo || ""}</td>
        <td>${n.fechaEnvio ? new Date(n.fechaEnvio).toLocaleString() : ""}</td>
        <td class="admin-notificaciones__acciones">
          <button class="admin-notificaciones__btn-borrar" title="Eliminar" onclick="eliminarNotificacion('${
            n._id
          }')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `;
  });
}

async function cargarHistorialNotificaciones() {
  const tbody = document.getElementById("tbodyNotificaciones");
  tbody.innerHTML = '<tr><td colspan="8">Cargando...</td></tr>';
  try {
    const res = await fetch("/api/notificaciones", { credentials: "include" });
    if (!res.ok) throw new Error("Error al obtener historial");
    notificacionesCache = await res.json();
    renderNotificaciones();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" class="admin-notificaciones__vacio">Error: ${e.message}</td></tr>`;
  }
}

/**
 * Elimina una notificación/registro del historial (solo admins).
 * @param {string} id
 */
async function eliminarNotificacion(id) {
  if (!confirm("¿Seguro que deseas eliminar este registro del historial?"))
    return;
  try {
    const res = await fetch(`/api/notificaciones/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error("No se pudo eliminar");
    cargarHistorialNotificaciones();
  } catch (e) {
    alert("Error al eliminar: " + e.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  cargarHistorialNotificaciones();
  const filtro = document.getElementById("filtroEstado");
  if (filtro) {
    filtro.addEventListener("change", (e) => {
      renderNotificaciones(e.target.value);
    });
  }
});
