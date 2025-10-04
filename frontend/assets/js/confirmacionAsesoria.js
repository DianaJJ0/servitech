/**
 * CONFIRMACIÓN DE ASESORÍA CON PAGOS SIMULADOS - SERVITECH
 * Maneja la confirmación de asesorías con sistema de pagos simulados
 * @description Sistema simplificado sin verificación de MercadoPago
 */

document.addEventListener("DOMContentLoaded", function () {
  console.log("Inicializando confirmación de asesoría...");
  inicializarConfirmacion();
});

// Variables globales
let status = "unknown";
let pageData = {};

/**
 * Inicializa la página de confirmación
 * @description Configura la página según el estado del pago/asesoría
 */
function inicializarConfirmacion() {
  try {
    console.log("=== INICIALIZANDO CONFIRMACIÓN ===");

    // Obtener datos de la página
    obtenerDatosPagina();

    // Configurar conexión
    configurarEstadoConexion();

    // Manejar estado específico
    manejarEstadoConfirmacion();

    // Limpiar datos temporales si es éxito
    if (status === "success") {
      limpiarDatosTemporales();
    }

    console.log("Confirmación inicializada:", { status, pageData });
  } catch (error) {
    console.error("Error inicializando confirmación:", error);
    mostrarNotificacion("Error al cargar la página de confirmación", "error");
  }
}

/**
 * Obtiene los datos de la página desde el DOM
 * @description Lee los datos JSON embebidos desde el servidor
 */
function obtenerDatosPagina() {
  try {
    // Obtener estado desde script embebido
    const statusScript = document.getElementById("pageStatus");
    if (statusScript) {
      status = JSON.parse(statusScript.textContent);
      console.log("Estado obtenido:", status);
    }

    // Obtener datos adicionales
    const dataScript = document.getElementById("pageData");
    if (dataScript) {
      pageData = JSON.parse(dataScript.textContent);
      console.log("Datos de página obtenidos:", pageData);
    }

    // También revisar parámetros URL como fallback
    const urlParams = new URLSearchParams(window.location.search);
    const urlStatus = urlParams.get("status");

    if (urlStatus && !status) {
      status = urlStatus;
      console.log("Estado obtenido desde URL:", status);
    }

    // Obtener IDs desde URL si no están en pageData
    if (!pageData.pagoId && urlParams.get("pagoId")) {
      pageData.pagoId = urlParams.get("pagoId");
    }

    if (!pageData.asesoriaId && urlParams.get("asesoriaId")) {
      pageData.asesoriaId = urlParams.get("asesoriaId");
    }
  } catch (error) {
    console.error("Error leyendo datos de la página:", error);
    status = "error";
    pageData = {};
  }
}

/**
 * Maneja el estado de confirmación según el tipo
 * @description Ejecuta acciones específicas según el estado
 */
function manejarEstadoConfirmacion() {
  console.log("Manejando estado de confirmación:", status);

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
 * Maneja el estado de éxito
 * @description Muestra mensajes de éxito y limpia datos temporales
 */
function manejarExito() {
  console.log("Asesoría confirmada exitosamente");

  // Mostrar notificación de éxito
  setTimeout(() => {
    mostrarNotificacion("¡Asesoría agendada correctamente!", "success");
  }, 1000);

  // Información adicional
  setTimeout(() => {
    mostrarNotificacion(
      "El experto revisará tu solicitud en las próximas 24 horas",
      "info"
    );
  }, 3500);

  // Registrar evento exitoso
  registrarEvento("asesoria_confirmada", {
    status: "success",
    pagoId: pageData.pagoId,
    asesoriaId: pageData.asesoriaId,
    simulado: true,
  });

  // Limpiar datos temporales después de un momento
  setTimeout(() => {
    limpiarDatosTemporales();
  }, 2000);
}

/**
 * Maneja el estado pendiente (para casos especiales)
 * @description En el sistema simulado, esto sería raro pero manejamos el caso
 */
function manejarPendiente() {
  console.log("Estado pendiente detectado");

  // En el sistema simulado, esto no debería ocurrir frecuentemente
  // pero lo manejamos por compatibilidad
  setTimeout(() => {
    mostrarNotificacion("Procesando tu solicitud...", "info");
  }, 1000);

  // Registrar evento pendiente
  registrarEvento("estado_pendiente", {
    status: "pending",
    pagoId: pageData.pagoId,
    simulado: true,
  });

  // Auto-refresh después de 30 segundos para casos pendientes
  setTimeout(() => {
    console.log("Auto-refresh por estado pendiente");
    window.location.reload();
  }, 30000);
}

/**
 * Maneja errores o fallos
 * @description Muestra mensajes de error y limpia datos
 */
function manejarError() {
  console.log("Error en la confirmación de asesoría");

  // Mostrar notificación de error
  setTimeout(() => {
    mostrarNotificacion(
      "Ocurrió un problema al procesar tu solicitud",
      "error"
    );
  }, 1000);

  // Limpiar datos temporales
  limpiarDatosTemporales();

  // Registrar evento de error
  registrarEvento("error_confirmacion", {
    status: "error",
    originalStatus: status,
    pagoId: pageData.pagoId,
  });
}

/**
 * Maneja estados desconocidos
 * @description Fallback para estados no reconocidos
 */
function manejarEstadoDesconocido() {
  console.warn("Estado desconocido:", status);

  mostrarNotificacion(
    "Estado no reconocido. Contacta a soporte si persiste el problema.",
    "warning"
  );

  registrarEvento("estado_desconocido", {
    status: status,
    pageData: pageData,
  });
}

/**
 * Configura el estado de conexión
 * @description Monitorea y muestra el estado de conectividad
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

  // Estado inicial
  actualizarEstadoConexion();

  // Escuchar cambios de conexión
  window.addEventListener("online", () => {
    actualizarEstadoConexion();
    mostrarNotificacion("Conexión restaurada", "success");
  });

  window.addEventListener("offline", () => {
    actualizarEstadoConexion();
    mostrarNotificacion("Conexión perdida", "warning");
  });
}

/**
 * Limpia datos temporales del localStorage
 * @description Elimina datos de procesos completados
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

  let limpiados = 0;

  keysToClean.forEach((key) => {
    try {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        limpiados++;
        console.log(`Limpiado del localStorage: ${key}`);
      }
    } catch (e) {
      console.warn(`Error limpiando ${key}:`, e);
    }
  });

  if (limpiados > 0) {
    console.log(`Se limpiaron ${limpiados} elementos del localStorage`);
  }
}

/**
 * Función para verificar estado (para compatibilidad con template)
 * @description Función de compatibilidad que no hace verificación real en sistema simulado
 */
function verificarEstadoPago() {
  console.log("Verificación de estado solicitada (sistema simulado)");

  if (pageData.pagoId) {
    mostrarNotificacion(
      "En el sistema simulado, los pagos se procesan instantáneamente",
      "info"
    );

    // Simular verificación con pequeña pausa
    setTimeout(() => {
      mostrarNotificacion(
        "Estado verificado: pago procesado correctamente",
        "success"
      );
    }, 1500);
  } else {
    mostrarNotificacion("No hay ID de pago para verificar", "warning");
  }
}

/**
 * Muestra notificaciones mejoradas
 * @param {string} mensaje - Mensaje a mostrar
 * @param {string} tipo - Tipo de notificación (success, error, warning, info)
 */
function mostrarNotificacion(mensaje, tipo = "info") {
  // Crear contenedor si no existe
  let container = document.querySelector(".notification-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "notification-container";
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
    `;
    document.body.appendChild(container);
  }

  const notificacion = document.createElement("div");
  notificacion.className = `notification notification-${tipo}`;

  const iconos = {
    success: "fas fa-check-circle",
    error: "fas fa-exclamation-triangle",
    warning: "fas fa-exclamation-circle",
    info: "fas fa-info-circle",
  };

  const colores = {
    success: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
    error: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
    warning: "linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)",
    info: "linear-gradient(135deg, #007bff 0%, #6f42c1 100%)",
  };

  notificacion.style.cssText = `
    background: ${colores[tipo] || colores.info};
    color: ${tipo === "warning" ? "#000" : "#fff"};
    padding: 16px 20px;
    border-radius: 12px;
    margin-bottom: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    backdrop-filter: blur(10px);
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 14px;
    line-height: 1.4;
    border: 1px solid rgba(255,255,255,0.2);
    animation: slideInRight 0.3s ease-out forwards;
  `;

  notificacion.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <i class="${iconos[tipo]}" style="font-size: 1.2rem;"></i>
      <span style="flex: 1;">${mensaje}</span>
      <button onclick="this.parentElement.parentElement.remove()"
              style="background: none; border: none; color: inherit; cursor: pointer; font-size: 1.1rem; opacity: 0.7; transition: opacity 0.2s;">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;

  container.appendChild(notificacion);

  // Auto-remover según el tipo
  const tiempos = {
    success: 5000,
    info: 4000,
    warning: 7000,
    error: 8000,
  };

  setTimeout(() => {
    if (notificacion.parentNode) {
      notificacion.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (notificacion.parentNode) {
          notificacion.remove();
        }
      }, 300);
    }
  }, tiempos[tipo] || 5000);
}

/**
 * Registra eventos para analytics
 * @param {string} evento - Nombre del evento
 * @param {Object} datos - Datos adicionales del evento
 */
function registrarEvento(evento, datos = {}) {
  try {
    console.log(`Evento registrado: ${evento}`, datos);

    // Google Analytics si está disponible
    if (typeof gtag !== "undefined") {
      gtag("event", evento, {
        event_category: "asesorias_simuladas",
        event_label: status,
        custom_parameter: JSON.stringify(datos),
      });
    }

    // Envío al backend para analytics propios (si el beacon está disponible)
    if (navigator.sendBeacon && pageData.hasUser) {
      const eventData = {
        evento,
        datos: {
          ...datos,
          simulado: true,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        },
      };

      const success = navigator.sendBeacon(
        "/api/analytics/evento",
        JSON.stringify(eventData)
      );

      if (!success) {
        console.warn("No se pudo enviar evento al backend");
      }
    }
  } catch (error) {
    console.warn("Error registrando evento:", error);
  }
}

/**
 * Función de navegación segura
 * @param {string} url - URL a la que navegar
 */
function navegarA(url) {
  try {
    window.location.href = url;
  } catch (error) {
    console.error("Error navegando a:", url, error);
    mostrarNotificacion(
      "Error al navegar. Intenta refrescar la página.",
      "error"
    );
  }
}

/**
 * Función de limpieza al salir de la página
 */
window.addEventListener("beforeunload", function () {
  // Registrar evento de salida si corresponde
  if (status === "success") {
    registrarEvento("pagina_confirmacion_salida", {
      status,
      tiempoEnPagina: Date.now() - performance.timing.navigationStart,
    });
  }
});

/**
 * Manejo de errores globales
 */
window.addEventListener("error", function (event) {
  console.error("Error global capturado:", event.error);
  registrarEvento("error_javascript", {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

// Agregar estilos para las animaciones
const style = document.createElement("style");
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);

// Hacer funciones disponibles globalmente para compatibilidad
window.verificarEstadoPago = verificarEstadoPago;
window.navegarA = navegarA;
window.confirmacionDebug = {
  verificarEstadoPago,
  limpiarDatosTemporales,
  mostrarNotificacion,
  registrarEvento,
  status,
  pageData,
};

console.log("Script confirmacionAsesoria.js cargado correctamente");
