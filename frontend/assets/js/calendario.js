/**
 * CALENDARIO DE ASESORIAS - FUNCIONALIDAD COMPLETA
 * Maneja la seleccion de fechas, horarios continuos y envio de solicitudes
 */

document.addEventListener("DOMContentLoaded", function () {
  inicializarCalendario();
  configurarFormulario();
  configurarEventListeners();
});

// Variables globales
let expertoData = null;
let usuarioData = null;
let asesoriasExistentes = [];
let fechaSeleccionada = null;
let horaSeleccionada = null;
let precioPorHora = 20000;

/**
 * Inicializa el calendario con datos del experto
 */
function inicializarCalendario() {
  try {
    // Obtener datos del DOM
    const expertoScript = document.getElementById("expertoData");
    const usuarioScript = document.getElementById("usuarioData");
    const asesoriasScript = document.getElementById("asesoriasData");

    if (expertoScript) {
      expertoData = JSON.parse(expertoScript.textContent);
      precioPorHora = expertoData.infoExperto?.precioPorHora || 20000;
    }

    if (usuarioScript) {
      usuarioData = JSON.parse(usuarioScript.textContent);
    }

    if (asesoriasScript) {
      asesoriasExistentes = JSON.parse(asesoriasScript.textContent);
    }

    console.log("Datos cargados:", {
      expertoData,
      usuarioData,
      asesoriasExistentes,
    });

    // Generar calendario
    generarCalendario();
  } catch (error) {
    console.error("Error inicializando calendario:", error);
    mostrarMensaje("Error al cargar el calendario", "error");
  }
}

/**
 * Genera el calendario visual
 */
function generarCalendario() {
  const calendarContainer = document.getElementById("calendar");
  if (!calendarContainer) return;

  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const anoActual = ahora.getFullYear();

  // Estructura del calendario
  calendarContainer.innerHTML = `
        <div class="calendar-nav">
            <button class="calendar-btn" id="prevMonth" type="button">
                <i class="fas fa-chevron-left"></i>
            </button>
            <span class="calendar-title" id="monthTitle">
                ${obtenerNombreMes(mesActual)} ${anoActual}
            </span>
            <button class="calendar-btn" id="nextMonth" type="button">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        <table class="calendar-table">
            <thead>
                <tr>
                    <th>Dom</th>
                    <th>Lun</th>
                    <th>Mar</th>
                    <th>Mie</th>
                    <th>Jue</th>
                    <th>Vie</th>
                    <th>Sab</th>
                </tr>
            </thead>
            <tbody id="calendarBody">
            </tbody>
        </table>
    `;

  // Generar dias del mes
  generarDiasDelMes(anoActual, mesActual);

  // Event listeners para navegacion
  document.getElementById("prevMonth").addEventListener("click", () => {
    const nuevaFecha = new Date(anoActual, mesActual - 1, 1);
    generarCalendario();
  });

  document.getElementById("nextMonth").addEventListener("click", () => {
    const nuevaFecha = new Date(anoActual, mesActual + 1, 1);
    generarCalendario();
  });
}

/**
 * Genera los dias del mes en el calendario
 */
function generarDiasDelMes(ano, mes) {
  const calendarBody = document.getElementById("calendarBody");
  const primerDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const diasEnMes = ultimoDia.getDate();
  const diaSemanaInicio = primerDia.getDay();

  let html = "";
  let fecha = 1;

  // Generar semanas
  for (let semana = 0; semana < 6; semana++) {
    html += "<tr>";

    // Generar dias de la semana
    for (let dia = 0; dia < 7; dia++) {
      if (semana === 0 && dia < diaSemanaInicio) {
        // Dias vacios al inicio
        html += '<td class="inactive"></td>';
      } else if (fecha > diasEnMes) {
        // Dias vacios al final
        html += '<td class="inactive"></td>';
      } else {
        // Dias del mes actual
        const fechaActual = new Date(ano, mes, fecha);
        const hoy = new Date();
        const esHoy = fechaActual.toDateString() === hoy.toDateString();
        const esPasado = fechaActual < hoy && !esHoy;
        const esDisponible = !esPasado && esDiaDisponible(fechaActual);

        let clases = [];
        if (esPasado) clases.push("inactive");
        else if (esDisponible) clases.push("available");

        html += `<td class="${clases.join(" ")}" data-fecha="${ano}-${(mes + 1)
          .toString()
          .padStart(2, "0")}-${fecha
          .toString()
          .padStart(2, "0")}">${fecha}</td>`;
        fecha++;
      }
    }

    html += "</tr>";

    // Si ya terminamos el mes, salir del bucle
    if (fecha > diasEnMes) break;
  }

  calendarBody.innerHTML = html;

  // Agregar event listeners a los dias disponibles
  calendarBody.querySelectorAll("td.available").forEach((td) => {
    td.addEventListener("click", function () {
      seleccionarFecha(this.dataset.fecha);
    });
  });
}

/**
 * Verifica si un dia esta disponible para asesorias
 */
function esDiaDisponible(fecha) {
  // Por simplicidad, todos los dias futuros estan disponibles
  return true;
}

/**
 * Selecciona una fecha en el calendario
 */
function seleccionarFecha(fechaStr) {
  // Remover seleccion anterior
  document.querySelectorAll(".calendar-table td.selected").forEach((td) => {
    td.classList.remove("selected");
  });

  // Agregar seleccion nueva
  const tdSeleccionado = document.querySelector(`[data-fecha="${fechaStr}"]`);
  if (tdSeleccionado) {
    tdSeleccionado.classList.add("selected");
  }

  fechaSeleccionada = fechaStr;
  horaSeleccionada = null; // Reset hora al cambiar fecha

  // Actualizar input de fecha
  const fechaInput = document.getElementById("fechaSeleccionada");
  if (fechaInput) {
    const fecha = new Date(fechaStr + "T12:00:00");
    fechaInput.value = fecha.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // Limpiar hora seleccionada
  const horaInput = document.getElementById("horaSeleccionada");
  if (horaInput) {
    horaInput.value = "";
  }

  // Generar horarios disponibles
  generarHorariosDisponibles(fechaStr);

  // Actualizar resumen
  actualizarResumen();

  // Mostrar seccion de horarios
  const horariosSection = document.getElementById("horariosSection");
  if (horariosSection) {
    horariosSection.style.display = "block";
  }
}

/**
 * Genera los horarios disponibles para una fecha
 */
function generarHorariosDisponibles(fecha) {
  const horariosGrid = document.getElementById("horariosGrid");
  if (!horariosGrid) return;

  // Horarios disponibles de 8:00 a 17:30 (para permitir asesorias que terminen a las 18:00)
  const horarios = [];
  for (let hora = 8; hora <= 17; hora++) {
    horarios.push(`${hora.toString().padStart(2, "0")}:00`);
    if (hora < 17) {
      // No agregar :30 para las 17:00
      horarios.push(`${hora.toString().padStart(2, "0")}:30`);
    }
  }

  let html = "";
  horarios.forEach((horario) => {
    const disponible = verificarDisponibilidadHorario(fecha, horario);
    const clases = disponible ? "horario-slot" : "horario-slot ocupado";
    const titulo = disponible
      ? "Disponible"
      : "No disponible para la duración seleccionada";

    html += `
            <div class="${clases}" data-horario="${horario}" title="${titulo}" ${
      disponible ? "onclick=\"seleccionarHorario('" + horario + "')\"" : ""
    }>
                ${horario}
            </div>
        `;
  });

  horariosGrid.innerHTML = html;
}

/**
 * Verifica si un horario esta disponible considerando la duracion seleccionada
 */
function verificarDisponibilidadHorario(fecha, horario) {
  const duracionSeleccionada = document.querySelector(
    'input[name="duracion"]:checked'
  );
  const duracionMinutos = duracionSeleccionada
    ? parseInt(duracionSeleccionada.value)
    : 60;

  // Convertir horario a Date
  const [horas, minutos] = horario.split(":").map(Number);
  const fechaHoraInicio = new Date(fecha + "T" + horario + ":00");
  const fechaHoraFin = new Date(
    fechaHoraInicio.getTime() + duracionMinutos * 60000
  );

  // Verificar que no exceda las 18:00
  const limiteHora = new Date(fecha + "T18:00:00");
  if (fechaHoraFin > limiteHora) {
    return false;
  }

  // Verificar conflictos con asesorias existentes
  for (const asesoria of asesoriasExistentes) {
    if (
      asesoria.estado !== "pendiente-aceptacion" &&
      asesoria.estado !== "confirmada"
    ) {
      continue; // Ignorar asesorias canceladas, rechazadas, etc.
    }

    const asesoriaInicio = new Date(asesoria.fechaHoraInicio);
    const asesoriaFin = new Date(
      asesoriaInicio.getTime() + asesoria.duracionMinutos * 60000
    );

    // Verificar si hay solapamiento
    if (fechaHoraInicio < asesoriaFin && fechaHoraFin > asesoriaInicio) {
      return false;
    }
  }

  return true;
}

/**
 * Selecciona un horario
 */
function seleccionarHorario(horario) {
  // Verificar disponibilidad antes de seleccionar
  if (!verificarDisponibilidadHorario(fechaSeleccionada, horario)) {
    mostrarMensaje(
      "Este horario no esta disponible para la duracion seleccionada",
      "error"
    );
    return;
  }

  // Remover seleccion anterior
  document.querySelectorAll(".horario-slot.selected").forEach((slot) => {
    slot.classList.remove("selected");
  });

  // Agregar nueva seleccion
  const slotSeleccionado = document.querySelector(
    `[data-horario="${horario}"]`
  );
  if (slotSeleccionado && !slotSeleccionado.classList.contains("ocupado")) {
    slotSeleccionado.classList.add("selected");
    horaSeleccionada = horario;

    // Actualizar input de hora
    const horaInput = document.getElementById("horaSeleccionada");
    if (horaInput) {
      horaInput.value = horario;
    }

    // Actualizar resumen
    actualizarResumen();

    // Mostrar visualmente el bloque de tiempo reservado
    mostrarBloqueReservado();
  }
}

/**
 * Muestra visualmente el bloque de tiempo que sera reservado
 */
function mostrarBloqueReservado() {
  // Remover indicaciones anteriores
  document
    .querySelectorAll(".horario-slot.reservado-preview")
    .forEach((slot) => {
      slot.classList.remove("reservado-preview");
    });

  if (!horaSeleccionada) return;

  const duracionSeleccionada = document.querySelector(
    'input[name="duracion"]:checked'
  );
  const duracionMinutos = duracionSeleccionada
    ? parseInt(duracionSeleccionada.value)
    : 60;

  // Calcular cuantos slots de 30 minutos ocupa
  const slotsNecesarios = Math.ceil(duracionMinutos / 30);

  // Encontrar el slot inicial
  const slotInicial = document.querySelector(
    `[data-horario="${horaSeleccionada}"]`
  );
  if (!slotInicial) return;

  // Marcar todos los slots que seran ocupados
  let slotActual = slotInicial;
  for (let i = 0; i < slotsNecesarios && slotActual; i++) {
    slotActual.classList.add("reservado-preview");
    slotActual = slotActual.nextElementSibling;
  }
}

/**
 * Configura el formulario de asesoria
 */
function configurarFormulario() {
  const form = document.getElementById("formAgendarAsesoria");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    enviarSolicitudAsesoria();
  });
}

/**
 * Configura event listeners adicionales
 */
function configurarEventListeners() {
  // Cambio en duracion
  const duracionOptions = document.querySelectorAll('input[name="duracion"]');
  duracionOptions.forEach((option) => {
    option.addEventListener("change", function () {
      // Regenerar horarios disponibles cuando cambie la duracion
      if (fechaSeleccionada) {
        horaSeleccionada = null;
        const horaInput = document.getElementById("horaSeleccionada");
        if (horaInput) horaInput.value = "";

        // Remover seleccion de horario
        document.querySelectorAll(".horario-slot.selected").forEach((slot) => {
          slot.classList.remove("selected");
        });
        document
          .querySelectorAll(".horario-slot.reservado-preview")
          .forEach((slot) => {
            slot.classList.remove("reservado-preview");
          });

        generarHorariosDisponibles(fechaSeleccionada);
      }
      actualizarResumen();
    });
  });

  // Cambios en campos del formulario
  const campos = ["tituloAsesoria", "descripcionAsesoria"];
  campos.forEach((campoId) => {
    const campo = document.getElementById(campoId);
    if (campo) {
      campo.addEventListener("input", validarFormulario);
    }
  });
}

/**
 * Actualiza el resumen de la solicitud
 */
function actualizarResumen() {
  const resumenFecha = document.getElementById("resumenFecha");
  const resumenHora = document.getElementById("resumenHora");
  const resumenHoraFin = document.getElementById("resumenHoraFin");
  const resumenDuracion = document.getElementById("resumenDuracion");
  const resumenTotal = document.getElementById("resumenTotal");

  // Actualizar fecha
  if (resumenFecha && fechaSeleccionada) {
    const fecha = new Date(fechaSeleccionada + "T12:00:00");
    resumenFecha.textContent = fecha.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  // Actualizar hora
  if (resumenHora && horaSeleccionada) {
    resumenHora.textContent = horaSeleccionada;
  }

  // Actualizar duracion, hora fin y precio
  const duracionSeleccionada = document.querySelector(
    'input[name="duracion"]:checked'
  );
  if (duracionSeleccionada && resumenDuracion && resumenTotal) {
    const minutos = parseInt(duracionSeleccionada.value);
    const horas = minutos / 60;

    // Actualizar duracion
    if (horas === 1) {
      resumenDuracion.textContent = "1 hora";
    } else if (horas === 1.5) {
      resumenDuracion.textContent = "1.5 horas";
    } else {
      resumenDuracion.textContent = `${horas} horas`;
    }

    // Calcular y mostrar hora fin
    if (resumenHoraFin && horaSeleccionada) {
      const [horaInicio, minutosInicio] = horaSeleccionada
        .split(":")
        .map(Number);
      const fechaHoraInicio = new Date();
      fechaHoraInicio.setHours(horaInicio, minutosInicio, 0, 0);
      const fechaHoraFin = new Date(
        fechaHoraInicio.getTime() + minutos * 60000
      );

      const horaFin = fechaHoraFin.getHours().toString().padStart(2, "0");
      const minutosFin = fechaHoraFin.getMinutes().toString().padStart(2, "0");
      resumenHoraFin.textContent = `${horaFin}:${minutosFin}`;
    }

    // Calcular precio
    const precio = precioPorHora * horas;
    resumenTotal.textContent = `$${precio.toLocaleString("es-CO")} COP`;
  }
}

/**
 * Valida el formulario
 */
function validarFormulario() {
  const titulo = document.getElementById("tituloAsesoria").value.trim();
  const descripcion = document
    .getElementById("descripcionAsesoria")
    .value.trim();
  const btnEnviar = document.getElementById("btnEnviarSolicitud");

  const esValido =
    titulo.length >= 5 &&
    descripcion.length >= 10 &&
    fechaSeleccionada &&
    horaSeleccionada;

  if (btnEnviar) {
    btnEnviar.disabled = !esValido;
    btnEnviar.style.opacity = esValido ? "1" : "0.6";
  }

  return esValido;
}

/**
 * Envia la solicitud de asesoria
 */
async function enviarSolicitudAsesoria() {
  if (!validarFormulario()) {
    mostrarMensaje("Por favor completa todos los campos requeridos", "error");
    return;
  }

  const btnEnviar = document.getElementById("btnEnviarSolicitud");
  if (btnEnviar) {
    btnEnviar.disabled = true;
    btnEnviar.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Enviando solicitud...';
  }

  try {
    const duracionSeleccionada = document.querySelector(
      'input[name="duracion"]:checked'
    );
    const duracionMinutos = parseInt(duracionSeleccionada.value);

    // Construir fecha y hora de inicio
    const fechaHoraInicio = new Date(
      fechaSeleccionada + "T" + horaSeleccionada + ":00"
    );

    // Recopilar datos del formulario segun el modelo
    const formData = {
      titulo: document.getElementById("tituloAsesoria").value.trim(),
      descripcion: document.getElementById("descripcionAsesoria").value.trim(),
      experto: {
        email: expertoData.email,
        nombre: expertoData.nombre,
        apellido: expertoData.apellido,
        avatarUrl: expertoData.avatarUrl || null,
      },
      fechaHoraInicio: fechaHoraInicio.toISOString(),
      duracionMinutos: duracionMinutos,
      categoria: "Tecnologia",
    };

    console.log("Enviando solicitud:", formData);

    // Enviar al backend
    const token = localStorage.getItem("token");
    const response = await fetch("/api/asesorias", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.mensaje || "Error al crear la asesoria");
    }

    // Exito
    mostrarMensaje(
      "Solicitud enviada exitosamente. El experto sera notificado.",
      "success"
    );

    // Limpiar formulario
    document.getElementById("formAgendarAsesoria").reset();
    fechaSeleccionada = null;
    horaSeleccionada = null;

    // Ocultar seccion de horarios
    const horariosSection = document.getElementById("horariosSection");
    if (horariosSection) {
      horariosSection.style.display = "none";
    }

    // Remover selecciones
    document.querySelectorAll(".calendar-table td.selected").forEach((td) => {
      td.classList.remove("selected");
    });
    document
      .querySelectorAll(
        ".horario-slot.selected, .horario-slot.reservado-preview"
      )
      .forEach((slot) => {
        slot.classList.remove("selected", "reservado-preview");
      });

    // Actualizar resumen
    actualizarResumen();
  } catch (error) {
    console.error("Error enviando solicitud:", error);
    mostrarMensaje("Error al enviar la solicitud: " + error.message, "error");
  } finally {
    if (btnEnviar) {
      btnEnviar.disabled = false;
      btnEnviar.innerHTML =
        '<i class="fas fa-paper-plane"></i> Enviar solicitud de asesoria';
    }
  }
}

/**
 * Muestra un mensaje al usuario
 */
function mostrarMensaje(texto, tipo = "info") {
  const container = document.getElementById("mensajesFormulario");
  if (!container) return;

  // Limpiar mensajes anteriores
  container.innerHTML = "";

  const mensaje = document.createElement("div");
  mensaje.className = `message ${tipo}`;
  mensaje.innerHTML = `
        <i class="fas fa-${
          tipo === "success"
            ? "check-circle"
            : tipo === "error"
            ? "exclamation-circle"
            : "info-circle"
        }"></i>
        ${texto}
    `;

  container.appendChild(mensaje);

  // Auto-ocultar despues de 5 segundos para mensajes de exito
  if (tipo === "success") {
    setTimeout(() => {
      mensaje.style.opacity = "0";
      setTimeout(() => mensaje.remove(), 300);
    }, 5000);
  }
}

/**
 * Obtiene el nombre del mes
 */
function obtenerNombreMes(mes) {
  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  return meses[mes];
}

// Hacer funciones disponibles globalmente para onclick
window.seleccionarHorario = seleccionarHorario;
