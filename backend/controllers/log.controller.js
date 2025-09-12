/**
 * CONTROLADOR DE LOGS
 * Lógica para registrar y consultar logs del sistema.
 */
const Log = require("../models/log.model.js");
const Usuario = require("../models/usuario.model.js");

/**
 * @openapi
 * tags:
 *   - name: Logs
 *     description: Consultas y gestión de logs
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
 * Registra un nuevo log en el sistema
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const crearLog = async (req, res) => {
  try {
    const datos = req.body;
    // Validar campos obligatorios
    if (!datos.usuarioId || !datos.email || !datos.tipo || !datos.descripcion) {
      return res.status(400).json({
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

/**
 * Lista todos los logs del sistema (solo admin)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
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

/**
 * Obtiene un log específico por ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
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

/**
 * Obtener logs filtrados.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @openapi
 * /api/logs:
 *   get:
 *     tags: [Logs]
 *     summary: Obtener logs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de logs
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Requiere rol admin
 */

module.exports = {
  crearLog,
  obtenerLogs,
  obtenerLogPorId,
};
