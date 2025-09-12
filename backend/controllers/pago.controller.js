/**
 * CONTROLADOR DE PAGOS
 * Lógica para registrar, listar y actualizar pagos asociados a asesorías.
 */
const Pago = require("../models/pago.model.js");
const Usuario = require("../models/usuario.model.js");
const Notificacion = require("../models/notificacion.model.js");
const Log = require("../models/log.model.js");
const generarLogs = require("../services/generarLogs");

/**
 * @openapi
 * tags:
 *   - name: Pagos
 *     description: Integración y gestión de pagos
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *         message:
 *           type: string
 *       required:
 *         - error
 *         - message
 */

/**
 * Registra un nuevo pago en el sistema
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 * @openapi
 * /api/pagos:
 *   post:
 *     tags: [Pagos]
 *     summary: Procesar pago
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Pago'
 *     responses:
 *       200:
 *         description: Pago procesado
 *       400:
 *         description: Petición inválida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const crearPago = async (req, res) => {
  try {
    const datosPago = req.body;

    // Validaciones clave
    if (
      !datosPago.clienteId ||
      !datosPago.expertoId ||
      !datosPago.monto ||
      !datosPago.metodo ||
      !datosPago.estado
    ) {
      return res.status(400).json({
        mensaje: "Faltan datos obligatorios para el registro del pago.",
        error:
          "Campos requeridos: clienteId, expertoId, monto, metodo, estado.",
      });
    }

    // Validación de tipo de datos
    if (typeof datosPago.monto !== "number" || datosPago.monto <= 0) {
      return res.status(400).json({
        mensaje: "El monto debe ser un número mayor a 0.",
        error: "Tipo de dato incorrecto o monto inválido.",
      });
    }

    // Validación de estado permitido
    const estadosValidos = [
      "pendiente",
      "retenido",
      "liberado",
      "reembolsado",
      "fallido",
    ];
    if (!estadosValidos.includes(datosPago.estado)) {
      return res.status(400).json({
        mensaje: "Estado de pago inválido.",
        error: `Los estados permitidos son: ${estadosValidos.join(", ")}`,
      });
    }

    // Validación de duplicidad de transacciónId (si lo usas como único)
    if (datosPago.transaccionId) {
      const pagoExistente = await Pago.findOne({
        transaccionId: datosPago.transaccionId,
      });
      if (pagoExistente) {
        return res.status(409).json({
          mensaje: "Ya existe un pago con ese transaccionId.",
          error: "Pago duplicado.",
        });
      }
    }

    // Registro normal
    const nuevoPago = new Pago(datosPago);
    await nuevoPago.save();

    // Registrar notificación a cliente y log
    try {
      const cliente = await Usuario.findById(nuevoPago.clienteId);
      if (cliente) {
        const asunto = "Confirmación de pago";
        const mensaje = `Tu pago de $${nuevoPago.monto} COP se ha registrado correctamente para la asesoría.`;

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
        await Log.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "pago",
          descripcion: "Registro de pago",
          entidad: "Pago",
          referenciaId: nuevoPago._id,
          datos: { asunto, mensaje },
        });
      }
    } catch (e) {
      // No detiene la creación si la notificación/log falla
      console.error("Error registrando notificación/log de pago:", e);
    }

    // Log de negocio: pago creado
    generarLogs.registrarEvento({
      usuarioEmail: (nuevoPago && nuevoPago.clienteEmail) || null,
      nombre: null,
      apellido: null,
      accion: "CREAR_PAGO",
      detalle: `Pago registrado id:${nuevoPago._id} monto:${nuevoPago.monto}`,
      resultado: "Exito",
      tipo: "pago",
      persistirEnDB: true,
    });

    res.status(201).json({ mensaje: "Pago registrado.", pago: nuevoPago });
  } catch (error) {
    generarLogs.registrarEvento({
      usuarioEmail: (req.body && req.body.clienteEmail) || null,
      nombre: null,
      apellido: null,
      accion: "CREAR_PAGO",
      detalle: "Error al registrar pago",
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "pago",
      persistirEnDB: true,
    });
    // Error de validación de MongoDB
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ mensaje: "Error de validación.", error: error.message });
    }
    // Error por ObjectId mal formado
    if (error.name === "CastError" && error.kind === "ObjectId") {
      return res.status(400).json({
        mensaje: "ID de usuario o asesoría inválido.",
        error: error.message,
      });
    }
    // Error por campos extraños
    if (error.code === 11000) {
      return res.status(409).json({
        mensaje: "Pago duplicado por campo único.",
        error: error.message,
      });
    }
    // Error genérico
    res.status(500).json({
      mensaje: "Error interno al registrar pago.",
      error: error.message,
    });
  }
};

/**
 * Lista todos los pagos (solo admin)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
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

/**
 * Obtiene un pago específico por ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
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

/**
 * Actualiza el estado de un pago (solo admin)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const actualizarEstadoPago = async (req, res) => {
  try {
    const { estado } = req.body;
    const estadosValidos = [
      "pendiente",
      "retenido",
      "liberado",
      "reembolsado",
      "fallido",
    ];
    if (!estado || !estadosValidos.includes(estado)) {
      return res.status(400).json({
        mensaje: "Estado de pago inválido.",
        error: `Los estados permitidos son: ${estadosValidos.join(", ")}`,
      });
    }
    const pago = await Pago.findByIdAndUpdate(
      req.params.id,
      { estado },
      { new: true }
    );
    if (!pago) return res.status(404).json({ mensaje: "Pago no encontrado." });

    // Registrar notificación/log por cambio de estado
    try {
      const cliente = await Usuario.findById(pago.clienteId);
      if (cliente) {
        const asunto = "Actualización de estado de pago";
        const mensaje = `Tu pago ha cambiado de estado a "${estado}".`;

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
        await Log.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "pago",
          descripcion: "Actualización de estado de pago",
          entidad: "Pago",
          referenciaId: pago._id,
          datos: { asunto, mensaje, nuevoEstado: estado },
        });
      }
    } catch (e) {
      console.error(
        "Error registrando notificación/log actualización pago:",
        e
      );
    }

    // Log por cambio de estado
    generarLogs.registrarEvento({
      usuarioEmail: (pago && pago.clienteEmail) || null,
      nombre: null,
      apellido: null,
      accion: "ACTUALIZAR_ESTADO_PAGO",
      detalle: `Pago ${pago._id} cambiado a ${estado}`,
      resultado: "Exito",
      tipo: "pago",
      persistirEnDB: true,
    });

    res.status(200).json({ mensaje: "Estado actualizado.", pago });
  } catch (error) {
    generarLogs.registrarEvento({
      usuarioEmail: null,
      nombre: null,
      apellido: null,
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
  crearPago,
  obtenerPagos,
  obtenerPagoPorId,
  actualizarEstadoPago,
};
