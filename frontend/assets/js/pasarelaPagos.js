/**
 * PASARELA DE PAGOS SIMULADOS - SERVITECH
 * Maneja el proceso completo de pago simulado y creación de asesorías
 * @description Sistema de pagos simulados sin integración externa
 */

document.addEventListener("DOMContentLoaded", function () {
  console.log("Inicializando pasarela de pagos simulados...");
  inicializarPago();
});

// Variables globales
let datosAsesoria = null;
let serverData = null;
let pagoEnProceso = false;

/**
 * Inicializa el proceso de pago
 * @description Función principal que coordina todo el flujo de pago
 */
async function inicializarPago() {
  try {
    console.log("=== INICIALIZANDO PROCESO DE PAGO ===");

    // Cargar datos del servidor y localStorage
    obtenerDatosServidor();
    obtenerDatosAsesoria();

    // Validar datos antes de continuar
    if (!validarDatos()) {
      console.log("Validación fallida, deteniendo proceso");
      return;
    }

    console.log("Validación exitosa, mostrando resumen...");
    mostrarResumen();
    mostrarBotonPago();
  } catch (error) {
    console.error("Error inicializando pago:", error);
    mostrarError("Error al inicializar el pago: " + error.message);
  }
}

/**
 * Obtiene datos del servidor desde el script embebido
 * @description Lee los datos pasados desde el backend
 */
function obtenerDatosServidor() {
  try {
    const serverScript = document.getElementById("serverData");
    if (serverScript) {
      serverData = JSON.parse(serverScript.textContent);
      console.log("Datos del servidor obtenidos:", serverData);
    } else {
      console.warn("No se encontraron datos del servidor");
      serverData = {};
    }
  } catch (error) {
    console.error("Error leyendo datos del servidor:", error);
    serverData = {};
  }
}

/**
 * Obtiene datos de la asesoría desde localStorage
 * @description Recupera los datos de la asesoría guardados en el navegador
 */
function obtenerDatosAsesoria() {
  try {
    const asesoriaData = localStorage.getItem("asesoriaEnProceso");
    console.log("Datos raw de localStorage:", asesoriaData);

    if (!asesoriaData) {
      console.log("No hay datos en localStorage, creando desde serverData");
      crearDatosDesdeServidor();
      return;
    }

    datosAsesoria = JSON.parse(asesoriaData);
    console.log("Datos de asesoría desde localStorage:", datosAsesoria);

    // Sincronizar monto con datos del servidor si es necesario
    if (serverData && serverData.monto) {
      datosAsesoria.precio = serverData.monto;
    }

    console.log("Datos finales de asesoría:", datosAsesoria);
  } catch (error) {
    console.error("Error obteniendo datos de asesoría:", error);
    console.log("Intentando crear datos desde serverData...");
    crearDatosDesdeServidor();
  }
}

/**
 * Crea datos de asesoría desde los datos del servidor como fallback
 * @description Genera datos básicos cuando no hay información en localStorage
 */
function crearDatosDesdeServidor() {
  if (!serverData || !serverData.expertoSeleccionado) {
    mostrarError(
      "No se encontraron datos de la asesoría. Por favor, regresa al calendario."
    );
    setTimeout(() => {
      window.location.href = "/expertos.html";
    }, 3000);
    return;
  }

  datosAsesoria = {
    titulo: "Asesoría técnica especializada",
    descripcion:
      "Asesoría técnica con experto especializado en tu área de interés",
    experto: {
      email:
        serverData.expertoSeleccionado.id ||
        serverData.expertoSeleccionado.email,
      nombre: serverData.expertoSeleccionado.nombre,
      apellido: serverData.expertoSeleccionado.apellido,
      avatarUrl: null,
    },
    fechaHoraInicio: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    duracionMinutos: (serverData.duracion || 1) * 60,
    categoria: "Tecnologia",
    precio: serverData.monto || 20000,
  };

  console.log("Datos creados desde servidor:", datosAsesoria);
}

/**
 * Valida los datos básicos de la asesoría
 * @description Verifica que todos los datos necesarios estén presentes y sean válidos
 * @returns {boolean} True si todos los datos son válidos
 */
function validarDatos() {
  console.log("Validando datos de la asesoría...");
  console.log("Datos a validar:", datosAsesoria);

  if (!datosAsesoria) {
    console.error("datosAsesoria es null o undefined");
    mostrarAlerta("No se encontraron datos de la asesoría");
    return false;
  }

  // Validar título
  if (!datosAsesoria.titulo || datosAsesoria.titulo.length < 5) {
    console.error("Título inválido:", datosAsesoria.titulo);
    mostrarAlerta("El título de la asesoría es muy corto");
    return false;
  }

  // Validar descripción
  if (!datosAsesoria.descripcion || datosAsesoria.descripcion.length < 10) {
    console.error("Descripción inválida:", datosAsesoria.descripcion);
    mostrarAlerta("La descripción de la asesoría es muy corta");
    return false;
  }

  // Validar información del experto
  if (!datosAsesoria.experto || !datosAsesoria.experto.email) {
    console.error("Información del experto incompleta:", datosAsesoria.experto);
    mostrarAlerta("Información del experto incompleta");
    return false;
  }

  // Validar precio
  if (!datosAsesoria.precio || datosAsesoria.precio < 1000) {
    console.error("Precio inválido:", datosAsesoria.precio);
    mostrarAlerta("El monto mínimo es $1.000 COP");
    return false;
  }

  // Validar fecha
  const fechaAsesoria = new Date(datosAsesoria.fechaHoraInicio);
  const ahora = new Date();
  if (fechaAsesoria <= ahora) {
    console.error("Fecha inválida:", fechaAsesoria, "vs", ahora);
    mostrarAlerta("La fecha de la asesoría debe ser futura");
    return false;
  }

  console.log("Validación exitosa - todos los datos son correctos");
  return true;
}

/**
 * Muestra el resumen de la asesoría en la interfaz
 * @description Renderiza los datos de la asesoría en formato legible
 */
function mostrarResumen() {
  const container = document.getElementById("resumenDatos");
  if (!container || !datosAsesoria) {
    console.error("No se puede mostrar resumen - contenedor o datos faltantes");
    return;
  }

  try {
    console.log("Generando resumen con datos:", datosAsesoria);

    const fecha = new Date(datosAsesoria.fechaHoraInicio);
    const duracionTexto = calcularDuracionTexto(datosAsesoria.duracionMinutos);

    container.innerHTML = `
      <div class="summary-grid">
        <div class="summary-item">
          <div class="item-label">
            <i class="fas fa-user-tie"></i>
            Experto:
          </div>
          <div class="item-value">
            ${datosAsesoria.experto.nombre} ${datosAsesoria.experto.apellido}
          </div>
        </div>

        <div class="summary-item">
          <div class="item-label">
            <i class="fas fa-bookmark"></i>
            Tema:
          </div>
          <div class="item-value">
            ${datosAsesoria.titulo}
          </div>
        </div>

        <div class="summary-item">
          <div class="item-label">
            <i class="fas fa-calendar"></i>
            Fecha:
          </div>
          <div class="item-value">
            ${fecha.toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>

        <div class="summary-item">
          <div class="item-label">
            <i class="fas fa-clock"></i>
            Hora:
          </div>
          <div class="item-value">
            ${fecha.toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>

        <div class="summary-item">
          <div class="item-label">
            <i class="fas fa-hourglass-half"></i>
            Duración:
          </div>
          <div class="item-value">
            ${duracionTexto}
          </div>
        </div>

        <div class="summary-item">
          <div class="item-label">
            <i class="fas fa-tag"></i>
            Categoría:
          </div>
          <div class="item-value">
            ${datosAsesoria.categoria}
          </div>
        </div>

        <div class="summary-item full-width">
          <div class="item-label">
            <i class="fas fa-align-left"></i>
            Descripción:
          </div>
          <div class="item-value description">
            ${datosAsesoria.descripcion}
          </div>
        </div>

        <div class="summary-item total full-width">
          <div class="item-label">
            <i class="fas fa-dollar-sign"></i>
            Total a pagar:
          </div>
          <div class="item-value total-amount">
            $${datosAsesoria.precio.toLocaleString("es-CO")} COP
          </div>
        </div>
      </div>
    `;

    console.log("Resumen mostrado exitosamente");
  } catch (error) {
    console.error("Error mostrando resumen:", error);
    container.innerHTML =
      '<div class="error-placeholder">Error mostrando resumen de la asesoría</div>';
  }
}

/**
 * Calcula el texto de duración legible
 * @param {number} minutos - Duración en minutos
 * @returns {string} Texto legible de la duración
 */
function calcularDuracionTexto(minutos) {
  if (minutos === 60) return "1 hora";
  if (minutos === 90) return "1.5 horas";
  if (minutos === 120) return "2 horas";
  if (minutos === 180) return "3 horas";
  return `${minutos} minutos`;
}

/**
 * Muestra el botón de pago
 * @description Hace visible el botón para procesar el pago
 */
function mostrarBotonPago() {
  const container = document.getElementById("paymentContainer");
  if (container) {
    container.style.display = "block";
  }
}

/**
 * Procesa el pago simulado
 * @description Función principal que maneja todo el proceso de pago
 */
async function procesarPago() {
  if (pagoEnProceso) {
    console.log("Pago ya en proceso, ignorando click adicional");
    return;
  }

  try {
    pagoEnProceso = true;
    console.log("=== PROCESANDO PAGO SIMULADO ===");

    // Mostrar estado de carga
    mostrarEstadoCarga();

    // Verificar autenticación
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No hay sesión activa. Por favor, inicia sesión.");
    }

    console.log("Enviando datos al backend:", {
      titulo: datosAsesoria.titulo,
      descripcion: datosAsesoria.descripcion,
      expertoEmail: datosAsesoria.experto.email,
      fechaHoraInicio: datosAsesoria.fechaHoraInicio,
      duracionMinutos: datosAsesoria.duracionMinutos,
      monto: datosAsesoria.precio,
    });

    // Enviar solicitud al backend
    const response = await fetch("/api/pagos/crear-pago-simulado", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        titulo: datosAsesoria.titulo,
        descripcion: datosAsesoria.descripcion,
        expertoEmail: datosAsesoria.experto.email,
        fechaHoraInicio: datosAsesoria.fechaHoraInicio,
        duracionMinutos: datosAsesoria.duracionMinutos,
        monto: datosAsesoria.precio,
      }),
    });

    console.log("Respuesta del servidor:", response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error del servidor:", errorData);
      throw new Error(
        errorData.mensaje || `Error del servidor: ${response.status}`
      );
    }

    const result = await response.json();
    console.log("Pago procesado exitosamente:", result);

    // Simular tiempo de procesamiento para mejor UX
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Limpiar datos de localStorage
    localStorage.removeItem("asesoriaEnProceso");

    // Mostrar estado de éxito
    mostrarEstadoExito();

    // Registrar evento de conversión
    if (typeof gtag !== "undefined") {
      gtag("event", "purchase", {
        transaction_id: result.pagoId,
        value: datosAsesoria.precio,
        currency: "COP",
      });
    }
  } catch (error) {
    console.error("Error procesando pago:", error);
    mostrarError("Error al procesar el pago: " + error.message);
  } finally {
    pagoEnProceso = false;
  }
}

/**
 * Muestra el estado de carga durante el procesamiento
 * @description Cambia la interfaz para mostrar que el pago se está procesando
 */
function mostrarEstadoCarga() {
  // Ocultar elementos
  document.getElementById("paymentContainer").style.display = "none";
  document.getElementById("errorState").style.display = "none";
  document.getElementById("successState").style.display = "none";

  // Mostrar loading
  const loadingState = document.getElementById("loadingState");
  loadingState.style.display = "block";

  // Actualizar texto de carga progresivamente
  const loadingText = document.querySelector(".loading-text");
  const textos = [
    "Procesando tu solicitud...",
    "Validando datos de la asesoría...",
    "Creando tu solicitud...",
    "Notificando al experto...",
    "Finalizando proceso...",
  ];

  let indice = 0;
  const intervalo = setInterval(() => {
    if (indice < textos.length) {
      loadingText.textContent = textos[indice];
      indice++;
    } else {
      clearInterval(intervalo);
    }
  }, 800);
}

/**
 * Muestra el estado de éxito después del procesamiento
 * @description Cambia la interfaz para mostrar que el pago fue exitoso
 */
function mostrarEstadoExito() {
  // Ocultar todos los otros estados
  document.getElementById("loadingState").style.display = "none";
  document.getElementById("paymentContainer").style.display = "none";
  document.getElementById("errorState").style.display = "none";

  // Mostrar éxito
  const successState = document.getElementById("successState");
  successState.style.display = "block";

  // Animación de éxito
  successState.classList.add("animate-in");

  // Scroll hacia el mensaje de éxito
  successState.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

/**
 * Muestra estado de error
 * @param {string} mensaje - Mensaje de error a mostrar
 * @description Cambia la interfaz para mostrar un error
 */
function mostrarError(mensaje) {
  console.error("Mostrando error:", mensaje);

  // Ocultar otros estados
  document.getElementById("loadingState").style.display = "none";
  document.getElementById("paymentContainer").style.display = "none";
  document.getElementById("successState").style.display = "none";

  // Mostrar error
  const errorState = document.getElementById("errorState");
  const errorMessage = document.getElementById("errorMessage");

  if (errorState && errorMessage) {
    errorMessage.textContent = mensaje;
    errorState.style.display = "block";

    // Scroll hacia el error
    errorState.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }
}

/**
 * Reintenta el proceso de pago
 * @description Vuelve a mostrar el botón de pago para reintentar
 */
function reintentar() {
  console.log("Reintentando proceso de pago...");

  // Ocultar error
  document.getElementById("errorState").style.display = "none";

  // Mostrar botón de pago nuevamente
  mostrarBotonPago();

  // Reset flag de proceso
  pagoEnProceso = false;
}

/**
 * Muestra alerta temporal
 * @param {string} mensaje - Mensaje de alerta
 * @description Muestra una alerta que se cierra automáticamente
 */
function mostrarAlerta(mensaje) {
  const container = document.getElementById("alertContainer");
  const text = document.getElementById("alertText");

  if (container && text) {
    text.textContent = mensaje;
    container.style.display = "block";

    // Auto-cerrar después de 6 segundos
    setTimeout(() => {
      cerrarAlerta();
    }, 6000);

    // Scroll hacia la alerta
    container.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  } else {
    // Fallback a alert nativo
    alert(mensaje);
  }
}

/**
 * Cierra la alerta
 * @description Oculta la alerta actual
 */
function cerrarAlerta() {
  const container = document.getElementById("alertContainer");
  if (container) {
    container.style.display = "none";
  }
}

// Funciones globales para uso desde HTML
window.procesarPago = procesarPago;
window.reintentar = reintentar;
window.cerrarAlerta = cerrarAlerta;

console.log("Script pasarelaPagos.js cargado correctamente");
