// ===============================
// Verificación de sesión (seguridad)
// ===============================
// Auth check is performed on DOMContentLoaded to avoid redirecting during module import (testable)
function ensureAuthenticatedOrRedirect() {
  try {
    const token = localStorage.getItem("token");
    const currentUser = localStorage.getItem("currentUser");
    if (!token && !currentUser) {
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
// Read initial data injected by server as JSON
let usuarioId = null;
let rol = 'cliente';
function readInitialData() {
  try {
    const el = document.getElementById('initial-misAsesorias');
    if (!el) return;
    const data = JSON.parse(el.textContent);
    usuarioId = data.usuarioId || null;
    rol = data.rolUsuario || 'cliente';
  } catch (e) {
    // ignore and keep defaults
  }
}

// Exports for tests
try {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = module.exports || {};
    module.exports.readInitialData = readInitialData;
    module.exports.ensureAuthenticatedOrRedirect = ensureAuthenticatedOrRedirect;
  }
} catch (e) {}
const asesoriasList = document.querySelector(".asesorias-list");

// ===============================
// Renderizado de tarjetas de asesoría (HTML en JS) - modularizado
// ===============================
function getAvatarUrl(experto) {
  return (
    // Si el experto tiene una URL de avatar, la usamos; de lo contrario, generamos una por defecto
    experto.avatar_url ||
    "https://ui-avatars.com/api/?name=" +
      encodeURIComponent(experto.nombre || "Experto") +
      "&background=3a8eff&color=fff"
  );
}

// Función para obtener la especialidad del experto
function getEspecialidad(experto) {
  return (experto.especialidades && experto.especialidades[0]) || "";
}

// Función para renderizar la tarjeta de asesoría
function renderAsesoriaCard(asesoria) {
  const experto = asesoria.experto || {};
  const fechaObj = new Date(asesoria.fechaHora);
  const fecha = fechaObj.toLocaleDateString("es-CO");
  const hora = fechaObj.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
  // Obtener la hora de fin
  const horaFin = asesoria.duracionMinutos
    ? new Date(
        fechaObj.getTime() + asesoria.duracionMinutos * 60000
      ).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
    : "";
  const estado = asesoria.estado || "Agendada";
  const nombreCompleto =
    (experto.nombre || "") + " " + (experto.apellido || "");

  // Renderizar la tarjeta de asesoría
  // Alt text accesible para el avatar del experto
  const expertoAltText = `Retrato de ${nombreCompleto}. Especialidad: ${getEspecialidad(experto)}. Estado de la asesoría: ${estado}. Fecha: ${fecha}. Hora: ${hora}${horaFin ? " - " + horaFin : ""}. Botones disponibles: Mensaje y Ver detalles. El entorno es una tarjeta de asesoría en una lista de asesorías agendadas.`;

  return `
    <div class="asesoria-card">
      <div class="asesoria-info">
        <div>
          <span class="asesoria-fecha">${fecha}</span>
          <span class="asesoria-hora">${hora}${horaFin ? " - " + horaFin : ""}</span>
        </div>
        <div class="asesoria-experto"></div>
          <img src="${getAvatarUrl(experto)}" alt="${expertoAltText}" class="experto-avatar">
          <div>
            <span class="experto-nombre" style="display:block; margin-bottom:0.2em;">${nombreCompleto}</span>
            <span class="experto-rol" style="display:block; margin-top:0.2em;">${getEspecialidad(experto)}</span>
          </div>
        </div>
        <div class="asesoria-estado ${estado.toLowerCase()}">${estado}</div>
      </div>
      <div class="asesoria-acciones">
        <button class="btn btn-primary btn-sm" onclick="abrirMensajesAsesoria('${asesoria._id}', '${nombreCompleto}')">
          <i class="fas fa-comment-dots"></i> Mensaje
        </button>
        <button class="btn btn-outline btn-sm" onclick='abrirDetallesAsesoria(${JSON.stringify({
          fecha,
          hora: hora + (horaFin ? " - " + horaFin : ""),
          experto: nombreCompleto,
          rol: getEspecialidad(experto),
          estado,
        })})'>
          <i class="fas fa-calendar-alt"></i> Ver detalles
        </button>
      </div>
    </div>
  `;
}

// ===============================
// Función principal: cargar asesorías
// ===============================
async function cargarAsesorias() {
  if (!usuarioId) {
    asesoriasList.innerHTML =
      '<div class="alert alert-danger">No se pudo identificar el usuario.</div>';
    return;
  }
  asesoriasList.innerHTML = '<div class="cargando">Cargando asesorías...</div>';
  try {
    const res = await fetch(`/api/asesorias?usuario=${usuarioId}&rol=${rol}`);
    const data = await res.json();

    // Validar respuesta y mostrar mensajes según el caso
    if (!data.success || !Array.isArray(data.data)) {
      asesoriasList.innerHTML =
        '<div class="alert alert-warning">No se encontraron asesorías.</div>';
      return;
    }
    if (data.data.length === 0) {
      asesoriasList.innerHTML =
        '<div class="alert alert-info">Aún no tienes asesorías agendadas.</div>';
      return;
    }

    // Renderizar todas las asesorías
    asesoriasList.innerHTML = data.data.map(renderAsesoriaCard).join("");
  } catch (err) {
    asesoriasList.innerHTML =
      '<div class="alert alert-danger">Error al cargar asesorías.</div>';
  }
}

// ===============================
// Modales: mensajes y detalles
// ===============================
window.abrirMensajesAsesoria = function (asesoriaId, expertoNombre) {
  document.getElementById("expertoNombre").innerText = expertoNombre;
  document.getElementById("mensajeModal").style.display = "flex";
  // Aquí puedes cargar el historial real de mensajes usando asesoriaId
};

window.abrirDetallesAsesoria = function (data) {
  const html = `
    <div style="margin-bottom:1rem;">
      <strong>Fecha:</strong> ${data.fecha}<br>
      <strong>Hora:</strong> ${data.hora}<br>
      <strong>Estado:</strong> ${data.estado}
    </div>
    <div style="display:flex;align-items:center;gap:1rem;">
      <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(
        data.experto
      )}&background=3a8eff&color=fff" alt="${
    data.experto
  }" style="width:48px;height:48px;border-radius:50%;border:2px solid var(--accent-color);">
      <div>
        <strong>${data.experto}</strong><br>
        <span style="color:var(--accent-color);">${data.rol}</span>
      </div>
    </div>
  `;
  document.getElementById("detalleContenido").innerHTML = html;
  document.getElementById("detalleModal").style.display = "flex";
};

// ===============================
// Eventos de la página
// ===============================
document.addEventListener("DOMContentLoaded", function () {
  readInitialData();
  ensureAuthenticatedOrRedirect();
  cargarAsesorias();
});

// ===============================
// Eventos de los modales
// ===============================
function cerrarMensajes() {
  document.getElementById("mensajeModal").style.display = "none";
}

document
  .getElementById("formMensaje")
  ?.addEventListener("submit", function (e) {
    e.preventDefault();
    const texto = document.getElementById("mensajeTexto").value;
    if (texto.trim() !== "") {
      const historial = document.getElementById("mensajesHistorial");
      const div = document.createElement("div");
      div.className = "mensaje mensaje-usuario";
      div.innerHTML =
        '<div class="mensaje-avatar"><img src="https://ui-avatars.com/api/?name=Usuario&background=ffd700&color=222" alt="Usuario"></div><div class="mensaje-texto">' +
        texto +
        "</div>";
      historial.appendChild(div);
      document.getElementById("mensajeTexto").value = "";
      historial.scrollTop = historial.scrollHeight;
    }
  });

function cerrarDetalles() {
  document.getElementById("detalleModal").style.display = "none";
}

// ===============================
// Lógica de filtros y UI (solo si existen en la vista)
// ===============================
document.addEventListener("DOMContentLoaded", function () {
  // Filtros visuales
  const filterOptions = document.querySelectorAll(".filter-option");
  filterOptions.forEach((option) => {
    option.addEventListener("click", function () {
      filterOptions.forEach((opt) => opt.classList.remove("selected"));
      this.classList.add("selected");
      this.style.color = "var(--primary-color)";
      this.style.fontWeight = "500";
    });
  });

  // Efecto hover en tarjetas (solo si existen .post-card)
  const postCards = document.querySelectorAll(".post-card");
  postCards.forEach((card) => {
    card.addEventListener("mouseenter", function () {
      this.style.borderColor = "rgba(58, 142, 255, 0.3)";
    });
    card.addEventListener("mouseleave", function () {
      this.style.borderColor = "var(--border-light)";
    });
  });

  // Acordeón (solo si existen .accordion-header)
  const accordionHeaders = document.querySelectorAll(".accordion-header");
  accordionHeaders.forEach((header) => {
    header.addEventListener("click", function () {
      const target = document.querySelector(this.dataset.target);
      const isOpen = target.classList.contains("open");
      document
        .querySelectorAll(".accordion-content")
        .forEach((content) => content.classList.remove("open"));
      document
        .querySelectorAll(".accordion-header")
        .forEach((h) => h.classList.remove("active"));
      if (!isOpen) {
        target.classList.add("open");
        this.classList.add("active");
      }
    });
  });

  // Modal genérico (solo si existen los elementos)
  const openModalBtn = document.getElementById("open-modal-btn");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const modal = document.getElementById("modal");
  if (openModalBtn && closeModalBtn && modal) {
    openModalBtn.addEventListener("click", function () {
      modal.style.display = "flex";
    });
    closeModalBtn.addEventListener("click", function () {
      modal.style.display = "none";
    });
    window.addEventListener("click", function (e) {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });
  }
});
