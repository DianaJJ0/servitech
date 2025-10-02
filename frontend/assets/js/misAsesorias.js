// Gestión de asesorías del usuario con validaciones y acciones completas

document.addEventListener("DOMContentLoaded", function () {
  ensureAuthenticatedOrRedirect();
  initializeMisAsesorias();
});

// Variables globales
let userData = {};
let asesorias = [];

// Verificación de autenticación desde sessionStorage/localStorage
function ensureAuthenticatedOrRedirect() {
  try {
    const user = JSON.parse(
      sessionStorage.getItem("user") || localStorage.getItem("user") || "null"
    );
    if (!user || !user.email) {
      window.location.replace("/login.html");
      return false;
    }
    return true;
  } catch (e) {
    window.location.replace("/login.html");
    return false;
  }
}

// Configuración inicial
function readInitialData() {
  try {
    const el = document.getElementById("userData");
    if (el) {
      userData = JSON.parse(el.textContent);
    }
  } catch (e) {
    console.warn("Error leyendo datos iniciales:", e);
  }
}

// Inicialización principal
async function initializeMisAsesorias() {
  readInitialData();
  await cargarAsesorias();
  setupModalEventListeners();
}

// Cargar asesorías del usuario
async function cargarAsesorias() {
  const asesoriasList = document.querySelector(".asesorias-list");

  try {
    showLoading(asesoriasList);

    const response = await fetchProtegido("/api/asesorias/mias");

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success && Array.isArray(data.data)) {
      asesorias = data.data;
      renderAsesorias(asesorias, data.rol || userData.rolUsuario);
    } else {
      throw new Error("Formato de respuesta inválido");
    }
  } catch (error) {
    console.error("Error cargando asesorías:", error);
    showError(
      asesoriasList,
      "No se pudieron cargar las asesorías. Intenta recargar la página."
    );
  }
}

// Renderizar asesorías
function renderAsesorias(asesoriasList, userRole) {
  const container = document.querySelector(".asesorias-list");

  if (!asesoriasList || asesoriasList.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No tienes asesorías</h3>
        <p>Cuando ${
          userRole === "experto"
            ? "recibas solicitudes de asesoría"
            : "agendes una asesoría"
        }, aparecerán aquí.</p>
        ${
          userRole === "cliente"
            ? '<a href="/expertos.html" class="btn btn-primary">Buscar expertos</a>'
            : ""
        }
      </div>
    `;
    return;
  }

  // Agrupar asesorías por estado
  const agrupadas = agruparAsesoriasPorEstado(asesoriasList);

  let html = "";

  if (userRole === "experto") {
    html += renderSeccionAsesorias(
      "Pendientes de respuesta",
      agrupadas.pendientesAceptacion,
      "experto"
    );
    html += renderSeccionAsesorias(
      "Confirmadas",
      agrupadas.confirmadas,
      "experto"
    );
    html += renderSeccionAsesorias(
      "Completadas",
      agrupadas.completadas,
      "experto"
    );
    html += renderSeccionAsesorias(
      "Rechazadas/Canceladas",
      [...agrupadas.rechazadas, ...agrupadas.canceladas],
      "experto"
    );
  } else {
    html += renderSeccionAsesorias(
      "Pendientes de aceptación",
      agrupadas.pendientesAceptacion,
      "cliente"
    );
    html += renderSeccionAsesorias(
      "Confirmadas",
      agrupadas.confirmadas,
      "cliente"
    );
    html += renderSeccionAsesorias(
      "Completadas",
      agrupadas.completadas,
      "cliente"
    );
    html += renderSeccionAsesorias(
      "Rechazadas/Canceladas",
      [...agrupadas.rechazadas, ...agrupadas.canceladas],
      "cliente"
    );
  }

  container.innerHTML = html;
}

// Agrupar asesorías por estado
function agruparAsesoriasPorEstado(asesoriasList) {
  return {
    pendientesAceptacion: asesoriasList.filter(
      (a) => a.estado === "pendiente-aceptacion"
    ),
    confirmadas: asesoriasList.filter((a) => a.estado === "confirmada"),
    completadas: asesoriasList.filter((a) => a.estado === "completada"),
    canceladas: asesoriasList.filter((a) => a.estado.includes("cancelada")),
    rechazadas: asesoriasList.filter((a) => a.estado === "rechazada"),
  };
}

// Renderizar sección de asesorías
function renderSeccionAsesorias(titulo, asesoriasList, userRole) {
  if (!asesoriasList || asesoriasList.length === 0) {
    return "";
  }

  return `
    <div class="asesorias-section">
      <h2 class="section-title">
        <i class="fas fa-calendar-alt"></i>
        ${titulo} (${asesoriasList.length})
      </h2>
      ${asesoriasList
        .map((asesoria) => renderAsesoriaCard(asesoria, userRole))
        .join("")}
    </div>
  `;
}

// Renderizar tarjeta de asesoría
function renderAsesoriaCard(asesoria, userRole) {
  const fechaObj = new Date(asesoria.fechaHoraInicio);
  const fecha = fechaObj.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const hora = fechaObj.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const participante =
    userRole === "experto" ? asesoria.cliente : asesoria.experto;
  const estadoClass = getEstadoClass(asesoria.estado);
  const estadoTexto = getEstadoTexto(asesoria.estado);

  return `
    <div class="asesoria-card" data-id="${asesoria._id}">
      <div class="asesoria-header">
        <h3 class="asesoria-titulo">${escapeHtml(asesoria.titulo)}</h3>
        <span class="asesoria-estado ${estadoClass}">${estadoTexto}</span>
      </div>

      <div class="asesoria-info">
        <div class="asesoria-fecha">
          <i class="fas fa-calendar-alt"></i>
          <span>${fecha}</span>
        </div>
        <div class="asesoria-hora">
          <i class="fas fa-clock"></i>
          <span>${hora} (${asesoria.duracionMinutos} min)</span>
        </div>
        <div class="asesoria-participante">
          <img src="${getAvatarUrl(
            participante
          )}" alt="Avatar" class="participante-avatar">
          <div class="participante-info">
            <div class="participante-nombre">${escapeHtml(
              participante.nombre
            )} ${escapeHtml(participante.apellido)}</div>
            <div class="participante-email">${escapeHtml(
              participante.email
            )}</div>
          </div>
        </div>
      </div>

      <div class="asesoria-acciones">
        ${renderAcciones(asesoria, userRole)}
      </div>

      ${
        asesoria.motivoCancelacion
          ? `
        <div class="motivo-cancelacion">
          <strong>Motivo:</strong> ${escapeHtml(asesoria.motivoCancelacion)}
        </div>
      `
          : ""
      }
    </div>
  `;
}

// Renderizar acciones según estado y rol
function renderAcciones(asesoria, userRole) {
  let acciones = [];

  // Acción común: ver detalles
  acciones.push(
    `<button class="btn btn-secondary btn-sm" onclick="verDetalles('${asesoria._id}')"><i class="fas fa-eye"></i> Ver detalles</button>`
  );

  if (userRole === "experto") {
    if (asesoria.estado === "pendiente-aceptacion") {
      acciones.push(
        `<button class="btn btn-primary btn-sm" onclick="aceptarAsesoria('${asesoria._id}')"><i class="fas fa-check"></i> Aceptar</button>`
      );
      acciones.push(
        `<button class="btn btn-danger btn-sm" onclick="rechazarAsesoria('${asesoria._id}')"><i class="fas fa-times"></i> Rechazar</button>`
      );
    } else if (asesoria.estado === "confirmada") {
      acciones.push(
        `<button class="btn btn-warning btn-sm" onclick="cancelarAsesoriaPorExperto('${asesoria._id}')"><i class="fas fa-ban"></i> Cancelar</button>`
      );
    }
  } else {
    // Cliente
    if (asesoria.estado === "confirmada") {
      acciones.push(
        `<button class="btn btn-primary btn-sm" onclick="finalizarAsesoria('${asesoria._id}')"><i class="fas fa-check-circle"></i> Finalizar</button>`
      );
      acciones.push(
        `<button class="btn btn-warning btn-sm" onclick="cancelarAsesoriaPorCliente('${asesoria._id}')"><i class="fas fa-ban"></i> Cancelar</button>`
      );
    }
  }

  return acciones.join(" ");
}

// Funciones de acción para asesorías
window.aceptarAsesoria = async function (asesoriaId) {
  if (!confirm("¿Estás seguro de que quieres aceptar esta asesoría?")) return;

  try {
    showLoadingButton(`button[onclick="aceptarAsesoria('${asesoriaId}')"]`);

    const response = await fetchProtegido(
      `/api/asesorias/${asesoriaId}/aceptar`,
      {
        method: "PUT",
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      showToast("Asesoría aceptada exitosamente", "success");
      await cargarAsesorias();
    } else {
      throw new Error(data.mensaje || "Error al aceptar asesoría");
    }
  } catch (error) {
    console.error("Error:", error);
    showToast(error.message, "error");
  }
};

window.rechazarAsesoria = async function (asesoriaId) {
  const motivo = prompt("Ingresa el motivo del rechazo (opcional):");
  if (motivo === null) return; // Usuario canceló

  try {
    showLoadingButton(`button[onclick="rechazarAsesoria('${asesoriaId}')"]`);

    const response = await fetchProtegido(
      `/api/asesorias/${asesoriaId}/rechazar`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim() }),
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      showToast(
        "Asesoría rechazada. Se procesó el reembolso al cliente.",
        "success"
      );
      await cargarAsesorias();
    } else {
      throw new Error(data.mensaje || "Error al rechazar asesoría");
    }
  } catch (error) {
    console.error("Error:", error);
    showToast(error.message, "error");
  }
};

window.cancelarAsesoriaPorCliente = async function (asesoriaId) {
  if (
    !confirm(
      "Al cancelar recibirás el 80% del pago de vuelta y el experto recibirá el 20% como compensación. ¿Continuar?"
    )
  )
    return;

  const motivo = prompt("Ingresa el motivo de la cancelación (opcional):");
  if (motivo === null) return;

  try {
    showLoadingButton(
      `button[onclick="cancelarAsesoriaPorCliente('${asesoriaId}')"]`
    );

    const response = await fetchProtegido(
      `/api/asesorias/${asesoriaId}/cancelar-cliente`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim() }),
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      showToast(
        "Asesoría cancelada. Se procesó el reembolso parcial.",
        "success"
      );
      await cargarAsesorias();
    } else {
      throw new Error(data.mensaje || "Error al cancelar asesoría");
    }
  } catch (error) {
    console.error("Error:", error);
    showToast(error.message, "error");
  }
};

window.cancelarAsesoriaPorExperto = async function (asesoriaId) {
  if (
    !confirm(
      "Al cancelar, el cliente recibirá el reembolso completo. ¿Continuar?"
    )
  )
    return;

  const motivo = prompt("Ingresa el motivo de la cancelación (opcional):");
  if (motivo === null) return;

  try {
    showLoadingButton(
      `button[onclick="cancelarAsesoriaPorExperto('${asesoriaId}')"]`
    );

    const response = await fetchProtegido(
      `/api/asesorias/${asesoriaId}/cancelar-experto`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim() }),
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      showToast(
        "Asesoría cancelada. Se procesó el reembolso completo al cliente.",
        "success"
      );
      await cargarAsesorias();
    } else {
      throw new Error(data.mensaje || "Error al cancelar asesoría");
    }
  } catch (error) {
    console.error("Error:", error);
    showToast(error.message, "error");
  }
};

window.finalizarAsesoria = async function (asesoriaId) {
  if (
    !confirm(
      "¿Confirmas que la asesoría se completó exitosamente? El pago será liberado al experto."
    )
  )
    return;

  try {
    showLoadingButton(`button[onclick="finalizarAsesoria('${asesoriaId}')"]`);

    const response = await fetchProtegido(
      `/api/asesorias/${asesoriaId}/finalizar`,
      {
        method: "PUT",
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      showToast(
        "Asesoría finalizada. El pago fue liberado al experto.",
        "success"
      );
      await cargarAsesorias();
    } else {
      throw new Error(data.mensaje || "Error al finalizar asesoría");
    }
  } catch (error) {
    console.error("Error:", error);
    showToast(error.message, "error");
  }
};

window.verDetalles = function (asesoriaId) {
  const asesoria = asesorias.find((a) => a._id === asesoriaId);
  if (!asesoria) return;

  const fechaObj = new Date(asesoria.fechaHoraInicio);
  const fechaCompleta = fechaObj.toLocaleString("es-CO");

  const contenido = `
    <div class="detalle-asesoria">
      <h4>${escapeHtml(asesoria.titulo)}</h4>
      <div class="detalle-item">
        <strong>Estado:</strong>
        <span>${getEstadoTexto(asesoria.estado)}</span>
      </div>
      <div class="detalle-item">
        <strong>Fecha y hora:</strong>
        <span>${fechaCompleta}</span>
      </div>
      <div class="detalle-item">
        <strong>Duración:</strong>
        <span>${asesoria.duracionMinutos} minutos</span>
      </div>
      <div class="detalle-item">
        <strong>Cliente:</strong>
        <span>${escapeHtml(asesoria.cliente.nombre)} ${escapeHtml(
    asesoria.cliente.apellido
  )}<br>${escapeHtml(asesoria.cliente.email)}</span>
      </div>
      <div class="detalle-item">
        <strong>Experto:</strong>
        <span>${escapeHtml(asesoria.experto.nombre)} ${escapeHtml(
    asesoria.experto.apellido
  )}<br>${escapeHtml(asesoria.experto.email)}</span>
      </div>
      ${
        asesoria.motivoCancelacion
          ? `
        <div class="detalle-item">
          <strong>Motivo de cancelación:</strong>
          <span>${escapeHtml(asesoria.motivoCancelacion)}</span>
        </div>
      `
          : ""
      }
      <div class="detalle-item">
        <strong>Código:</strong>
        <span>${escapeHtml(asesoria.codigoAsesoria)}</span>
      </div>
    </div>
  `;

  document.getElementById("detalleContenido").innerHTML = contenido;
  document.getElementById("detalleModal").style.display = "flex";
};

// Configurar event listeners para modales
function setupModalEventListeners() {
  // Cerrar modales al hacer clic fuera
  window.addEventListener("click", function (e) {
    if (e.target.classList.contains("modal")) {
      e.target.style.display = "none";
    }
  });
}

// Funciones auxiliares
function getAvatarUrl(participante) {
  return (
    participante.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      participante.nombre || "Usuario"
    )}&background=3a8eff&color=fff`
  );
}

function getEstadoClass(estado) {
  const clases = {
    "pendiente-aceptacion": "pendiente",
    confirmada: "confirmada",
    completada: "completada",
    "cancelada-cliente": "cancelada",
    "cancelada-experto": "cancelada",
    rechazada: "rechazada",
  };
  return clases[estado] || "pendiente";
}

function getEstadoTexto(estado) {
  const textos = {
    "pendiente-aceptacion": "Pendiente de aceptación",
    confirmada: "Confirmada",
    completada: "Completada",
    "cancelada-cliente": "Cancelada por cliente",
    "cancelada-experto": "Cancelada por experto",
    rechazada: "Rechazada",
  };
  return textos[estado] || estado;
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showLoading(container) {
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Cargando asesorías...</p>
    </div>
  `;
}

function showError(container, mensaje) {
  container.innerHTML = `
    <div class="error-state">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Error</h3>
      <p>${mensaje}</p>
      <button class="btn btn-primary" onclick="window.location.reload()">Reintentar</button>
    </div>
  `;
}

function showLoadingButton(selector) {
  const btn = document.querySelector(selector);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
  }
}

function showToast(mensaje, tipo = "info") {
  // Crear toast notification
  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.innerHTML = `
    <div class="toast-content">
      <span>${mensaje}</span>
      <button class="toast-close">&times;</button>
    </div>
  `;

  document.body.appendChild(toast);

  // Mostrar toast
  setTimeout(() => toast.classList.add("show"), 100);

  // Auto-remover después de 5 segundos
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 5000);

  // Botón para cerrar manualmente
  toast.querySelector(".toast-close").onclick = () => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  };
}

// Fetch protegido reutilizable
async function fetchProtegido(url, options = {}) {
  const user = JSON.parse(
    sessionStorage.getItem("user") || localStorage.getItem("user") || "null"
  );
  const headers = options.headers || {};

  if (user && user.token) {
    headers["Authorization"] = "Bearer " + user.token;
  }

  return fetch(url, { ...options, headers });
}

// Funciones para modales (compatibilidad con EJS existente)
window.cerrarMensajes = function () {
  document.getElementById("mensajeModal").style.display = "none";
};

window.cerrarDetalles = function () {
  document.getElementById("detalleModal").style.display = "none";
};

window.abrirMensajes = function (asesoriaId, expertoNombre) {
  document.getElementById("expertoNombre").textContent = expertoNombre || "";
  document.getElementById("mensajeModal").style.display = "flex";
};
