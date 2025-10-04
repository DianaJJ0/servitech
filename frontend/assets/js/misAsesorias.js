/**
 * GESTIÓN DE MIS ASESORÍAS - SERVITECH
 * Maneja la visualización y gestión completa del ciclo de vida de asesorías
 * @description Sistema completo para clientes y expertos con roles diferenciados
 */

document.addEventListener("DOMContentLoaded", function () {
  console.log("Inicializando Mis Asesorías...");

  // Verificar autenticación
  if (!verificarAutenticacion()) {
    return;
  }

  // Inicializar componentes
  inicializarFiltros();
  inicializarModales();
  cargarAsesorias();
});

// Variables globales
let usuarioActual = null;
let asesoriaActual = null;
let accionPendiente = null;

/**
 * Verifica si el usuario está autenticado
 * @returns {boolean} True si está autenticado
 */
function verificarAutenticacion() {
  const token = localStorage.getItem("token");
  if (!token) {
    console.log("Usuario no autenticado, redirigiendo...");
    window.location.href = "/login";
    return false;
  }
  return true;
}

/**
 * Carga las asesorías según el filtro seleccionado
 * @param {string} filtro - Filtro a aplicar (todas, pendiente-aceptacion, etc.)
 */
async function cargarAsesorias(filtro = "todas") {
  try {
    console.log("=== CARGANDO ASESORÍAS ===");
    console.log("Filtro seleccionado:", filtro);

    const token = localStorage.getItem("token");
    if (!token) {
      mostrarError("No hay sesión activa");
      return;
    }

    mostrarEstadoCarga();

    // Construir URL con filtros
    let url = "/api/asesorias/mis-asesorias";
    if (filtro !== "todas") {
      url += `?estado=${filtro}`;
    }

    console.log("Consultando URL:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Respuesta del servidor:", response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error del servidor:", errorData);
      throw new Error(errorData.mensaje || `Error ${response.status}`);
    }

    const data = await response.json();
    console.log("Datos recibidos del servidor:", data);

    // Guardar información del usuario actual
    if (data.usuarioActual) {
      usuarioActual = data.usuarioActual;
      console.log("Usuario actual guardado:", usuarioActual);
    } else {
      console.warn("No se recibió información del usuario actual");
      // Fallback: cargar datos del usuario
      await cargarDatosUsuario();
    }

    // Mostrar asesorías
    mostrarAsesorias(data.asesorias || []);
  } catch (error) {
    console.error("Error cargando asesorías:", error);
    mostrarError("Error al cargar las asesorías: " + error.message);
  }
}

/**
 * Carga los datos del usuario actual como fallback
 */
async function cargarDatosUsuario() {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch("/api/usuarios/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const userData = await response.json();
      usuarioActual = {
        email: userData.email,
        nombre: userData.nombre,
        apellido: userData.apellido,
        roles: userData.roles || [],
      };
      console.log("Usuario actual cargado como fallback:", usuarioActual);
    } else {
      console.error("Error cargando datos del usuario");
    }
  } catch (error) {
    console.error("Error obteniendo datos del usuario:", error);
  }
}

/**
 * Muestra las asesorías en la interfaz
 * @param {Array} asesorias - Lista de asesorías a mostrar
 */
function mostrarAsesorias(asesorias) {
  const container = document.getElementById("asesorias-container");

  if (!container) {
    console.error("Contenedor de asesorías no encontrado");
    return;
  }

  console.log("=== MOSTRANDO ASESORÍAS ===");
  console.log("Cantidad de asesorías:", asesorias.length);
  console.log("Usuario actual:", usuarioActual);

  if (asesorias.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-calendar-times"></i>
                </div>
                <h3>No hay asesorías</h3>
                <p>No tienes asesorías con el filtro seleccionado.</p>
                <a href="/expertos.html" class="btn btn-primary">
                    <i class="fas fa-search"></i>
                    Buscar Expertos
                </a>
            </div>
        `;
    return;
  }

  container.innerHTML = asesorias
    .map((asesoria) => crearTarjetaAsesoria(asesoria))
    .join("");
}

/**
 * Crea el HTML de una tarjeta de asesoría
 * @param {Object} asesoria - Datos de la asesoría
 * @returns {string} HTML de la tarjeta
 */
function crearTarjetaAsesoria(asesoria) {
  if (!usuarioActual) {
    console.error("Usuario actual no disponible para crear tarjeta");
    return '<div class="error-card">Error: Usuario no identificado</div>';
  }

  const fecha = new Date(asesoria.fechaHoraInicio);
  const fechaFormateada = fecha.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const horaFormateada = fecha.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const duracionTexto = calcularDuracionTexto(asesoria.duracionMinutos);

  // LÓGICA CLAVE: Determinar si el usuario actual es el experto o cliente
  const esExperto = usuarioActual.email === asesoria.experto.email;
  const esCliente = usuarioActual.email === asesoria.cliente.email;

  console.log("Procesando asesoría:", asesoria.titulo);
  console.log("Email usuario actual:", usuarioActual.email);
  console.log("Email experto:", asesoria.experto.email);
  console.log("Email cliente:", asesoria.cliente.email);
  console.log("¿Es experto?:", esExperto);
  console.log("¿Es cliente?:", esCliente);

  // Determinar qué usuario mostrar (el "otro")
  const otroUsuario = esExperto ? asesoria.cliente : asesoria.experto;
  const rolTexto = esExperto ? "Cliente" : "Experto";

  // Obtener información del estado
  const estadoInfo = obtenerInfoEstado(asesoria.estado);

  // Generar botones según el estado y rol
  const botones = generarBotones(asesoria, esExperto);

  // Información del pago si existe
  const infoPago = asesoria.pagoId
    ? `
        <div class="pago-info">
            <i class="fas fa-credit-card"></i>
            <span>Pago: $${
              asesoria.pagoId.monto
                ? asesoria.pagoId.monto.toLocaleString("es-CO")
                : "N/A"
            } COP</span>
            <span class="pago-estado ${asesoria.pagoId.estado}">${
        asesoria.pagoId.estado || "N/A"
      }</span>
        </div>
    `
    : "";

  return `
        <article class="asesoria-card" data-id="${asesoria._id}">
            <header class="card-header">
                <div class="card-title-section">
                    <h3 class="card-title" title="${asesoria.titulo}">${asesoria.titulo}</h3>
                    <span class="estado-badge ${estadoInfo.clase}">${estadoInfo.texto}</span>
                </div>
                <div class="card-date">
                    <i class="fas fa-calendar"></i>
                    <time datetime="${asesoria.fechaHoraInicio}">
                        ${fechaFormateada}
                    </time>
                </div>
            </header>

            <div class="card-content">
                <div class="asesoria-info">
                    <div class="info-item">
                        <i class="fas fa-user"></i>
                        <span>${rolTexto}: ${otroUsuario.nombre} ${otroUsuario.apellido}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-clock"></i>
                        <span>${horaFormateada} - ${duracionTexto}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-tag"></i>
                        <span>${asesoria.categoria}</span>
                    </div>
                    ${infoPago}
                </div>

                <div class="asesoria-descripcion">
                    <p title="${asesoria.descripcion}">${asesoria.descripcion}</p>
                </div>
            </div>

            <footer class="card-footer">
                <div class="card-actions">
                    ${botones}
                </div>
            </footer>
        </article>
    `;
}

/**
 * Obtiene información del estado para mostrar
 * @param {string} estado - Estado de la asesoría
 * @returns {Object} Información del estado
 */
function obtenerInfoEstado(estado) {
  const estados = {
    "pendiente-aceptacion": {
      clase: "pendiente",
      texto: "Pendiente de aceptación",
    },
    confirmada: { clase: "confirmada", texto: "Confirmada" },
    "en-progreso": { clase: "en-progreso", texto: "En progreso" },
    completada: { clase: "completada", texto: "Completada" },
    cancelada: { clase: "cancelada", texto: "Cancelada" },
    rechazada: { clase: "rechazada", texto: "Rechazada" },
  };

  return estados[estado] || { clase: "pendiente", texto: estado };
}

/**
 * Genera botones según el estado y rol del usuario
 * @param {Object} asesoria - Datos de la asesoría
 * @param {boolean} esExperto - Si el usuario actual es el experto
 * @returns {string} HTML de los botones
 */
function generarBotones(asesoria, esExperto) {
  console.log("=== GENERANDO BOTONES ===");
  console.log("Estado:", asesoria.estado);
  console.log("Es experto:", esExperto);

  let botones = "";

  switch (asesoria.estado) {
    case "pendiente-aceptacion":
      if (esExperto) {
        // EXPERTO: Puede aceptar o rechazar
        console.log("Generando botones para EXPERTO en estado PENDIENTE");
        botones = `
                    <button class="btn btn-success" onclick="confirmarAccion('aceptar', '${asesoria._id}', '${asesoria.titulo}')">
                        <i class="fas fa-check"></i> Aceptar
                    </button>
                    <button class="btn btn-danger" onclick="confirmarAccion('rechazar', '${asesoria._id}', '${asesoria.titulo}')">
                        <i class="fas fa-times"></i> Rechazar
                    </button>
                    <button class="btn btn-outline-secondary" onclick="verDetalles('${asesoria._id}')">
                        <i class="fas fa-info-circle"></i> Detalles
                    </button>
                `;
      } else {
        // CLIENTE: Solo puede cancelar
        console.log("Generando botones para CLIENTE en estado PENDIENTE");
        botones = `
                    <button class="btn btn-outline" onclick="confirmarAccion('cancelar', '${asesoria._id}', '${asesoria.titulo}')">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button class="btn btn-outline-secondary" onclick="verDetalles('${asesoria._id}')">
                        <i class="fas fa-info-circle"></i> Detalles
                    </button>
                `;
      }
      break;

    case "confirmada":
      console.log("Generando botones para estado CONFIRMADA");
      // AMBOS: Pueden iniciar, finalizar y cancelar
      botones = `
                <button class="btn btn-primary" onclick="iniciarAsesoria('${asesoria._id}')">
                    <i class="fas fa-video"></i> Iniciar
                </button>
                <button class="btn btn-success" onclick="confirmarAccion('finalizar', '${asesoria._id}', '${asesoria.titulo}')">
                    <i class="fas fa-check-circle"></i> Finalizar
                </button>
                <button class="btn btn-outline" onclick="confirmarAccion('cancelar', '${asesoria._id}', '${asesoria.titulo}')">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button class="btn btn-outline-secondary" onclick="verDetalles('${asesoria._id}')">
                    <i class="fas fa-info-circle"></i> Detalles
                </button>
            `;
      break;

    case "en-progreso":
      console.log("Generando botones para estado EN PROGRESO");
      // AMBOS: Solo finalizar y ver detalles
      botones = `
                <button class="btn btn-success" onclick="confirmarAccion('finalizar', '${asesoria._id}', '${asesoria.titulo}')">
                    <i class="fas fa-check-circle"></i> Finalizar
                </button>
                <button class="btn btn-outline-secondary" onclick="verDetalles('${asesoria._id}')">
                    <i class="fas fa-info-circle"></i> Detalles
                </button>
            `;
      break;

    case "completada":
    case "cancelada":
    case "rechazada":
      console.log("Generando botones para estado FINAL");
      // AMBOS: Solo ver detalles
      botones = `
                <button class="btn btn-outline" onclick="verDetalles('${asesoria._id}')">
                    <i class="fas fa-eye"></i> Ver detalles
                </button>
            `;
      break;

    default:
      console.log("Generando botones para estado DEFAULT");
      botones = `
                <button class="btn btn-outline-secondary" onclick="verDetalles('${asesoria._id}')">
                    <i class="fas fa-info-circle"></i> Ver detalles
                </button>
            `;
  }

  console.log("Botones generados:", botones);
  return botones;
}

/**
 * Calcula el texto de duración legible
 * @param {number} minutos - Duración en minutos
 * @returns {string} Texto legible
 */
function calcularDuracionTexto(minutos) {
  if (minutos === 60) return "1 hora";
  if (minutos === 90) return "1.5 horas";
  if (minutos === 120) return "2 horas";
  if (minutos === 180) return "3 horas";
  return `${minutos} minutos`;
}

/**
 * Inicializa los filtros de asesorías
 */
function inicializarFiltros() {
  const filtros = document.querySelectorAll(".filtro-asesoria");

  filtros.forEach((filtro) => {
    filtro.addEventListener("click", function () {
      // Remover clase activa de todos los filtros
      filtros.forEach((f) => f.classList.remove("active"));

      // Agregar clase activa al filtro seleccionado
      this.classList.add("active");

      // Cargar asesorías con el filtro seleccionado
      const filtroSeleccionado = this.dataset.filtro;
      console.log("Filtro seleccionado:", filtroSeleccionado);
      cargarAsesorias(filtroSeleccionado);
    });
  });
}

/**
 * Inicializa los modales
 */
function inicializarModales() {
  // Modal de detalles
  const modalDetalles = document.getElementById("modal-detalles");
  const closeDetalles = modalDetalles?.querySelector(".close");

  if (closeDetalles) {
    closeDetalles.addEventListener("click", function () {
      modalDetalles.style.display = "none";
    });
  }

  // Modal de confirmación
  const modalConfirmacion = document.getElementById("modal-confirmacion");
  const closeConfirmacion = modalConfirmacion?.querySelector(".close");

  if (closeConfirmacion) {
    closeConfirmacion.addEventListener("click", cerrarModalConfirmacion);
  }

  // Cerrar modales al hacer clic fuera
  window.addEventListener("click", function (event) {
    if (event.target === modalDetalles) {
      modalDetalles.style.display = "none";
    }
    if (event.target === modalConfirmacion) {
      cerrarModalConfirmacion();
    }
  });
}

/**
 * Muestra modal de confirmación para acciones
 * @param {string} accion - Tipo de acción (aceptar, rechazar, cancelar, finalizar)
 * @param {string} asesoriaId - ID de la asesoría
 * @param {string} titulo - Título de la asesoría
 */
function confirmarAccion(accion, asesoriaId, titulo) {
  console.log("=== CONFIRMAR ACCIÓN ===");
  console.log("Acción:", accion);
  console.log("AsesoriaId:", asesoriaId);

  const modal = document.getElementById("modal-confirmacion");
  const titleElement = document.getElementById("confirm-title");
  const messageElement = document.getElementById("confirm-message");
  const inputContainer = document.getElementById("confirm-input-container");
  const actionButton = document.getElementById("confirm-action");

  // Configurar modal según la acción
  const configuraciones = {
    aceptar: {
      titulo: "Aceptar Asesoría",
      mensaje: `¿Estás seguro de que quieres aceptar la asesoría "${titulo}"?`,
      boton: '<i class="fas fa-check"></i> Aceptar',
      clase: "btn-success",
      mostrarInput: false,
    },
    rechazar: {
      titulo: "Rechazar Asesoría",
      mensaje: `¿Estás seguro de que quieres rechazar la asesoría "${titulo}"?`,
      boton: '<i class="fas fa-times"></i> Rechazar',
      clase: "btn-danger",
      mostrarInput: true,
    },
    cancelar: {
      titulo: "Cancelar Asesoría",
      mensaje: `¿Estás seguro de que quieres cancelar la asesoría "${titulo}"?`,
      boton: '<i class="fas fa-times"></i> Cancelar Asesoría',
      clase: "btn-danger",
      mostrarInput: true,
    },
    finalizar: {
      titulo: "Finalizar Asesoría",
      mensaje: `¿Estás seguro de que quieres finalizar la asesoría "${titulo}"? Esta acción liberará el pago al experto.`,
      boton: '<i class="fas fa-check-circle"></i> Finalizar',
      clase: "btn-success",
      mostrarInput: true,
    },
  };

  const config = configuraciones[accion];
  if (!config) {
    console.error("Acción no reconocida:", accion);
    return;
  }

  // Configurar modal
  titleElement.textContent = config.titulo;
  messageElement.textContent = config.mensaje;
  actionButton.innerHTML = config.boton;
  actionButton.className = `btn ${config.clase}`;

  // Mostrar/ocultar input de motivo
  if (config.mostrarInput) {
    inputContainer.style.display = "block";
    document.getElementById("confirm-input").value = "";
  } else {
    inputContainer.style.display = "none";
  }

  // Configurar acción del botón
  actionButton.onclick = () => ejecutarAccion(accion, asesoriaId);

  // Guardar datos para referencia
  accionPendiente = { accion, asesoriaId, titulo };

  // Mostrar modal
  modal.style.display = "block";
}

/**
 * Ejecuta la acción confirmada
 * @param {string} accion - Tipo de acción
 * @param {string} asesoriaId - ID de la asesoría
 */
async function ejecutarAccion(accion, asesoriaId) {
  try {
    console.log("=== EJECUTANDO ACCIÓN ===");
    console.log("Acción:", accion);
    console.log("AsesoriaId:", asesoriaId);

    const motivo = document.getElementById("confirm-input").value.trim();

    cerrarModalConfirmacion();
    mostrarEstadoCarga();

    const token = localStorage.getItem("token");
    const url = `/api/asesorias/${asesoriaId}/${accion}`;

    const body = {};
    if (motivo && ["rechazar", "cancelar"].includes(accion)) {
      body.motivo = motivo;
    }
    if (motivo && accion === "finalizar") {
      body.comentarios = motivo;
    }

    console.log(`Enviando petición ${accion} a:`, url);
    console.log("Body:", body);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    });

    console.log("Respuesta del servidor:", response.status);

    if (response.ok) {
      const result = await response.json();
      console.log(`${accion} exitoso:`, result);

      mostrarNotificacion(
        `Asesoría ${
          accion === "aceptar"
            ? "aceptada"
            : accion === "rechazar"
            ? "rechazada"
            : accion === "cancelar"
            ? "cancelada"
            : "finalizada"
        } correctamente`,
        "success"
      );

      // Recargar asesorías
      cargarAsesorias();
    } else {
      const error = await response.json();
      console.error("Error del servidor:", error);
      throw new Error(error.mensaje || `Error al ${accion} la asesoría`);
    }
  } catch (error) {
    console.error(`Error ejecutando ${accion}:`, error);
    mostrarError(error.message);
  }
}

/**
 * Inicia una asesoría
 * @param {string} asesoriaId - ID de la asesoría
 */
async function iniciarAsesoria(asesoriaId) {
  try {
    console.log("=== INICIAR ASESORÍA ===");
    console.log("AsesoriaId:", asesoriaId);

    mostrarEstadoCarga();

    const token = localStorage.getItem("token");

    const response = await fetch(`/api/asesorias/${asesoriaId}/iniciar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      mostrarNotificacion("Asesoría iniciada correctamente", "success");
      cargarAsesorias();
    } else {
      const error = await response.json();
      throw new Error(error.mensaje || "Error al iniciar la asesoría");
    }
  } catch (error) {
    console.error("Error iniciando asesoría:", error);
    mostrarError(error.message);
  }
}

/**
 * Muestra los detalles de una asesoría
 * @param {string} asesoriaId - ID de la asesoría
 */
async function verDetalles(asesoriaId) {
  try {
    console.log("=== VER DETALLES ===");
    console.log("AsesoriaId:", asesoriaId);

    const token = localStorage.getItem("token");

    const response = await fetch(`/api/asesorias/${asesoriaId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const asesoria = await response.json();
      mostrarModalDetalles(asesoria);
    } else {
      const error = await response.json();
      throw new Error(error.mensaje || "Error al obtener detalles");
    }
  } catch (error) {
    console.error("Error obteniendo detalles:", error);
    mostrarError(error.message);
  }
}

/**
 * Muestra el modal con detalles de la asesoría
 * @param {Object} asesoria - Datos de la asesoría
 */
function mostrarModalDetalles(asesoria) {
  const modal = document.getElementById("modal-detalles");
  const content = document.getElementById("detalles-content");

  if (!modal || !content) {
    console.error("Modal de detalles no encontrado");
    return;
  }

  const fecha = new Date(asesoria.fechaHoraInicio);
  const fechaFormateada = fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const horaFormateada = fecha.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const duracionTexto = calcularDuracionTexto(asesoria.duracionMinutos);
  const estadoInfo = obtenerInfoEstado(asesoria.estado);

  // Información del pago
  const infoPago = asesoria.pagoId
    ? `
        <div class="detalle-pago">
            <h4>Información del Pago</h4>
            <p><strong>Monto:</strong> $${
              asesoria.pagoId.monto
                ? asesoria.pagoId.monto.toLocaleString("es-CO")
                : "N/A"
            } COP</p>
            <p><strong>Estado del pago:</strong> <span class="pago-estado ${
              asesoria.pagoId.estado
            }">${asesoria.pagoId.estado || "N/A"}</span></p>
            <p><strong>Método:</strong> ${asesoria.pagoId.metodo || "N/A"}</p>
        </div>
    `
    : "";

  content.innerHTML = `
        <div class="detalles-grid">
            <h3>${asesoria.titulo}</h3>

            <div class="detalle-seccion">
                <h4>Información General</h4>
                <div class="detalle-info">
                    <p><strong>Estado:</strong> <span class="estado-badge ${
                      estadoInfo.clase
                    }">${estadoInfo.texto}</span></p>
                    <p><strong>Fecha:</strong> ${fechaFormateada}</p>
                    <p><strong>Hora:</strong> ${horaFormateada}</p>
                    <p><strong>Duración:</strong> ${duracionTexto}</p>
                    <p><strong>Categoría:</strong> ${asesoria.categoria}</p>
                </div>
            </div>

            <div class="detalle-seccion">
                <h4>Participantes</h4>
                <div class="detalle-info">
                    <p><strong>Cliente:</strong> ${asesoria.cliente.nombre} ${
    asesoria.cliente.apellido
  }</p>
                    <p><strong>Experto:</strong> ${asesoria.experto.nombre} ${
    asesoria.experto.apellido
  }</p>
                </div>
            </div>

            ${infoPago}

            <div class="detalle-seccion">
                <h4>Descripción</h4>
                <div class="detalle-descripcion">
                    <p>${asesoria.descripcion}</p>
                </div>
            </div>

            ${
              asesoria.comentarios
                ? `
                <div class="detalle-seccion">
                    <h4>Comentarios</h4>
                    <div class="detalle-comentarios">
                        <p>${asesoria.comentarios}</p>
                    </div>
                </div>
            `
                : ""
            }

            ${
              asesoria.calificacion
                ? `
                <div class="detalle-seccion">
                    <h4>Calificación</h4>
                    <div class="detalle-calificacion">
                        <div class="estrellas">
                            ${"★".repeat(asesoria.calificacion)}${"☆".repeat(
                    5 - asesoria.calificacion
                  )}
                        </div>
                        <span>(${asesoria.calificacion}/5)</span>
                    </div>
                </div>
            `
                : ""
            }
        </div>
    `;

  modal.style.display = "block";
}

/**
 * Cierra el modal de confirmación
 */
function cerrarModalConfirmacion() {
  const modal = document.getElementById("modal-confirmacion");
  modal.style.display = "none";
  accionPendiente = null;
}

/**
 * Muestra estado de carga
 */
function mostrarEstadoCarga() {
  const container = document.getElementById("asesorias-container");

  container.innerHTML = `
        <div class="loading-container">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Procesando...</p>
        </div>
    `;
}

/**
 * Muestra mensaje de error
 * @param {string} mensaje - Mensaje de error
 */
function mostrarError(mensaje) {
  const container = document.getElementById("asesorias-container");

  container.innerHTML = `
        <div class="error-container">
            <div class="error-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Error al cargar asesorías</h3>
            <p>${mensaje}</p>
            <div class="error-actions">
                <button class="btn btn-primary" onclick="cargarAsesorias()">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
                <a href="/contacto.html" class="btn btn-outline">
                    <i class="fas fa-life-ring"></i> Contactar Soporte
                </a>
            </div>
        </div>
    `;
}

/**
 * Muestra notificación temporal
 * @param {string} mensaje - Mensaje a mostrar
 * @param {string} tipo - Tipo de notificación (success, error, warning)
 */
function mostrarNotificacion(mensaje, tipo = "success") {
  // Crear notificación
  const notificacion = document.createElement("div");
  notificacion.className = `notification ${tipo}`;

  const iconos = {
    success: "fas fa-check-circle",
    error: "fas fa-exclamation-triangle",
    warning: "fas fa-exclamation-circle",
  };

  notificacion.innerHTML = `
        <i class="${iconos[tipo]}"></i>
        <span>${mensaje}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

  // Agregar al body
  document.body.appendChild(notificacion);

  // Auto-remover después de 5 segundos
  setTimeout(() => {
    if (notificacion.parentNode) {
      notificacion.remove();
    }
  }, 5000);
}

// Hacer funciones disponibles globalmente
window.cargarAsesorias = cargarAsesorias;
window.verDetalles = verDetalles;
window.iniciarAsesoria = iniciarAsesoria;
window.confirmarAccion = confirmarAccion;
window.cerrarModalConfirmacion = cerrarModalConfirmacion;

console.log("Script misAsesorias.js cargado correctamente");
