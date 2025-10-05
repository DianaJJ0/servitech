/**
 * Controlador de Pagos Simulados - ServiTech
 * @module controllers/pago
 * @description Gestión completa de pagos simulados sin integración externa
 */

const Pago = require("../models/pago.model.js");
const Usuario = require("../models/usuario.model.js");
const Asesoria = require("../models/asesoria.model.js");
const Notificacion = require("../models/notificacion.model.js");
const generarLogs = require("../services/generarLogs");
const { enviarCorreo } = require("../services/email.service.js");

/**
 * Crear pago simulado y asesoría
 * @function crearPagoSimulado
 * @description Procesa un pago simulado y crea la asesoría correspondiente
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Resultado del pago simulado
 *
 * @openapi
 * /api/pagos/crear-pago-simulado:
 *   post:
 *     summary: Crear pago simulado y asesoría
 *     description: Procesa un pago de forma simulada y crea la asesoría automáticamente
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
 *               - descripcion
 *               - expertoEmail
 *               - fechaHoraInicio
 *               - duracionMinutos
 *               - monto
 *             properties:
 *               titulo:
 *                 type: string
 *                 description: Título de la asesoría
 *                 example: "Configuración de servidor web"
 *               descripcion:
 *                 type: string
 *                 description: Descripción detallada
 *                 example: "Asesoría para configurar Apache y SSL"
 *               expertoEmail:
 *                 type: string
 *                 format: email
 *                 description: Email del experto
 *                 example: "experto@ejemplo.com"
 *               fechaHoraInicio:
 *                 type: string
 *                 format: date-time
 *                 description: Fecha y hora de inicio
 *                 example: "2024-12-15T14:00:00.000Z"
 *               duracionMinutos:
 *                 type: integer
 *                 enum: [60, 90, 120, 180]
 *                 description: Duración en minutos
 *                 example: 60
 *               monto:
 *                 type: number
 *                 minimum: 1000
 *                 description: Monto en pesos colombianos
 *                 example: 50000
 *     responses:
 *       201:
 *         description: Pago procesado y asesoría creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Pago procesado exitosamente"
 *                 pagoId:
 *                   type: string
 *                   example: "507f1f77bcf86cd799439011"
 *                 asesoriaId:
 *                   type: string
 *                   example: "507f1f77bcf86cd799439012"
 *                 estadoPago:
 *                   type: string
 *                   example: "retenido"
 *       400:
 *         description: Datos inválidos o conflicto de horario
 *       404:
 *         description: Experto no encontrado
 *       500:
 *         description: Error interno del servidor
 */
const crearPagoSimulado = async (req, res) => {
  try {
    const {
      titulo,
      descripcion,
      expertoEmail,
      fechaHoraInicio,
      duracionMinutos,
      monto,
      datosPago, // NUEVO: datos del formulario de pago
    } = req.body;

    console.log("=== CREAR PAGO SIMULADO ===");
    console.log("Datos recibidos:", {
      titulo,
      descripcion,
      expertoEmail,
      fechaHoraInicio,
      duracionMinutos,
      monto,
      datosPago,
    });

    // Validaciones básicas
    if (
      !titulo ||
      !descripcion ||
      !expertoEmail ||
      !fechaHoraInicio ||
      !duracionMinutos ||
      !monto
    ) {
      return res.status(400).json({
        mensaje: "Todos los campos son requeridos",
      });
    }

    // Validar datos del formulario de pago (NUEVO)
    if (
      !datosPago ||
      !datosPago.nombre ||
      !datosPago.email ||
      !datosPago.cedula
    ) {
      return res.status(400).json({
        mensaje: "Faltan los datos básicos de pago (nombre, email, cédula).",
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datosPago.email)) {
      return res
        .status(400)
        .json({ mensaje: "Correo electrónico de pago inválido." });
    }
    if (!/^[0-9]{5,15}$/.test(datosPago.cedula)) {
      return res.status(400).json({ mensaje: "Cédula/NIT inválido." });
    }

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

    const fechaAsesoria = new Date(fechaHoraInicio);
    const ahora = new Date();

    // Validar que la fecha sea futura
    if (fechaAsesoria <= ahora) {
      return res.status(400).json({
        mensaje: "La fecha de la asesoría debe ser futura",
      });
    }

    // Verificar disponibilidad del experto
    const fechaFin = new Date(
      fechaAsesoria.getTime() + duracionMinutos * 60000
    );

    const asesoriaConflicto = await Asesoria.findOne({
      "experto.email": expertoEmail,
      estado: { $in: ["confirmada", "en-progreso"] },
      $or: [
        {
          // Asesoría existente que empieza antes y termina después del inicio de la nueva
          fechaHoraInicio: { $lte: fechaAsesoria },
          fechaHoraFin: { $gt: fechaAsesoria },
        },
        {
          // Asesoría existente que empieza antes del fin de la nueva y termina después
          fechaHoraInicio: { $lt: fechaFin },
          fechaHoraFin: { $gte: fechaFin },
        },
        {
          // Asesoría existente que está completamente dentro de la nueva
          fechaHoraInicio: { $gte: fechaAsesoria },
          fechaHoraFin: { $lte: fechaFin },
        },
      ],
    });

    if (asesoriaConflicto) {
      return res.status(400).json({
        mensaje: "El experto ya tiene una asesoría programada en ese horario",
        conflicto: {
          titulo: asesoriaConflicto.titulo,
          fecha: asesoriaConflicto.fechaHoraInicio,
          estado: asesoriaConflicto.estado,
        },
      });
    }

    // Crear pago simulado (se guardan los datos de pago en metadatos)
    const nuevoPago = new Pago({
      clienteId: req.usuario.email,
      expertoId: expertoEmail,
      monto: parseFloat(monto),
      metodo: "simulado",
      estado: "retenido", // Dinero retenido hasta finalizar asesoría
      descripcion: `Asesoría: ${titulo}`,
      fechaHoraAsesoria: fechaAsesoria,
      duracionMinutos: parseInt(duracionMinutos),
      metadatos: {
        titulo: titulo,
        descripcion: descripcion,
        expertoNombre: `${experto.nombre} ${experto.apellido}`,
        clienteNombre: `${req.usuario.nombre} ${req.usuario.apellido}`,
        simulado: true,
        fechaProcesamiento: new Date(),
        datosPago: {
          nombre: datosPago.nombre,
          email: datosPago.email,
          cedula: datosPago.cedula,
          telefono: datosPago.telefono || "",
        },
      },
    });

    await nuevoPago.save();
    console.log("Pago simulado creado:", nuevoPago._id);

    // Crear asesoría automáticamente
    const nuevaAsesoria = new Asesoria({
      titulo: titulo,
      descripcion: descripcion,
      cliente: {
        email: req.usuario.email,
        nombre: req.usuario.nombre,
        apellido: req.usuario.apellido,
        avatarUrl: req.usuario.avatarUrl || null,
      },
      experto: {
        email: experto.email,
        nombre: experto.nombre,
        apellido: experto.apellido,
        avatarUrl: experto.avatarUrl || null,
      },
      categoria: "Tecnologia",
      fechaHoraInicio: fechaAsesoria,
      fechaHoraFin: fechaFin,
      duracionMinutos: parseInt(duracionMinutos),
      estado: "pendiente-aceptacion",
      pagoId: nuevoPago._id,
    });

    await nuevaAsesoria.save();
    console.log("Asesoría creada:", nuevaAsesoria._id);

    // Actualizar pago con ID de asesoría
    await Pago.findByIdAndUpdate(nuevoPago._id, {
      asesoriaId: nuevaAsesoria._id,
    });

    // Enviar notificaciones
    await enviarNotificacionesNuevaAsesoria(
      nuevaAsesoria,
      nuevoPago,
      experto,
      req.usuario
    );

    // Registrar evento en logs
    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario.email,
      nombre: req.usuario.nombre,
      apellido: req.usuario.apellido,
      accion: "CREAR_PAGO_SIMULADO",
      detalle: `Pago simulado y asesoría creada: ${titulo}, monto: $${monto} COP`,
      resultado: "Exito",
      tipo: "pago",
      persistirEnDB: true,
    });

    res.status(201).json({
      mensaje: "Pago procesado exitosamente",
      pagoId: nuevoPago._id,
      asesoriaId: nuevaAsesoria._id,
      estadoPago: "retenido",
    });
  } catch (error) {
    console.error("Error creando pago simulado:", error);

    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario?.email || null,
      accion: "ERROR_CREAR_PAGO_SIMULADO",
      detalle: error.message,
      resultado: "Error",
      tipo: "pago",
      persistirEnDB: true,
    });

    res.status(500).json({
      mensaje: "Error interno al procesar el pago",
      error: error.message,
    });
  }
};

/**
 * Liberar pago al finalizar asesoría
 * @function liberarPago
 * @description Libera el pago retenido cuando se finaliza una asesoría
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Resultado de la liberación
 *
 * @openapi
 * /api/pagos/{id}/liberar:
 *   post:
 *     summary: Liberar pago retenido
 *     description: Libera el dinero retenido al experto cuando se finaliza una asesoría
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
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Pago liberado exitosamente
 *       400:
 *         description: El pago no puede ser liberado
 *       404:
 *         description: Pago no encontrado
 *       403:
 *         description: Sin permisos para liberar el pago
 */
const liberarPago = async (req, res) => {
  try {
    const pagoId = req.params.id;

    console.log("=== LIBERAR PAGO ===");
    console.log("PagoId:", pagoId);

    const pago = await Pago.findById(pagoId);
    if (!pago) {
      return res.status(404).json({ mensaje: "Pago no encontrado" });
    }

    // Verificar que el pago esté en estado retenido
    if (pago.estado !== "retenido") {
      return res.status(400).json({
        mensaje: `El pago no puede ser liberado. Estado actual: ${pago.estado}`,
      });
    }

    // Verificar permisos (cliente, experto o admin)
    const esCliente = req.usuario.email === pago.clienteId;
    const esExperto = req.usuario.email === pago.expertoId;
    const esAdmin = req.usuario.roles && req.usuario.roles.includes("admin");

    if (!esCliente && !esExperto && !esAdmin) {
      return res.status(403).json({
        mensaje: "No tienes permisos para liberar este pago",
      });
    }

    // Actualizar estado del pago a liberado
    await Pago.findByIdAndUpdate(pagoId, {
      estado: "liberado",
      fechaLiberacion: new Date(),
      metadatos: {
        ...pago.metadatos,
        liberadoPor: req.usuario.email,
        fechaLiberacion: new Date(),
      },
    });

    console.log("Pago liberado exitosamente");

    // Enviar notificaciones de liberación
    await enviarNotificacionesLiberacionPago(pago);

    // Registrar evento
    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario.email,
      nombre: req.usuario.nombre,
      apellido: req.usuario.apellido,
      accion: "LIBERAR_PAGO",
      detalle: `Pago ${pagoId} liberado exitosamente`,
      resultado: "Exito",
      tipo: "pago",
      persistirEnDB: true,
    });

    res.json({
      mensaje: "Pago liberado exitosamente",
      pagoId: pagoId,
      estado: "liberado",
    });
  } catch (error) {
    console.error("Error liberando pago:", error);
    res.status(500).json({
      mensaje: "Error interno liberando pago",
      error: error.message,
    });
  }
};

/**
 * Reembolsar pago
 * @function reembolsarPago
 * @description Procesa un reembolso total o parcial de un pago
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Resultado del reembolso
 *
 * @openapi
 * /api/pagos/{id}/reembolsar:
 *   post:
 *     summary: Procesar reembolso de pago
 *     description: Procesa un reembolso cuando se cancela una asesoría
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *                 description: Motivo del reembolso
 *                 example: "Asesoría cancelada por el experto"
 *               monto:
 *                 type: number
 *                 description: Monto a reembolsar (opcional, por defecto el total)
 *                 example: 25000
 *     responses:
 *       200:
 *         description: Reembolso procesado exitosamente
 *       400:
 *         description: El pago no puede ser reembolsado
 *       404:
 *         description: Pago no encontrado
 *       403:
 *         description: Sin permisos para reembolsar
 */
const reembolsarPago = async (req, res) => {
  try {
    const pagoId = req.params.id;
    const { motivo = "Asesoría cancelada", monto } = req.body;

    console.log("=== REEMBOLSAR PAGO ===");
    console.log("PagoId:", pagoId, "Motivo:", motivo);

    const pago = await Pago.findById(pagoId);
    if (!pago) {
      return res.status(404).json({ mensaje: "Pago no encontrado" });
    }

    // Verificar que el pago pueda ser reembolsado
    if (!["retenido", "liberado"].includes(pago.estado)) {
      return res.status(400).json({
        mensaje: "El pago no puede ser reembolsado en su estado actual",
      });
    }

    // Verificar permisos
    const esCliente = req.usuario.email === pago.clienteId;
    const esExperto = req.usuario.email === pago.expertoId;
    const esAdmin = req.usuario.roles && req.usuario.roles.includes("admin");

    if (!esCliente && !esExperto && !esAdmin) {
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

    const nuevoEstado =
      montoReembolso === pago.monto ? "reembolsado" : "reembolsado-parcial";

    // Actualizar estado del pago
    await Pago.findByIdAndUpdate(pagoId, {
      estado: nuevoEstado,
      fechaReembolso: new Date(),
      metadatos: {
        ...pago.metadatos,
        motivoReembolso: motivo,
        montoReembolsado: montoReembolso,
        procesadoPor: req.usuario.email,
        fechaReembolso: new Date(),
      },
    });

    // Enviar notificaciones de reembolso
    await enviarNotificacionesReembolso(pago, motivo, montoReembolso);

    // Registrar evento
    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario.email,
      nombre: req.usuario.nombre,
      apellido: req.usuario.apellido,
      accion: "REEMBOLSAR_PAGO",
      detalle: `Reembolso procesado para pago ${pagoId}, monto: $${montoReembolso}`,
      resultado: "Exito",
      tipo: "pago",
      persistirEnDB: true,
    });

    res.json({
      mensaje: "Reembolso procesado exitosamente",
      pagoId: pagoId,
      montoReembolsado: montoReembolso,
      estado: nuevoEstado,
    });
  } catch (error) {
    console.error("Error procesando reembolso:", error);
    res.status(500).json({
      mensaje: "Error interno procesando reembolso",
      error: error.message,
    });
  }
};

/**
 * Obtener pagos con paginación
 * @function obtenerPagos
 * @description Obtiene lista paginada de pagos (solo administradores)
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
    if (req.query.metodo) {
      filtros.metodo = req.query.metodo;
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
    res.status(500).json({ mensaje: "Error interno obteniendo pagos" });
  }
};

/**
 * Obtener pago por ID
 * @function obtenerPagoPorId
 * @description Obtiene información de un pago específico
 */
const obtenerPagoPorId = async (req, res) => {
  try {
    const pago = await Pago.findById(req.params.id);

    if (!pago) {
      return res.status(404).json({ mensaje: "Pago no encontrado" });
    }

    res.json(pago);
  } catch (error) {
    console.error("Error obteniendo pago:", error);
    res.status(500).json({ mensaje: "Error interno obteniendo pago" });
  }
};

// Funciones auxiliares para notificaciones

/**
 * Envía notificaciones cuando se crea una nueva asesoría
 * @function enviarNotificacionesNuevaAsesoria
 * @private
 */
async function enviarNotificacionesNuevaAsesoria(
  asesoria,
  pago,
  experto,
  cliente
) {
  try {
    const fechaLocal = asesoria.fechaHoraInicio.toLocaleString("es-CO");
    const duracionTexto =
      asesoria.duracionMinutos === 60
        ? "1 hora"
        : asesoria.duracionMinutos === 90
        ? "1.5 horas"
        : asesoria.duracionMinutos === 120
        ? "2 horas"
        : "3 horas";

    // Notificación al experto
    await Notificacion.create({
      usuarioId: experto._id,
      email: experto.email,
      tipo: "email",
      asunto: "Nueva asesoría pendiente - Pago confirmado (SIMULADO)",
      mensaje: `Tienes una nueva solicitud de asesoría "${asesoria.titulo}". El pago ya fue procesado y está retenido de forma segura.`,
      relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
      estado: "enviado",
      fechaEnvio: new Date(),
    });

    await enviarCorreo(
      experto.email,
      "Nueva asesoría pendiente - Pago confirmado (SIMULADO)",
      `Tienes una nueva solicitud de asesoría titulada "${asesoria.titulo}".

Cliente: ${cliente.nombre} ${cliente.apellido}
Fecha y hora: ${fechaLocal}
Duración: ${duracionTexto}
Monto: $${pago.monto.toLocaleString("es-CO")} COP (SIMULADO)

El pago fue procesado en modo simulación y está retenido de forma segura. Ingresa a ServiTech para aceptar o rechazar esta solicitud.

Tienes 24 horas para responder a esta solicitud.`,
      {
        nombreDestinatario: experto.nombre,
        apellidoDestinatario: experto.apellido,
      }
    );

    // Notificación al cliente
    await Notificacion.create({
      usuarioId: cliente._id,
      email: cliente.email,
      tipo: "email",
      asunto: "Pago procesado - Asesoría enviada al experto (SIMULADO)",
      mensaje: `Tu pago fue procesado exitosamente. La solicitud de asesoría "${asesoria.titulo}" fue enviada al experto para su revisión.`,
      relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
      estado: "enviado",
      fechaEnvio: new Date(),
    });

    await enviarCorreo(
      cliente.email,
      "Pago procesado - Asesoría enviada al experto (SIMULADO)",
      `Tu pago de $${pago.monto.toLocaleString(
        "es-CO"
      )} COP fue procesado exitosamente en modo simulación.

La solicitud de asesoría "${asesoria.titulo}" fue enviada a ${experto.nombre} ${
        experto.apellido
      } para su revisión.

El experto tiene 24 horas para aceptar o rechazar tu solicitud. Recibirás una notificación con su respuesta.

Tu dinero está retenido de forma segura y solo se liberará al experto cuando la asesoría sea completada exitosamente.`,
      {
        nombreDestinatario: cliente.nombre,
        apellidoDestinatario: cliente.apellido,
      }
    );

    console.log("Notificaciones de nueva asesoría enviadas exitosamente");
  } catch (error) {
    console.error("Error enviando notificaciones de nueva asesoría:", error);
  }
}

/**
 * Envía notificaciones cuando se libera un pago
 * @function enviarNotificacionesLiberacionPago
 * @private
 */
async function enviarNotificacionesLiberacionPago(pago) {
  try {
    const cliente = await Usuario.findOne({ email: pago.clienteId });
    const experto = await Usuario.findOne({ email: pago.expertoId });

    if (!cliente || !experto) return;

    // Notificación al experto
    await enviarCorreo(
      experto.email,
      "Pago liberado - Asesoría completada (SIMULADO)",
      `El pago de $${pago.monto.toLocaleString(
        "es-CO"
      )} COP ha sido liberado exitosamente.

La asesoría con ${cliente.nombre} ${
        cliente.apellido
      } fue completada satisfactoriamente.

Este fue un pago simulado para desarrollo. En producción, el dinero sería transferido a tu cuenta.`,
      {
        nombreDestinatario: experto.nombre,
        apellidoDestinatario: experto.apellido,
      }
    );

    // Notificación al cliente
    await enviarCorreo(
      cliente.email,
      "Asesoría completada - Pago liberado (SIMULADO)",
      `Tu asesoría con ${experto.nombre} ${
        experto.apellido
      } ha sido completada exitosamente.

El pago de $${pago.monto.toLocaleString(
        "es-CO"
      )} COP ha sido liberado al experto.

Gracias por usar ServiTech. ¡Esperamos que hayas tenido una excelente experiencia!`,
      {
        nombreDestinatario: cliente.nombre,
        apellidoDestinatario: cliente.apellido,
      }
    );

    console.log("Notificaciones de liberación de pago enviadas exitosamente");
  } catch (error) {
    console.error("Error enviando notificaciones de liberación:", error);
  }
}

/**
 * Envía notificaciones cuando se reembolsa un pago
 * @function enviarNotificacionesReembolso
 * @private
 */
async function enviarNotificacionesReembolso(pago, motivo, montoReembolsado) {
  try {
    const cliente = await Usuario.findOne({ email: pago.clienteId });
    if (!cliente) return;

    await enviarCorreo(
      cliente.email,
      "Reembolso procesado (SIMULADO)",
      `Tu reembolso de $${montoReembolsado.toLocaleString(
        "es-CO"
      )} COP ha sido procesado exitosamente.

Motivo: ${motivo}

Este fue un pago simulado para desarrollo. En producción, el dinero sería devuelto a tu método de pago original.

Si tienes alguna pregunta, no dudes en contactarnos.`,
      {
        nombreDestinatario: cliente.nombre,
        apellidoDestinatario: cliente.apellido,
      }
    );

    console.log("Notificación de reembolso enviada exitosamente");
  } catch (error) {
    console.error("Error enviando notificación de reembolso:", error);
  }
}

module.exports = {
  crearPagoSimulado,
  liberarPago,
  reembolsarPago,
  obtenerPagos,
  obtenerPagoPorId,
};
