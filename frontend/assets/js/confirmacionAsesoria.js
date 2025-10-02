/**
 * Confirmación de Asesoría - ServiTech
 * Versión simplificada para el sistema actual
 */

document.addEventListener("DOMContentLoaded", function () {
  // Obtener datos del DOM
  let status = "unknown";

  try {
    const statusScript = document.getElementById("pageStatus");
    if (statusScript) {
      status = JSON.parse(statusScript.textContent);
    }
  } catch (error) {
    console.error("Error leyendo estado de la página:", error);
  }

  console.log("Estado de confirmación:", status);

  // Inicializar según el estado
  inicializarConfirmacion(status);

  /**
   * Inicializa la página según el estado
   */
  function inicializarConfirmacion(estado) {
    switch (estado) {
      case "success":
        manejarExito();
        break;
      case "pending":
        manejarPendiente();
        break;
      case "failure":
      default:
        manejarError();
        break;
    }
  }

  /**
   * Maneja el estado de éxito
   */
  function manejarExito() {
    console.log("Asesoría agendada exitosamente");

    // Animación de entrada
    aplicarAnimacionEntrada();

    // Mostrar notificación de éxito
    setTimeout(() => {
      mostrarNotificacion("¡Asesoría agendada exitosamente!", "success");
    }, 1000);

    // Simular envío de email de confirmación
    setTimeout(() => {
      mostrarNotificacion("Email de confirmación enviado", "info");
    }, 3000);

    // Limpiar datos temporales si existen
    limpiarDatosTemporales();
  }

  /**
   * Maneja el estado pendiente
   */
  function manejarPendiente() {
    console.log("Pago en proceso...");

    // Auto-refresh cada 30 segundos para estado pendiente
    setTimeout(function () {
      console.log("Recargando página para verificar estado...");
      window.location.reload();
    }, 30000);

    // Mostrar indicador de carga
    mostrarIndicadorCarga();
  }

  /**
   * Maneja errores o fallos
   */
  function manejarError() {
    console.log("Error en el proceso de asesoría");

    // Aplicar animación de entrada
    aplicarAnimacionEntrada();

    // Mostrar notificación de error
    setTimeout(() => {
      mostrarNotificacion(
        "Ocurrió un problema. Puedes intentar nuevamente.",
        "error"
      );
    }, 1000);

    // Limpiar datos temporales
    limpiarDatosTemporales();
  }

  /**
   * Aplica animaciones de entrada a la tarjeta
   */
  function aplicarAnimacionEntrada() {
    const card = document.querySelector(".confirmacion-card");
    if (card) {
      card.style.opacity = "0";
      card.style.transform = "translateY(20px)";

      setTimeout(function () {
        card.style.transition = "all 0.6s ease";
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      }, 100);
    }
  }

  /**
   * Muestra indicador de carga para estado pendiente
   */
  function mostrarIndicadorCarga() {
    const spinner = document.querySelector(".spinner");
    if (spinner) {
      spinner.style.display = "block";
    }
  }

  /**
   * Limpia datos temporales del localStorage
   */
  function limpiarDatosTemporales() {
    // Limpiar datos antiguos que pudieran estar en localStorage
    const keysToClean = [
      "pagoCompleto",
      "asesoriaTemp",
      "expertoSeleccionado",
      "fechaSeleccionada",
      "horaSeleccionada",
    ];

    keysToClean.forEach((key) => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Muestra notificaciones al usuario
   */
  function mostrarNotificacion(mensaje, tipo = "info") {
    // Verificar si ya existe un contenedor de notificaciones
    let container = document.querySelector(".notification-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "notification-container";
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
      `;
      document.body.appendChild(container);
    }

    const notificacion = document.createElement("div");
    notificacion.className = `notification notification-${tipo}`;
    notificacion.style.cssText = `
      background: ${
        tipo === "success"
          ? "#28a745"
          : tipo === "error"
          ? "#dc3545"
          : "#007bff"
      };
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      margin-bottom: 10px;
      max-width: 350px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateX(400px);
      transition: transform 0.3s ease;
      font-size: 14px;
      line-height: 1.4;
    `;

    const icono = tipo === "success" ? "✓" : tipo === "error" ? "✗" : "i";
    notificacion.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-weight: bold; font-size: 16px;">${icono}</span>
        <span>${mensaje}</span>
      </div>
    `;

    container.appendChild(notificacion);

    // Animar entrada
    setTimeout(() => {
      notificacion.style.transform = "translateX(0)";
    }, 100);

    // Auto-remover después de 5 segundos
    setTimeout(() => {
      notificacion.style.transform = "translateX(400px)";
      setTimeout(() => {
        if (notificacion.parentNode) {
          notificacion.remove();
        }
        // Remover container si está vacío
        if (container.children.length === 0) {
          container.remove();
        }
      }, 300);
    }, 5000);

    // Permitir cerrar haciendo clic
    notificacion.addEventListener("click", () => {
      notificacion.style.transform = "translateX(400px)";
      setTimeout(() => {
        if (notificacion.parentNode) {
          notificacion.remove();
        }
      }, 300);
    });
  }

  /**
   * Obtiene parámetros de la URL si son necesarios
   */
  function obtenerParametrosURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      status: urlParams.get("status"),
      asesoriaId: urlParams.get("asesoriaId"),
      transactionId: urlParams.get("transactionId"),
    };
  }

  /**
   * Registra evento de confirmación (opcional, para analytics)
   */
  function registrarEventoConfirmacion(estado) {
    // Aquí puedes agregar lógica para analytics o tracking
    console.log(`Evento de confirmación registrado: ${estado}`);

    // Ejemplo de envío a analytics (descomenta si usas Google Analytics)
    // if (typeof gtag !== 'undefined') {
    //   gtag('event', 'asesoria_confirmacion', {
    //     'event_category': 'engagement',
    //     'event_label': estado
    //   });
    // }
  }

  // Registrar el evento de confirmación
  registrarEventoConfirmacion(status);

  // Event listeners adicionales
  setupEventListeners();

  /**
   * Configura event listeners adicionales
   */
  function setupEventListeners() {
    // Botón de actualizar estado (para estado pendiente)
    const btnActualizar = document.querySelector('button[onclick*="reload"]');
    if (btnActualizar) {
      btnActualizar.addEventListener("click", function (e) {
        e.preventDefault();
        mostrarNotificacion("Actualizando estado...", "info");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      });
    }

    // Enlaces de navegación - agregar confirmación para algunos
    const enlaces = document.querySelectorAll(
      'a[href*="expertos"], a[href*="contacto"]'
    );
    enlaces.forEach((enlace) => {
      enlace.addEventListener("click", function (e) {
        // Solo para enlaces externos o de salida
        if (enlace.href.includes("expertos") && status === "success") {
          const confirmar = confirm(
            "¿Estás seguro de salir? Tu asesoría ya está agendada y recibirás confirmación por email."
          );
          if (!confirmar) {
            e.preventDefault();
          }
        }
      });
    });
  }

  // Log final para debugging
  console.log("Confirmación de asesoría inicializada correctamente");
});
