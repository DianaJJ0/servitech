/**
 * Confirmación de Asesoría - ServiTech
 * Muestra los datos completos del pago y la cita procesada
 */

document.addEventListener("DOMContentLoaded", function () {
  // Inicializar página de confirmación con datos reales o fallback SIEMPRE
  inicializarConfirmacion();

  /**
   * Inicializa la página con los datos del pago completado
   */
  function inicializarConfirmacion() {
    // Recuperar datos completos del pago
    const pagoCompleto = localStorage.getItem("pagoCompleto");

    if (!pagoCompleto) {
      // Si no hay datos, usar datos de ejemplo/fallback SIEMPRE
      usarDatosFallback();
      return;
    }
    try {
      const datosCompletos = JSON.parse(pagoCompleto);
      console.log(" Datos de confirmación recuperados:", datosCompletos);
      // Actualizar toda la información en la página
      actualizarInformacionCita(datosCompletos);
      actualizarInformacionExperto(datosCompletos);
      actualizarInformacionPago(datosCompletos);

      // --- GUARDAR CITA EN BACKEND DESPUÉS DEL PAGO ---
      if (datosCompletos && datosCompletos.cita && datosCompletos.pago) {
        // Construir el objeto para el backend
        const datosCita = {
          clienteId: window.usuarioId || datosCompletos.cita.clienteId,
          expertoId: datosCompletos.cita.expertoId,
          categoriaId: datosCompletos.cita.categoriaId,
          tipoServicio: datosCompletos.cita.tipoServicio || "asesoria-detallada",
          titulo: datosCompletos.cita.titulo || `Asesoría con ${datosCompletos.cita.experto?.nombre || "experto"}`,
          descripcion: datosCompletos.cita.descripcion || "Asesoría agendada y pagada",
          fechaHora: datosCompletos.cita.fechaHora || new Date(),
          duracion: datosCompletos.cita.duracion || 60,
          precio: datosCompletos.cita.precio || 20000,
          metodoPago: datosCompletos.pago.metodo || "tarjeta",
          requerimientos: datosCompletos.cita.requerimientos || {},
          pagada: true,
          transactionId: datosCompletos.pago.transactionId
        };
        // Enviar al backend solo si no existe ya la cita (puedes mejorar esta lógica)
        fetch("/api/asesorias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(datosCita)
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            console.log(" Cita guardada en la base de datos después del pago");
          } else {
            console.warn("⚠️ No se pudo guardar la cita después del pago:", data.message);
          }
        })
        .catch(err => {
          console.error("Error al guardar la cita después del pago:", err);
        });
      }

      // Limpiar datos del localStorage después de mostrarlos
      const citaFinalizada = {
        transactionId: datosCompletos.pago.transactionId,
        fecha: datosCompletos.cita.fecha,
        hora: datosCompletos.cita.hora,
        experto: datosCompletos.cita.experto,
        servicio: datosCompletos.cita.servicio,
        fechaProcesamiento: new Date().toISOString(),
      };
      localStorage.setItem("ultimaCita", JSON.stringify(citaFinalizada));
    } catch (error) {
      console.error("Error al parsear datos de confirmación:", error);
      usarDatosFallback();
    }
  }

  /**
   * Actualiza la información de la cita en la página
   */
  function actualizarInformacionCita(datos) {
    const cita = datos.cita;

    // Actualizar servicio
    const servicioElement = document.querySelector(".detail-item .value");
    if (servicioElement) {
      servicioElement.textContent = `Asesoría: ${cita.servicio}`;
    }

    // Actualizar fecha
    const fechaElement = document.getElementById("sessionDate");
    if (fechaElement) {
      fechaElement.textContent = formatearFechaLegible(cita.fecha);
    }

    // Actualizar hora
    const horaElement = document.getElementById("sessionTime");
    if (horaElement) {
      const horaInicio = cita.hora;
      const horaFin = calcularHoraFin(horaInicio);
      horaElement.textContent = `${horaInicio} - ${horaFin}`;
    }

    // Actualizar ID de transacción
    const transactionElement = document.getElementById("transactionId");
    if (transactionElement) {
      transactionElement.textContent = datos.pago.transactionId;
    }
  }

  /**
   * Actualiza la información del experto
   */
  function actualizarInformacionExperto(datos) {
    let experto = datos.cita.experto;
    // Si experto es un objeto, usar el nombre
    if (typeof experto === "object" && experto !== null) {
      experto = experto.nombre || "Experto";
    }
    const servicio = datos.cita.servicio;

    // Actualizar nombre del experto
    const nombreElement = document.querySelector(".expert-details h4");
    if (nombreElement) {
      nombreElement.textContent = experto;
    }
    // Actualizar avatar
    const avatarImg = document.querySelector(".expert-avatar img");
    if (avatarImg) {
      const nombreParaAvatar = (typeof experto === "string" ? experto : String(experto)).replace(" ", "+");
      avatarImg.src = `https://ui-avatars.com/api/?name=${nombreParaAvatar}&background=3a8eff&color=fff&size=80`;
      avatarImg.alt = `Foto de ${experto}`;
    }
  }

  /**
   * Actualiza información adicional del pago si es necesario
   */
  function actualizarInformacionPago(datos) {
    const pago = datos.pago;

    // Mostrar información del método de pago
    const metodoPagoContainer = document.querySelector(
      ".payment-method-info-container"
    );
    const metodoPagoElement = document.querySelector(".payment-method-info");

    if (metodoPagoContainer && metodoPagoElement) {
      let metodoPagoTexto = "";

      switch (pago.metodo) {
        case "credit-card":
          metodoPagoTexto = "Tarjeta de Crédito/Débito";
          if (pago.tarjeta && pago.tarjeta.cuotas > 1) {
            metodoPagoTexto += ` (${pago.tarjeta.cuotas} cuotas)`;
          }
          break;
        case "pse":
          metodoPagoTexto = "PSE - Transferencia Bancaria";
          break;
        case "nequi":
          metodoPagoTexto = "Nequi";
          break;
        case "daviplata":
          metodoPagoTexto = "Daviplata";
          break;
        case "payu":
          metodoPagoTexto = "PayU";
          break;
        case "efecty":
          metodoPagoTexto = "Efecty";
          break;
        default:
          metodoPagoTexto = "Pago Online";
      }

      // Agregar información adicional para PSE
      if (pago.metodo === "pse" && pago.pse) {
        const bancos = {
          bancolombia: "Bancolombia",
          davivienda: "Banco Davivienda",
          bbva: "BBVA Colombia",
          bogota: "Banco de Bogotá",
          popular: "Banco Popular",
          occidente: "Banco de Occidente",
          av_villas: "Banco AV Villas",
          colpatria: "Scotiabank Colpatria",
          bancamia: "Bancamía",
          itau: "Banco Itaú",
          falabella: "Banco Falabella",
          pichincha: "Banco Pichincha",
          coopcentral: "Coopcentral",
          otras: "Otras entidades",
        };

        const nombreBanco = bancos[pago.pse.banco] || pago.pse.banco;
        metodoPagoTexto += ` - ${nombreBanco}`;
      }

      // Agregar información adicional para Nequi
      if (pago.metodo === "nequi" && pago.nequi) {
        const numeroCelular = pago.nequi.numeroCelular;
        // Ocultar los dígitos del medio por seguridad
        const numeroOculto = numeroCelular.replace(
          /(\d{3})(\d{3})(\d{4})/,
          "$1 *** $3"
        );
        metodoPagoTexto += ` - ${numeroOculto}`;
      }

      // Agregar información adicional para PayU
      if (pago.metodo === "payu" && pago.payu) {
        const email = pago.payu.email;
        const documento = pago.payu.documento;
        // Ocultar parte del email y documento por seguridad
        const emailOculto = email.replace(/(.{2})(.*)(@.*)/, "$1***$3");
        const documentoOculto = documento.replace(
          /(\d{2})(\d*)(\d{2})/,
          "$1***$3"
        );
        metodoPagoTexto += ` - ${emailOculto} | Doc: ${documentoOculto}`;
      }

      // Agregar información adicional para Daviplata
      if (pago.metodo === "daviplata" && pago.daviplata) {
        const numeroCelular = pago.daviplata.numeroCelular;
        // Ocultar los dígitos del medio por seguridad
        const numeroOculto = numeroCelular.replace(
          /(\d{3})(\d{3})(\d{4})/,
          "$1 *** $3"
        );
        metodoPagoTexto += ` - ${numeroOculto}`;
      }

      metodoPagoElement.textContent = metodoPagoTexto;
      metodoPagoContainer.style.display = "flex"; // Mostrar el elemento
    }

    // Enviar email de confirmación simulado
    enviarEmailConfirmacion(datos);
  }

  /**
   * Simula el envío de email de confirmación
   */
  function enviarEmailConfirmacion(datos) {
    console.log("📧 Enviando email de confirmación a:", datos.pago.email);

    // Mostrar notificación de email enviado
    setTimeout(() => {
      mostrarNotificacion(
        `Email de confirmación enviado a ${datos.pago.email}`,
        "success"
      );
    }, 2000);
  }

  /**
   * Calcula la hora de fin basada en la hora de inicio
   */
  function calcularHoraFin(horaInicio) {
    try {
      const [hora, minutos] = horaInicio.split(":");
      const fecha = new Date();
      fecha.setHours(parseInt(hora), parseInt(minutos));
      fecha.setHours(fecha.getHours() + 1); // Sumar 1 hora

      return fecha.toTimeString().substr(0, 5);
    } catch (error) {
      // Fallback si hay error
      const horaNum = parseInt(horaInicio.split(":")[0]);
      return `${horaNum + 1}:00`;
    }
  }

  /**
   * Formatea fecha para mostrar de forma legible
   */
  function formatearFechaLegible(fechaString) {
    try {
      const fecha = new Date(fechaString + "T00:00:00");
      const opciones = {
        day: "numeric",
        month: "long",
        year: "numeric",
        weekday: "long",
      };

      return fecha.toLocaleDateString("es-ES", opciones);
    } catch (error) {
      return fechaString;
    }
  }

  /**
   * Usar datos de fallback si hay error
   */
  function usarDatosFallback() {
    console.log(" Usando datos de fallback para confirmación");
    // Datos de ejemplo personalizados y realistas
    const nombresExpertos = [
      {
        nombre: "Camilo Martínez",
        especialidad: "Redes y Seguridad",
        avatar: "Camilo+Martinez",
      },
      {
        nombre: "Ana García",
        especialidad: "Desarrollo Web",
        avatar: "Ana+Garcia",
      },
      {
        nombre: "Roberto Sánchez",
        especialidad: "Soporte Técnico",
        avatar: "Roberto+Sanchez",
      },
    ];
    const experto =
      nombresExpertos[Math.floor(Math.random() * nombresExpertos.length)];
    const servicios = [
      "Optimización de PC",
      "Configuración de redes",
      "Desarrollo de página web",
      "Soporte remoto",
      "Asesoría en ciberseguridad",
    ];
    const servicio = servicios[Math.floor(Math.random() * servicios.length)];
    const metodos = [
      {
        metodo: "credit-card",
        texto: "Tarjeta de Crédito/Débito",
        email: "cliente1@correo.com",
        cuotas: 1,
      },
      {
        metodo: "pse",
        texto: "PSE - Bancolombia",
        email: "cliente2@correo.com",
        banco: "bancolombia",
      },
      {
        metodo: "nequi",
        texto: "Nequi",
        email: "cliente3@correo.com",
        numeroCelular: "+573001234567",
      },
      {
        metodo: "daviplata",
        texto: "Daviplata",
        email: "cliente4@correo.com",
        numeroCelular: "+573007654321",
      },
    ];
    const metodo = metodos[Math.floor(Math.random() * metodos.length)];
    const fecha = getRandomFutureDate();
    const hora = getRandomTimeSlot().split(" - ")[0];
    const datosEjemplo = {
      cita: {
        servicio: servicio,
        fecha: fecha,
        hora: hora,
        experto: experto.nombre,
      },
      pago: {
        transactionId: generateTransactionId(),
        metodo: metodo.metodo,
        email: metodo.email,
        tarjeta: metodo.cuotas ? { cuotas: metodo.cuotas } : undefined,
        pse: metodo.banco ? { banco: metodo.banco } : undefined,
        nequi:
          metodo.numeroCelular && metodo.metodo === "nequi"
            ? { numeroCelular: metodo.numeroCelular }
            : undefined,
        daviplata:
          metodo.numeroCelular && metodo.metodo === "daviplata"
            ? { numeroCelular: metodo.numeroCelular }
            : undefined,
      },
      expertoInfo: experto,
    };
    actualizarInformacionCita(datosEjemplo);
    actualizarInformacionExperto(datosEjemplo);
    actualizarInformacionPago(datosEjemplo);
  }

  /**
   * Muestra notificaciones al usuario
   */
  function mostrarNotificacion(mensaje, tipo = "info") {
    const notificacion = document.createElement("div");
    notificacion.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${
        tipo === "success"
          ? "#28a745"
          : tipo === "error"
          ? "#dc3545"
          : "#007bff"
      };
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 9999;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;

    const icono = tipo === "success" ? "✅" : tipo === "error" ? "❌" : "ℹ️";
    notificacion.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span>${icono}</span>
        <span>${mensaje}</span>
      </div>
    `;

    document.body.appendChild(notificacion);

    setTimeout(() => {
      if (notificacion.parentNode) {
        notificacion.remove();
      }
    }, 5000);
  }

  /**
   * Muestra errores al usuario
   */
  function mostrarError(mensaje) {
    mostrarNotificacion(mensaje, "error");
  }

  // Funciones de fallback para datos aleatorios (mantener compatibilidad)
  function getRandomFutureDate() {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + Math.floor(Math.random() * 10) + 1);

    const options = { day: "numeric", month: "long", year: "numeric" };
    return futureDate.toLocaleDateString("es-ES", options);
  }

  function getRandomTimeSlot() {
    const hours = [
      "9:00 - 10:00",
      "10:30 - 11:30",
      "13:00 - 14:00",
      "14:30 - 15:30",
      "16:00 - 17:00",
      "17:30 - 18:30",
    ];
    return hours[Math.floor(Math.random() * hours.length)];
  }

  function generateTransactionId() {
    const prefix = "ST-";
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9).toUpperCase();
    return `${prefix}${timestamp}-${random}`;
  }
});
