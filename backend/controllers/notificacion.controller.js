/**
 * CONTROLADOR DE NOTIFICACIONES
 * ---------------------------------------------
 * Este archivo implementa la lógica de negocio para la gestión de notificaciones y webhooks.
 * Incluye operaciones CRUD, validaciones, normalización de datos y registro de logs para auditoría.
 *
 * @module controllers/notificacion.controller
 * @requires models/notificacion.model
 * @requires services/generarLogs
 *
 * Uso típico:
 *   const notificacionController = require('./controllers/notificacion.controller');
 *   app.post('/api/notificaciones', notificacionController.crearNotificacion);
 *
 * Todas las funciones están documentadas con JSDoc y Swagger/OpenAPI para Deepwiki y generación automática de documentación.
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
 * Registra una nueva notificación.
 *
 * @openapi
 * /api/notificaciones:
 *   post:
 *     tags: [Notificaciones]
 *     summary: Enviar notificación
 *     description: Registra y envía una notificación a un usuario. Requiere autenticación.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Notificacion'
 *     responses:
 *       201:
 *         description: Notificación registrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                 notificacion:
 *                   $ref: '#/components/schemas/Notificacion'
 *       400:
 *         description: Petición inválida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * @function crearNotificacion
 * @param {import('express').Request} req - Objeto de solicitud HTTP
 * @param {import('express').Response} res - Objeto de respuesta HTTP
 * @returns {Promise<void>}
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
 * Lista todas las notificaciones (solo admin).
 *
 * @openapi
 * /api/notificaciones:
 *   get:
 *     tags: [Notificaciones]
 *     summary: Listar notificaciones
 *     description: Devuelve todas las notificaciones registradas en el sistema. Solo para administradores.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de notificaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notificacion'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * @function obtenerNotificaciones
 * @param {import('express').Request} req - Objeto de solicitud HTTP
 * @param {import('express').Response} res - Objeto de respuesta HTTP
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
 * Obtiene una notificación específica por ID.
 *
 * @openapi
 * /api/notificaciones/{id}:
 *   get:
 *     tags: [Notificaciones]
 *     summary: Obtener notificación por ID
 *     description: Devuelve los detalles de una notificación específica por su ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la notificación
 *     responses:
 *       200:
 *         description: Notificación encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notificacion'
 *       404:
 *         description: Notificación no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * @function obtenerNotificacionPorId
 * @param {import('express').Request} req - Objeto de solicitud HTTP
 * @param {import('express').Response} res - Objeto de respuesta HTTP
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
 * Elimina una notificación/registro de bitácora por ID (solo admin).
 *
 * @openapi
 * /api/notificaciones/{id}:
 *   delete:
 *     summary: Eliminar notificación (bitácora de asesoría) por ID (solo admin)
 *     tags: [Notificaciones]
 *     description: Elimina una notificación específica por su ID. Solo para administradores.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la notificación
 *     responses:
 *       200:
 *         description: Notificación eliminada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *       404:
 *         description: Notificación no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * @function eliminarNotificacion
 * @param {import('express').Request} req - Objeto de solicitud HTTP
 * @param {import('express').Response} res - Objeto de respuesta HTTP
 * @returns {Promise<void>}
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
