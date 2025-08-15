/**
 * CONTROLADOR DE PAGOS
 * Lógica para registrar, listar y actualizar pagos asociados a asesorías.
 */
const Pago = require("../models/pago.model.js");

const crearPago = async (req, res) => {
  try {
    const datosPago = req.body;
    const nuevoPago = new Pago(datosPago);
    await nuevoPago.save();
    res.status(201).json({ mensaje: "Pago registrado.", pago: nuevoPago });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al registrar pago." });
  }
};

const obtenerPagos = async (req, res) => {
  try {
    const pagos = await Pago.find().sort({ createdAt: -1 });
    res.status(200).json(pagos);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al listar pagos." });
  }
};

const obtenerPagoPorId = async (req, res) => {
  try {
    const pago = await Pago.findById(req.params.id);
    if (!pago) return res.status(404).json({ mensaje: "Pago no encontrado." });
    res.status(200).json(pago);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al buscar pago." });
  }
};

const actualizarEstadoPago = async (req, res) => {
  try {
    const { estado } = req.body;
    const pago = await Pago.findByIdAndUpdate(
      req.params.id,
      { estado },
      { new: true }
    );
    if (!pago) return res.status(404).json({ mensaje: "Pago no encontrado." });
    res.status(200).json({ mensaje: "Estado actualizado.", pago });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al actualizar estado del pago." });
  }
};

module.exports = {
  crearPago,
  obtenerPagos,
  obtenerPagoPorId,
  actualizarEstadoPago,
};
