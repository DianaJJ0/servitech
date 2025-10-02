/**
 * Controlador de Pagos - ServiTech
 * @module controllers/pago
 * @description Gestión completa de pagos con MercadoPago para asesorías tecnológicas
 */

const Pago = require("../models/pago.model.js");
const Usuario = require("../models/usuario.model.js");
const Asesoria = require("../models/asesoria.model.js");
const Notificacion = require("../models/notificacion.model.js");
const generarLogs = require("../services/generarLogs");
const { enviarCorreo } = require("../services/email.service.js");

// Importar MercadoPago con la nueva API
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");

// Configurar cliente de MercadoPago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: {
    timeout: 5000,
  },
});

// Instanciar servicios
const preference = new Preference(client);
const payment = new Payment(client);

/**
 * Crear preferencia de pago para asesoría
 */
const crearPreferenciaPago = async (req, res) => {
  try {
    const {
      titulo,
      descripcion = "",
      expertoEmail,
      fechaHoraInicio,
      duracionMinutos,
      monto,
    } = req.body;

    // Validaciones básicas
    if (
      !titulo ||
      !expertoEmail ||
      !fechaHoraInicio ||
      !duracionMinutos ||
      !monto
    ) {
      return res.status(400).json({
        mensaje:
          "Faltan datos requeridos: titulo, expertoEmail, fechaHoraInicio, duracionMinutos, monto",
      });
    }

    // Validar monto mínimo
    if (monto < 1000) {
      return res.status(400).json({
        mensaje: "El monto mínimo es $1.000 COP",
      });
    }

    // Verificar que el experto existe y está activo
    const experto = await Usuario.findOne({
      email: expertoEmail,
      roles: "experto",
      estado: "activo",
    });

    if (!experto) {
      return res.status(404).json({
        mensaje: "Experto no encontrado o no está activo",
      });
    }

    // Verificar que no sea el mismo usuario
    if (req.usuario.email === expertoEmail) {
      return res.status(400).json({
        mensaje: "No puedes crear una asesoría contigo mismo",
      });
    }

    // Crear registro de pago en base de datos
    const nuevoPago = new Pago({
      clienteId: req.usuario.email,
      expertoId: expertoEmail,
      monto: parseFloat(monto),
      metodo: "mercadopago",
      estado: "pendiente",
      descripcion: `Asesoría: ${titulo}`,
      fechaHoraAsesoria: new Date(fechaHoraInicio),
      duracionMinutos: parseInt(duracionMinutos),
      metadatos: {
        titulo: titulo,
        descripcion: descripcion,
        expertoNombre: `${experto.nombre} ${experto.apellido}`,
        clienteNombre: `${req.usuario.nombre} ${req.usuario.apellido}`,
      },
    });

    await nuevoPago.save();

    // Crear preferencia en MercadoPago con la nueva API
    const fechaAsesoria = new Date(fechaHoraInicio);
    const duracionTexto =
      duracionMinutos === 60
        ? "1 hora"
        : duracionMinutos === 90
        ? "1.5 horas"
        : duracionMinutos === 120
        ? "2 horas"
        : "3 horas";

    const preferenceData = {
      items: [
        {
          title: `Asesoría: ${titulo}`,
          description: `${duracionTexto} con ${experto.nombre} ${
            experto.apellido
          } - ${fechaAsesoria.toLocaleDateString("es-CO")}`,
          unit_price: parseFloat(monto),
          quantity: 1,
          currency_id: "COP",
          category_id: "services",
        },
      ],
      payer: {
        name: req.usuario.nombre,
        surname: req.usuario.apellido,
        email: req.usuario.email,
        phone: {
          area_code: "57",
          number: "0000000000",
        },
        address: {
          street_name: "Virtual",
          street_number: 1,
          zip_code: "110111",
        },
      },
      external_reference: nuevoPago._id.toString(),
      notification_url: `${
        process.env.BACKEND_URL || "http://localhost:5020"
      }/api/pagos/webhook`,
      back_urls: {
        success: `${
          process.env.FRONTEND_URL || "http://localhost:5021"
        }/confirmacion-asesoria?status=success&pagoId=${nuevoPago._id}`,
        failure: `${
          process.env.FRONTEND_URL || "http://localhost:5021"
        }/confirmacion-asesoria?status=failure&pagoId=${nuevoPago._id}`,
        pending: `${
          process.env.FRONTEND_URL || "http://localhost:5021"
        }/confirmacion-asesoria?status=pending&pagoId=${nuevoPago._id}`,
      },
      auto_return: "approved",
      statement_descriptor: "SERVITECH",
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString(),
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12,
      },
    };

    // Crear preferencia usando la nueva API
    const response = await preference.create({ body: preferenceData });

    if (!response || !response.id) {
      throw new Error("No se pudo crear la preferencia en MercadoPago");
    }

    // Actualizar el pago con el ID de preferencia
    await Pago.findByIdAndUpdate(nuevoPago._id, {
      transaccionId: response.id,
      metadatos: {
        ...nuevoPago.metadatos,
        preferenceId: response.id,
        initPoint: response.init_point,
        sandboxInitPoint: response.sandbox_init_point,
      },
    });

    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario.email,
      nombre: req.usuario.nombre,
      apellido: req.usuario.apellido,
      accion: "CREAR_PREFERENCIA_PAGO",
      detalle: `Preferencia creada para asesoría: ${titulo}, monto: $${monto} COP`,
      resultado: "Exito",
      tipo: "pago",
      persistirEnDB: true,
    });

    res.status(201).json({
      pagoId: nuevoPago._id,
      preferenceId: response.id,
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point,
      publicKey: process.env.MERCADOPAGO_PUBLIC_KEY,
    });
  } catch (error) {
    console.error("Error creando preferencia de pago:", error);

    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario?.email || null,
      accion: "ERROR_CREAR_PREFERENCIA",
      detalle: error.message,
      resultado: "Error",
      tipo: "pago",
      persistirEnDB: true,
    });

    res.status(500).json({
      mensaje: "Error interno al crear preferencia de pago",
      error: error.message,
    });
  }
};

/**
 * Webhook de MercadoPago para procesar notificaciones de pago
 */
const webhookMercadoPago = async (req, res) => {
  try {
    console.log(
      "Webhook recibido de MercadoPago:",
      JSON.stringify(req.body, null, 2)
    );

    const { type, data } = req.body;

    if (type === "payment" && data && data.id) {
      const paymentId = data.id;

      // Obtener información del pago desde MercadoPago usando la nueva API
      const paymentInfo = await payment.get({ id: paymentId });

      console.log(
        "Información del pago de MercadoPago:",
        JSON.stringify(paymentInfo, null, 2)
      );

      // Buscar el pago en nuestra base de datos usando external_reference
      const pago = await Pago.findById(paymentInfo.external_reference);

      if (!pago) {
        console.warn(
          "Pago no encontrado en base de datos:",
          paymentInfo.external_reference
        );
        return res.status(404).json({ mensaje: "Pago no encontrado" });
      }

      // Determinar nuevo estado según el estado del pago
      let nuevoEstado = "pendiente";

      switch (paymentInfo.status) {
        case "approved":
          nuevoEstado = "retenido";
          break;
        case "pending":
          nuevoEstado = "pendiente";
          break;
        case "in_process":
          nuevoEstado = "procesando";
          break;
        case "rejected":
        case "cancelled":
        case "refunded":
          nuevoEstado = "fallido";
          break;
        default:
          nuevoEstado = "pendiente";
      }

      // Actualizar pago en base de datos
      await Pago.findByIdAndUpdate(pago._id, {
        estado: nuevoEstado,
        transaccionId: paymentId,
        metadatos: {
          ...pago.metadatos,
          mercadopagoStatus: paymentInfo.status,
          mercadopagoDetail: paymentInfo.status_detail,
          fechaProcesamiento: new Date(),
          paymentMethod: paymentInfo.payment_method_id,
          transactionAmount: paymentInfo.transaction_amount,
        },
      });

      // Si el pago fue aprobado, crear la asesoría automáticamente
      if (nuevoEstado === "retenido") {
        await crearAsesoriaDesdeWebhook(pago);
      }

      await generarLogs.registrarEvento({
        usuarioEmail: pago.clienteId,
        accion: "WEBHOOK_PAGO_PROCESADO",
        detalle: `Pago ${pago._id} actualizado a estado: ${nuevoEstado}, MP status: ${paymentInfo.status}`,
        resultado: "Exito",
        tipo: "pago",
        persistirEnDB: true,
      });
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Error procesando webhook de MercadoPago:", error);

    await generarLogs.registrarEvento({
      usuarioEmail: null,
      accion: "ERROR_WEBHOOK_PAGO",
      detalle: error.message,
      resultado: "Error",
      tipo: "pago",
      persistirEnDB: true,
    });

    res.status(500).json({ error: "Error procesando webhook" });
  }
};

/**
 * Crear asesoría automáticamente desde webhook cuando el pago es aprobado
 */
async function crearAsesoriaDesdeWebhook(pago) {
  try {
    console.log("Creando asesoría desde webhook para pago:", pago._id);

    // Verificar que no existe ya una asesoría para este pago
    const asesoriaExistente = await Asesoria.findOne({ pagoId: pago._id });
    if (asesoriaExistente) {
      console.log("Ya existe una asesoría para este pago:", pago._id);
      return;
    }

    // Obtener datos del cliente y experto
    const cliente = await Usuario.findOne({ email: pago.clienteId });
    const experto = await Usuario.findOne({ email: pago.expertoId });

    if (!cliente || !experto) {
      console.error("Cliente o experto no encontrado para crear asesoría");
      await generarLogs.registrarEvento({
        usuarioEmail: pago.clienteId,
        accion: "ERROR_CREAR_ASESORIA_WEBHOOK",
        detalle: `Cliente o experto no encontrado. Cliente: ${!!cliente}, Experto: ${!!experto}`,
        resultado: "Error",
        tipo: "asesoria",
        persistirEnDB: true,
      });
      return;
    }

    // Crear asesoría con los datos del pago
    const nuevaAsesoria = new Asesoria({
      titulo: pago.metadatos?.titulo || "Asesoría Técnica",
      descripcion:
        pago.metadatos?.descripcion || "Asesoría técnica especializada",
      cliente: {
        email: cliente.email,
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        avatarUrl: cliente.avatarUrl || null,
      },
      experto: {
        email: experto.email,
        nombre: experto.nombre,
        apellido: experto.apellido,
        avatarUrl: experto.avatarUrl || null,
      },
      categoria: "Tecnologia",
      fechaHoraInicio: pago.fechaHoraAsesoria,
      duracionMinutos: pago.duracionMinutos || 60,
      estado: "pendiente-aceptacion",
      pagoId: pago._id,
    });

    await nuevaAsesoria.save();

    // Actualizar el pago con el ID de la asesoría
    await Pago.findByIdAndUpdate(pago._id, {
      asesoriaId: nuevaAsesoria._id,
    });

    // Notificar al experto por email
    try {
      await Notificacion.create({
        usuarioId: experto._id,
        email: experto.email,
        tipo: "email",
        asunto: "Nueva asesoría pendiente - Pago confirmado",
        mensaje: `Tienes una nueva solicitud de asesoría "${nuevaAsesoria.titulo}". El pago ya fue procesado y está retenido. Ingresa a ServiTech para aceptarla o rechazarla.`,
        relacionadoCon: { tipo: "Asesoria", referenciaId: nuevaAsesoria._id },
        estado: "enviado",
        fechaEnvio: new Date(),
      });

      const fechaLocal = nuevaAsesoria.fechaHoraInicio.toLocaleString("es-CO");
      const horasTexto =
        nuevaAsesoria.duracionMinutos === 60
          ? "1 hora"
          : nuevaAsesoria.duracionMinutos === 90
          ? "1.5 horas"
          : nuevaAsesoria.duracionMinutos === 120
          ? "2 horas"
          : "3 horas";

      await enviarCorreo(
        experto.email,
        "Nueva asesoría pendiente - Pago confirmado",
        `Tienes una nueva solicitud de asesoría titulada "${
          nuevaAsesoria.titulo
        }".\n\nCliente: ${cliente.nombre} ${
          cliente.apellido
        }\nFecha y hora: ${fechaLocal}\nDuración: ${horasTexto}\nMonto: $${pago.monto.toLocaleString(
          "es-CO"
        )} COP\n\nEl pago ya fue procesado y está retenido de forma segura. Se liberará cuando aceptes y completes la asesoría.\n\nIngresa a ServiTech para aceptarla o rechazarla.`,
        {
          nombreDestinatario: experto.nombre,
          apellidoDestinatario: experto.apellido,
        }
      );
    } catch (emailError) {
      console.warn("Error enviando notificación al experto:", emailError);
    }

    // Notificar al cliente sobre la creación exitosa
    try {
      await Notificacion.create({
        usuarioId: cliente._id,
        email: cliente.email,
        tipo: "email",
        asunto: "Pago procesado - Asesoría enviada al experto",
        mensaje: `Tu pago fue procesado exitosamente. La solicitud de asesoría "${nuevaAsesoria.titulo}" fue enviada al experto para su revisión.`,
        relacionadoCon: { tipo: "Asesoria", referenciaId: nuevaAsesoria._id },
        estado: "enviado",
        fechaEnvio: new Date(),
      });

      await enviarCorreo(
        cliente.email,
        "Pago procesado - Asesoría enviada al experto",
        `Tu pago de $${pago.monto.toLocaleString(
          "es-CO"
        )} COP fue procesado exitosamente.\n\nLa solicitud de asesoría "${
          nuevaAsesoria.titulo
        }" fue enviada a ${experto.nombre} ${
          experto.apellido
        } para su revisión.\n\nEl experto tiene 24 horas para aceptar o rechazar tu solicitud. Recibirás una notificación con su respuesta.\n\nTu dinero está protegido y solo se liberará al experto cuando la asesoría se complete exitosamente.`,
        {
          nombreDestinatario: cliente.nombre,
          apellidoDestinatario: cliente.apellido,
        }
      );
    } catch (emailError) {
      console.warn("Error enviando notificación al cliente:", emailError);
    }

    await generarLogs.registrarEvento({
      usuarioEmail: cliente.email,
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      accion: "CREAR_ASESORIA_DESDE_WEBHOOK",
      detalle: `Asesoría creada automáticamente id:${nuevaAsesoria._id}, pagoId:${pago._id}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    console.log(
      "Asesoría creada exitosamente desde webhook:",
      nuevaAsesoria._id
    );
  } catch (error) {
    console.error("Error creando asesoría desde webhook:", error);

    await generarLogs.registrarEvento({
      usuarioEmail: pago.clienteId,
      accion: "ERROR_CREAR_ASESORIA_WEBHOOK",
      detalle: error.message,
      resultado: "Error",
      tipo: "asesoria",
      persistirEnDB: true,
    });
  }
}

/**
 * Procesar reembolso de pago
 */
const procesarReembolso = async (req, res) => {
  try {
    const pagoId = req.params.id;
    const { motivo = "Solicitud de reembolso", monto } = req.body;

    const pago = await Pago.findById(pagoId);
    if (!pago) {
      return res.status(404).json({
        mensaje: "Pago no encontrado",
      });
    }

    if (!["retenido", "liberado"].includes(pago.estado)) {
      return res.status(400).json({
        mensaje: "El pago no puede ser reembolsado en su estado actual",
      });
    }

    const esAdmin = req.usuario.roles && req.usuario.roles.includes("admin");
    const esCliente = req.usuario.email === pago.clienteId;

    if (!esAdmin && !esCliente) {
      return res.status(403).json({
        mensaje: "No tienes permisos para reembolsar este pago",
      });
    }

    const montoReembolso = monto || pago.monto;

    if (montoReembolso > pago.monto) {
      return res.status(400).json({
        mensaje: "El monto a reembolsar no puede ser mayor al monto original",
      });
    }

    // Procesar reembolso en MercadoPago si hay transactionId
    let refundInfo = null;
    if (
      pago.transaccionId &&
      pago.transaccionId !== pago.metadatos?.preferenceId
    ) {
      try {
        const { Refund } = require("mercadopago");
        const refund = new Refund(client);

        const refundResponse = await refund.create({
          body: {
            payment_id: parseInt(pago.transaccionId),
            amount: montoReembolso,
          },
        });

        refundInfo = refundResponse;
      } catch (mpError) {
        console.warn("Error procesando reembolso en MercadoPago:", mpError);
      }
    }

    const nuevoEstado =
      montoReembolso === pago.monto ? "reembolsado" : "reembolsado-parcial";

    await Pago.findByIdAndUpdate(pagoId, {
      estado: nuevoEstado,
      fechaReembolso: new Date(),
      metadatos: {
        ...pago.metadatos,
        motivoReembolso: motivo,
        montoReembolsado: montoReembolso,
        refundInfo: refundInfo,
        procesadoPor: req.usuario.email,
      },
    });

    try {
      const cliente = await Usuario.findOne({ email: pago.clienteId });
      if (cliente) {
        await enviarCorreo(
          cliente.email,
          "Reembolso procesado",
          `Tu reembolso de $${montoReembolso.toLocaleString(
            "es-CO"
          )} COP ha sido procesado.\n\nMotivo: ${motivo}\n\nEl dinero será devuelto a tu método de pago original en los próximos días hábiles.`,
          {
            nombreDestinatario: cliente.nombre,
            apellidoDestinatario: cliente.apellido,
          }
        );
      }
    } catch (emailError) {
      console.warn("Error enviando notificación de reembolso:", emailError);
    }

    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario.email,
      nombre: req.usuario.nombre,
      apellido: req.usuario.apellido,
      accion: "PROCESAR_REEMBOLSO",
      detalle: `Reembolso procesado para pago ${pagoId}, monto: $${montoReembolso}`,
      resultado: "Exito",
      tipo: "pago",
      persistirEnDB: true,
    });

    res.json({
      mensaje: "Reembolso procesado exitosamente",
      pago: await Pago.findById(pagoId),
    });
  } catch (error) {
    console.error("Error procesando reembolso:", error);

    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario?.email || null,
      accion: "ERROR_PROCESAR_REEMBOLSO",
      detalle: error.message,
      resultado: "Error",
      tipo: "pago",
      persistirEnDB: true,
    });

    res.status(500).json({
      mensaje: "Error interno procesando reembolso",
      error: error.message,
    });
  }
};

const obtenerPagos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filtros = {};
    if (req.query.estado) {
      filtros.estado = req.query.estado;
    }

    const pagos = await Pago.find(filtros)
      .sort({ fechaCreacion: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Pago.countDocuments(filtros);

    res.json({
      pagos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error obteniendo pagos:", error);
    res.status(500).json({
      mensaje: "Error interno obteniendo pagos",
    });
  }
};

const obtenerPagoPorId = async (req, res) => {
  try {
    const pago = await Pago.findById(req.params.id);

    if (!pago) {
      return res.status(404).json({
        mensaje: "Pago no encontrado",
      });
    }

    res.json(pago);
  } catch (error) {
    console.error("Error obteniendo pago:", error);
    res.status(500).json({
      mensaje: "Error interno obteniendo pago",
    });
  }
};

const actualizarEstadoPago = async (req, res) => {
  try {
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({
        mensaje: "Estado es requerido",
      });
    }

    const estadosValidos = [
      "pendiente",
      "procesando",
      "retenido",
      "liberado",
      "reembolsado",
      "reembolsado-parcial",
      "fallido",
    ];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        mensaje: "Estado no válido",
      });
    }

    const pago = await Pago.findByIdAndUpdate(
      req.params.id,
      {
        estado,
        fechaActualizacion: new Date(),
      },
      { new: true }
    );

    if (!pago) {
      return res.status(404).json({
        mensaje: "Pago no encontrado",
      });
    }

    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario.email,
      nombre: req.usuario.nombre,
      apellido: req.usuario.apellido,
      accion: "ACTUALIZAR_ESTADO_PAGO",
      detalle: `Estado del pago ${req.params.id} actualizado a: ${estado}`,
      resultado: "Exito",
      tipo: "pago",
      persistirEnDB: true,
    });

    res.json({
      mensaje: "Estado actualizado exitosamente",
      pago,
    });
  } catch (error) {
    console.error("Error actualizando estado de pago:", error);
    res.status(500).json({
      mensaje: "Error interno actualizando estado",
    });
  }
};

module.exports = {
  crearPreferenciaPago,
  webhookMercadoPago,
  procesarReembolso,
  obtenerPagos,
  obtenerPagoPorId,
  actualizarEstadoPago,
};
