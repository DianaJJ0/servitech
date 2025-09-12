/**
 * CONTROLADOR DE NOTIFICACIONES
 * Lógica para registrar y listar notificaciones enviadas a usuarios.
 */
const Notificacion = require("../models/notificacion.model.js");
const Usuario = require("../models/usuario.model.js");

/**
 * @openapi
 * tags:
 *   - name: Notificaciones
 *     description: Gestión de notificaciones y webhooks
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
 * Registra una nueva notificación
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 * @openapi
 * /api/notificaciones:
 *   post:
 *     tags: [Notificaciones]
 *     summary: Enviar notificación
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Notificacion'
 *     responses:
 *       200:
 *         description: Notificación enviada
 *       400:
 *         description: Petición inválida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const crearNotificacion = async (req, res) => {
  try {
    const datos = req.body;
    // Validar datos obligatorios
    if (!datos.usuarioId || !datos.email || !datos.tipo) {
      return res.status(400).json({
        mensaje: "Faltan datos obligatorios: usuarioId, email, tipo.",
      });
    }
    // Verificar usuario real
    const usuario = await Usuario.findById(datos.usuarioId);
    if (!usuario || usuario.email !== datos.email) {
      return res
        .status(400)
        .json({ mensaje: "Usuario no encontrado o email no corresponde." });
    }
    const notificacion = new Notificacion({ ...datos, fechaEnvio: new Date() });
    await notificacion.save();
    res.status(201).json({ mensaje: "Notificación registrada.", notificacion });
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al registrar notificación.",
      error: error.message,
    });
  }
};

/**
 * Lista todas las notificaciones (solo admin)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const obtenerNotificaciones = async (req, res) => {
  try {
    const notificaciones = await Notificacion.find().sort({ createdAt: -1 });
    res.status(200).json(notificaciones);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al listar notificaciones.",
      error: error.message,
    });
  }
};

/**
 * Obtiene una notificación específica por ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const obtenerNotificacionPorId = async (req, res) => {
  try {
    const notificacion = await Notificacion.findById(req.params.id);
    if (!notificacion)
      return res.status(404).json({ mensaje: "No encontrada." });
    res.status(200).json(notificacion);
  } catch (error) {
    res
      .status(500)
      .json({ mensaje: "Error al buscar notificación.", error: error.message });
  }
};

module.exports = {
  crearNotificacion,
  obtenerNotificaciones,
  obtenerNotificacionPorId,
};
