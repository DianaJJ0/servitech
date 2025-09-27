// ===============================
// Verificación de sesión (seguridad)
// ===============================
function ensureAuthenticatedOrRedirect() {
  try {
    const token = localStorage.getItem("token");
    const usuario = localStorage.getItem("usuario");
    // Unifica: solo aceptamos autenticado si existe token Y usuario
    if (!token || !usuario) {
      window.location.replace("/login.html");
      throw new Error("No autenticado");
    }
  } catch (e) {
    window.location.replace("/login.html");
    throw e;
  }
}

// ===============================
// Configuración global y helpers
// ===============================
let usuarioId = null;
let rol = "cliente";
function readInitialData() {
  try {
    const el = document.getElementById("initial-misAsesorias");
    if (!el) return;
    const data = JSON.parse(el.textContent);
    usuarioId = data.usuarioId || null;
    rol = data.rolUsuario || "cliente";
  } catch (e) {}
}

// Exports para tests
try {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = module.exports || {};
    module.exports.readInitialData = readInitialData;
    module.exports.ensureAuthenticatedOrRedirect =
      ensureAuthenticatedOrRedirect;
  }
} catch (e) {}

const asesoriasList = document.querySelector(".asesorias-list");

// ===============================
// Renderizado de tarjetas de asesoría
// ===============================
function getAvatarUrl(experto) {
  return (
    experto.avatar_url ||
    "https://ui-avatars.com/api/?name=" +
      encodeURIComponent(experto.nombre || "Experto") +
      "&background=3a8eff&color=fff"
  );
}

function renderAsesoriaCard(asesoria) {
  const experto = asesoria.experto || {};
  const fechaObj = new Date(asesoria.fechaHora);
  const fecha = fechaObj.toLocaleDateString("es-CO");
  const hora = fechaObj.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const horaFin = asesoria.duracionMinutos
    ? new Date(
        fechaObj.getTime() + asesoria.duracionMinutos * 60000
      ).toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const estado = asesoria.estado || "Agendada";
  const nombreCompleto =
    (experto.nombre || "") + " " + (experto.apellido || "");

  return `
    <div class="asesoria-card">
      <div class="asesoria-info">
        <div>
          <span class="asesoria-fecha">${fecha}</span>
          <span class="asesoria-hora">${hora}${
    horaFin ? " - " + horaFin : ""
  }</span>
        </div>
        <div class="asesoria-experto">
          <img src="${getAvatarUrl(
            experto
          )}" alt="Avatar de ${nombreCompleto}" class="experto-avatar">
          <div>
            <div class="experto-nombre">${nombreCompleto}</div>
            <div class="experto-rol">${
              (experto.roles && experto.roles.join(", ")) || "Experto"
            }</div>
          </div>
        </div>
      </div>
      <div class="asesoria-estado ${
        estado.toLowerCase() === "completada" ? "completada" : ""
      }">${estado}</div>
      <div class="asesoria-acciones">
        <button class="btn btn-primary btn-sm" onclick="verDetalles('${
          asesoria._id
        }')">Ver detalles</button>
        <button class="btn btn-secondary btn-sm" onclick="abrirMensajes('${
          asesoria._id
        }','${nombreCompleto.replace(/"/g, "&quot;")}')">Mensaje</button>
      </div>
    </div>
  `;
}

// ===============================
// Carga de asesorías
// ===============================
async function cargarAsesorias() {
  try {
    ensureAuthenticatedOrRedirect();
    readInitialData();

    // Endpoint de ejemplo (ajusta según tu backend)
    // Si el backend diferencia por rol, puedes agregar querys ?rol=cliente|experto
    const res = await fetch("/api/asesorias/mias", { credentials: "include" });
    if (!res.ok) throw new Error("Error al cargar asesorías");
    const data = await res.json();
    const items = Array.isArray(data) ? data : data.data || [];
    asesoriasList.innerHTML = items.map(renderAsesoriaCard).join("");
  } catch (e) {
    asesoriasList.innerHTML =
      '<div class="alert alert-danger">No fue posible cargar tus asesorías. Intenta más tarde.</div>';
  }
}

// ===============================
// Modales simples (UI local)
// ===============================
window.abrirMensajes = function (asesoriaId, expertoNombre) {
  document.getElementById("expertoNombre").textContent = expertoNombre || "";
  document.getElementById("mensajeModal").style.display = "flex";
};

window.cerrarMensajes = function () {
  document.getElementById("mensajeModal").style.display = "none";
};

window.verDetalles = function (asesoriaId) {
  // Aquí podrías consultar /api/asesorias/:id para más detalle
  const cont = document.getElementById("detalleContenido");
  cont.innerHTML = `<p>ID de la asesoría: ${asesoriaId}</p>`;
  document.getElementById("detalleModal").style.display = "flex";
};

window.cerrarDetalles = function () {
  document.getElementById("detalleModal").style.display = "none";
};

// Init
document.addEventListener("DOMContentLoaded", cargarAsesorias);
