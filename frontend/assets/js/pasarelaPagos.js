/**
 * PASARELA DE PAGOS - MERCADOPAGO INTEGRATION
 * Maneja la creacion de preferencias y procesamiento de pagos
 */

document.addEventListener("DOMContentLoaded", function () {
  inicializarPago();
});

// Variables globales
let mp = null;
let datosAsesoria = null;
let serverData = {};

/**
 * Inicializa el proceso de pago
 */
async function inicializarPago() {
  try {
    // Obtener datos del servidor
    const serverDataScript = document.getElementById("serverData");
    if (serverDataScript) {
      serverData = JSON.parse(serverDataScript.textContent);
    }

    console.log("Datos del servidor:", serverData);

    // Obtener datos de la asesoría desde localStorage
    const asesoriaData = localStorage.getItem("asesoriaEnProceso");
    if (!asesoriaData) {
      mostrarError(
        "No se encontraron datos de la asesoría. Regresa al calendario."
      );
      return;
    }

    datosAsesoria = JSON.parse(asesoriaData);
    console.log("Datos de asesoría:", datosAsesoria);

    // Mostrar resumen
    mostrarResumenAsesoria();

    // Crear preferencia de pago
    await crearPreferenciaPago();
  } catch (error) {
    console.error("Error inicializando pago:", error);
    mostrarError("Error al inicializar el pago: " + error.message);
  }
}

/**
 * Muestra el resumen de la asesoría
 */
function mostrarResumenAsesoria() {
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
                  year: "numeric",
                  month: "long",
                  day: "numeric",
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
 * Crea la preferencia de pago en MercadoPago
 */
async function crearPreferenciaPago() {
  try {
    mostrarLoading(true);

    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No hay sesión activa. Por favor inicia sesión.");
    }

    console.log("Creando preferencia de pago...");

    // Crear preferencia en el backend
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
      const errorText = await response.text();
      console.error("Error del servidor:", errorText);

      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { mensaje: errorText };
      }

      throw new Error(
        errorData.mensaje || `Error del servidor: ${response.status}`
      );
    }

    const result = await response.json();
    console.log("Preferencia creada:", result);

    // Verificar que tenemos los datos necesarios
    if (!result.publicKey || !result.preferenceId) {
      throw new Error("Respuesta incompleta del servidor");
    }

    // Inicializar MercadoPago
    mp = new MercadoPago(result.publicKey, {
      locale: "es-CO",
    });

    console.log("MercadoPago inicializado con key:", result.publicKey);

    // Crear wallet con la preferencia
    const checkout = mp.checkout({
      preference: {
        id: result.preferenceId,
      },
      render: {
        container: "#wallet_container",
        label: "Pagar Asesoría",
      },
    });

    console.log("Checkout creado:", checkout);

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
 * Muestra/oculta el estado de carga
 */
function mostrarLoading(show) {
  const loading = document.getElementById("loadingState");
  const wallet = document.getElementById("wallet_container");
  const errorState = document.getElementById("errorState");

  if (loading) loading.style.display = show ? "block" : "none";
  if (wallet) wallet.style.display = show ? "none" : "block";
  if (errorState && show) errorState.style.display = "none";
}

/**
 * Muestra un mensaje de error
 */
function mostrarError(mensaje) {
  console.error("Mostrando error:", mensaje);

  const errorState = document.getElementById("errorState");
  const wallet = document.getElementById("wallet_container");
  const loading = document.getElementById("loadingState");

  if (errorState) {
    errorState.style.display = "block";
    const errorP = errorState.querySelector("p");
    if (errorP) {
      errorP.innerHTML = `${mensaje} <a href="javascript:location.reload()">Intentar nuevamente</a>`;
    }
  }

  if (wallet) wallet.style.display = "none";
  if (loading) loading.style.display = "none";
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

    // Redirigir a confirmación
    window.location.href = confirmUrl;
  }
}

/**
 * Verificar estado del pago desde localStorage
 */
function verificarEstadoPago() {
  const pagoId = localStorage.getItem("pagoId");
  if (pagoId) {
    console.log("Pago ID guardado:", pagoId);
  }
}

// Manejar retorno al cargar la página
if (window.location.search.includes("status=")) {
  console.log("Detectado retorno de MercadoPago");
  manejarRetornoPago();
} else {
  // Verificar estado al cargar normalmente
  verificarEstadoPago();
}

// Manejar errores globales de JavaScript
window.addEventListener("error", function (e) {
  console.error("Error global:", e.error);
  if (e.error && e.error.message && e.error.message.includes("MercadoPago")) {
    mostrarError(
      "Error cargando MercadoPago. Verifica tu conexión a internet."
    );
  }
});

// Log para debugging
console.log("Script pasarelaPagos.js cargado correctamente");
