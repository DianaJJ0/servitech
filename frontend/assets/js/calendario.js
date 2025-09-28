// Calendario y agendamiento de asesoría

document.addEventListener("DOMContentLoaded", function () {
  const calendarioEl = document.getElementById("calendar");
  const form = document.getElementById("formAgendarAsesoria");
  const horaSelect = document.getElementById("hora");
  const errorCalendar = document.getElementById("errorCalendar");
  const successMsg = document.getElementById("successMsg");

  const experto = window.experto;
  const usuario = window.usuario;
  const asesoriasExistentes = window.asesoriasExistentes || [];

  // Horas ofertadas (puedes ajustar)
  const horasDisponibles = [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
  ];

  // Días disponibles del experto
  const diasDisponibles =
    (experto.infoExperto && experto.infoExperto.diasDisponibles) || [];

  let fechaSeleccionada = null;

  function renderCalendar(year, month) {
    calendarioEl.innerHTML = "";
    const table = document.createElement("table");
    table.className = "calendar-table";
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

    const primerDia = new Date(year, month, 1);
    let primerSemana = (primerDia.getDay() + 6) % 7;
    const diasMes = new Date(year, month + 1, 0).getDate();

    let dia = 1 - primerSemana;
    for (let sem = 0; sem < 6; sem++) {
      const row = document.createElement("tr");
      for (let d = 0; d < 7; d++) {
        const td = document.createElement("td");
        if (dia > 0 && dia <= diasMes) {
          const fecha = new Date(year, month, dia);
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          fecha.setHours(0, 0, 0, 0);

          // Solo permite seleccionar días futuros/hoy y que estén en diasDisponibles
          const diaSemanaNombre =
            diasSemana[fecha.getDay() === 0 ? 6 : fecha.getDay() - 1];
          const diaValido =
            diasDisponibles.length === 0 ||
            diasDisponibles.includes(diaSemanaNombre);

          if (fecha >= hoy && diaValido) {
            td.className = "available";
            td.tabIndex = 0;
            td.style.cursor = "pointer";

            // Revisar si ya hay una asesoría en ese día para ese experto
            const fechaISO = fecha.toISOString().slice(0, 10);
            const ocupado = asesoriasExistentes.some(
              (a) =>
                a.fechaHoraInicio?.slice(0, 10) === fechaISO &&
                ["pendiente-pago", "confirmada"].includes(a.estado)
            );
            if (ocupado) {
              td.classList.remove("available");
              td.className = "inactive";
              td.title = "No disponible (ya tiene asesoría agendada)";
            } else {
              td.addEventListener("click", function () {
                seleccionarFecha(fecha);
              });
            }
          } else {
            td.className = "inactive";
          }
          td.textContent = dia;
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

    // Navegación meses
    const navDiv = document.createElement("div");
    navDiv.className = "calendar-nav";
    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.textContent = "<";
    prevBtn.className = "calendar-btn";
    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.textContent = ">";
    nextBtn.className = "calendar-btn";
    const titleSpan = document.createElement("span");
    titleSpan.className = "calendar-title";
    titleSpan.textContent = `${fechaMesLetras(month)} ${year}`;

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

  function fechaMesLetras(month) {
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

  function seleccionarFecha(fecha) {
    fechaSeleccionada = fecha.toISOString().slice(0, 10);
    renderCalendar(fecha.getFullYear(), fecha.getMonth());
    renderHorasDisponibles(fechaSeleccionada);
    errorCalendar.textContent = "";
    successMsg.textContent = "";
  }

  function renderHorasDisponibles(fechaISO) {
    horaSelect.innerHTML = '<option value="">Selecciona una hora</option>';
    // Revisar asesorías agendadas en ese día y quitar las horas ocupadas
    const ocupadas = asesoriasExistentes
      .filter((a) => a.fechaHoraInicio?.slice(0, 10) === fechaISO)
      .map((a) => a.fechaHoraInicio?.slice(11, 16));
    horasDisponibles.forEach((hora) => {
      if (!ocupadas.includes(hora)) {
        const opt = document.createElement("option");
        opt.value = hora;
        opt.textContent = hora;
        horaSelect.appendChild(opt);
      }
    });
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    errorCalendar.textContent = "";
    successMsg.textContent = "";

    if (!fechaSeleccionada) {
      setError("Debes seleccionar una fecha disponible.");
      return;
    }
    if (!horaSelect.value) {
      setError("Debes seleccionar una hora disponible.");
      return;
    }
    if (!usuario || !usuario._id) {
      setError("Debes iniciar sesión para agendar una asesoría.");
      return;
    }

    // Armar fechaHoraInicio
    const fechaHoraInicio =
      fechaSeleccionada + "T" + horaSelect.value + ":00.000Z";
    // Armar objeto asesoría (según modelo)
    const datosAsesoria = {
      titulo: `Asesoría con ${experto.nombre}`,
      categoria:
        (experto.infoExperto &&
          experto.infoExperto.categorias &&
          experto.infoExperto.categorias[0]) ||
        "",
      fechaHoraInicio,
      duracionMinutos: 60,
      cliente: {
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        avatarUrl: usuario.avatarUrl || "",
      },
      experto: {
        email: experto.email,
        nombre: experto.nombre,
        apellido: experto.apellido,
        avatarUrl: experto.avatarUrl || "",
      },
      // pagoId se agrega después del pago
    };

    // Aquí puedes guardar en localStorage para continuar en la pasarela de pago
    localStorage.setItem(
      "asesoriaPendientePagar",
      JSON.stringify(datosAsesoria)
    );

    // Redirigir a la pasarela de pago
    successMsg.textContent = "Redirigiendo a la pasarela de pago...";
    setTimeout(() => {
      window.location.href = "/pasarela-pagos";
    }, 1200);
  });

  function setError(msg) {
    errorCalendar.textContent = msg;
    successMsg.textContent = "";
  }

  // Inicializar calendario en mes actual
  const today = new Date();
  renderCalendar(today.getFullYear(), today.getMonth());
});
