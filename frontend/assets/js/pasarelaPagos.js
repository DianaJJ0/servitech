/**
 * PASARELA DE PAGOS SIMULADOS - SERVITECH
 * Maneja el proceso completo de pago simulado y creación de asesorías
 * @description Sistema de pagos simulados sin integración externa
 */

document.addEventListener("DOMContentLoaded", function () {
  inicializarPago();
});

let datosAsesoria = null;
let serverData = null;
let pagoEnProceso = false;

/**
 * Inicializa el proceso de pago
 */
async function inicializarPago() {
  obtenerDatosServidor();
  obtenerDatosAsesoria();

  if (!validarDatos()) {
    return;
  }

  mostrarResumen();

  // Manejar el submit del formulario de pago
  const form = document.getElementById("formPago");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      procesarPagoConFormulario();
    });
  }
}

/**
 * Obtiene datos del servidor desde el script embebido
 */
function obtenerDatosServidor() {
  const serverScript = document.getElementById("serverData");
  if (serverScript) {
    serverData = JSON.parse(serverScript.textContent);
  } else {
    serverData = {};
  }
}

/**
 * Obtiene datos de la asesoría desde localStorage
 */
function obtenerDatosAsesoria() {
  const asesoriaData = localStorage.getItem("asesoriaEnProceso");
  if (!asesoriaData) {
    crearDatosDesdeServidor();
    return;
  }
  datosAsesoria = JSON.parse(asesoriaData);
  if (serverData && serverData.monto) {
    datosAsesoria.precio = serverData.monto;
  }
}

/**
 * Crea datos de asesoría desde los datos del servidor como fallback
 */
function crearDatosDesdeServidor() {
  if (!serverData || !serverData.expertoSeleccionado) {
    mostrarAlerta(
      "No se encontraron datos de la asesoría. Regresa al calendario."
    );
    setTimeout(() => (window.location.href = "/expertos.html"), 3000);
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
}

/**
 * Valida los datos básicos de la asesoría
 */
function validarDatos() {
  if (!datosAsesoria) {
    mostrarAlerta("No se encontraron datos de la asesoría");
    return false;
  }
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
 * Muestra el resumen de la asesoría en la interfaz
 */
function mostrarResumen() {
  const container = document.getElementById("resumenDatos");
  if (!container || !datosAsesoria) return;
  try {
    const fecha = new Date(datosAsesoria.fechaHoraInicio);
    const duracionTexto = calcularDuracionTexto(datosAsesoria.duracionMinutos);
    container.innerHTML = `
      <div class="summary-grid">
        <div class="summary-item">
          <div class="item-label"><i class="fas fa-user-tie"></i> Experto:</div>
          <div class="item-value">${datosAsesoria.experto.nombre} ${
      datosAsesoria.experto.apellido
    }</div>
        </div>
        <div class="summary-item">
          <div class="item-label"><i class="fas fa-bookmark"></i> Tema:</div>
          <div class="item-value">${datosAsesoria.titulo}</div>
        </div>
        <div class="summary-item">
          <div class="item-label"><i class="fas fa-calendar"></i> Fecha:</div>
          <div class="item-value">${fecha.toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}</div>
        </div>
        <div class="summary-item">
          <div class="item-label"><i class="fas fa-clock"></i> Hora:</div>
          <div class="item-value">${fecha.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })}</div>
        </div>
        <div class="summary-item">
          <div class="item-label"><i class="fas fa-hourglass-half"></i> Duración:</div>
          <div class="item-value">${duracionTexto}</div>
        </div>
        <div class="summary-item">
          <div class="item-label"><i class="fas fa-tag"></i> Categoría:</div>
          <div class="item-value">${datosAsesoria.categoria}</div>
        </div>
        <div class="summary-item full-width">
          <div class="item-label"><i class="fas fa-align-left"></i> Descripción:</div>
          <div class="item-value description">${datosAsesoria.descripcion}</div>
        </div>
        <div class="summary-item total full-width">
          <div class="item-label"><i class="fas fa-dollar-sign"></i> Total a pagar:</div>
          <div class="item-value total-amount">$${datosAsesoria.precio.toLocaleString(
            "es-CO"
          )} COP</div>
        </div>
      </div>
    `;
  } catch (error) {
    container.innerHTML =
      '<div class="error-placeholder">Error mostrando resumen de la asesoría</div>';
  }
}

function calcularDuracionTexto(minutos) {
  if (minutos === 60) return "1 hora";
  if (minutos === 90) return "1.5 horas";
  if (minutos === 120) return "2 horas";
  if (minutos === 180) return "3 horas";
  return `${minutos} minutos`;
}

/**
 * Procesa el pago con los datos del formulario
 */
async function procesarPagoConFormulario() {
  if (pagoEnProceso) return;

  // Validar campos del formulario
  const nombre = document.getElementById("nombrePago").value.trim();
  const email = document.getElementById("emailPago").value.trim();
  const cedula = document.getElementById("cedulaPago").value.trim();
  const telefono = document.getElementById("telefonoPago").value.trim();
  const metodoPago = document.getElementById("metodoPago").value;
  let numeroTarjeta = document
    .getElementById("numeroTarjeta")
    .value.replace(/\s+/g, "");
  const expiracionTarjeta = document
    .getElementById("expiracionTarjeta")
    .value.trim();
  const cvvTarjeta = document.getElementById("cvvTarjeta").value.trim();

  // Nombre: solo letras y espacios
  if (
    !nombre ||
    nombre.length < 5 ||
    !/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]{5,80}$/.test(nombre)
  ) {
    mostrarAlerta(
      "El nombre solo puede contener letras y espacios, mínimo 5 caracteres."
    );
    return;
  }
  if (!email || !validarEmail(email)) {
    mostrarAlerta("Debes ingresar un correo electrónico válido.");
    return;
  }
  // Cédula: solo números, 5-15 dígitos
  if (!cedula || !/^[0-9]{5,15}$/.test(cedula)) {
    mostrarAlerta("La cédula/NIT debe tener solo números (5 a 15 dígitos).");
    return;
  }
  // Teléfono: solo números, máximo 10 dígitos
  if (telefono && !/^[0-9]{0,10}$/.test(telefono)) {
    mostrarAlerta("El teléfono debe tener solo números (máximo 10 dígitos).");
    return;
  }
  if (!metodoPago) {
    mostrarAlerta("Selecciona un método de pago.");
    return;
  }
  if (metodoPago === "tarjeta") {
    // Número de tarjeta: 16-19 dígitos, solo números
    if (!numeroTarjeta || !/^[0-9]{16,19}$/.test(numeroTarjeta)) {
      mostrarAlerta(
        "Ingresa un número de tarjeta válido (16 a 19 dígitos, solo números)."
      );
      return;
    }
    // Expiración: MM/AA, mes 01-12 y año >= actual
    if (
      !expiracionTarjeta ||
      !/^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(expiracionTarjeta)
    ) {
      mostrarAlerta(
        "Ingresa la fecha de expiración en formato MM/AA (ej: 08/27)."
      );
      return;
    }
    // Validar que la fecha no sea pasada
    const [mesExp, anioExp] = expiracionTarjeta.split("/");
    const hoy = new Date();
    const anioActual = hoy.getFullYear() % 100;
    const mesActual = hoy.getMonth() + 1;
    if (
      parseInt(anioExp) < anioActual ||
      (parseInt(anioExp) === anioActual && parseInt(mesExp) < mesActual)
    ) {
      mostrarAlerta(
        "La tarjeta está expirada. Verifica la fecha de expiración."
      );
      return;
    }
    // CVV: 3 o 4 dígitos
    if (!cvvTarjeta || !/^[0-9]{3,4}$/.test(cvvTarjeta)) {
      mostrarAlerta("Ingresa un CVV válido (3 o 4 dígitos).");
      return;
    }
  }

  try {
    pagoEnProceso = true;
    mostrarEstadoCarga();

    const token = localStorage.getItem("token");
    if (!token) throw new Error("No hay sesión activa. Inicia sesión.");

    // Enviar solicitud al backend incluyendo los datos de pago
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
        datosPago: {
          nombre,
          email,
          cedula,
          telefono,
          metodo: metodoPago,
          numeroTarjeta: metodoPago === "tarjeta" ? numeroTarjeta : undefined,
          expiracionTarjeta:
            metodoPago === "tarjeta" ? expiracionTarjeta : undefined,
          cvvTarjeta: metodoPago === "tarjeta" ? cvvTarjeta : undefined,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.mensaje || `Error del servidor: ${response.status}`
      );
    }

    const result = await response.json();
    // Limpiar datos de localStorage
    localStorage.removeItem("asesoriaEnProceso");

    // Redirigir a la confirmación con los datos de la factura
    window.location.href = `/confirmacion-asesoria?status=success&pagoId=${result.pagoId}&asesoriaId=${result.asesoriaId}&simulado=true`;
  } catch (error) {
    mostrarError("Error al procesar el pago: " + error.message);
  } finally {
    pagoEnProceso = false;
  }
}

/**
 * Muestra el estado de carga durante el procesamiento
 */
function mostrarEstadoCarga() {
  document.getElementById("formPago").style.display = "none";
  document.getElementById("loadingState").style.display = "block";
  document.getElementById("successState").style.display = "none";
  document.getElementById("errorState").style.display = "none";
}

function mostrarError(mensaje) {
  document.getElementById("loadingState").style.display = "none";
  document.getElementById("formPago").style.display = "block";
  document.getElementById("errorMessage").textContent = mensaje;
  document.getElementById("errorState").style.display = "block";
}

/**
 * Muestra alerta temporal
 */
function mostrarAlerta(mensaje) {
  const container = document.getElementById("alertContainer");
  const text = document.getElementById("alertText");
  if (container && text) {
    text.textContent = mensaje;
    container.style.display = "block";
    setTimeout(() => cerrarAlerta(), 6000);
    container.scrollIntoView({ behavior: "smooth", block: "center" });
    // feedback visual en el primer input con error
    const firstInput = document.querySelector(
      "#formPago input:invalid, #formPago select:invalid"
    );
    if (firstInput) firstInput.focus();
  } else {
    alert(mensaje);
  }
}
function cerrarAlerta() {
  const container = document.getElementById("alertContainer");
  if (container) container.style.display = "none";
}
function reintentar() {
  document.getElementById("errorState").style.display = "none";
  document.getElementById("formPago").style.display = "block";
  pagoEnProceso = false;
}
function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

window.cerrarAlerta = cerrarAlerta;
window.reintentar = reintentar;
