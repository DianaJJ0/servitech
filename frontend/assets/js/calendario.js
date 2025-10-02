// Calendario y agendamiento de asesoría con pago simulado

document.addEventListener("DOMContentLoaded", function () {
  // Obtener datos del DOM de forma segura
  let experto = null;
  let usuario = null;
  let asesoriasExistentes = [];

  try {
    const expertoScript = document.getElementById("expertoData");
    const usuarioScript = document.getElementById("usuarioData");
    const asesoriasScript = document.getElementById("asesoriasData");

    if (expertoScript) {
      experto = JSON.parse(expertoScript.textContent);
    }

    if (usuarioScript && usuarioScript.textContent !== "null") {
      usuario = JSON.parse(usuarioScript.textContent);
    }

    if (asesoriasScript) {
      asesoriasExistentes = JSON.parse(asesoriasScript.textContent);
    }
  } catch (error) {
    console.error("Error leyendo datos del servidor:", error);
    setError("Error cargando información del calendario.");
    return;
  }

  const calendarioEl = document.getElementById("calendar");
  const form = document.getElementById("formAgendarAsesoria");
  const horaSelect = document.getElementById("hora");
  const errorCalendar = document.getElementById("errorCalendar");
  const successMsg = document.getElementById("successMsg");

  // Validar que el usuario esté autenticado
  if (!usuario || !usuario.email) {
    setError("Debes iniciar sesión para agendar una asesoría.");
    if (form) form.style.display = "none";
    return;
  }

  // Validar que el experto esté disponible
  if (!experto || !experto.email) {
    setError("Información del experto no disponible.");
    if (form) form.style.display = "none";
    return;
  }

  // Horas disponibles (8:00 AM - 6:00 PM)
  const horasDisponibles = [
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
  ];

  // Días disponibles del experto
  const diasDisponibles = (experto.infoExperto &&
    experto.infoExperto.diasDisponibles) || [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
  ];

  let fechaSeleccionada = null;

  /**
   * Renderiza el calendario
   */
  function renderCalendar(year, month) {
    if (!calendarioEl) return;

    calendarioEl.innerHTML = "";

    // Crear tabla del calendario
    const table = document.createElement("table");
    table.className = "calendar-table";

    // Header con días de la semana
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");
    const diasSemana = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

    const rowHead = document.createElement("tr");
    diasSemana.forEach((dia) => {
      const th = document.createElement("th");
      th.textContent = dia;
      rowHead.appendChild(th);
    });
    thead.appendChild(rowHead);

    // Calcular días del mes
    const primerDia = new Date(year, month, 1);
    let primerSemana = (primerDia.getDay() + 6) % 7; // Lunes = 0
    const diasMes = new Date(year, month + 1, 0).getDate();

    let dia = 1 - primerSemana;

    // Generar 6 semanas máximo
    for (let sem = 0; sem < 6; sem++) {
      const row = document.createElement("tr");

      for (let d = 0; d < 7; d++) {
        const td = document.createElement("td");

        if (dia > 0 && dia <= diasMes) {
          const fecha = new Date(year, month, dia);
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          fecha.setHours(0, 0, 0, 0);

          // Validar si el día está disponible
          const diaEnSemana = [
            "Lunes",
            "Martes",
            "Miércoles",
            "Jueves",
            "Viernes",
            "Sábado",
            "Domingo",
          ][d];
          const diaValido = diasDisponibles.includes(diaEnSemana);

          // Solo permitir días futuros y válidos
          if (fecha >= hoy && diaValido) {
            td.className = "available";
            td.tabIndex = 0;
            td.style.cursor = "pointer";

            // Verificar si ya hay asesoría en ese día
            const fechaISO = fecha.toISOString().slice(0, 10);
            const ocupado = asesoriasExistentes.some((a) => {
              const fechaAsesoria = new Date(a.fechaHoraInicio)
                .toISOString()
                .slice(0, 10);
              return (
                fechaAsesoria === fechaISO &&
                ["pendiente-aceptacion", "confirmada"].includes(a.estado)
              );
            });

            if (ocupado) {
              td.classList.remove("available");
              td.className = "inactive";
              td.title = "No disponible (experto ocupado)";
            } else {
              td.addEventListener("click", function () {
                seleccionarFecha(fecha);
              });
            }
          } else {
            td.className = "inactive";
          }

          td.textContent = dia;

          // Marcar día seleccionado
          if (
            fechaSeleccionada &&
            fecha.toISOString().slice(0, 10) === fechaSeleccionada
          ) {
            td.classList.add("selected");
          }
        } else {
          td.className = "inactive";
          td.textContent = "";
        }

        row.appendChild(td);
        dia++;
      }
      tbody.appendChild(row);
    }

    table.appendChild(thead);
    table.appendChild(tbody);
    calendarioEl.appendChild(table);

    // Agregar navegación del mes
    const navDiv = document.createElement("div");
    navDiv.className = "calendar-nav";

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.textContent = "‹";
    prevBtn.className = "calendar-btn";
    prevBtn.title = "Mes anterior";

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.textContent = "›";
    nextBtn.className = "calendar-btn";
    nextBtn.title = "Mes siguiente";

    const titleSpan = document.createElement("span");
    titleSpan.className = "calendar-title";
    titleSpan.textContent = `${obtenerNombreMes(month)} ${year}`;

    prevBtn.addEventListener("click", function () {
      renderCalendar(
        month === 0 ? year - 1 : year,
        month === 0 ? 11 : month - 1
      );
    });

    nextBtn.addEventListener("click", function () {
      renderCalendar(
        month === 11 ? year + 1 : year,
        month === 11 ? 0 : month + 1
      );
    });

    navDiv.appendChild(prevBtn);
    navDiv.appendChild(titleSpan);
    navDiv.appendChild(nextBtn);
    calendarioEl.insertBefore(navDiv, calendarioEl.firstChild);
  }

  /**
   * Obtiene el nombre del mes
   */
  function obtenerNombreMes(month) {
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
    return meses[month];
  }

  /**
   * Selecciona una fecha y actualiza las horas disponibles
   */
  function seleccionarFecha(fecha) {
    fechaSeleccionada = fecha.toISOString().slice(0, 10);
    renderCalendar(fecha.getFullYear(), fecha.getMonth());
    renderHorasDisponibles(fechaSeleccionada);
    limpiarMensajes();
  }

  /**
   * Renderiza las horas disponibles para la fecha seleccionada
   */
  function renderHorasDisponibles(fechaISO) {
    if (!horaSelect) return;

    horaSelect.innerHTML = '<option value="">Selecciona una hora</option>';

    // Obtener horas ocupadas en esa fecha
    const ocupadas = asesoriasExistentes
      .filter((a) => {
        const fechaAsesoria = new Date(a.fechaHoraInicio)
          .toISOString()
          .slice(0, 10);
        return (
          fechaAsesoria === fechaISO &&
          ["pendiente-aceptacion", "confirmada"].includes(a.estado)
        );
      })
      .map((a) => {
        const hora = new Date(a.fechaHoraInicio).toTimeString().slice(0, 5);
        return hora;
      });

    // Agregar horas disponibles
    horasDisponibles.forEach((hora) => {
      if (!ocupadas.includes(hora)) {
        const opt = document.createElement("option");
        opt.value = hora;
        opt.textContent = hora;
        horaSelect.appendChild(opt);
      }
    });

    // Si no hay horas disponibles
    if (horaSelect.children.length === 1) {
      setError("No hay horas disponibles en esta fecha.");
      horaSelect.disabled = true;
    } else {
      horaSelect.disabled = false;
    }
  }

  /**
   * Maneja el envío del formulario
   */
  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      limpiarMensajes();

      // Validaciones del formulario
      if (!fechaSeleccionada) {
        setError("Debes seleccionar una fecha disponible.");
        return;
      }

      if (!horaSelect.value) {
        setError("Debes seleccionar una hora disponible.");
        return;
      }

      // Validar que la fecha sea futura
      const fechaHora = new Date(`${fechaSeleccionada}T${horaSelect.value}:00`);
      const ahora = new Date();

      if (fechaHora <= ahora) {
        setError("La fecha y hora seleccionadas deben ser futuras.");
        return;
      }

      // Deshabilitar el formulario durante el envío
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Procesando...";
      }

      try {
        // Crear preferencia de pago (simulada)
        const response = await fetch("/api/pagos/crear-preferencia", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            titulo: `Asesoría con ${experto.nombre} ${experto.apellido}`,
            expertoEmail: experto.email,
            fechaHoraInicio: fechaHora.toISOString(),
            duracionMinutos: 60,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setSuccess(
            "¡Asesoría agendada exitosamente! El experto ha sido notificado y debe aceptar o rechazar tu solicitud."
          );

          // Redirigir a la página de confirmación después de 2 segundos
          setTimeout(() => {
            window.location.href = data.data.linkPago;
          }, 2000);
        } else {
          setError(data.mensaje || "Error al agendar la asesoría.");
        }
      } catch (error) {
        console.error("Error:", error);
        setError("Error de conexión. Intenta nuevamente.");
      } finally {
        // Rehabilitar el formulario
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }

  /**
   * Muestra un mensaje de error
   */
  function setError(mensaje) {
    if (errorCalendar) {
      errorCalendar.textContent = mensaje;
      errorCalendar.style.display = "block";
    }
    if (successMsg) {
      successMsg.style.display = "none";
    }
  }

  /**
   * Muestra un mensaje de éxito
   */
  function setSuccess(mensaje) {
    if (successMsg) {
      successMsg.textContent = mensaje;
      successMsg.style.display = "block";
    }
    if (errorCalendar) {
      errorCalendar.style.display = "none";
    }
  }

  /**
   * Limpia todos los mensajes
   */
  function limpiarMensajes() {
    if (errorCalendar) {
      errorCalendar.textContent = "";
      errorCalendar.style.display = "none";
    }
    if (successMsg) {
      successMsg.textContent = "";
      successMsg.style.display = "none";
    }
  }

  // Inicializar calendario en el mes actual
  const today = new Date();
  renderCalendar(today.getFullYear(), today.getMonth());
});
