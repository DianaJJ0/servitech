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

  // mostrarResumen se define más abajo; si no existe por alguna razón, usamos un fallback
  try {
    if (typeof mostrarResumen === "function") mostrarResumen();
  } catch (err) {
    console.error("Error llamando a mostrarResumen:", err);
  }

  // Manejar el submit del formulario de pago
  // Manejar botón de Mercado Pago
  const btnMP = document.getElementById("btnIrAMercadoPago");
  // Inicializar Mercado Pago SDK si disponemos de la clave pública en serverData
  // No usamos SDK; el botón es puramente visual y hace fetch al backend
  if (btnMP) {
    btnMP.addEventListener("click", function (e) {
      e.preventDefault();
      iniciarCheckoutMercadoPago();
    });
  }
}

/**
 * Rellena el contenedor #resumenDatos con la información de la asesoría
 * Esta función evita referencias a elementos inexistentes y presenta un resumen sencillo
 */
function mostrarResumen() {
  const cont = document.getElementById("resumenDatos");
  if (!cont) return;

  // Limpiar contenido
  cont.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "summary-box";
  // Mostrar título como un item más (misma estructura que los demás)
  const tituloItem = document.createElement("p");
  tituloItem.className = "summary-item";
  tituloItem.textContent =
    datosAsesoria && datosAsesoria.titulo
      ? `Título: ${datosAsesoria.titulo}`
      : "Título: Asesoría";

  const experto = document.createElement("div");
  experto.className = "summary-item";
  const expertoLabel = document.createElement("div");
  expertoLabel.className = "item-label";
  expertoLabel.innerHTML = "<strong>Experto:</strong>";
  const expertoValue = document.createElement("div");
  expertoValue.className = "item-value descripcion";
  expertoValue.textContent =
    datosAsesoria && datosAsesoria.experto
      ? `${datosAsesoria.experto.nombre || ""} ${
          datosAsesoria.experto.apellido || ""
        } (${datosAsesoria.experto.email || ""})`
      : "N/A";
  experto.appendChild(expertoLabel);
  experto.appendChild(expertoValue);

  const fecha = document.createElement("div");
  fecha.className = "summary-item";
  const fechaLabel = document.createElement("div");
  fechaLabel.className = "item-label";
  fechaLabel.innerHTML = "<strong>Fecha:</strong>";
  const fechaValue = document.createElement("div");
  fechaValue.className = "item-value descripcion";
  try {
    fechaValue.textContent =
      datosAsesoria && datosAsesoria.fechaHoraInicio
        ? new Date(datosAsesoria.fechaHoraInicio).toLocaleString()
        : "Por definir";
  } catch (e) {
    fechaValue.textContent = "Por definir";
  }
  fecha.appendChild(fechaLabel);
  fecha.appendChild(fechaValue);

  const duracion = document.createElement("div");
  duracion.className = "summary-item";
  const duracionLabel = document.createElement("div");
  duracionLabel.className = "item-label";
  duracionLabel.innerHTML = "<strong>Duración:</strong>";
  const duracionValue = document.createElement("div");
  duracionValue.className = "item-value descripcion";
  duracionValue.textContent =
    datosAsesoria && datosAsesoria.duracionMinutos
      ? `${datosAsesoria.duracionMinutos} minutos`
      : "Por definir";
  duracion.appendChild(duracionLabel);
  duracion.appendChild(duracionValue);

  const precio = document.createElement("div");
  precio.className = "summary-item summary-price";
  const monto =
    datosAsesoria && datosAsesoria.precio
      ? datosAsesoria.precio
      : (serverData && serverData.monto) || 0;
  const precioLabel = document.createElement("div");
  precioLabel.className = "item-label";
  precioLabel.innerHTML = "<strong>Total:</strong>";
  const precioValue = document.createElement("div");
  precioValue.className = "item-value descripcion";
  precioValue.textContent = `$${Number(monto).toLocaleString("es-CO")} COP`;
  precio.appendChild(precioLabel);
  precio.appendChild(precioValue);

  wrap.appendChild(tituloItem);
  wrap.appendChild(experto);
  wrap.appendChild(fecha);
  wrap.appendChild(duracion);
  wrap.appendChild(precio);

  cont.appendChild(wrap);

  // Asegurar que el monto visible en el header también se sincroniza
  const montoTotalEl = document.getElementById("montoTotal");
  if (montoTotalEl) {
    montoTotalEl.textContent = `$${Number(monto).toLocaleString("es-CO")} COP`;
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
 * Inicia el Checkout Pro de Mercado Pago solicitando al backend la preferencia
 */
async function iniciarCheckoutMercadoPago() {
  if (pagoEnProceso) return;
  try {
    pagoEnProceso = true;
    mostrarEstadoCarga();

    const token = localStorage.getItem("token");
    console.debug("iniciarCheckoutMercadoPago: token present?", !!token);
    if (!token) throw new Error("No hay sesión activa. Inicia sesión.");

    console.debug("iniciarCheckoutMercadoPago: payload", {
      titulo: datosAsesoria.titulo,
      descripcion: datosAsesoria.descripcion,
      expertoEmail: datosAsesoria.experto.email,
      fechaHoraInicio: datosAsesoria.fechaHoraInicio,
      duracionMinutos: datosAsesoria.duracionMinutos,
      monto: datosAsesoria.precio,
    });

    const response = await fetch("/api/pagos/crear-preferencia-mp", {
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
        simulate: true,
      }),
    });

    const text = await response.text();
    let result;
    try {
      result = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error(
        "iniciarCheckoutMercadoPago: response text is not JSON",
        text
      );
      throw new Error(`Respuesta inesperada del servidor: ${response.status}`);
    }

    if (!response.ok) {
      const errMsg =
        result && result.mensaje
          ? result.mensaje
          : `Error del servidor: ${response.status}`;
      console.error(
        "iniciarCheckoutMercadoPago: backend error",
        errMsg,
        result
      );
      throw new Error(errMsg);
    }

    console.debug("iniciarCheckoutMercadoPago: backend result", result);
    if (result.initPoint) {
      localStorage.removeItem("asesoriaEnProceso");
      // Antes de redirigir, pedir estado de notificaciones para informar al usuario
      try {
        // result.pagoId fue devuelto por el backend
        if (result.pagoId) {
          // No esperamos la respuesta (no bloquear redirección), pero la solicitamos
          fetch(`/api/pagos/${result.pagoId}/notificaciones`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => r.json())
            .then((data) => mostrarResultadoNotificaciones(data))
            .catch((e) =>
              console.warn("No se pudo obtener estado notificaciones", e)
            );
        }
      } catch (e) {
        console.warn("Error consultando notificaciones:", e);
      }

      // If SDK is initialized, render official MP button using preference id
      try {
        if (window.mpInstance && result.preferenceId) {
          const container = document.getElementById("mp-button-container");
          try {
            // ocultar botón original si existe
            const originalBtn = document.getElementById("btnIrAMercadoPago");
            if (originalBtn) originalBtn.classList.add("hidden");
            // Usar el render del SDK para que inyecte el botón oficial
            if (window.mpInstance && container) {
              window.mpInstance.checkout({
                preference: { id: result.preferenceId },
                render: {
                  container: "#mp-button-container",
                  label: "Pagar con Mercado Pago",
                },
              });
            }
          } catch (e) {
            console.warn(
              "Error renderizando botón SDK, fallback a init_point",
              e
            );
            window.open(result.initPoint, "_blank");
          }
        } else {
          // Open Mercado Pago in a new tab so the current page can show confirmation
          try {
            window.open(result.initPoint, "_blank");
          } catch (e) {
            // If popups are blocked, fallback to navigating
            window.location.href = result.initPoint;
            return;
          }
        }
      } catch (e) {
        console.warn("Error iniciando SDK de MP, abriendo init_point", e);
        try {
          window.open(result.initPoint, "_blank");
        } catch (e2) {
          window.location.href = result.initPoint;
        }
      }

      // Immediately navigate current tab to confirmation page with ids so user sees the result
      const params = new URLSearchParams();
      if (result.pagoId) params.set("pagoId", result.pagoId);
      if (result.asesoriaId) params.set("asesoriaId", result.asesoriaId);
      params.set("status", "pending");
      window.location.href = `/confirmacion-asesoria?${params.toString()}`;
      return;
    }

    mostrarError("No se pudo iniciar Mercado Pago");
  } catch (error) {
    console.error("iniciarCheckoutMercadoPago error:", error);
    mostrarError("Error al iniciar Mercado Pago: " + error.message);
  } finally {
    pagoEnProceso = false;
  }
}

/**
 * Muestra un pequeño mensaje informando si las notificaciones fueron enviadas
 * data = { enviado: boolean, detalles: Array }
 */
function mostrarResultadoNotificaciones(data) {
  try {
    const container = document.getElementById("notificacionResult");
    if (!container) {
      // crear un badge minimal debajo del botón
      const mpContainer = document.querySelector(".mp-checkout-container");
      const el = document.createElement("div");
      el.id = "notificacionResult";
      el.style.marginTop = "12px";
      el.style.fontSize = "0.95rem";
      if (data && data.enviado) {
        // No mostramos el texto verde en la parte superior por diseño; mantener silencio
        el.textContent = "";
        el.style.display = "none";
      } else {
        el.style.color = "#c62828"; // rojo
        el.textContent =
          "No se pudieron enviar notificaciones (configurar SENDGRID).";
      }
      if (mpContainer) mpContainer.appendChild(el);
      return;
    }
    if (data && data.enviado) {
      // no mostrar mensaje positivo
      container.style.display = "none";
    } else {
      container.style.color = "#c62828";
      container.textContent =
        "No se pudieron enviar notificaciones (configurar SENDGRID).";
    }
  } catch (e) {
    console.warn("mostrarResultadoNotificaciones fallo:", e);
  }
}

/**
 * Muestra el estado de carga durante el procesamiento
 */
function mostrarEstadoCarga() {
  const formPagoEl = document.getElementById("formPago");
  const loadingEl = document.getElementById("loadingState");
  const successEl = document.getElementById("successState");
  const errorEl = document.getElementById("errorState");
  if (formPagoEl) formPagoEl.classList.add("hidden");
  if (loadingEl) loadingEl.classList.remove("hidden");
  if (successEl) successEl.classList.add("hidden");
  if (errorEl) errorEl.classList.add("hidden");
}

function mostrarError(mensaje) {
  try {
    const loadingEl = document.getElementById("loadingState");
    const formPagoEl = document.getElementById("formPago");
    const errorMessageEl = document.getElementById("errorMessage");
    const errorEl = document.getElementById("errorState");
    if (loadingEl) loadingEl.classList.add("hidden");
    if (formPagoEl) formPagoEl.classList.remove("hidden");
    if (errorMessageEl) errorMessageEl.textContent = mensaje;
    if (errorEl) errorEl.classList.remove("hidden");
  } catch (e) {
    console.error("mostrarError fallo al manipular el DOM:", e, mensaje);
    // último recurso: alert al usuario
    try {
      alert(mensaje);
    } catch (e2) {
      /* ignore */
    }
  }
}

/**
 * Muestra alerta temporal
 */
function mostrarAlerta(mensaje) {
  const container = document.getElementById("alertContainer");
  const text = document.getElementById("alertText");
  if (container && text) {
    text.textContent = mensaje;
    container.classList.remove("hidden");
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
  if (container) container.classList.add("hidden");
}
function reintentar() {
  const errorEl = document.getElementById("errorState");
  const formPagoEl = document.getElementById("formPago");
  if (errorEl) errorEl.classList.add("hidden");
  if (formPagoEl) formPagoEl.classList.remove("hidden");
  pagoEnProceso = false;
}
function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

window.cerrarAlerta = cerrarAlerta;
window.reintentar = reintentar;
