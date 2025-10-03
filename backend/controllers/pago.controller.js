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
 * @function crearPreferenciaPago
 * @description Crea una preferencia de pago en MercadoPago para una asesoría específica
 * @param {Object} req - Request object
 * @param {Object} req.body - Datos de la preferencia
 * @param {string} req.body.titulo - Título de la asesoría
 * @param {string} [req.body.descripcion] - Descripción opcional de la asesoría
 * @param {string} req.body.expertoEmail - Email del experto
 * @param {string} req.body.fechaHoraInicio - Fecha y hora de inicio (ISO string)
 * @param {number} req.body.duracionMinutos - Duración en minutos (60, 90, 120, 180)
 * @param {number} req.body.monto - Monto del pago en COP
 * @param {Object} req.usuario - Usuario autenticado
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Datos de la preferencia creada
 * @throws {400} Datos faltantes o inválidos
 * @throws {403} Usuario no autorizado
 * @throws {404} Experto no encontrado
 * @throws {500} Error interno del servidor
 * @example
 * // Crear preferencia de pago
 * POST /api/pagos/crear-preferencia
 * {
 *   "titulo": "Configuración de servidor",
 *   "descripcion": "Asesoría para configurar servidor web",
 *   "expertoEmail": "experto@ejemplo.com",
 *   "fechaHoraInicio": "2024-12-15T14:00:00.000Z",
 *   "duracionMinutos": 60,
 *   "monto": 50000
 * }
 *
 * @openapi
 * /api/pagos/crear-preferencia:
 *   post:
 *     summary: Crear preferencia de pago para asesoría
 *     description: |
 *       Crea una preferencia de pago en MercadoPago para procesar el pago de una asesoría.
 *       Valida que el experto exista y esté activo, que el monto sea válido y que el usuario
 *       no esté creando una asesoría consigo mismo.
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - titulo
 *               - expertoEmail
 *               - fechaHoraInicio
 *               - duracionMinutos
 *               - monto
 *             properties:
 *               titulo:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 300
 *                 description: Título descriptivo de la asesoría
 *                 example: "Configuración de servidor web"
 *               descripcion:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Descripción detallada de la asesoría
 *                 example: "Asesoría para configurar Apache y SSL"
 *               expertoEmail:
 *                 type: string
 *                 format: email
 *                 description: Email del experto que dará la asesoría
 *                 example: "experto@ejemplo.com"
 *               fechaHoraInicio:
 *                 type: string
 *                 format: date-time
 *                 description: Fecha y hora de inicio de la asesoría
 *                 example: "2024-12-15T14:00:00.000Z"
 *               duracionMinutos:
 *                 type: integer
 *                 enum: [60, 90, 120, 180]
 *                 description: Duración de la asesoría en minutos
 *                 example: 60
 *               monto:
 *                 type: number
 *                 minimum: 1000
 *                 description: Monto del pago en pesos colombianos
 *                 example: 50000
 *           examples:
 *             asesoria_basica:
 *               summary: Asesoría básica de 1 hora
 *               value:
 *                 titulo: "Configuración de servidor"
 *                 descripcion: "Configurar servidor web con Apache"
 *                 expertoEmail: "experto@ejemplo.com"
 *                 fechaHoraInicio: "2024-12-15T14:00:00.000Z"
 *                 duracionMinutos: 60
 *                 monto: 50000
 *             asesoria_extendida:
 *               summary: Asesoría extendida de 3 horas
 *               value:
 *                 titulo: "Desarrollo completo de API"
 *                 descripcion: "Desarrollo y documentación de API REST"
 *                 expertoEmail: "experto@ejemplo.com"
 *                 fechaHoraInicio: "2024-12-16T09:00:00.000Z"
 *                 duracionMinutos: 180
 *                 monto: 150000
 *     responses:
 *       201:
 *         description: Preferencia de pago creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pagoId:
 *                   type: string
 *                   description: ID del registro de pago en la base de datos
 *                   example: "507f1f77bcf86cd799439011"
 *                 preferenceId:
 *                   type: string
 *                   description: ID de la preferencia en MercadoPago
 *                   example: "123456789-abcd-1234-efgh-987654321098"
 *                 initPoint:
 *                   type: string
 *                   format: uri
 *                   description: URL para iniciar el pago en MercadoPago
 *                   example: "https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=123456789"
 *                 sandboxInitPoint:
 *                   type: string
 *                   format: uri
 *                   description: URL de sandbox para pruebas
 *                   example: "https://sandbox.mercadopago.com.co/checkout/v1/redirect?pref_id=123456789"
 *                 publicKey:
 *                   type: string
 *                   description: Clave pública de MercadoPago para el frontend
 *                   example: "APP_USR-12345678-abcd-1234-efgh-987654321098"
 *       400:
 *         description: Datos inválidos o faltantes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *               examples:
 *                 datos_faltantes:
 *                   value:
 *                     mensaje: "Faltan datos requeridos: titulo, expertoEmail, fechaHoraInicio, duracionMinutos, monto"
 *                 monto_minimo:
 *                   value:
 *                     mensaje: "El monto mínimo es $1.000 COP"
 *                 auto_asesoria:
 *                   value:
 *                     mensaje: "No puedes crear una asesoría contigo mismo"
 *       404:
 *         description: Experto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Experto no encontrado o no está activo"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                 error:
 *                   type: string
 *               example:
 *                 mensaje: "Error interno al crear preferencia de pago"
 *                 error: "Connection timeout"
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

    // Crear preferencia en MercadoPago
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

    // Crear preferencia usando la API de MercadoPago
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
 * @function webhookMercadoPago
 * @description Procesa las notificaciones automáticas de MercadoPago sobre cambios en el estado de los pagos
 * @param {Object} req - Request object con datos del webhook
 * @param {Object} req.body - Datos de la notificación
 * @param {string} req.body.type - Tipo de notificación (payment, merchant_order, etc.)
 * @param {Object} req.body.data - Datos del evento
 * @param {string} req.body.data.id - ID del pago en MercadoPago
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Confirmación de recepción del webhook
 * @example
 * // Webhook de MercadoPago
 * POST /api/pagos/webhook
 * {
 *   "type": "payment",
 *   "data": {
 *     "id": "12345678901"
 *   }
 * }
 *
 * @openapi
 * /api/pagos/webhook:
 *   post:
 *     summary: Webhook de MercadoPago
 *     description: |
 *       Recibe notificaciones automáticas de MercadoPago sobre cambios en el estado de los pagos.
 *       Actualiza el estado del pago en la base de datos y crea automáticamente la asesoría
 *       cuando el pago es aprobado.
 *     tags: [Pagos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 description: Tipo de notificación
 *                 example: "payment"
 *               data:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID del pago en MercadoPago
 *                     example: "12345678901"
 *     responses:
 *       200:
 *         description: Webhook recibido y procesado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 */
const webhookMercadoPago = async (req, res) => {
  try {
    console.log(
      "Webhook recibido de MercadoPago:",
      JSON.stringify(req.body, null, 2)
    );

    const { type, data } = req.body;

    // Responder inmediatamente a MercadoPago para evitar reintentos
    res.status(200).json({ received: true });

    // Procesar solo notificaciones de pagos
    if (type === "payment" && data && data.id) {
      const paymentId = data.id;

      console.log(`Procesando notificación de pago: ${paymentId}`);

      try {
        // Obtener información detallada del pago desde MercadoPago
        const paymentInfo = await payment.get({ id: paymentId });
        console.log(
          "Información del pago de MercadoPago:",
          JSON.stringify(paymentInfo, null, 2)
        );

        // Buscar el pago en nuestra base de datos usando external_reference
        const pago = await Pago.findById(paymentInfo.external_reference);

        if (!pago) {
          console.warn(
            `Pago no encontrado en base de datos: ${paymentInfo.external_reference}`
          );
          return;
        }

        console.log(
          `Pago encontrado: ${pago._id}, estado actual: ${pago.estado}`
        );

        // Determinar nuevo estado según el estado del pago en MercadoPago
        let nuevoEstado = pago.estado;
        let procesoExitoso = false;

        switch (paymentInfo.status) {
          case "approved":
            if (pago.estado === "pendiente" || pago.estado === "procesando") {
              nuevoEstado = "retenido";
              procesoExitoso = true;
            }
            break;
          case "pending":
            if (pago.estado === "pendiente") {
              nuevoEstado = "procesando";
            }
            break;
          case "in_process":
            nuevoEstado = "procesando";
            break;
          case "rejected":
          case "cancelled":
            if (pago.estado !== "reembolsado" && pago.estado !== "liberado") {
              nuevoEstado = "fallido";
            }
            break;
          case "refunded":
            nuevoEstado = "reembolsado";
            break;
          default:
            console.log(
              `Estado de MercadoPago no manejado: ${paymentInfo.status}`
            );
        }

        // Solo actualizar si hay cambio de estado
        if (nuevoEstado !== pago.estado) {
          console.log(
            `Actualizando estado del pago ${pago._id}: ${pago.estado} -> ${nuevoEstado}`
          );

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
              lastWebhookUpdate: new Date(),
            },
          });

          // Si el pago fue aprobado y cambió a retenido, crear asesoría automáticamente
          if (nuevoEstado === "retenido" && procesoExitoso) {
            console.log("Pago aprobado, creando asesoría automáticamente...");
            await crearAsesoriaDesdeWebhook(pago);
          }

          // Si el pago falló, notificar al cliente
          if (nuevoEstado === "fallido") {
            await notificarFalloPago(pago, paymentInfo);
          }

          await generarLogs.registrarEvento({
            usuarioEmail: pago.clienteId,
            accion: "WEBHOOK_PAGO_ACTUALIZADO",
            detalle: `Pago ${pago._id} actualizado: ${pago.estado} -> ${nuevoEstado}, MP status: ${paymentInfo.status}`,
            resultado: "Exito",
            tipo: "pago",
            persistirEnDB: true,
          });
        } else {
          console.log(
            `Sin cambios de estado para pago ${pago._id}: ${nuevoEstado}`
          );
        }
      } catch (mpError) {
        console.error(
          "Error obteniendo información del pago de MercadoPago:",
          mpError
        );

        await generarLogs.registrarEvento({
          usuarioEmail: null,
          accion: "ERROR_WEBHOOK_MP_API",
          detalle: `Error consultando pago ${paymentId}: ${mpError.message}`,
          resultado: "Error",
          tipo: "pago",
          persistirEnDB: true,
        });
      }
    } else {
      console.log(`Tipo de notificación no procesada: ${type}`);
    }
  } catch (error) {
    console.error("Error procesando webhook de MercadoPago:", error);

    await generarLogs.registrarEvento({
      usuarioEmail: null,
      accion: "ERROR_WEBHOOK_GENERAL",
      detalle: error.message,
      resultado: "Error",
      tipo: "pago",
      persistirEnDB: true,
    });
  }
};

/**
 * Crear asesoría automáticamente desde webhook cuando el pago es aprobado
 * @function crearAsesoriaDesdeWebhook
 * @description Crea una asesoría automáticamente cuando se recibe confirmación de pago exitoso
 * @param {Object} pago - Objeto del pago procesado exitosamente
 * @returns {Promise<void>}
 * @private
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
        } para su revisión.\n\nEl experto tiene 24 horas para aceptar o rechazar tu solicitud. Recibirás una notificación con su respuesta.\n\nTu dinero está protegido y solo se liberará al experto cuando confirmes que la asesoría fue exitosa.`,
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
 * Notifica al cliente sobre fallo en el pago
 * @function notificarFalloPago
 * @description Envía notificación al cliente cuando un pago falla
 * @param {Object} pago - Objeto del pago que falló
 * @param {Object} paymentInfo - Información del pago desde MercadoPago
 * @returns {Promise<void>}
 * @private
 */
async function notificarFalloPago(pago, paymentInfo) {
  try {
    const cliente = await Usuario.findOne({ email: pago.clienteId });
    if (!cliente) return;

    const motivoFallo = paymentInfo.status_detail || "No especificado";
    const asuntoEmail = "Problema con tu pago - ServiTech";
    const mensajeEmail = `Hubo un problema procesando tu pago para la asesoría.\n\nDetalle: ${motivoFallo}\nMonto: $${pago.monto.toLocaleString(
      "es-CO"
    )} COP\n\nPuedes intentar nuevamente con otro método de pago o contactar a nuestro soporte si el problema persiste.\n\nNo se realizó ningún cargo a tu cuenta.`;

    await Notificacion.create({
      usuarioId: cliente._id,
      email: cliente.email,
      tipo: "email",
      asunto: asuntoEmail,
      mensaje: "Hubo un problema procesando tu pago",
      relacionadoCon: { tipo: "Pago", referenciaId: pago._id },
      estado: "enviado",
      fechaEnvio: new Date(),
    });

    await enviarCorreo(cliente.email, asuntoEmail, mensajeEmail, {
      nombreDestinatario: cliente.nombre,
      apellidoDestinatario: cliente.apellido,
    });

    console.log(`Notificación de fallo enviada al cliente: ${cliente.email}`);
  } catch (error) {
    console.error("Error notificando fallo de pago:", error);
  }
}

/**
 * Procesar reembolso de pago
 * @function procesarReembolso
 * @description Procesa un reembolso total o parcial de un pago
 * @param {Object} req - Request object
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.id - ID del pago a reembolsar
 * @param {Object} req.body - Datos del reembolso
 * @param {string} [req.body.motivo] - Motivo del reembolso
 * @param {number} [req.body.monto] - Monto a reembolsar (opcional, por defecto el total)
 * @param {Object} req.usuario - Usuario autenticado
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Resultado del reembolso
 * @throws {404} Pago no encontrado
 * @throws {400} Estado no válido para reembolso
 * @throws {403} Sin permisos para reembolsar
 * @throws {500} Error interno del servidor
 *
 * @openapi
 * /api/pagos/{id}/reembolso:
 *   post:
 *     summary: Procesar reembolso de pago
 *     description: |
 *       Procesa un reembolso total o parcial de un pago específico.
 *       Solo administradores o el cliente que realizó el pago pueden solicitar reembolsos.
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del pago a reembolsar
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *                 default: "Solicitud de reembolso"
 *                 description: Motivo del reembolso
 *               monto:
 *                 type: number
 *                 description: Monto a reembolsar (opcional, por defecto el total)
 *     responses:
 *       200:
 *         description: Reembolso procesado exitosamente
 *       400:
 *         description: El pago no puede ser reembolsado
 *       403:
 *         description: Sin permisos para reembolsar
 *       404:
 *         description: Pago no encontrado
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

/**
 * Obtener lista de pagos con paginación
 * @function obtenerPagos
 * @description Obtiene una lista paginada de pagos con filtros opcionales
 * @param {Object} req - Request object
 * @param {Object} req.query - Query parameters
 * @param {number} [req.query.page=1] - Número de página
 * @param {number} [req.query.limit=20] - Límite de resultados por página
 * @param {string} [req.query.estado] - Filtrar por estado
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Lista de pagos con información de paginación
 *
 * @openapi
 * /api/pagos:
 *   get:
 *     summary: Obtener lista de pagos
 *     description: Obtiene una lista paginada de pagos con filtros opcionales
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Límite de resultados por página
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [pendiente, procesando, retenido, liberado, reembolsado, fallido]
 *         description: Filtrar por estado
 *     responses:
 *       200:
 *         description: Lista de pagos obtenida exitosamente
 */
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

/**
 * Obtener pago por ID
 * @function obtenerPagoPorId
 * @description Obtiene la información completa de un pago específico
 * @param {Object} req - Request object
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.id - ID del pago
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Información del pago
 * @throws {404} Pago no encontrado
 *
 * @openapi
 * /api/pagos/{id}:
 *   get:
 *     summary: Obtener pago por ID
 *     description: Obtiene la información completa de un pago específico
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del pago
 *     responses:
 *       200:
 *         description: Información del pago
 *       404:
 *         description: Pago no encontrado
 */
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

/**
 * Actualizar estado de pago
 * @function actualizarEstadoPago
 * @description Actualiza manualmente el estado de un pago (solo administradores)
 * @param {Object} req - Request object
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.id - ID del pago
 * @param {Object} req.body - Datos de actualización
 * @param {string} req.body.estado - Nuevo estado del pago
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Pago actualizado
 * @throws {400} Estado no válido
 * @throws {404} Pago no encontrado
 *
 * @openapi
 * /api/pagos/{id}/estado:
 *   put:
 *     summary: Actualizar estado de pago
 *     description: Actualiza manualmente el estado de un pago (solo administradores)
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del pago
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estado
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [pendiente, procesando, retenido, liberado, reembolsado, reembolsado-parcial, fallido]
 *                 description: Nuevo estado del pago
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
 *       400:
 *         description: Estado no válido
 *       404:
 *         description: Pago no encontrado
 */
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
