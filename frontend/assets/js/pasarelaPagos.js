/**
 * PASARELA DE PAGOS SIMPLIFICADA
 * Solo maneja la creacion de preferencia y el boton de MercadoPago
 */

document.addEventListener("DOMContentLoaded", function () {
  inicializarPago();
});

let datosAsesoria = null;
let mp = null;

/**
 * Inicializa el proceso de pago
 */
async function inicializarPago() {
  try {
    // Obtener datos de la asesoria desde localStorage
    const asesoriaData = localStorage.getItem("asesoriaEnProceso");
    if (!asesoriaData) {
      mostrarError(
        "No se encontraron datos de la asesoría. Regresa al calendario."
      );
      setTimeout(() => {
        window.location.href = "/expertos.html";
      }, 3000);
      return;
    }

    datosAsesoria = JSON.parse(asesoriaData);
    console.log("Datos de asesoría cargados:", datosAsesoria);

    // Validaciones básicas
    if (!validarDatos()) {
      return;
    }

    // Mostrar resumen
    mostrarResumen();

    // Crear preferencia de pago
    await crearPreferenciaPago();
  } catch (error) {
    console.error("Error inicializando pago:", error);
    mostrarError("Error al inicializar el pago: " + error.message);
  }
}

/**
 * Valida los datos básicos de la asesoría
 */
function validarDatos() {
  if (!datosAsesoria.titulo || datosAsesoria.titulo.length < 5) {
    mostrarAlerta("El título de la asesoría es muy corto");
    return false;
  }

  if (!datosAsesoria.descripcion || datosAsesoria.descripcion.length < 10) {
    mostrarAlerta("La descripción de la asesoría es muy corta");
    return false;
  }

  if (!datosAsesoria.experto || !datosAsesoria.experto.email) {
    mostrarAlerta("Información del experto incompleta");
    return false;
  }

  if (!datosAsesoria.precio || datosAsesoria.precio < 1000) {
    mostrarAlerta("El monto mínimo es $1.000 COP");
    return false;
  }

  const fechaAsesoria = new Date(datosAsesoria.fechaHoraInicio);
  const ahora = new Date();
  if (fechaAsesoria <= ahora) {
    mostrarAlerta("La fecha de la asesoría debe ser futura");
    return false;
  }

  return true;
}

/**
 * Muestra el resumen de la asesoría
 */
function mostrarResumen() {
  const container = document.getElementById("resumenDatos");
  if (!container || !datosAsesoria) return;

  try {
    const fecha = new Date(datosAsesoria.fechaHoraInicio);
    const duracionTexto =
      datosAsesoria.duracionMinutos === 60
        ? "1 hora"
        : datosAsesoria.duracionMinutos === 90
        ? "1.5 horas"
        : datosAsesoria.duracionMinutos === 120
        ? "2 horas"
        : "3 horas";

    container.innerHTML = `
            <div class="resumen-item">
                <span class="label">Experto:</span>
                <span class="value">${datosAsesoria.experto.nombre} ${
      datosAsesoria.experto.apellido
    }</span>
            </div>
            <div class="resumen-item">
                <span class="label">Fecha:</span>
                <span class="value">${fecha.toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}</span>
            </div>
            <div class="resumen-item">
                <span class="label">Hora:</span>
                <span class="value">${fecha.toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}</span>
            </div>
            <div class="resumen-item">
                <span class="label">Duración:</span>
                <span class="value">${duracionTexto}</span>
            </div>
            <div class="resumen-item">
                <span class="label">Tema:</span>
                <span class="value">${datosAsesoria.titulo}</span>
            </div>
            <div class="resumen-item total">
                <span class="label">Total:</span>
                <span class="value">$${datosAsesoria.precio.toLocaleString(
                  "es-CO"
                )} COP</span>
            </div>
        `;
  } catch (error) {
    console.error("Error mostrando resumen:", error);
    container.innerHTML =
      '<p class="error">Error mostrando resumen de la asesoría</p>';
  }
}

/**
 * Crea la preferencia de pago con MercadoPago
 */
async function crearPreferenciaPago() {
  try {
    mostrarLoading(true);

    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No hay sesión activa. Por favor inicia sesión.");
    }

    console.log("Creando preferencia de pago...");

    const response = await fetch("/api/pagos/crear-preferencia", {
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
      throw new Error(
        errorData.mensaje || `Error del servidor: ${response.status}`
      );
    }

    const result = await response.json();
    console.log("Preferencia creada:", result);

    if (!result.publicKey || !result.preferenceId) {
      throw new Error("Respuesta incompleta del servidor");
    }

    // Inicializar MercadoPago
    mp = new MercadoPago(result.publicKey, {
      locale: "es-CO",
    });

    console.log("MercadoPago inicializado");

    // Crear checkout
    const checkout = mp.checkout({
      preference: {
        id: result.preferenceId,
      },
      render: {
        container: "#wallet_container",
        label: "Pagar Asesoría",
      },
    });

    console.log("Checkout creado");

    // Guardar IDs para tracking
    localStorage.setItem("preferenceId", result.preferenceId);
    localStorage.setItem("pagoId", result.pagoId);

    mostrarLoading(false);
  } catch (error) {
    console.error("Error creando preferencia:", error);
    mostrarLoading(false);
    mostrarError("Error al crear la preferencia de pago: " + error.message);
  }
}

/**
 * Maneja el retorno desde MercadoPago
 */
function manejarRetornoPago() {
  const urlParams = new URLSearchParams(window.location.search);
  const status = urlParams.get("status");
  const paymentId = urlParams.get("payment_id");
  const preferenceId = urlParams.get("preference_id");
  const pagoId = urlParams.get("pagoId");

  console.log("Parámetros de retorno:", {
    status,
    paymentId,
    preferenceId,
    pagoId,
  });

  if (status && (paymentId || pagoId)) {
    // Limpiar datos temporales
    localStorage.removeItem("asesoriaEnProceso");
    localStorage.removeItem("preferenceId");

    // Construir URL de confirmación
    let confirmUrl = `/confirmacion-asesoria?status=${status}`;
    if (paymentId) confirmUrl += `&paymentId=${paymentId}`;
    if (preferenceId) confirmUrl += `&preferenceId=${preferenceId}`;
    if (pagoId) confirmUrl += `&pagoId=${pagoId}`;

    console.log("Redirigiendo a:", confirmUrl);
    window.location.href = confirmUrl;
  }
}

/**
 * Muestra/oculta el estado de carga
 */
function mostrarLoading(show) {
  const loading = document.getElementById("loadingState");
  const wallet = document.getElementById("wallet_container");
  const error = document.getElementById("errorState");

  if (loading) loading.style.display = show ? "block" : "none";
  if (wallet) wallet.style.display = show ? "none" : "block";
  if (error && show) error.style.display = "none";
}

/**
 * Muestra mensaje de error
 */
function mostrarError(mensaje) {
  console.error("Mostrando error:", mensaje);

  const errorState = document.getElementById("errorState");
  const wallet = document.getElementById("wallet_container");
  const loading = document.getElementById("loadingState");
  const errorMessage = document.getElementById("errorMessage");

  if (errorState) errorState.style.display = "block";
  if (wallet) wallet.style.display = "none";
  if (loading) loading.style.display = "none";
  if (errorMessage) errorMessage.textContent = mensaje;
}

/**
 * Muestra alerta simple
 */
function mostrarAlerta(mensaje) {
  const container = document.getElementById("alertContainer");
  const text = document.getElementById("alertText");

  if (container && text) {
    text.textContent = mensaje;
    container.style.display = "block";

    // Auto-ocultar después de 6 segundos
    setTimeout(() => {
      cerrarAlerta();
    }, 6000);

    // Scroll hacia la alerta
    container.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

/**
 * Cierra la alerta
 */
function cerrarAlerta() {
  const container = document.getElementById("alertContainer");
  if (container) {
    container.style.display = "none";
  }
}

// Manejar retorno de MercadoPago al cargar la página
if (window.location.search.includes("status=")) {
  console.log("Detectado retorno de MercadoPago");
  manejarRetornoPago();
}

// Manejar errores globales
window.addEventListener("error", function (e) {
  console.error("Error global:", e.error);
  if (e.error && e.error.message && e.error.message.includes("MercadoPago")) {
    mostrarError(
      "Error cargando MercadoPago. Verifica tu conexión a internet."
    );
  }
});

// Hacer funciones disponibles globalmente
window.cerrarAlerta = cerrarAlerta;

console.log("Script pasarelaPagos.js simplificado cargado");
