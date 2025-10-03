/**
 * MIS ASESORIAS - GESTION COMPLETA CON ESTADOS DE PAGO
 * Maneja la visualización y gestión de asesorías para clientes y expertos
 */

document.addEventListener("DOMContentLoaded", function () {
  inicializarMisAsesorias();
});

// Variables globales
let usuarioData = null;
let asesorias = [];
let filtroActual = "todas";
let accionPendiente = null;
let verificacionesActivas = new Set();

/**
 * Inicializa la página de mis asesorías
 */
function inicializarMisAsesorias() {
  try {
    // Obtener datos del usuario
    const userDataScript = document.getElementById("userData");
    if (userDataScript) {
      usuarioData = JSON.parse(userDataScript.textContent);
    }

    if (!usuarioData) {
      mostrarError("No se pudieron cargar los datos del usuario");
      return;
    }

    console.log("Usuario data:", usuarioData);

    // Configurar filtros
    configurarFiltros();

    // Cargar asesorías
    cargarAsesorias();

    // Configurar verificación periódica para asesorías pendientes
    configurarVerificacionPeriodica();
  } catch (error) {
    console.error("Error inicializando mis asesorías:", error);
    mostrarError("Error al inicializar la página");
  }
}

/**
 * Configura los filtros de asesorías
 */
function configurarFiltros() {
  const filtroTabs = document.querySelectorAll(".filtro-tab");

  filtroTabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      // Remover active de todos
      filtroTabs.forEach((t) => t.classList.remove("active"));

      // Agregar active al seleccionado
      this.classList.add("active");

      // Cambiar filtro
      filtroActual = this.dataset.filtro;

      // Filtrar asesorías
      filtrarAsesorias();
    });
  });
}

/**
 * Carga las asesorías del usuario
 */
async function cargarAsesorias() {
  try {
    mostrarEstado("loading");

    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No hay sesión activa");
    }

    console.log("Cargando asesorías...");

    const response = await fetch("/api/asesorias/mias", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.mensaje || `Error ${response.status}`);
    }

    asesorias = await response.json();
    console.log("Asesorías cargadas:", asesorias);

    // Enriquecer con datos de pago
    await enriquecerConDatosPago();

    if (asesorias.length === 0) {
      mostrarEstado("empty");
    } else {
      mostrarEstado("content");
      renderizarAsesorias();
    }
  } catch (error) {
    console.error("Error cargando asesorías:", error);
    mostrarError("Error al cargar las asesorías: " + error.message);
  }
}

/**
 * Enriquece las asesorías con datos de pago
 */
async function enriquecerConDatosPago() {
  const token = localStorage.getItem("token");
  if (!token) return;

  for (let asesoria of asesorias) {
    if (asesoria.pagoId) {
      try {
        const response = await fetch(`/api/pagos/${asesoria.pagoId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const datoPago = await response.json();
          asesoria.datoPago = datoPago;
          console.log(
            `Pago cargado para asesoría ${asesoria._id}: ${datoPago.estado}`
          );
        }
      } catch (error) {
        console.warn(
          `Error cargando pago para asesoría ${asesoria._id}:`,
          error
        );
      }
    }
  }
}

/**
 * Configura verificación periódica para asesorías con pagos pendientes
 */
function configurarVerificacionPeriodica() {
  setInterval(() => {
    const asesoriasPendientes = asesorias.filter(
      (a) =>
        a.datoPago &&
        ["pendiente", "procesando"].includes(a.datoPago.estado) &&
        !verificacionesActivas.has(a._id)
    );

    asesoriasPendientes.forEach((asesoria) => {
      verificarEstadoPagoAsesoria(asesoria._id);
    });
  }, 30000); // Verificar cada 30 segundos
}

/**
 * Verifica el estado del pago de una asesoría específica
 */
async function verificarEstadoPagoAsesoria(asesoriaId) {
  if (verificacionesActivas.has(asesoriaId)) return;

  verificacionesActivas.add(asesoriaId);

  try {
    const asesoria = asesorias.find((a) => a._id === asesoriaId);
    if (!asesoria || !asesoria.pagoId) return;

    const token = localStorage.getItem("token");
    const response = await fetch(`/api/pagos/${asesoria.pagoId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const datosPagoActualizados = await response.json();
      const estadoAnterior = asesoria.datoPago?.estado;

      if (estadoAnterior !== datosPagoActualizados.estado) {
        console.log(
          `Estado de pago actualizado para asesoría ${asesoriaId}: ${estadoAnterior} -> ${datosPagoActualizados.estado}`
        );

        // Actualizar datos locales
        asesoria.datoPago = datosPagoActualizados;

        // Recargar asesorías si hay cambio significativo
        if (
          datosPagoActualizados.estado === "retenido" ||
          datosPagoActualizados.estado === "fallido"
        ) {
          mostrarNotificacion(
            "Estado de pago actualizado. Recargando...",
            "info"
          );
          setTimeout(() => cargarAsesorias(), 2000);
        }

        // Re-renderizar la tarjeta específica
        renderizarAsesorias();
      }
    }
  } catch (error) {
    console.warn(
      `Error verificando estado de pago para asesoría ${asesoriaId}:`,
      error
    );
  } finally {
    verificacionesActivas.delete(asesoriaId);
  }
}

/**
 * Filtra las asesorías según el filtro seleccionado
 */
function filtrarAsesorias() {
  const asesoriasFiltradas = asesorias.filter((asesoria) => {
    switch (filtroActual) {
      case "pendientes":
        return (
          asesoria.estado === "pendiente-aceptacion" &&
          usuarioData.rolUsuario === "experto"
        );
      case "confirmadas":
        return asesoria.estado === "confirmada";
      case "completadas":
        return asesoria.estado === "completada";
      case "canceladas":
        return ["cancelada-cliente", "cancelada-experto", "rechazada"].includes(
          asesoria.estado
        );
      case "todas":
      default:
        return true;
    }
  });

  renderizarAsesorias(asesoriasFiltradas);
}

/**
 * Renderiza las asesorías en el contenedor
 */
function renderizarAsesorias(asesoriasList = null) {
  const container = document.getElementById("asesoriasContainer");
  const asesorias = asesoriasList || window.asesorias;

  if (!asesorias || asesorias.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><p>No hay asesorías para mostrar</p></div>';
    return;
  }

  container.innerHTML = asesorias
    .map((asesoria) => generarTarjetaAsesoria(asesoria))
    .join("");
}

/**
 * Genera HTML para una tarjeta de asesoría con información de pago
 */
function generarTarjetaAsesoria(asesoria) {
  const esExperto = usuarioData.rolUsuario === "experto";
  const participante = esExperto ? asesoria.cliente : asesoria.experto;
  const rolParticipante = esExperto ? "Cliente" : "Experto";

  const fecha = new Date(asesoria.fechaHoraInicio);
  const fechaFormateada = fecha.toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const horaFormateada = fecha.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const duracionTexto =
    asesoria.duracionMinutos === 60
      ? "1 hora"
      : asesoria.duracionMinutos === 90
      ? "1.5 horas"
      : asesoria.duracionMinutos === 120
      ? "2 horas"
      : "3 horas";

  // Obtener iniciales del participante
  const iniciales = obtenerIniciales(
    participante.nombre,
    participante.apellido
  );

  // Información de pago
  let infoPago = "";
  if (asesoria.datoPago) {
    infoPago = generarInfoPago(asesoria.datoPago, esExperto);
  }

  // Información de contacto para asesorías confirmadas
  let contactoInfo = "";
  if (
    asesoria.estado === "confirmada" &&
    !esExperto &&
    asesoria.experto.telefonoContacto
  ) {
    contactoInfo = `
            <div class="contacto-info">
                <h5><i class="fas fa-phone"></i> Contacto del experto:</h5>
                <div class="contacto-telefono">${asesoria.experto.telefonoContacto}</div>
            </div>
        `;
  }

  return `
        <div class="asesoria-card" data-asesoria-id="${asesoria._id}">
            <div class="asesoria-header">
                <div class="asesoria-titulo">${asesoria.titulo}</div>
                <div class="asesoria-estado estado-${asesoria.estado}">
                    ${obtenerTextoEstado(asesoria.estado)}
                </div>
            </div>

            <div class="asesoria-participante">
                <div class="participante-avatar">
                    ${
                      participante.avatarUrl
                        ? `<img src="${participante.avatarUrl}" alt="${participante.nombre}" style="width: 100%; height: 100%; border-radius: 50%;">`
                        : iniciales
                    }
                </div>
                <div class="participante-info">
                    <h4>${participante.nombre} ${participante.apellido}</h4>
                    <span>${rolParticipante}</span>
                </div>
            </div>

            ${contactoInfo}
            ${infoPago}

            <div class="asesoria-detalles">
                <div class="detalle-item">
                    <i class="fas fa-calendar"></i>
                    <span>${fechaFormateada}</span>
                </div>
                <div class="detalle-item">
                    <i class="fas fa-clock"></i>
                    <span>${horaFormateada} - ${duracionTexto}</span>
                </div>
                <div class="detalle-item">
                    <i class="fas fa-tag"></i>
                    <span>${asesoria.categoria}</span>
                </div>
                <div class="detalle-item">
                    <i class="fas fa-code"></i>
                    <span>${asesoria.codigoAsesoria}</span>
                </div>
            </div>

            <div class="asesoria-descripcion">
                ${asesoria.descripcion}
            </div>

            <div class="asesoria-acciones">
                ${generarBotonesAccion(asesoria, esExperto)}
            </div>
        </div>
    `;
}

/**
 * Genera información de pago para mostrar en la tarjeta
 */
function generarInfoPago(datoPago, esExperto) {
  if (!datoPago) return "";

  const estado = datoPago.estado;
  const monto = datoPago.monto;

  let claseEstado = "";
  let iconoEstado = "";
  let textoEstado = "";
  let descripcion = "";

  switch (estado) {
    case "pendiente":
      claseEstado = "pago-pendiente";
      iconoEstado = "fas fa-clock";
      textoEstado = "Pago pendiente";
      descripcion = "El pago está siendo procesado";
      break;
    case "procesando":
      claseEstado = "pago-procesando";
      iconoEstado = "fas fa-spinner fa-spin";
      textoEstado = "Procesando pago";
      descripcion = "Verificando con MercadoPago";
      break;
    case "retenido":
      claseEstado = "pago-retenido";
      iconoEstado = "fas fa-shield-alt";
      textoEstado = esExperto ? "Pago retenido" : "Pago confirmado";
      descripcion = esExperto
        ? "Se liberará al completar la asesoría"
        : "Tu pago está seguro y protegido";
      break;
    case "liberado":
      claseEstado = "pago-liberado";
      iconoEstado = "fas fa-check-circle";
      textoEstado = "Pago liberado";
      descripcion = esExperto
        ? "Pago disponible en tu cuenta"
        : "Pago entregado al experto";
      break;
    case "reembolsado":
      claseEstado = "pago-reembolsado";
      iconoEstado = "fas fa-undo-alt";
      textoEstado = "Reembolsado";
      descripcion = "Dinero devuelto a tu cuenta";
      break;
    case "fallido":
      claseEstado = "pago-fallido";
      iconoEstado = "fas fa-exclamation-triangle";
      textoEstado = "Pago fallido";
      descripcion = "Hubo un problema con el pago";
      break;
    default:
      return "";
  }

  return `
        <div class="pago-info ${claseEstado}">
            <div class="pago-header">
                <i class="${iconoEstado}"></i>
                <span class="pago-estado">${textoEstado}</span>
            </div>
            <div class="pago-detalles">
                <div class="pago-monto">$${monto.toLocaleString(
                  "es-CO"
                )} COP</div>
                <div class="pago-descripcion">${descripcion}</div>
            </div>
            ${
              estado === "pendiente" || estado === "procesando"
                ? `<button class="btn-verificar-pago" onclick="verificarEstadoPagoAsesoria('${
                    datoPago.asesoriaId || ""
                  }')">
                    <i class="fas fa-sync-alt"></i> Verificar estado
                </button>`
                : ""
            }
        </div>
    `;
}

/**
 * Genera los botones de acción según el estado y rol
 */
function generarBotonesAccion(asesoria, esExperto) {
  const botones = [];

  // Si hay problema con el pago, mostrar acción especial
  if (asesoria.datoPago && asesoria.datoPago.estado === "fallido") {
    if (!esExperto) {
      botones.push(`
                <button class="btn-accion btn-reintentar-pago" onclick="reintentarPago('${asesoria._id}')">
                    <i class="fas fa-credit-card"></i>
                    Reintentar pago
                </button>
            `);
    }
    return botones.join("");
  }

  switch (asesoria.estado) {
    case "pendiente-aceptacion":
      if (esExperto) {
        botones.push(`
                    <button class="btn-accion btn-aceptar" onclick="aceptarAsesoria('${asesoria._id}')">
                        <i class="fas fa-check"></i>
                        Aceptar
                    </button>
                `);
        botones.push(`
                    <button class="btn-accion btn-rechazar" onclick="rechazarAsesoria('${asesoria._id}')">
                        <i class="fas fa-times"></i>
                        Rechazar
                    </button>
                `);
      } else {
        botones.push(`
                    <button class="btn-accion btn-cancelar" onclick="cancelarAsesoria('${asesoria._id}', 'cliente')">
                        <i class="fas fa-times"></i>
                        Cancelar solicitud
                    </button>
                `);
      }
      break;

    case "confirmada":
      if (!esExperto) {
        botones.push(`
                    <button class="btn-accion btn-finalizar" onclick="finalizarAsesoria('${asesoria._id}')">
                        <i class="fas fa-flag-checkered"></i>
                        Finalizar
                    </button>
                `);
      }
      botones.push(`
                <button class="btn-accion btn-cancelar" onclick="cancelarAsesoria('${
                  asesoria._id
                }', '${esExperto ? "experto" : "cliente"}')">
                    <i class="fas fa-times"></i>
                    Cancelar
                </button>
            `);
      if (asesoria.experto.telefonoContacto && !esExperto) {
        botones.push(`
                    <button class="btn-accion btn-contactar" onclick="contactarExperto('${asesoria.experto.telefonoContacto}')">
                        <i class="fas fa-phone"></i>
                        Contactar
                    </button>
                `);
      }
      break;

    case "completada":
      // Mostrar información de pago liberado si aplica
      if (
        asesoria.datoPago &&
        asesoria.datoPago.estado === "liberado" &&
        esExperto
      ) {
        botones.push(`
                    <div class="pago-completado">
                        <i class="fas fa-money-bill-wave"></i>
                        Pago recibido: $${asesoria.datoPago.monto.toLocaleString(
                          "es-CO"
                        )} COP
                    </div>
                `);
      }
      break;
  }

  return botones.join("");
}

/**
 * Reintentar pago para una asesoría fallida
 */
function reintentarPago(asesoriaId) {
  const asesoria = asesorias.find((a) => a._id === asesoriaId);
  if (!asesoria) return;

  // Guardar datos de la asesoría para reintentar el pago
  const datosAsesoria = {
    titulo: asesoria.titulo,
    descripcion: asesoria.descripcion,
    experto: asesoria.experto,
    fechaHoraInicio: asesoria.fechaHoraInicio,
    duracionMinutos: asesoria.duracionMinutos,
    categoria: asesoria.categoria,
    precio: asesoria.datoPago?.monto || 20000,
  };

  localStorage.setItem("asesoriaEnProceso", JSON.stringify(datosAsesoria));

  // Redirigir a la pasarela de pagos
  window.location.href = `/pasarela-pagos?experto=${encodeURIComponent(
    JSON.stringify({
      id: asesoria.experto.email,
      nombre: asesoria.experto.nombre,
      apellido: asesoria.experto.apellido,
    })
  )}&monto=${datosAsesoria.precio}&reintentar=true`;
}

/**
 * Acepta una asesoría (solo expertos)
 */
async function aceptarAsesoria(asesoriaId) {
  try {
    await confirmarAccion(
      "Aceptar asesoría",
      "¿Estás seguro de aceptar esta asesoría? El pago será retenido hasta que se complete.",
      async () => {
        const token = localStorage.getItem("token");
        const response = await fetch(`/api/asesorias/${asesoriaId}/aceptar`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.mensaje || "Error al aceptar asesoría");
        }

        mostrarNotificacion("Asesoría aceptada exitosamente", "success");
        cargarAsesorias();
      }
    );
  } catch (error) {
    console.error("Error aceptando asesoría:", error);
    mostrarNotificacion("Error al aceptar asesoría: " + error.message, "error");
  }
}

/**
 * Rechaza una asesoría (solo expertos)
 */
async function rechazarAsesoria(asesoriaId) {
  try {
    const motivo =
      prompt("Motivo del rechazo (opcional):") || "Rechazada por el experto";

    await confirmarAccion(
      "Rechazar asesoría",
      "¿Estás seguro de rechazar esta asesoría? El pago será reembolsado al cliente automáticamente.",
      async () => {
        const token = localStorage.getItem("token");
        const response = await fetch(`/api/asesorias/${asesoriaId}/rechazar`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ motivo }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.mensaje || "Error al rechazar asesoría");
        }

        const resultado = await response.json();

        if (resultado.reembolsoExitoso) {
          mostrarNotificacion(
            "Asesoría rechazada. Reembolso procesado automáticamente.",
            "success"
          );
        } else {
          mostrarNotificacion(
            "Asesoría rechazada. El reembolso será procesado manualmente.",
            "warning"
          );
        }

        cargarAsesorias();
      }
    );
  } catch (error) {
    console.error("Error rechazando asesoría:", error);
    mostrarNotificacion(
      "Error al rechazar asesoría: " + error.message,
      "error"
    );
  }
}

/**
 * Finaliza una asesoría (solo clientes)
 */
async function finalizarAsesoria(asesoriaId) {
  try {
    const comentarios =
      prompt("Comentarios sobre la asesoría (opcional):") || "";
    const calificacionStr = prompt("Calificación del 1 al 5 (opcional):") || "";
    const calificacion = calificacionStr ? parseInt(calificacionStr) : null;

    await confirmarAccion(
      "Finalizar asesoría",
      "¿Estás seguro de finalizar esta asesoría? El pago será liberado al experto.",
      async () => {
        const token = localStorage.getItem("token");
        const body = {};
        if (comentarios) body.comentarios = comentarios;
        if (calificacion && calificacion >= 1 && calificacion <= 5)
          body.calificacion = calificacion;

        const response = await fetch(`/api/asesorias/${asesoriaId}/finalizar`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.mensaje || "Error al finalizar asesoría");
        }

        const resultado = await response.json();

        if (resultado.pagoLiberado) {
          mostrarNotificacion(
            `Asesoría finalizada. Pago de $${resultado.montoPago.toLocaleString(
              "es-CO"
            )} COP liberado al experto.`,
            "success"
          );
        } else {
          mostrarNotificacion("Asesoría finalizada exitosamente.", "success");
        }

        cargarAsesorias();
      }
    );
  } catch (error) {
    console.error("Error finalizando asesoría:", error);
    mostrarNotificacion(
      "Error al finalizar asesoría: " + error.message,
      "error"
    );
  }
}

/**
 * Cancela una asesoría
 */
async function cancelarAsesoria(asesoriaId, tipo) {
  try {
    const endpoint = `/api/asesorias/${asesoriaId}/cancelar-${tipo}`;
    const mensaje =
      tipo === "cliente"
        ? "¿Estás seguro de cancelar esta asesoría?"
        : "¿Estás seguro de cancelar esta asesoría? Esto puede afectar tu calificación.";

    await confirmarAccion("Cancelar asesoría", mensaje, async () => {
      const token = localStorage.getItem("token");
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || "Error al cancelar asesoría");
      }

      mostrarNotificacion("Asesoría cancelada exitosamente", "success");
      cargarAsesorias();
    });
  } catch (error) {
    console.error("Error cancelando asesoría:", error);
    mostrarNotificacion(
      "Error al cancelar asesoría: " + error.message,
      "error"
    );
  }
}

/**
 * Contacta al experto por teléfono
 */
function contactarExperto(telefono) {
  if (telefono && telefono !== "No especificado") {
    window.open(`tel:${telefono}`, "_self");
  } else {
    mostrarNotificacion("Número de teléfono no disponible", "error");
  }
}

/**
 * Muestra modal de confirmación
 */
function confirmarAccion(titulo, mensaje, callback) {
  return new Promise((resolve, reject) => {
    const modal = document.getElementById("confirmModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalMessage = document.getElementById("modalMessage");
    const confirmBtn = document.getElementById("modalConfirmBtn");

    modalTitle.textContent = titulo;
    modalMessage.textContent = mensaje;

    // Limpiar event listeners anteriores
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener("click", async () => {
      try {
        cerrarModal();
        await callback();
        resolve();
      } catch (error) {
        reject(error);
      }
    });

    modal.style.display = "flex";
  });
}

/**
 * Cierra el modal
 */
function cerrarModal() {
  const modal = document.getElementById("confirmModal");
  modal.style.display = "none";
}

/**
 * Muestra diferentes estados de la página
 */
function mostrarEstado(estado) {
  const loading = document.getElementById("loadingState");
  const error = document.getElementById("errorState");
  const content = document.getElementById("asesoriasContainer");
  const empty = document.getElementById("emptyState");

  // Ocultar todos
  loading.style.display = "none";
  error.style.display = "none";
  content.style.display = "none";
  empty.style.display = "none";

  // Mostrar el correspondiente
  switch (estado) {
    case "loading":
      loading.style.display = "block";
      break;
    case "error":
      error.style.display = "block";
      break;
    case "content":
      content.style.display = "block";
      break;
    case "empty":
      empty.style.display = "block";
      break;
  }
}

/**
 * Muestra mensaje de error
 */
function mostrarError(mensaje) {
  mostrarEstado("error");
  const errorMessage = document.getElementById("errorMessage");
  if (errorMessage) {
    errorMessage.textContent = mensaje;
  }
}

/**
 * Muestra notificaciones mejoradas
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
        `;
    document.body.appendChild(container);
  }

  const notification = document.createElement("div");
  notification.className = `notification notification-${tipo}`;
  notification.style.cssText = `
        background: ${
          tipo === "success"
            ? "#28a745"
            : tipo === "error"
            ? "#dc3545"
            : tipo === "warning"
            ? "#ffc107"
            : "#007bff"
        };
        color: ${tipo === "warning" ? "#000" : "#fff"};
        padding: 12px 20px;
        border-radius: 12px;
        margin-bottom: 10px;
        max-width: 350px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        backdrop-filter: blur(10px);
        transform: translateX(400px);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 14px;
        line-height: 1.4;
        border: 1px solid rgba(255,255,255,0.2);
    `;

  const iconos = {
    success: "fas fa-check-circle",
    error: "fas fa-exclamation-circle",
    warning: "fas fa-exclamation-triangle",
    info: "fas fa-info-circle",
  };

  notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <i class="${iconos[tipo]}" style="font-size: 1.2rem;"></i>
            <span style="flex: 1;">${mensaje}</span>
            <button onclick="this.parentElement.parentElement.remove()"
                    style="background: none; border: none; color: inherit; cursor: pointer; font-size: 1.1rem; opacity: 0.7;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

  container.appendChild(notification);

  // Animar entrada
  setTimeout(() => {
    notification.style.transform = "translateX(0)";
  }, 100);

  // Auto-remover
  const timeout = tipo === "error" ? 8000 : tipo === "warning" ? 6000 : 5000;
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.transform = "translateX(400px)";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, timeout);
}

/**
 * Funciones auxiliares
 */
function obtenerTextoEstado(estado) {
  const estados = {
    "pendiente-aceptacion": "Pendiente",
    confirmada: "Confirmada",
    completada: "Completada",
    "cancelada-cliente": "Cancelada",
    "cancelada-experto": "Cancelada",
    rechazada: "Rechazada",
  };
  return estados[estado] || estado;
}

function obtenerIniciales(nombre, apellido) {
  const n = nombre ? nombre.charAt(0).toUpperCase() : "";
  const a = apellido ? apellido.charAt(0).toUpperCase() : "";
  return n + a || "?";
}

// Hacer funciones disponibles globalmente
window.cargarAsesorias = cargarAsesorias;
window.aceptarAsesoria = aceptarAsesoria;
window.rechazarAsesoria = rechazarAsesoria;
window.finalizarAsesoria = finalizarAsesoria;
window.cancelarAsesoria = cancelarAsesoria;
window.contactarExperto = contactarExperto;
window.cerrarModal = cerrarModal;
window.reintentarPago = reintentarPago;
window.verificarEstadoPagoAsesoria = verificarEstadoPagoAsesoria;

console.log("Script misAsesorias.js cargado correctamente");
