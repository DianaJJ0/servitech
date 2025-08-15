/**
 * CONTROLADOR DE NOTIFICACIONES
 * Lógica para registrar y listar notificaciones enviadas a usuarios.
 */
const Notificacion = require("../models/notificacion.model.js");

const crearNotificacion = async (req, res) => {
  try {
    const datos = req.body;
    const notificacion = new Notificacion(datos);
    await notificacion.save();
    res.status(201).json({ mensaje: "Notificación registrada.", notificacion });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al registrar notificación." });
  }
};

const obtenerNotificaciones = async (req, res) => {
  try {
    const notificaciones = await Notificacion.find().sort({ createdAt: -1 });
    res.status(200).json(notificaciones);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al listar notificaciones." });
  }
};

const obtenerNotificacionPorId = async (req, res) => {
  try {
    const notificacion = await Notificacion.findById(req.params.id);
    if (!notificacion)
      return res.status(404).json({ mensaje: "No encontrada." });
    res.status(200).json(notificacion);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al buscar notificación." });
  }
};

module.exports = {
  crearNotificacion,
  obtenerNotificaciones,
  obtenerNotificacionPorId,
};
