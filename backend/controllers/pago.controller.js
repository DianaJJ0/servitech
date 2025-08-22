/**
 * CONTROLADOR DE PAGOS
 * Lógica para registrar, listar y actualizar pagos asociados a asesorías.
 */
const Pago = require("../models/pago.model.js");

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
    res.status(201).json({ mensaje: "Pago registrado.", pago: nuevoPago });
  } catch (error) {
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
    res.status(200).json({ mensaje: "Estado actualizado.", pago });
  } catch (error) {
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
