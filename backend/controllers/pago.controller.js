const Pago = require("../models/pago.model.js");
const Usuario = require("../models/usuario.model.js");
const Notificacion = require("../models/notificacion.model.js");
const Log = require("../models/log.model.js");
const generarLogs = require("../services/generarLogs");

const mercadopago = require("mercadopago");
mercadopago.access_token = process.env.MP_ACCESS_TOKEN_SANDBOX || "";

/**
 * @swagger
 * /api/pagos:
 *   post:
 *     summary: Registra un nuevo pago
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
 *               - clienteId
 *               - expertoId
 *               - monto
 *               - metodo
 *               - estado
 *     responses:
 *       201:
 *         description: Pago registrado exitosamente
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: Pago duplicado
 */
const crearPago = async (req, res) => {
  try {
    const datosPago = req.body;

    // Validar autenticación por email/token
    if (!req.usuario || req.usuario.email !== datosPago.clienteId) {
      return res.status(403).json({
        mensaje: "No autorizado. El clienteId debe coincidir con el usuario autenticado.",
        error: "Autenticación inválida.",
      });
    }

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

    if (typeof datosPago.monto !== "number" || datosPago.monto <= 0) {
      return res.status(400).json({
        mensaje: "El monto debe ser un número mayor a 0.",
        error: "Tipo de dato incorrecto o monto inválido.",
      });
    }

    // Validar estado permitido
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

    // Validar duplicidad de transaccionId si existe
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

    // Generar transaccionId automáticamente si no lo envían
    if (!datosPago.transaccionId) {
      datosPago.transaccionId =
        "ST-" +
        Date.now() +
        "-" +
        Math.random().toString(36).substr(2, 9).toUpperCase();
    }

    // Registro normal
    const nuevoPago = new Pago(datosPago);
    await nuevoPago.save();

    generarLogs.registrarEvento({
      usuarioEmail: nuevoPago.clienteId,
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
      usuarioEmail: (req.body && req.body.clienteId) || null,
      nombre: null,
      apellido: null,
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

// Listar todos los pagos
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

    // Notificación/log de cambio de estado
    try {
      const cliente = await Usuario.findOne({ email: pago.clienteId });
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
      console.error("Error guardando log en BD:", e.message);
    }

    generarLogs.registrarEvento({
      usuarioEmail: pago.clienteId,
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
  tieneRol,
};
