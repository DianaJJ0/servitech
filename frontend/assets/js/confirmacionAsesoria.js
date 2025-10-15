/**
 * CONFIRMACIÓN DE ASESORÍA CON PAGOS SIMULADOS - SERVITECH
 * Maneja la confirmación de asesorías con sistema de pagos simulados y visualización de factura
 */

document.addEventListener("DOMContentLoaded", function () {
  inicializarConfirmacion();
});

let status = "unknown";
let pageData = {};
let facturaData = {};

/**
 * Inicializa la página de confirmación
 */
function inicializarConfirmacion() {
  try {
    obtenerDatosPagina();
    configurarEstadoConexion();
    manejarEstadoConfirmacion();
    if (status === "success") {
      limpiarDatosTemporales();
      mostrarFactura();
    }
    // configurar reenvío de notificaciones (botón y estado)
    configurarReenvioNotificaciones();
  } catch (error) {
    console.error("Error inicializando confirmación:", error);
    mostrarNotificacion("Error al cargar la confirmación", "error");
  }
}

/**
 * Consulta el estado de notificaciones y habilita el botón de reenvío si procede
 */
function configurarReenvioNotificaciones() {
  try {
    if (!pageData || !pageData.pagoId) return;
    const token = localStorage.getItem("token");
    fetch(`/api/pagos/${pageData.pagoId}/notificaciones`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        const btn = document.getElementById("btnReenviarNoti");
        if (!btn) return;
        // Si ya fue enviado, ocultar botón
        if (data && data.enviado) {
          btn.classList.add("hidden");
          return;
        }
        // Mostrar botón para reintentar
        btn.classList.remove("hidden");
        btn.addEventListener("click", function handleReenvio() {
          btn.disabled = true;
          const originalText = btn.textContent;
          btn.textContent = "Enviando...";
          const tokenInner = localStorage.getItem("token");
          fetch(`/api/pagos/${pageData.pagoId}/reenviar-notificaciones`, {
            method: "POST",
            headers: tokenInner
              ? {
                  Authorization: `Bearer ${tokenInner}`,
                  "Content-Type": "application/json",
                }
              : { "Content-Type": "application/json" },
          })
            .then((r) => r.json())
            .then((res) => {
              btn.textContent = "Reenviado";
              btn.classList.add("hidden");
              btn.disabled = false;
            })
            .catch((e) => {
              console.warn("Error reenviando notificaciones", e);
              btn.disabled = false;
              btn.textContent = originalText;
            });
        });
      })
      .catch((err) => console.warn("Error consultando notificaciones:", err));
  } catch (e) {
    console.warn(e);
  }
}

/**
 * Obtiene los datos de la página desde el DOM
 */
function obtenerDatosPagina() {
  // Estado de la página
  const statusScript = document.getElementById("pageStatus");
  if (statusScript) {
    status = JSON.parse(statusScript.textContent);
  }
  // Datos base
  const dataScript = document.getElementById("pageData");
  if (dataScript) {
    pageData = JSON.parse(dataScript.textContent);
  }
  // Datos de factura para EJS render
  const facturaScript = document.getElementById("facturaData");
  if (facturaScript) {
    facturaData = JSON.parse(facturaScript.textContent);
  }
}

/**
 * Maneja el estado de confirmación
 */
function manejarEstadoConfirmacion() {
  switch (status) {
    case "success":
      manejarExito();
      break;
    case "pending":
      manejarPendiente();
      break;
    case "failure":
    case "error":
      manejarError();
      break;
    default:
      manejarEstadoDesconocido();
      break;
  }
}

/**
 * Muestra notificaciones emergentes
 */
function mostrarNotificacion(mensaje, tipo = "info") {
  let container = document.querySelector(".notification-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "notification-container";
    container.style.position = "fixed";
    container.style.top = "20px";
    container.style.right = "20px";
    container.style.zIndex = "10000";
    container.style.maxWidth = "400px";
    document.body.appendChild(container);
  }
  const notificacion = document.createElement("div");
  notificacion.className = `notification notification-${tipo}`;
  notificacion.textContent = mensaje;
  container.appendChild(notificacion);
  setTimeout(() => notificacion.remove(), 5000);
}

/**
 * Estado de éxito
 */
function manejarExito() {
  setTimeout(() => {
    mostrarNotificacion("¡Asesoría agendada correctamente!", "success");
  }, 1000);
  setTimeout(() => {
    mostrarNotificacion(
      "El experto revisará tu solicitud en las próximas 24 horas",
      "info"
    );
  }, 3500);
}

/**
 * Estado pendiente
 */
function manejarPendiente() {
  setTimeout(() => {
    mostrarNotificacion("Procesando tu solicitud...", "info");
  }, 1000);
  setTimeout(() => {
    window.location.reload();
  }, 30000);
}

/**
 * Estado error
 */
function manejarError() {
  setTimeout(() => {
    mostrarNotificacion(
      "Ocurrió un problema al procesar tu solicitud",
      "error"
    );
  }, 1000);
  limpiarDatosTemporales();
}

/**
 * Estado desconocido
 */
function manejarEstadoDesconocido() {
  mostrarNotificacion(
    "Estado no reconocido. Contacta a soporte si persiste el problema.",
    "warning"
  );
}

/**
 * Limpia datos temporales del localStorage
 */
function limpiarDatosTemporales() {
  const keysToClean = [
    "asesoriaEnProceso",
    "pagoEnProceso",
    "expertoSeleccionado",
    "fechaSeleccionada",
    "horaSeleccionada",
    "preferenceId",
    "pagoCompleto",
    "asesoriaTemp",
    "simulacionId",
    "pagoId",
  ];
  keysToClean.forEach((key) => {
    try {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
      }
    } catch (e) {}
  });
}

/**
 * Muestra factura si se renderiza la página con datos
 */
function mostrarFactura() {
  // El renderizado server-side ya muestra la factura completa.
  // Solo podrías agregar lógica JS para exportar PDF aquí si lo requieres en el futuro.
}

/**
 * Conexión online/offline visual
 */
function configurarEstadoConexion() {
  const estadoElement = document.getElementById("conexionEstado");
  if (!estadoElement) return;
  function actualizarEstadoConexion() {
    if (navigator.onLine) {
      estadoElement.className = "conexion-estado online";
      estadoElement.innerHTML =
        '<i class="fas fa-wifi"></i> <span>Conectado</span>';
      estadoElement.style.display = "none";
    } else {
      estadoElement.className = "conexion-estado offline";
      estadoElement.innerHTML =
        '<i class="fas fa-wifi-slash"></i> <span>Sin conexión</span>';
      estadoElement.style.display = "block";
    }
  }
  actualizarEstadoConexion();
  window.addEventListener("online", actualizarEstadoConexion);
  window.addEventListener("offline", actualizarEstadoConexion);
}

window.confirmacionDebug = {
  status,
  pageData,
  facturaData,
};
