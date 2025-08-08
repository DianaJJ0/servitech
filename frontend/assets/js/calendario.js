/**
 * Calendario Interactivo para ServiTech
 * Maneja la selección de fechas y horarios para asesorías
 */

class CalendarioAsesorias {
  constructor() {
    this.fechaActual = new Date();
    this.fechaSeleccionada = null;
    this.horaSeleccionada = null;
    this.expertoActual = {
      nombre: "María Rodríguez",
      especialidad: "Desarrollo Web",
      avatar: "MR",
      experiencia: "10 años de experiencia",
      rating: "★★★★★",
    };

    // Horarios disponibles por día (simulado)
    this.horariosDisponibles = {
      // Formato: 'YYYY-MM-DD': ['09:00', '10:00', '11:00', ...]
    };

    this.init();
  }

  init() {
    this.generarCalendario();
    this.configurarEventListeners();
    this.generarHorariosDisponibles();
  }

  configurarEventListeners() {
    // Botones de navegación del calendario
    const btnAnterior = document.querySelector(".nav-btn:first-child");
    const btnSiguiente = document.querySelector(".nav-btn:last-child");

    if (btnAnterior) {
      btnAnterior.addEventListener("click", () => this.mesAnterior());
    }

    if (btnSiguiente) {
      btnSiguiente.addEventListener("click", () => this.mesSiguiente());
    }

    // Botón confirmar cita
    const btnConfirmar = document.querySelector(".btn-primary");
    if (btnConfirmar) {
      btnConfirmar.addEventListener("click", (e) => this.confirmarCita(e));
    }
  }

  generarCalendario() {
    const año = this.fechaActual.getFullYear();
    const mes = this.fechaActual.getMonth();

    // Actualizar título del mes
    const tituloMes = document.querySelector(".month-title");
    if (tituloMes) {
      const nombresMeses = [
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
      tituloMes.textContent = `${nombresMeses[mes]} ${año}`;
    }

    // Generar días del calendario
    this.generarDiasCalendario(año, mes);
  }

  generarDiasCalendario(año, mes) {
    const tbody = document.querySelector(".calendar tbody");
    if (!tbody) return;

    // Limpiar calendario actual
    tbody.innerHTML = "";

    // Primer día del mes y último día del mes anterior
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    const diasEnMes = ultimoDia.getDate();

    // Día de la semana del primer día (0=domingo, 1=lunes, etc.)
    let diaSemana = primerDia.getDay();
    diaSemana = diaSemana === 0 ? 6 : diaSemana - 1; // Convertir a formato lunes=0

    // Días del mes anterior para completar la primera semana
    const mesAnterior = new Date(año, mes, 0);
    const diasMesAnterior = mesAnterior.getDate();

    let diaActual = 1;
    let diasSiguienteMes = 1;
    const hoy = new Date();

    // Generar 6 semanas
    for (let semana = 0; semana < 6; semana++) {
      const fila = document.createElement("tr");

      for (let dia = 0; dia < 7; dia++) {
        const celda = document.createElement("td");
        const span = document.createElement("span");
        span.className = "day";

        if (semana === 0 && dia < diaSemana) {
          // Días del mes anterior
          span.textContent = diasMesAnterior - (diaSemana - dia - 1);
          span.className += " inactive";
        } else if (diaActual <= diasEnMes) {
          // Días del mes actual
          span.textContent = diaActual;

          const fechaDia = new Date(año, mes, diaActual);

          // Marcar día actual
          if (this.esMismaFecha(fechaDia, hoy)) {
            span.className += " today";
          }

          // Marcar día seleccionado
          if (
            this.fechaSeleccionada &&
            this.esMismaFecha(fechaDia, this.fechaSeleccionada)
          ) {
            span.className += " selected";
          }

          // Deshabilitar fechas pasadas
          if (fechaDia < hoy.setHours(0, 0, 0, 0)) {
            span.className += " inactive";
          } else {
            // Agregar evento click para días válidos
            span.addEventListener("click", () =>
              this.seleccionarFecha(fechaDia)
            );
            span.style.cursor = "pointer";
          }

          diaActual++;
        } else {
          // Días del siguiente mes
          span.textContent = diasSiguienteMes;
          span.className += " inactive";
          diasSiguienteMes++;
        }

        celda.appendChild(span);
        fila.appendChild(celda);
      }

      tbody.appendChild(fila);

      // Si ya completamos todos los días del mes y la siguiente semana, salir
      if (diaActual > diasEnMes && diasSiguienteMes > 7) break;
    }
  }

  esMismaFecha(fecha1, fecha2) {
    return (
      fecha1.getDate() === fecha2.getDate() &&
      fecha1.getMonth() === fecha2.getMonth() &&
      fecha1.getFullYear() === fecha2.getFullYear()
    );
  }

  seleccionarFecha(fecha) {
    // Remover selección anterior
    const anteriorSeleccionado = document.querySelector(".day.selected");
    if (anteriorSeleccionado) {
      anteriorSeleccionado.classList.remove("selected");
    }

    // Agregar nueva selección
    event.target.classList.add("selected");
    this.fechaSeleccionada = new Date(fecha);

    // Generar horarios para la fecha seleccionada
    this.mostrarHorarios(fecha);

    // Actualizar resumen
    this.actualizarResumen();
  }

  mostrarHorarios(fecha) {
    const fechaKey = this.formatearFechaKey(fecha);
    const horarios =
      this.horariosDisponibles[fechaKey] || this.generarHorariosDefault();

    // Actualizar título de horarios
    const tituloHorarios = document.querySelector(".time-slots h3");
    if (tituloHorarios) {
      const dia = fecha.getDate();
      const nombresMeses = [
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
      const mes = nombresMeses[fecha.getMonth()];
      tituloHorarios.textContent = `Horarios disponibles - ${dia} ${mes}`;
    }

    // Generar slots de horarios
    const slotsContainer = document.querySelector(".slots-container");
    if (slotsContainer) {
      slotsContainer.innerHTML = "";

      horarios.forEach((horario) => {
        const slot = document.createElement("div");
        slot.className = "time-slot";
        slot.textContent = horario.hora;

        if (horario.ocupado) {
          slot.className += " booked";
        } else {
          slot.addEventListener("click", () =>
            this.seleccionarHorario(horario.hora, slot)
          );
          slot.style.cursor = "pointer";
        }

        slotsContainer.appendChild(slot);
      });
    }
  }

  seleccionarHorario(hora, elemento) {
    // Remover selección anterior
    const anteriorSeleccionado = document.querySelector(".time-slot.selected");
    if (anteriorSeleccionado) {
      anteriorSeleccionado.classList.remove("selected");
    }

    // Agregar nueva selección
    elemento.classList.add("selected");
    this.horaSeleccionada = hora;

    // Actualizar resumen
    this.actualizarResumen();
  }

  actualizarResumen() {
    if (!this.fechaSeleccionada) return;

    const fecha = this.formatearFechaLegible(this.fechaSeleccionada);
    const hora = this.horaSeleccionada || "--:--";

    // Actualizar elementos del resumen
    const summaryItems = document.querySelectorAll(".summary-item");

    summaryItems.forEach((item) => {
      const label = item.querySelector(".summary-label");
      const value = item.querySelector(".summary-value");

      if (!label || !value) return;

      const labelText = label.textContent.trim();

      switch (labelText) {
        case "Fecha:":
          value.textContent = fecha;
          break;
        case "Hora:":
          value.textContent = hora;
          break;
        case "Experto:":
          value.textContent = this.expertoActual.nombre;
          break;
        case "Servicio:":
          value.textContent = this.expertoActual.especialidad;
          break;
      }
    });
  }

  generarHorariosDisponibles() {
    // Generar horarios para los próximos 30 días
    const hoy = new Date();

    for (let i = 0; i < 30; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() + i);

      // No generar horarios para fines de semana
      if (fecha.getDay() === 0 || fecha.getDay() === 6) continue;

      const fechaKey = this.formatearFechaKey(fecha);
      this.horariosDisponibles[fechaKey] = this.generarHorariosDefault();
    }
  }

  generarHorariosDefault() {
    const horarios = [
      { hora: "09:00", ocupado: Math.random() < 0.3 },
      { hora: "10:00", ocupado: Math.random() < 0.3 },
      { hora: "11:00", ocupado: Math.random() < 0.3 },
      { hora: "12:00", ocupado: Math.random() < 0.3 },
      { hora: "13:00", ocupado: Math.random() < 0.3 },
      { hora: "14:00", ocupado: Math.random() < 0.3 },
      { hora: "15:00", ocupado: Math.random() < 0.3 },
      { hora: "16:00", ocupado: Math.random() < 0.3 },
      { hora: "17:00", ocupado: Math.random() < 0.3 },
      { hora: "18:00", ocupado: Math.random() < 0.3 },
    ];

    return horarios;
  }

  formatearFechaKey(fecha) {
    const año = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, "0");
    const dia = fecha.getDate().toString().padStart(2, "0");
    return `${año}-${mes}-${dia}`;
  }

  formatearFechaLegible(fecha) {
    const dia = fecha.getDate();
    const nombresMeses = [
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
    const mes = nombresMeses[fecha.getMonth()];
    const año = fecha.getFullYear();

    return `${dia} de ${mes} ${año}`;
  }

  mesAnterior() {
    this.fechaActual.setMonth(this.fechaActual.getMonth() - 1);
    this.generarCalendario();
  }

  mesSiguiente() {
    this.fechaActual.setMonth(this.fechaActual.getMonth() + 1);
    this.generarCalendario();
  }

  confirmarCita(event) {
    event.preventDefault();
    if (!this.fechaSeleccionada || !this.horaSeleccionada) {
      this.mostrarMensaje(
        "Por favor selecciona una fecha y hora para tu cita.",
        "warning"
      );
      return;
    }

    // Obtener usuario autenticado desde variable global
    const usuarioId = window.usuarioId;
    if (!usuarioId) {
      this.mostrarMensaje(
        "No se detectó usuario autenticado. Inicia sesión.",
        "danger"
      );
      return;
    }

    // Obtener IDs reales de experto y categoría desde variables globales
    const expertoId = window.expertoSeleccionado?.id;
    const categoriaId = window.categoriaSeleccionadaId || null; // Debes inyectar esto desde backend si es necesario

    if (!expertoId) {
      this.mostrarMensaje(
        "No se detectó el experto seleccionado. Intenta de nuevo.",
        "danger"
      );
      return;
    }
    if (!categoriaId) {
      this.mostrarMensaje(
        "No se detectó la categoría seleccionada. Intenta de nuevo.",
        "danger"
      );
      return;
    }

    // Armar fecha y hora
    const fechaHora = new Date(
      this.fechaSeleccionada.getFullYear(),
      this.fechaSeleccionada.getMonth(),
      this.fechaSeleccionada.getDate(),
      parseInt(this.horaSeleccionada.split(":")[0]),
      parseInt(this.horaSeleccionada.split(":")[1])
    );

    // Datos obligatorios para el backend
    const datosCita = {
      clienteId: usuarioId,
      expertoId: expertoId,
      categoriaId: categoriaId,
      tipoServicio: "asesoria-detallada", // O el tipo que corresponda
      titulo: `Asesoría con ${window.expertoSeleccionado.nombre || "experto"}`,
      descripcion: `Asesoría agendada desde el calendario con ${
        window.expertoSeleccionado.nombre || "experto"
      } (${window.expertoSeleccionado.especialidad || ""})`,
      fechaHora: fechaHora,
      duracion: 60, // minutos
      precio: 20000, // Puedes ajustar el precio según lógica real
      metodoPago: "tarjeta", // O el método seleccionado por el usuario
      requerimientos: {},
    };

    // Guardar los datos de la cita en localStorage para usarlos después del pago
    localStorage.setItem("citaSeleccionada", JSON.stringify(datosCita));
    this.mostrarMensaje(
      "Cita pendiente de pago. Redirigiendo a la pasarela de pagos...",
      "success"
    );
    setTimeout(() => {
      window.location.href = "/pasarela-pagos";
    }, 2000);
  }

  mostrarMensaje(mensaje, tipo = "info") {
    // Crear elemento de notificación
    const notificacion = document.createElement("div");
    notificacion.className = `alert alert-${
      tipo === "warning" ? "warning" : tipo === "success" ? "success" : "info"
    } alert-dismissible fade show`;
    notificacion.style.position = "fixed";
    notificacion.style.top = "20px";
    notificacion.style.right = "20px";
    notificacion.style.zIndex = "9999";
    notificacion.style.maxWidth = "400px";

    notificacion.innerHTML = `
            <strong>${
              tipo === "warning" ? "⚠️" : tipo === "success" ? "✅" : "ℹ️"
            }</strong> ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

    document.body.appendChild(notificacion);

    // Auto-remover después de 5 segundos
    setTimeout(() => {
      if (notificacion.parentNode) {
        notificacion.remove();
      }
    }, 5000);
  }
}

// Inicializar calendario cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", function () {
  // Verificar que estamos en la página del calendario
  if (document.getElementById("calendar-view")) {
    window.calendarioAsesorias = new CalendarioAsesorias();
    console.log("📅 Calendario de asesorías inicializado correctamente");
  }
});

// Exportar para uso en otros archivos si es necesario
if (typeof module !== "undefined" && module.exports) {
  module.exports = CalendarioAsesorias;
}
