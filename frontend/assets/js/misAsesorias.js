/**
 * MIS ASESORIAS - GESTION COMPLETA
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
 * Genera HTML para una tarjeta de asesoría
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
        <div class="asesoria-card">
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
 * Genera los botones de acción según el estado y rol
 */
function generarBotonesAccion(asesoria, esExperto) {
  const botones = [];

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
                        Cancelar Solicitud
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
      // Solo mostrar información, sin acciones
      break;
  }

  return botones.join("");
}

/**
 * Acepta una asesoría (solo expertos)
 */
async function aceptarAsesoria(asesoriaId) {
  try {
    await confirmarAccion(
      "Aceptar Asesoría",
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
    await confirmarAccion(
      "Rechazar Asesoría",
      "¿Estás seguro de rechazar esta asesoría? El pago será reembolsado al cliente.",
      async () => {
        const token = localStorage.getItem("token");
        const response = await fetch(`/api/asesorias/${asesoriaId}/rechazar`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.mensaje || "Error al rechazar asesoría");
        }

        mostrarNotificacion(
          "Asesoría rechazada. El pago será reembolsado.",
          "success"
        );
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
    await confirmarAccion(
      "Finalizar Asesoría",
      "¿Estás seguro de finalizar esta asesoría? El pago será liberado al experto.",
      async () => {
        const token = localStorage.getItem("token");
        const response = await fetch(`/api/asesorias/${asesoriaId}/finalizar`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.mensaje || "Error al finalizar asesoría");
        }

        mostrarNotificacion(
          "Asesoría finalizada. El pago fue liberado al experto.",
          "success"
        );
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

    await confirmarAccion("Cancelar Asesoría", mensaje, async () => {
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
  notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: bold; font-size: 16px;">${icono}</span>
            <span>${mensaje}</span>
        </div>
    `;

  container.appendChild(notification);

  // Animar entrada
  setTimeout(() => {
    notification.style.transform = "translateX(0)";
  }, 100);

  // Auto-remover
  setTimeout(() => {
    notification.style.transform = "translateX(400px)";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 5000);
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
