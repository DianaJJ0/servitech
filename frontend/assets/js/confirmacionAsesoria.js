/**
 * Confirmación de Asesoría - ServiTech 
 * Maneja la confirmación de asesorías y verificación de estados de pago
 */

document.addEventListener("DOMContentLoaded", function () {
  inicializarConfirmacion();
});

// Variables globales
let status = "unknown";
let pageData = {};
let verificacionInterval = null;
let intentosVerificacion = 0;
const MAX_INTENTOS = 8;

/**
 * Inicializa la página de confirmación
 */
function inicializarConfirmacion() {
  try {
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
    mostrarNotificacion("Error al cargar la página", "error");
  }
}

/**
 * Obtiene los datos de la página desde el DOM
 */
function obtenerDatosPagina() {
  try {
    const statusScript = document.getElementById("pageStatus");
    if (statusScript) {
      status = JSON.parse(statusScript.textContent);
    }

    const dataScript = document.getElementById("pageData");
    if (dataScript) {
      pageData = JSON.parse(dataScript.textContent);
    }
  } catch (error) {
    console.error("Error leyendo datos de la página:", error);
    status = "error";
    pageData = {};
  }
}

/**
 * Maneja el estado de confirmación según el tipo
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
    default:
      manejarError();
      break;
  }
}

/**
 * Maneja el estado de éxito
 */
function manejarExito() {
  console.log("Asesoría confirmada exitosamente");

  // Mostrar notificación de éxito
  setTimeout(() => {
    mostrarNotificacion("¡Asesoría agendada correctamente!", "success");
  }, 1000);

  // Información adicional
  setTimeout(() => {
    mostrarNotificacion("Revisa tu correo para más detalles", "info");
  }, 3500);

  // Registrar evento exitoso
  registrarEvento("asesoria_confirmada", {
    status: "success",
    pagoId: pageData.pagoId,
  });
}

/**
 * Maneja el estado pendiente
 */
function manejarPendiente() {
  console.log("Pago en estado pendiente, iniciando verificación...");

  // Iniciar verificación periódica del estado
  if (pageData.pagoId) {
    iniciarVerificacionEstado();
  }

  // Mostrar notificación informativa
  setTimeout(() => {
    mostrarNotificacion("Verificando estado del pago...", "info");
  }, 1000);

  // Auto-refresh después de 3 minutos si no hay cambios
  setTimeout(() => {
    if (verificacionInterval) {
      console.log("Recargando página automáticamente");
      window.location.reload();
    }
  }, 3 * 60 * 1000);

  // Registrar evento pendiente
  registrarEvento("pago_pendiente", {
    status: "pending",
    pagoId: pageData.pagoId,
  });
}

/**
 * Maneja errores o fallos
 */
function manejarError() {
  console.log("Error en la confirmación de asesoría");

  // Mostrar notificación de error
  setTimeout(() => {
    mostrarNotificacion(
      "Ocurrió un problema. Puedes intentar nuevamente.",
      "error"
    );
  }, 1000);

  // Limpiar datos temporales
  limpiarDatosTemporales();

  // Registrar evento de error
  registrarEvento("error_confirmacion", {
    status: "error",
    originalStatus: status,
  });
}

/**
 * Inicia la verificación periódica del estado del pago
 */
function iniciarVerificacionEstado() {
  if (!pageData.pagoId) {
    console.warn("No hay ID de pago para verificar");
    return;
  }

  // Verificar inmediatamente
  verificarEstadoPago();

  // Configurar verificación cada 20 segundos
  verificacionInterval = setInterval(() => {
    if (intentosVerificacion >= MAX_INTENTOS) {
      console.log("Máximo de intentos alcanzado, deteniendo verificación");
      clearInterval(verificacionInterval);
      verificacionInterval = null;
      mostrarNotificacion(
        "Verificación finalizada. Puedes actualizar manualmente.",
        "info"
      );
      return;
    }

    verificarEstadoPago();
  }, 20000);
}

/**
 * Verifica el estado del pago con el backend
 */
async function verificarEstadoPago() {
  try {
    intentosVerificacion++;
    console.log(
      `Verificando estado del pago (intento ${intentosVerificacion}/${MAX_INTENTOS})`
    );

    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("No hay token de autenticación");
      return;
    }

    const pagoId = pageData.pagoId;
    if (!pagoId) {
      console.warn("No hay ID de pago para verificar");
      return;
    }

    const response = await fetch(`/api/pagos/${pagoId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.warn("Token expirado o inválido");
        return;
      }
      throw new Error(`Error ${response.status} al verificar pago`);
    }

    const pago = await response.json();
    console.log("Estado del pago verificado:", pago.estado);

    // Manejar cambios de estado
    if (pago.estado === "retenido" && status === "pending") {
      // El pago fue aprobado
      mostrarNotificacion("¡Pago confirmado! Redirigiendo...", "success");

      // Detener verificación
      if (verificacionInterval) {
        clearInterval(verificacionInterval);
        verificacionInterval = null;
      }

      setTimeout(() => {
        window.location.href =
          window.location.pathname + "?status=success&pagoId=" + pagoId;
      }, 2000);
    } else if (pago.estado === "fallido" && status === "pending") {
      // El pago falló
      mostrarNotificacion("El pago no pudo ser procesado", "error");

      // Detener verificación
      if (verificacionInterval) {
        clearInterval(verificacionInterval);
        verificacionInterval = null;
      }

      setTimeout(() => {
        window.location.href =
          window.location.pathname + "?status=failure&pagoId=" + pagoId;
      }, 2000);
    }
  } catch (error) {
    console.error("Error verificando estado del pago:", error);

    // Solo mostrar error en el primer intento
    if (intentosVerificacion === 1) {
      mostrarNotificacion(
        "Error verificando el estado. Reintentando...",
        "warning"
      );
    }
  }
}

/**
 * Función para verificar estado manualmente (botón)
 */
function verificarEstadoPago() {
  if (verificacionInterval) {
    clearInterval(verificacionInterval);
    verificacionInterval = null;
  }

  intentosVerificacion = 0;
  mostrarNotificacion("Verificando estado...", "info");

  // Reiniciar verificación
  iniciarVerificacionEstado();
}

/**
 * Configura el estado de conexión
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
        '<i class="fas fa-wifi"></i> <span>Sin conexión</span>';
      estadoElement.style.display = "block";
    }
  }

  // Estado inicial
  actualizarEstadoConexion();

  // Escuchar cambios de conexión
  window.addEventListener("online", () => {
    actualizarEstadoConexion();
    if (status === "pending" && !verificacionInterval) {
      iniciarVerificacionEstado();
    }
  });

  window.addEventListener("offline", actualizarEstadoConexion);
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
  ];

  keysToClean.forEach((key) => {
    try {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`Limpiado del localStorage: ${key}`);
      }
    } catch (e) {
      console.warn(`Error limpiando ${key}:`, e);
    }
  });
}

/**
 * Muestra notificaciones
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
    error: "fas fa-exclamation-circle",
    warning: "fas fa-exclamation-triangle",
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
    `;

  notificacion.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <i class="${iconos[tipo]}" style="font-size: 1.2rem;"></i>
            <span style="flex: 1;">${mensaje}</span>
            <button onclick="this.parentElement.parentElement.remove()"
                    style="background: none; border: none; color: inherit; cursor: pointer; font-size: 1.1rem; opacity: 0.7;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

  container.appendChild(notificacion);

  // Animar entrada
  setTimeout(() => {
    notificacion.style.transform = "translateX(0)";
  }, 100);

  // Auto-remover
  const timeout = tipo === "error" ? 8000 : tipo === "warning" ? 6000 : 5000;
  setTimeout(() => {
    if (notificacion.parentNode) {
      notificacion.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (notificacion.parentNode) {
          notificacion.remove();
        }
      }, 300);
    }
  }, timeout);
}

/**
 * Registra eventos para analytics
 */
function registrarEvento(evento, datos = {}) {
  try {
    console.log(`Evento registrado: ${evento}`, datos);

    // Google Analytics si está disponible
    if (typeof gtag !== "undefined") {
      gtag("event", evento, {
        event_category: "asesorias",
        event_label: status,
        custom_parameter: JSON.stringify(datos),
      });
    }

    // Envío al backend para analytics propios
    if (navigator.sendBeacon && pageData.hasUser) {
      const eventData = {
        evento,
        datos,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      navigator.sendBeacon("/api/analytics/evento", JSON.stringify(eventData));
    }
  } catch (error) {
    console.warn("Error registrando evento:", error);
  }
}

/**
 * Función de limpieza al salir de la página
 */
window.addEventListener("beforeunload", function () {
  // Limpiar interval si existe
  if (verificacionInterval) {
    clearInterval(verificacionInterval);
    verificacionInterval = null;
  }

  // Registrar evento de salida si corresponde
  if (status === "success") {
    registrarEvento("pagina_confirmacion_salida", { status });
  }
});

// Hacer funciones disponibles globalmente
window.verificarEstadoPago = verificarEstadoPago;
window.confirmarcionDebug = {
  verificarEstadoPago,
  limpiarDatosTemporales,
  mostrarNotificacion,
  status,
  pageData,
};

console.log("Script confirmacionAsesoria.js cargado");
