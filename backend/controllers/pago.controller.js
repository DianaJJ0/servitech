/**
 * Controlador de pagos - backend/controllers/pago.controller.js
 * Maneja la creación, consulta y actualización de pagos sin SDK complejo de MercadoPago
 */

const Pago = require("../models/pago.model.js");
const Asesoria = require("../models/asesoria.model.js");
const Usuario = require("../models/usuario.model.js");
const Notificacion = require("../models/notificacion.model.js");
const generarLogs = require("../services/generarLogs");
const { enviarCorreo } = require("../services/email.service.js");

const ESTADOS_VALIDOS = [
  "pendiente",
  "procesando",
  "retenido",
  "liberado",
  "reembolsado-total",
  "reembolsado-parcial",
  "fallido",
];

/**
 * @swagger
 * /api/pagos/crear-preferencia:
 *   post:
 *     summary: Crear preferencia de pago para asesoría
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
 *             properties:
 *               titulo:
 *                 type: string
 *               expertoEmail:
 *                 type: string
 *               fechaHoraInicio:
 *                 type: string
 *               duracionMinutos:
 *                 type: number
 *     responses:
 *       201:
 *         description: Preferencia creada exitosamente
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: Experto no encontrado
 *       409:
 *         description: Conflicto de horarios
 */
const crearPreferenciaPago = async (req, res) => {
  try {
    const { titulo, expertoEmail, fechaHoraInicio, duracionMinutos } = req.body;
    const clienteEmail = req.usuario.email;

    // Validaciones de entrada
    if (!titulo || titulo.trim().length === 0) {
      return res.status(400).json({
        success: false,
        mensaje: "El título de la asesoría es obligatorio.",
      });
    }

    if (!expertoEmail || expertoEmail.trim().length === 0) {
      return res.status(400).json({
        success: false,
        mensaje: "El email del experto es obligatorio.",
      });
    }

    if (!fechaHoraInicio) {
      return res.status(400).json({
        success: false,
        mensaje: "La fecha y hora de inicio es obligatoria.",
      });
    }

    if (!duracionMinutos || ![60, 120, 180].includes(Number(duracionMinutos))) {
      return res.status(400).json({
        success: false,
        mensaje: "La duración debe ser 60, 120 o 180 minutos.",
      });
    }

    // Validar que no sea el mismo usuario
    if (clienteEmail === expertoEmail) {
      return res.status(400).json({
        success: false,
        mensaje: "No puedes agendar una asesoría contigo mismo.",
      });
    }

    // Buscar experto
    const experto = await Usuario.findOne({
      email: expertoEmail,
      roles: "experto",
      estado: "activo",
    });

    if (!experto) {
      return res.status(404).json({
        success: false,
        mensaje: "Experto no encontrado o no disponible.",
      });
    }

    // Validar fecha futura
    const fechaAsesoria = new Date(fechaHoraInicio);
    const ahora = new Date();
    if (fechaAsesoria <= ahora) {
      return res.status(400).json({
        success: false,
        mensaje: "La fecha de la asesoría debe ser futura.",
      });
    }

    // Validar disponibilidad del experto
    const fechaFin = new Date(
      fechaAsesoria.getTime() + Number(duracionMinutos) * 60000
    );
    const solapamiento = await Asesoria.findOne({
      "experto.email": expertoEmail,
      $or: [
        {
          fechaHoraInicio: { $lte: fechaAsesoria },
          $expr: {
            $gt: [
              {
                $add: [
                  "$fechaHoraInicio",
                  { $multiply: ["$duracionMinutos", 60000] },
                ],
              },
              fechaAsesoria,
            ],
          },
        },
        {
          fechaHoraInicio: { $lt: fechaFin },
          $expr: {
            $gte: [
              {
                $add: [
                  "$fechaHoraInicio",
                  { $multiply: ["$duracionMinutos", 60000] },
                ],
              },
              fechaFin,
            ],
          },
        },
      ],
      estado: { $in: ["pendiente-aceptacion", "confirmada"] },
    });

    if (solapamiento) {
      return res.status(409).json({
        success: false,
        mensaje: "El experto ya tiene una asesoría programada en ese horario.",
      });
    }

    const montoTotal = 25000; // $25,000 COP precio fijo
    const comisionPlataforma = Math.round(montoTotal * 0.15); // 15%
    const montoExperto = montoTotal - comisionPlataforma; // 85%

    // Por ahora creamos la asesoría directamente como retenida (simulando pago exitoso)
    // En un entorno real, aquí iría la integración completa con MercadoPago
    const externalReference = `ASE_${Date.now()}_${clienteEmail}`;

    // Crear pago en estado retenido (simulando pago exitoso)
    const nuevoPago = new Pago({
      clienteId: clienteEmail,
      expertoId: expertoEmail,
      monto: montoTotal,
      montoExperto: montoExperto,
      comisionPlataforma: comisionPlataforma,
      moneda: "COP",
      metodo: "mercadopago",
      estado: "retenido", // Directamente retenido para simplificar
      fechaPago: new Date(),
      transaccionId: externalReference,
      detalles: {
        titulo,
        fechaHoraInicio,
        duracionMinutos: Number(duracionMinutos),
        preferenceId: `PREF_${Date.now()}`,
        mpPaymentId: `PAY_${Date.now()}`,
        mpStatus: "approved",
        simulado: true, // Indicador de que es un pago simulado
      },
    });

    await nuevoPago.save();

    // Crear asesoría en estado pendiente-aceptacion (como si el pago ya se procesó)
    const nuevaAsesoria = new Asesoria({
      titulo,
      categoria: "Consultoría Técnica",
      fechaHoraInicio: fechaAsesoria,
      duracionMinutos: Number(duracionMinutos),
      cliente: {
        email: req.usuario.email,
        nombre: req.usuario.nombre,
        apellido: req.usuario.apellido,
        avatarUrl: req.usuario.avatarUrl || "",
      },
      experto: {
        email: experto.email,
        nombre: experto.nombre,
        apellido: experto.apellido,
        avatarUrl: experto.avatarUrl || "",
      },
      estado: "pendiente-aceptacion", // Directo a pendiente de aceptación
      pagoId: nuevoPago._id,
    });

    await nuevaAsesoria.save();

    // Notificar al experto inmediatamente
    try {
      const fechaLocal = new Date(fechaAsesoria).toLocaleString("es-CO");

      await Notificacion.create({
        usuarioId: experto._id,
        email: experto.email,
        tipo: "email",
        asunto: "Nueva asesoría pendiente de aceptación",
        mensaje: `Tienes una nueva solicitud de asesoría "${titulo}". Ingresa a Mis Asesorías para aceptarla o rechazarla.`,
        relacionadoCon: { tipo: "Asesoria", referenciaId: nuevaAsesoria._id },
        estado: "enviado",
        fechaEnvio: new Date(),
      });

      await enviarCorreo(
        experto.email,
        "Nueva asesoría pendiente de aceptación",
        `Tienes una nueva solicitud de asesoría "${titulo}".\n\nCliente: ${req.usuario.nombre} ${req.usuario.apellido}\nFecha y hora: ${fechaLocal}\nDuración: ${duracionMinutos} minutos\n\nIngresa a ServiTech en "Mis Asesorías" para aceptarla o rechazarla.\n\nTienes hasta 24 horas antes de la cita para responder.`,
        {
          nombreDestinatario: experto.nombre,
          apellidoDestinatario: experto.apellido,
        }
      );
    } catch (e) {
      console.error("Error enviando notificación al experto:", e);
    }

    await generarLogs.registrarEvento({
      usuarioEmail: clienteEmail,
      nombre: req.usuario.nombre,
      apellido: req.usuario.apellido,
      accion: "CREAR_PREFERENCIA_PAGO",
      detalle: `Preferencia creada (simulada): ${nuevoPago._id}`,
      resultado: "Exito",
      tipo: "pago",
      persistirEnDB: true,
    });

    // Simular respuesta de MercadoPago exitosa
    res.status(201).json({
      success: true,
      mensaje: "Pago procesado exitosamente.",
      data: {
        linkPago: `/confirmacion-asesoria?status=success&asesoriaId=${nuevaAsesoria._id}`,
        pagoId: nuevoPago._id,
        asesoriaId: nuevaAsesoria._id,
        monto: montoTotal,
        simulado: true,
      },
    });
  } catch (error) {
    console.error("Error creando preferencia:", error);
    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario?.email || null,
      accion: "ERROR_CREAR_PREFERENCIA",
      detalle: error.message,
      resultado: "Error",
      tipo: "pago",
      persistirEnDB: true,
    });
    res.status(500).json({
      success: false,
      mensaje: "Error interno al crear preferencia de pago.",
      error: error.message,
    });
  }
};

/**
 * @swagger
 * /api/pagos/webhook:
 *   post:
 *     summary: Webhook de Mercado Pago
 *     tags: [Pagos]
 *     responses:
 *       200:
 *         description: Webhook procesado
 */
const webhookMercadoPago = async (req, res) => {
  try {
    // Por ahora solo log del webhook recibido
    console.log("Webhook recibido:", req.body);

    await generarLogs.registrarEvento({
      usuarioEmail: null,
      accion: "WEBHOOK_MP_RECIBIDO",
      detalle: `Webhook tipo: ${req.body.type || "desconocido"}`,
      resultado: "Exito",
      tipo: "pago",
      persistirEnDB: true,
    });

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Error en webhook:", error);
    res.status(500).json({ error: "Error procesando webhook" });
  }
};

/**
 * @swagger
 * /api/pagos/{id}/reembolsar:
 *   post:
 *     summary: Procesar reembolso
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               porcentaje:
 *                 type: number
 *                 description: "Porcentaje a reembolsar (1 = 100%, 0.8 = 80%)"
 *               motivo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reembolso procesado
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: Pago no encontrado
 */
const procesarReembolso = async (req, res) => {
  try {
    const { id } = req.params;
    const { porcentaje = 1, motivo = "Cancelación" } = req.body;

    // Validaciones
    if (!id) {
      return res.status(400).json({
        success: false,
        mensaje: "ID de pago requerido.",
      });
    }

    if (porcentaje < 0 || porcentaje > 1) {
      return res.status(400).json({
        success: false,
        mensaje: "El porcentaje debe estar entre 0 y 1.",
      });
    }

    const pago = await Pago.findById(id);
    if (!pago) {
      return res.status(404).json({
        success: false,
        mensaje: "Pago no encontrado",
      });
    }

    const montoReembolso = Math.round(pago.monto * porcentaje);

    // Simular reembolso (en un entorno real aquí iría la API de MercadoPago)
    pago.estado =
      porcentaje === 1 ? "reembolsado-total" : "reembolsado-parcial";
    pago.detalles.reembolso = {
      fecha: new Date(),
      monto: montoReembolso,
      porcentaje,
      motivo,
      refundId: `REF_${Date.now()}`,
      simulado: true,
    };
    await pago.save();

    await generarLogs.registrarEvento({
      usuarioEmail: pago.clienteId,
      accion: "REEMBOLSO_PROCESADO",
      detalle: `Reembolso ${porcentaje * 100}% - $${montoReembolso} (simulado)`,
      resultado: "Exito",
      tipo: "pago",
      persistirEnDB: true,
    });

    res.json({
      success: true,
      mensaje: "Reembolso procesado exitosamente",
      data: {
        montoReembolsado: montoReembolso,
        porcentaje: porcentaje * 100,
        simulado: true,
      },
    });
  } catch (error) {
    console.error("Error procesando reembolso:", error);
    res.status(500).json({
      success: false,
      mensaje: "Error procesando reembolso",
      error: error.message,
    });
  }
};

// Funciones existentes (mantienen la lógica original)
const crearPago = async (req, res) => {
  try {
    const datosPago = req.body;

    if (!req.usuario || req.usuario.email !== datosPago.clienteId) {
      return res.status(403).json({
        mensaje:
          "No autorizado. El clienteId debe coincidir con el usuario autenticado.",
      });
    }

    if (
      !datosPago.clienteId ||
      !datosPago.expertoId ||
      !datosPago.monto ||
      !datosPago.metodo ||
      !datosPago.estado
    ) {
      return res.status(400).json({
        mensaje: "Faltan datos obligatorios para el registro del pago.",
      });
    }

    if (typeof datosPago.monto !== "number" || datosPago.monto <= 0) {
      return res.status(400).json({
        mensaje: "El monto debe ser un número mayor a 0.",
      });
    }

    if (!ESTADOS_VALIDOS.includes(datosPago.estado)) {
      return res.status(400).json({
        mensaje: "Estado de pago inválido.",
        error: `Los estados permitidos son: ${ESTADOS_VALIDOS.join(", ")}`,
      });
    }

    if (datosPago.transaccionId) {
      const pagoExistente = await Pago.findOne({
        transaccionId: datosPago.transaccionId,
      });
      if (pagoExistente) {
        return res.status(409).json({
          mensaje: "Ya existe un pago con ese transaccionId.",
        });
      }
    }

    if (!datosPago.transaccionId) {
      datosPago.transaccionId =
        "ST-" +
        Date.now() +
        "-" +
        Math.random().toString(36).substr(2, 9).toUpperCase();
    }

    const nuevoPago = new Pago(datosPago);
    await nuevoPago.save();

    try {
      const cliente = await Usuario.findOne({ email: nuevoPago.clienteId });
      if (cliente) {
        const asunto = "Pago registrado y retenido para asesoría";
        const mensaje = `Tu pago de $${nuevoPago.monto} fue registrado correctamente. El dinero estará retenido y solo será liberado al experto cuando la asesoría termine exitosamente.`;
        await Notificacion.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "email",
          asunto,
          mensaje,
          relacionadoCon: { tipo: "Pago", referenciaId: nuevoPago._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });
        await enviarCorreo(cliente.email, asunto, mensaje, {
          nombreDestinatario: cliente.nombre,
          apellidoDestinatario: cliente.apellido,
        });
      }
    } catch (e) {}

    await generarLogs.registrarEvento({
      usuarioEmail: nuevoPago.clienteId,
      accion: "CREAR_PAGO",
      detalle: `Pago registrado id:${nuevoPago._id} monto:${nuevoPago.monto}`,
      resultado: "Exito",
      tipo: "pago",
      persistirEnDB: true,
    });

    res.status(201).json({ mensaje: "Pago registrado.", pago: nuevoPago });
  } catch (error) {
    await generarLogs.registrarEvento({
      usuarioEmail: (req.body && req.body.clienteId) || null,
      accion: "CREAR_PAGO",
      detalle: "Error al registrar pago",
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "pago",
      persistirEnDB: true,
    });
    res.status(500).json({
      mensaje: "Error interno al registrar pago.",
      error: error.message,
    });
  }
};

const obtenerPagos = async (req, res) => {
  try {
    const pagos = await Pago.find().sort({ createdAt: -1 });
    res.status(200).json(pagos);
  } catch (error) {
    res
      .status(500)
      .json({ mensaje: "Error al listar pagos.", error: error.message });
  }
};

const obtenerPagoPorId = async (req, res) => {
  try {
    const pago = await Pago.findById(req.params.id);
    if (!pago) return res.status(404).json({ mensaje: "Pago no encontrado." });
    res.status(200).json(pago);
  } catch (error) {
    res
      .status(500)
      .json({ mensaje: "Error al buscar pago.", error: error.message });
  }
};

const actualizarEstadoPago = async (req, res) => {
  try {
    const { estado } = req.body;
    if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({
        mensaje: "Estado de pago inválido.",
        error: `Estados permitidos: ${ESTADOS_VALIDOS.join(", ")}`,
      });
    }
    const pago = await Pago.findByIdAndUpdate(
      req.params.id,
      { estado },
      { new: true }
    );
    if (!pago) return res.status(404).json({ mensaje: "Pago no encontrado." });

    try {
      const cliente = await Usuario.findOne({ email: pago.clienteId });
      if (cliente) {
        const asunto = "Actualización de estado de pago";
        const mensaje = `Hola ${cliente.nombre} ${cliente.apellido}, tu pago ha cambiado de estado a "${estado}".`;
        await Notificacion.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "email",
          asunto,
          mensaje,
          relacionadoCon: { tipo: "Pago", referenciaId: pago._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });
        await enviarCorreo(cliente.email, asunto, mensaje, {
          nombreDestinatario: cliente.nombre,
          apellidoDestinatario: cliente.apellido,
        });
      }
    } catch (e) {}

    if (estado === "liberado") {
      try {
        const experto = await Usuario.findOne({ email: pago.expertoId });
        if (experto) {
          const asunto = "Has recibido un pago por asesoría";
          const mensaje = `Has recibido un nuevo pago de $${pago.monto} por una asesoría. Ingresa a ServiTech para ver los detalles.`;
          await Notificacion.create({
            usuarioId: experto._id,
            email: experto.email,
            tipo: "email",
            asunto,
            mensaje,
            relacionadoCon: { tipo: "Pago", referenciaId: pago._id },
            estado: "enviado",
            fechaEnvio: new Date(),
          });
          await enviarCorreo(experto.email, asunto, mensaje, {
            nombreDestinatario: experto.nombre,
            apellidoDestinatario: experto.apellido,
          });
        }
      } catch (e) {}
    }

    await generarLogs.registrarEvento({
      usuarioEmail: pago.clienteId,
      accion: "ACTUALIZAR_ESTADO_PAGO",
      detalle: `Pago ${pago._id} cambiado a ${estado}`,
      resultado: "Exito",
      tipo: "pago",
      persistirEnDB: true,
    });

    res.status(200).json({ mensaje: "Estado actualizado.", pago });
  } catch (error) {
    await generarLogs.registrarEvento({
      usuarioEmail: null,
      accion: "ACTUALIZAR_ESTADO_PAGO",
      detalle: "Error al actualizar estado de pago",
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "pago",
      persistirEnDB: true,
    });
    res.status(500).json({
      mensaje: "Error al actualizar estado del pago.",
      error: error.message,
    });
  }
};

module.exports = {
  crearPreferenciaPago,
  webhookMercadoPago,
  procesarReembolso,
  crearPago,
  obtenerPagos,
  obtenerPagoPorId,
  actualizarEstadoPago,
};
