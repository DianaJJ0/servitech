/**
 * CONTROLADOR DE LOGS
 * Lógica para registrar y consultar logs del sistema.
 */
const Log = require("../models/log.model.js");
const Usuario = require("../models/usuario.model.js");

// Crear log
const crearLog = async (req, res) => {
  try {
    const datos = req.body;
    // Validar campos obligatorios
    if (!datos.usuarioId || !datos.email || !datos.tipo || !datos.descripcion) {
      return res
        .status(400)
        .json({
          mensaje:
            "Faltan datos obligatorios: usuarioId, email, tipo, descripcion.",
        });
    }
    // Verificar usuario real
    const usuario = await Usuario.findById(datos.usuarioId);
    if (!usuario || usuario.email !== datos.email) {
      return res
        .status(400)
        .json({ mensaje: "Usuario no encontrado o email no corresponde." });
    }
    const log = new Log({ ...datos, fecha: new Date() });
    await log.save();
    res.status(201).json({ mensaje: "Log registrado.", log });
  } catch (error) {
    res
      .status(500)
      .json({ mensaje: "Error al registrar log.", error: error.message });
  }
};

// Listar todos (solo admin)
const obtenerLogs = async (req, res) => {
  try {
    const logs = await Log.find().sort({ createdAt: -1 });
    res.status(200).json(logs);
  } catch (error) {
    res
      .status(500)
      .json({ mensaje: "Error al listar logs.", error: error.message });
  }
};

// Obtener log por ID
const obtenerLogPorId = async (req, res) => {
  try {
    const log = await Log.findById(req.params.id);
    if (!log) return res.status(404).json({ mensaje: "Log no encontrado." });
    res.status(200).json(log);
  } catch (error) {
    res
      .status(500)
      .json({ mensaje: "Error al buscar log.", error: error.message });
  }
};

module.exports = {
  crearLog,
  obtenerLogs,
  obtenerLogPorId,
};
