/**
 * CALENDARIO DE ASESORÍAS CON INTEGRACIÓN DE PAGOS SIMULADOS
 * Maneja la selección de fechas, horarios y redirige a pagos simulados
 * @description Sistema completo de calendario con validación de disponibilidad
 */

document.addEventListener("DOMContentLoaded", function () {
  console.log("Inicializando calendario de asesorías...");
  inicializarCalendario();
  configurarFormulario();
  configurarEventListeners();
  validarAutenticacion();
});

// Variables globales
let expertoData = null;
let usuarioData = null;
let asesoriasExistentes = [];
let fechaSeleccionada = null;
let horaSeleccionada = null;
let precioPorHora = 20000;
let fechaActualCalendario = new Date();

/**
 * Valida que el usuario esté autenticado
 * @description Verifica que hay un token válido antes de proceder
 */
function validarAutenticacion() {
  const token = localStorage.getItem("token");
  if (!token) {
    console.warn("Usuario no autenticado");
    mostrarMensaje("Debes iniciar sesión para agendar asesorías", "error");
    setTimeout(() => {
      window.location.href = "/login";
    }, 2000);
    return false;
  }
  return true;
}

/**
 * Inicializa el calendario con datos del experto
 * @description Carga datos del servidor y configura el calendario inicial
 */
function inicializarCalendario() {
  try {
    console.log("=== INICIALIZANDO CALENDARIO ===");

    // Obtener datos del DOM embebidos desde el servidor
    obtenerDatosDelServidor();

    // Validar que tenemos los datos necesarios
    if (!expertoData) {
      throw new Error("No se encontraron datos del experto");
    }

    console.log("Datos cargados exitosamente:", {
      expertoData: expertoData,
      usuarioData: usuarioData,
      asesoriasExistentes: asesoriasExistentes.length,
      precioPorHora: precioPorHora,
    });

    // Mostrar información del experto
    mostrarInfoExperto();

    // Generar calendario inicial
    generarCalendario();

    // Inicializar resumen
    actualizarResumen();
  } catch (error) {
    console.error("Error inicializando calendario:", error);
    mostrarMensaje("Error al cargar el calendario: " + error.message, "error");
  }
}

/**
 * Obtiene datos del servidor desde scripts embebidos
 * @description Lee los datos JSON del DOM
 */
function obtenerDatosDelServidor() {
  try {
    // Datos del experto
    const expertoScript = document.getElementById("expertoData");
    if (expertoScript) {
      expertoData = JSON.parse(expertoScript.textContent);
      precioPorHora = expertoData.infoExperto?.precioPorHora || 20000;
    }

    // Datos del usuario actual
    const usuarioScript = document.getElementById("usuarioData");
    if (usuarioScript) {
      usuarioData = JSON.parse(usuarioScript.textContent);
    }

    // Asesorías existentes del experto
    const asesoriasScript = document.getElementById("asesoriasData");
    if (asesoriasScript) {
      asesoriasExistentes = JSON.parse(asesoriasScript.textContent);
    }
  } catch (error) {
    console.error("Error leyendo datos del servidor:", error);
    throw new Error("Error al cargar datos del servidor");
  }
}

/**
 * Muestra información del experto en la interfaz
 * @description Actualiza elementos con datos del experto
 */
function mostrarInfoExperto() {
  if (!expertoData) return;

  // Actualizar nombre del experto si hay elemento
  const nombreExperto = document.getElementById("nombreExperto");
  if (nombreExperto) {
    nombreExperto.textContent = `${expertoData.nombre} ${expertoData.apellido}`;
  }

  // Actualizar precio por hora si hay elemento
  const precioElement = document.getElementById("precioPorHora");
  if (precioElement) {
    precioElement.textContent = `$${precioPorHora.toLocaleString(
      "es-CO"
    )} COP/hora`;
  }
}

/**
 * Genera el calendario visual
 * @description Crea la estructura HTML del calendario
 */
function generarCalendario() {
  const calendarContainer = document.getElementById("calendar");
  if (!calendarContainer) {
    console.error("Contenedor del calendario no encontrado");
    return;
  }

  const mesActual = fechaActualCalendario.getMonth();
  const anoActual = fechaActualCalendario.getFullYear();

  calendarContainer.innerHTML = `
    <div class="calendar-header">
      <div class="calendar-nav">
        <button class="calendar-btn" id="prevMonth" type="button" title="Mes anterior">
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="calendar-title" id="monthTitle">
          ${obtenerNombreMes(mesActual)} ${anoActual}
        </span>
        <button class="calendar-btn" id="nextMonth" type="button" title="Mes siguiente">
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
    <div class="calendar-body">
      <table class="calendar-table">
        <thead>
          <tr>
            <th>Dom</th>
            <th>Lun</th>
            <th>Mar</th>
            <th>Mié</th>
            <th>Jue</th>
            <th>Vie</th>
            <th>Sáb</th>
          </tr>
        </thead>
        <tbody id="calendarBody">
        </tbody>
      </table>
    </div>
  `;

  generarDiasDelMes(anoActual, mesActual);

  document.getElementById("prevMonth").addEventListener("click", navegarMesAnterior);
  document.getElementById("nextMonth").addEventListener("click", navegarMesSiguiente);
}

/**
 * Navega al mes anterior
 */
function navegarMesAnterior() {
  fechaActualCalendario.setMonth(fechaActualCalendario.getMonth() - 1);
  generarCalendario();
  limpiarSelecciones();
}

/**
 * Navega al mes siguiente
 */
function navegarMesSiguiente() {
  fechaActualCalendario.setMonth(fechaActualCalendario.getMonth() + 1);
  generarCalendario();
  limpiarSelecciones();
}

/**
 * Limpia las selecciones actuales
 */
function limpiarSelecciones() {
  fechaSeleccionada = null;
  horaSeleccionada = null;

  const fechaInput = document.getElementById("fechaSeleccionada");
  const horaInput = document.getElementById("horaSeleccionada");

  if (fechaInput) fechaInput.value = "";
  if (horaInput) horaInput.value = "";

  const horariosSection = document.getElementById("horariosSection");
  if (horariosSection) {
    horariosSection.style.display = "none";
  }

  actualizarResumen();
}


/**
 * Navega al mes anterior
 * @description Cambia al mes anterior y regenera el calendario
 */
function navegarMesAnterior() {
  fechaActualCalendario.setMonth(fechaActualCalendario.getMonth() - 1);
  generarCalendario();
  limpiarSelecciones();
}

/**
 * Navega al mes siguiente
 * @description Cambia al mes siguiente y regenera el calendario
 */
function navegarMesSiguiente() {
  fechaActualCalendario.setMonth(fechaActualCalendario.getMonth() + 1);
  generarCalendario();
  limpiarSelecciones();
}

/**
 * Limpia las selecciones actuales
 * @description Resetea fecha y hora seleccionadas
 */
function limpiarSelecciones() {
  fechaSeleccionada = null;
  horaSeleccionada = null;

  // Limpiar inputs
  const fechaInput = document.getElementById("fechaSeleccionada");
  const horaInput = document.getElementById("horaSeleccionada");

  if (fechaInput) fechaInput.value = "";
  if (horaInput) horaInput.value = "";

  // Ocultar sección de horarios
  const horariosSection = document.getElementById("horariosSection");
  if (horariosSection) {
    horariosSection.style.display = "none";
  }

  // Actualizar resumen
  actualizarResumen();
}

/**
 * Genera los días del mes en el calendario
 * @param {number} ano - Año del calendario
 * @param {number} mes - Mes del calendario (0-11)
 */
function generarDiasDelMes(ano, mes) {
  const calendarBody = document.getElementById("calendarBody");
  if (!calendarBody) return;

  const primerDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const diasEnMes = ultimoDia.getDate();
  const diaSemanaInicio = primerDia.getDay();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let html = "";
  let fecha = 1;

  for (let semana = 0; semana < 6; semana++) {
    html += "<tr>";
    for (let dia = 0; dia < 7; dia++) {
      if (semana === 0 && dia < diaSemanaInicio) {
        html += '<td class="calendar-day inactive"></td>';
      } else if (fecha > diasEnMes) {
        html += '<td class="calendar-day inactive"></td>';
      } else {
        const fechaActual = new Date(ano, mes, fecha);
        fechaActual.setHours(0, 0, 0, 0);

        const esHoy = fechaActual.getTime() === hoy.getTime();
        const esPasado = fechaActual < hoy;
        const esDisponible = !esPasado && esDiaDisponible(fechaActual);
        const esFuturoLejano =
          fechaActual > new Date(hoy.getTime() + 90 * 24 * 60 * 60 * 1000);

        let clases = ["calendar-day"];
        let titulo = "";

        if (esPasado) {
          clases.push("inactive");
          titulo = "Fecha pasada";
        } else if (esFuturoLejano) {
          clases.push("inactive");
          titulo = "Muy lejano (máximo 90 días)";
        } else if (esDisponible) {
          clases.push("available");
          titulo = "Disponible para agendar";
        } else {
          clases.push("busy");
          titulo = "Día ocupado";
        }

        if (esHoy) {
          clases.push("today");
        }

        const fechaStr = `${ano}-${(mes + 1)
          .toString()
          .padStart(2, "0")}-${fecha.toString().padStart(2, "0")}`;

        html += `<td class="${clases.join(
          " "
        )}" data-fecha="${fechaStr}" title="${titulo}">${fecha}</td>`;
        fecha++;
      }
    }
    html += "</tr>";
    if (fecha > diasEnMes) break;
  }

  calendarBody.innerHTML = html;

  calendarBody.querySelectorAll("td.available").forEach((td) => {
    td.addEventListener("click", function () {
      seleccionarFecha(this.dataset.fecha);
    });
    td.addEventListener("mouseenter", function () {
      this.classList.add("hover");
    });
    td.addEventListener("mouseleave", function () {
      this.classList.remove("hover");
    });
  });
}


/**
 * Verifica si un día está disponible para asesorías
 * @param {Date} fecha - Fecha a verificar
 * @returns {boolean} True si el día está disponible
 */
function esDiaDisponible(fecha) {
  // Por simplicidad, todos los días futuros están disponibles
  // Aquí podrías agregar lógica para días bloqueados, feriados, etc.
  const diaSemana = fecha.getDay();

  // Por ejemplo, bloquear domingos (día 0)
  if (diaSemana === 0) {
    return false;
  }

  return true;
}

/**
 * Selecciona una fecha en el calendario
 * @param {string} fechaStr - Fecha en formato YYYY-MM-DD
 */
function seleccionarFecha(fechaStr) {
  console.log("Seleccionando fecha:", fechaStr);

  // Remover selección anterior
  document.querySelectorAll(".calendar-day.selected").forEach((td) => {
    td.classList.remove("selected");
  });

  // Agregar selección nueva
  const tdSeleccionado = document.querySelector(`[data-fecha="${fechaStr}"]`);
  if (tdSeleccionado && tdSeleccionado.classList.contains("available")) {
    tdSeleccionado.classList.add("selected");
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

    // Mostrar sección de horarios con animación
    const horariosSection = document.getElementById("horariosSection");
    if (horariosSection) {
      horariosSection.style.display = "block";
      horariosSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    // Validar formulario
    validarFormulario();
  }
}

/**
 * Genera los horarios disponibles para una fecha específica
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 */
function generarHorariosDisponibles(fecha) {
  const horariosGrid = document.getElementById("horariosGrid");
  if (!horariosGrid) {
    console.error("Grid de horarios no encontrado");
    return;
  }

  const horarios = [];
  for (let hora = 8; hora <= 17; hora++) {
    horarios.push(`${hora.toString().padStart(2, "0")}:00`);
    if (hora < 17) {
      horarios.push(`${hora.toString().padStart(2, "0")}:30`);
    }
  }

  let html = "";
  horarios.forEach((horario) => {
    const disponible = verificarDisponibilidadHorario(fecha, horario);
    const clases = ["horario-slot"];
    if (disponible) {
      clases.push("disponible");
    } else {
      clases.push("ocupado");
    }
    const titulo = disponible
      ? "Horario disponible - Click para seleccionar"
      : "No disponible para la duración seleccionada";
    html += `
      <div class="${clases.join(" ")}"
           data-horario="${horario}"
           title="${titulo}"
           ${disponible ? `onclick="seleccionarHorario('${horario}')"` : ""}>
        <span>${horario}</span>
        ${!disponible ? '<i class="fas fa-times"></i>' : ''}
      </div>
    `;
  });

  horariosGrid.innerHTML = html;
}

/**
 * Verifica si un horario está disponible considerando la duración seleccionada
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @param {string} horario - Horario en formato HH:MM
 * @returns {boolean} True si el horario está disponible
 */
function verificarDisponibilidadHorario(fecha, horario) {
  try {
    const duracionSeleccionada = document.querySelector(
      'input[name="duracion"]:checked'
    );
    const duracionMinutos = duracionSeleccionada
      ? parseInt(duracionSeleccionada.value)
      : 60;

    const fechaHoraInicio = new Date(`${fecha}T${horario}:00`);
    const fechaHoraFin = new Date(
      fechaHoraInicio.getTime() + duracionMinutos * 60000
    );

    // Limitar máximo hasta 18:00
    const limiteHora = new Date(`${fecha}T18:00:00`);
    if (fechaHoraFin > limiteHora) {
      return false;
    }

    // SOLO si el día seleccionado es hoy, bloquea horarios pasados
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaSeleccionadaDate = new Date(fecha);
    fechaSeleccionadaDate.setHours(0, 0, 0, 0);

    if (fechaSeleccionadaDate.getTime() === hoy.getTime()) {
      const ahora = new Date();
      if (fechaHoraInicio <= ahora) {
        return false;
      }
    }

    // Verificar conflictos con asesorías existentes
    for (const asesoria of asesoriasExistentes) {
      if (
        !["confirmada", "en-progreso", "pendiente-aceptacion"].includes(
          asesoria.estado
        )
      ) {
        continue;
      }
      const asesoriaInicio = new Date(asesoria.fechaHoraInicio);
      const asesoriaFin = new Date(
        asesoriaInicio.getTime() + (asesoria.duracionMinutos || 60) * 60000
      );
      if (fechaHoraInicio < asesoriaFin && fechaHoraFin > asesoriaInicio) {
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error("Error verificando disponibilidad:", error);
    return false;
  }
}

/**
 * Selecciona un horario específico
 * @param {string} horario - Horario en formato HH:MM
 */
function seleccionarHorario(horario) {
  console.log("Seleccionando horario:", horario);

  // Verificar disponibilidad antes de seleccionar
  if (!verificarDisponibilidadHorario(fechaSeleccionada, horario)) {
    mostrarMensaje(
      "Este horario no está disponible para la duración seleccionada",
      "error"
    );
    return;
  }

  // Remover selección anterior
  document.querySelectorAll(".horario-slot.selected").forEach((slot) => {
    slot.classList.remove("selected");
  });

  // Agregar nueva selección
  const slotSeleccionado = document.querySelector(
    `[data-horario="${horario}"]`
  );
  if (slotSeleccionado && slotSeleccionado.classList.contains("disponible")) {
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

    // Validar formulario
    validarFormulario();

    // Scroll suave hacia el formulario
    const formularioSection = document.getElementById("formularioSection");
    if (formularioSection) {
      formularioSection.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }
}

/**
 * Muestra visualmente el bloque de tiempo que será reservado
 * @description Indica visualmente cuánto tiempo ocupará la asesoría
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

  // Calcular cuántos slots de 30 minutos ocupa
  const slotsNecesarios = Math.ceil(duracionMinutos / 30);

  // Encontrar el slot inicial
  const slotInicial = document.querySelector(
    `[data-horario="${horaSeleccionada}"]`
  );
  if (!slotInicial) return;

  // Marcar todos los slots que serán ocupados
  let slotActual = slotInicial;
  for (let i = 0; i < slotsNecesarios && slotActual; i++) {
    slotActual.classList.add("reservado-preview");
    slotActual = slotActual.nextElementSibling;
  }
}

/**
 * Configura el formulario de asesoría
 * @description Establece validaciones y eventos del formulario
 */
function configurarFormulario() {
  const form = document.getElementById("formAgendarAsesoria");
  if (!form) {
    console.error("Formulario de asesoría no encontrado");
    return;
  }

  // Prevenir envío tradicional y proceder con pago
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    console.log("Formulario enviado, procediendo a pago...");
    procederAPagoSimulado();
  });

  console.log("Formulario configurado correctamente");
}

/**
 * Configura event listeners adicionales
 * @description Establece eventos para campos dinámicos
 */
function configurarEventListeners() {
  // Cambios en duración
  const duracionOptions = document.querySelectorAll('input[name="duracion"]');
  duracionOptions.forEach((option) => {
    option.addEventListener("change", function () {
      console.log("Duración cambiada a:", this.value, "minutos");

      // Regenerar horarios disponibles cuando cambie la duración
      if (fechaSeleccionada) {
        horaSeleccionada = null;
        const horaInput = document.getElementById("horaSeleccionada");
        if (horaInput) horaInput.value = "";

        // Remover selección de horario
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
      validarFormulario();
    });
  });

  // Cambios en campos del formulario
  const campos = ["tituloAsesoria", "descripcionAsesoria"];
  campos.forEach((campoId) => {
    const campo = document.getElementById(campoId);
    if (campo) {
      campo.addEventListener("input", function () {
        validarFormulario();
        // Feedback visual en tiempo real
        if (
          this.value.trim().length < (campoId === "tituloAsesoria" ? 5 : 10)
        ) {
          this.classList.add("error");
        } else {
          this.classList.remove("error");
        }
      });

      campo.addEventListener("blur", function () {
        validarFormulario();
      });
    }
  });

  console.log("Event listeners configurados");
}

/**
 * Actualiza el resumen de la solicitud
 * @description Muestra información actualizada en el resumen
 */
function actualizarResumen() {
  const resumenFecha = document.getElementById("resumenFecha");
  const resumenHora = document.getElementById("resumenHora");
  const resumenHoraFin = document.getElementById("resumenHoraFin");
  const resumenDuracion = document.getElementById("resumenDuracion");
  const resumenTotal = document.getElementById("resumenTotal");

  // Actualizar fecha
  if (resumenFecha) {
    if (fechaSeleccionada) {
      const fecha = new Date(fechaSeleccionada + "T12:00:00");
      resumenFecha.textContent = fecha.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      resumenFecha.parentElement.style.display = "block";
    } else {
      resumenFecha.textContent = "No seleccionada";
      resumenFecha.parentElement.style.display = "none";
    }
  }

  // Actualizar hora
  if (resumenHora) {
    if (horaSeleccionada) {
      resumenHora.textContent = horaSeleccionada;
      resumenHora.parentElement.style.display = "block";
    } else {
      resumenHora.textContent = "No seleccionada";
      resumenHora.parentElement.style.display = "none";
    }
  }

  // Actualizar duración, hora fin y precio
  const duracionSeleccionada = document.querySelector(
    'input[name="duracion"]:checked'
  );
  if (duracionSeleccionada && resumenDuracion && resumenTotal) {
    const minutos = parseInt(duracionSeleccionada.value);
    const horas = minutos / 60;

    // Actualizar duración
    resumenDuracion.textContent = calcularTextoHoras(horas);

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
    } else if (resumenHoraFin) {
      resumenHoraFin.textContent = "-";
    }

    // Calcular precio
    const precio = precioPorHora * horas;
    resumenTotal.textContent = `$${precio.toLocaleString("es-CO")} COP`;
  }
}

/**
 * Calcula el texto legible para las horas
 * @param {number} horas - Número de horas
 * @returns {string} Texto legible
 */
function calcularTextoHoras(horas) {
  if (horas === 1) return "1 hora";
  if (horas === 1.5) return "1.5 horas";
  if (horas === 2) return "2 horas";
  if (horas === 3) return "3 horas";
  return `${horas} horas`;
}

/**
 * Valida el formulario completo
 * @returns {boolean} True si el formulario es válido
 */
function validarFormulario() {
  const titulo = document.getElementById("tituloAsesoria")?.value.trim() || "";
  const descripcion =
    document.getElementById("descripcionAsesoria")?.value.trim() || "";
  const btnEnviar = document.getElementById("btnEnviarSolicitud");

  // Validaciones individuales
  const tituloValido = titulo.length >= 5;
  const descripcionValida = descripcion.length >= 10;
  const fechaValida = !!fechaSeleccionada;
  const horaValida = !!horaSeleccionada;
  const expertoValido = !!expertoData;

  // Resultado general
  const esValido =
    tituloValido &&
    descripcionValida &&
    fechaValida &&
    horaValida &&
    expertoValido;

  // Actualizar botón de envío
  if (btnEnviar) {
    btnEnviar.disabled = !esValido;

    if (esValido) {
      btnEnviar.classList.remove("disabled");
      btnEnviar.innerHTML =
        '<i class="fas fa-credit-card"></i> Proceder al Pago';
    } else {
      btnEnviar.classList.add("disabled");
      btnEnviar.innerHTML =
        '<i class="fas fa-lock"></i> Completa todos los campos';
    }
  }

  // Feedback visual para campos individuales
  actualizarFeedbackCampos(
    tituloValido,
    descripcionValida,
    fechaValida,
    horaValida
  );

  return esValido;
}

/**
 * Actualiza el feedback visual de los campos
 * @param {boolean} tituloValido - Si el título es válido
 * @param {boolean} descripcionValida - Si la descripción es válida
 * @param {boolean} fechaValida - Si la fecha es válida
 * @param {boolean} horaValida - Si la hora es válida
 */
function actualizarFeedbackCampos(
  tituloValido,
  descripcionValida,
  fechaValida,
  horaValida
) {
  // Campo título
  const tituloField = document.getElementById("tituloAsesoria");
  if (tituloField) {
    tituloField.classList.toggle("valid", tituloValido);
    tituloField.classList.toggle(
      "invalid",
      tituloField.value.trim().length > 0 && !tituloValido
    );
  }

  // Campo descripción
  const descripcionField = document.getElementById("descripcionAsesoria");
  if (descripcionField) {
    descripcionField.classList.toggle("valid", descripcionValida);
    descripcionField.classList.toggle(
      "invalid",
      descripcionField.value.trim().length > 0 && !descripcionValida
    );
  }
}

/**
 * Procede al pago simulado antes de crear la asesoría
 * @description Redirige a la pasarela de pagos con los datos de la asesoría
 */
async function procederAPagoSimulado() {
  try {
    console.log("=== PROCEDIENDO A PAGO SIMULADO ===");

    if (!validarFormulario()) {
      mostrarMensaje("Por favor completa todos los campos requeridos", "error");
      return;
    }

    // Validar que el usuario no sea el mismo experto
    if (usuarioData && expertoData && usuarioData.email === expertoData.email) {
      mostrarMensaje("No puedes agendar una asesoría contigo mismo", "error");
      return;
    }

    // Calcular datos
    const duracionSeleccionada = document.querySelector(
      'input[name="duracion"]:checked'
    );
    const duracionMinutos = parseInt(duracionSeleccionada.value);
    const horas = duracionMinutos / 60;
    const precio = precioPorHora * horas;

    // Crear fecha y hora ISO
    const fechaHoraInicio = new Date(
      `${fechaSeleccionada}T${horaSeleccionada}:00`
    );

    // Validar que la fecha no sea en el pasado
    const ahora = new Date();
    if (fechaHoraInicio <= ahora) {
      mostrarMensaje("No puedes agendar una asesoría en el pasado", "error");
      return;
    }

    // Preparar datos de la asesoría para guardar en localStorage
    const datosAsesoria = {
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
      precio: precio,
    };

    console.log("Datos de asesoría preparados:", datosAsesoria);

    // Guardar en localStorage para uso en la pasarela de pagos
    localStorage.setItem("asesoriaEnProceso", JSON.stringify(datosAsesoria));

    // Mostrar mensaje de transición
    mostrarMensaje("Redirigiendo a la pasarela de pagos...", "info");

    // Deshabilitar botón temporalmente
    const btnEnviar = document.getElementById("btnEnviarSolicitud");
    if (btnEnviar) {
      btnEnviar.disabled = true;
      btnEnviar.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Redirigiendo...';
    }

    // Pequeña pausa para UX y luego redirigir
    setTimeout(() => {
      // Construir URL de la pasarela de pagos
      const urlPagos = `/pasarela-pagos?experto=${encodeURIComponent(
        JSON.stringify({
          id: expertoData.email,
          email: expertoData.email,
          nombre: expertoData.nombre,
          apellido: expertoData.apellido,
          especialidad:
            expertoData.infoExperto?.descripcion ||
            expertoData.infoExperto?.especialidades?.[0] ||
            "Tecnología",
        })
      )}&monto=${precio}&duracion=${horas}`;

      console.log("Redirigiendo a:", urlPagos);
      window.location.href = urlPagos;
    }, 1000);
  } catch (error) {
    console.error("Error procediendo a pago:", error);
    mostrarMensaje("Error al proceder al pago: " + error.message, "error");

    // Restaurar botón
    const btnEnviar = document.getElementById("btnEnviarSolicitud");
    if (btnEnviar) {
      btnEnviar.disabled = false;
      btnEnviar.innerHTML =
        '<i class="fas fa-credit-card"></i> Proceder al Pago';
    }
  }
}

/**
 * Muestra un mensaje al usuario
 * @param {string} texto - Texto del mensaje
 * @param {string} tipo - Tipo de mensaje (success, error, info, warning)
 */
function mostrarMensaje(texto, tipo = "info") {
  const container = document.getElementById("mensajesFormulario");
  if (!container) {
    console.warn("Contenedor de mensajes no encontrado");
    return;
  }

  // Limpiar mensajes anteriores
  container.innerHTML = "";

  const iconos = {
    success: "check-circle",
    error: "exclamation-triangle",
    info: "info-circle",
    warning: "exclamation-circle",
  };

  const mensaje = document.createElement("div");
  mensaje.className = `message ${tipo}`;
  mensaje.innerHTML = `
    <i class="fas fa-${iconos[tipo]}"></i>
    <span>${texto}</span>
  `;

  container.appendChild(mensaje);

  // Auto-ocultar después de tiempo determinado
  const tiempos = {
    success: 5000,
    info: 3000,
    warning: 6000,
    error: 8000,
  };

  setTimeout(() => {
    if (mensaje.parentNode) {
      mensaje.style.opacity = "0";
      setTimeout(() => {
        if (mensaje.parentNode) {
          mensaje.remove();
        }
      }, 300);
    }
  }, tiempos[tipo] || 5000);

  // Scroll hacia el mensaje
  container.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/**
 * Obtiene el nombre del mes
 * @param {number} mes - Número del mes (0-11)
 * @returns {string} Nombre del mes
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

console.log("Calendario de asesorías cargado correctamente");
