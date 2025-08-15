/**
 * CONTROLADOR DE LOGS
 * Lógica para registrar y consultar logs del sistema.
 */
const Log = require("../models/log.model.js");

const crearLog = async (req, res) => {
  try {
    const datos = req.body;
    const log = new Log(datos);
    await log.save();
    res.status(201).json({ mensaje: "Log registrado.", log });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al registrar log." });
  }
};

const obtenerLogs = async (req, res) => {
  try {
    const logs = await Log.find().sort({ createdAt: -1 });
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al listar logs." });
  }
};

const obtenerLogPorId = async (req, res) => {
  try {
    const log = await Log.findById(req.params.id);
    if (!log) return res.status(404).json({ mensaje: "Log no encontrado." });
    res.status(200).json(log);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al buscar log." });
  }
};

module.exports = {
  crearLog,
  obtenerLogs,
  obtenerLogPorId,
};
