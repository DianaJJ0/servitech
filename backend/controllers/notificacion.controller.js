/**
 * CONTROLADOR DE NOTIFICACIONES
 * Lógica para registrar y listar notificaciones enviadas a usuarios.
 */
const Notificacion = require("../models/notificacion.model.js");
const Usuario = require("../models/usuario.model.js");
const generarLogs = require("../services/generarLogs");

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
    // Forzar estado 'enviado' si no se especifica
    const notificacion = new Notificacion({
      ...datos,
      estado: datos.estado || "enviado",
      fechaEnvio: new Date(),
    });
    await notificacion.save();

    generarLogs.registrarEvento({
      usuarioEmail: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      accion: "ENVIAR_NOTIFICACION",
      detalle: `Notificación creada id:${notificacion._id}`,
      resultado: "Exito",
      tipo: "notificacion",
      persistirEnDB: true,
    });

    res.status(201).json({ mensaje: "Notificación registrada.", notificacion });
  } catch (error) {
    generarLogs.registrarEvento({
      usuarioEmail: (req.body && req.body.email) || null,
      accion: "ENVIAR_NOTIFICACION",
      detalle: "Error al registrar notificación",
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "notificacion",
      persistirEnDB: true,
    });
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
    console.log("[ADMIN-NOTIF] Petición recibida para listar notificaciones");
    if (!req.usuario) {
      console.log("[ADMIN-NOTIF] No hay usuario autenticado en req.usuario");
    } else {
      console.log(
        `[ADMIN-NOTIF] Usuario autenticado: ${req.usuario.email}, roles: ${req.usuario.roles}`
      );
    }
    const notificaciones = await Notificacion.find().sort({ createdAt: -1 });
    console.log(
      `[ADMIN-NOTIF] Total notificaciones encontradas: ${notificaciones.length}`
    );
    if (notificaciones.length > 0) {
      console.log(`[ADMIN-NOTIF] Ejemplo notificación:`, notificaciones[0]);
    }
    res.status(200).json(notificaciones);
  } catch (error) {
    console.error("[ADMIN-NOTIF] Error al listar notificaciones:", error);
    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      accion: "LISTAR_NOTIFICACIONES",
      detalle: "Error al listar notificaciones",
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "notificacion",
      persistirEnDB: true,
    });
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
    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      accion: "OBTENER_NOTIFICACION",
      detalle: "Error al obtener notificación",
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "notificacion",
      persistirEnDB: true,
    });
    res
      .status(500)
      .json({ mensaje: "Error al buscar notificación.", error: error.message });
  }
};

/**
 * Elimina una notificación/registro de bitácora por ID (solo admin)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 * @openapi
 * /api/notificaciones/{id}:
 *   delete:
 *     summary: Eliminar notificación (bitácora de asesoría) por ID (solo admin)
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notificación eliminada correctamente
 *       404:
 *         description: Notificación no encontrada
 */
const eliminarNotificacion = async (req, res) => {
  try {
    const notificacion = await Notificacion.findByIdAndDelete(req.params.id);
    if (!notificacion) {
      return res.status(404).json({ mensaje: "No encontrada." });
    }
    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      accion: "ELIMINAR_NOTIFICACION",
      detalle: `Notificación eliminada id:${req.params.id}`,
      resultado: "Exito",
      tipo: "notificacion",
      persistirEnDB: true,
    });
    res.status(200).json({ mensaje: "Notificación eliminada correctamente." });
  } catch (error) {
    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      accion: "ELIMINAR_NOTIFICACION",
      detalle: "Error al eliminar notificación",
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "notificacion",
      persistirEnDB: true,
    });
    res.status(500).json({
      mensaje: "Error al eliminar notificación.",
      error: error.message,
    });
  }
};

module.exports = {
  crearNotificacion,
  obtenerNotificaciones,
  obtenerNotificacionPorId,
  eliminarNotificacion,
};
