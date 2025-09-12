/**
 * RUTAS DE NOTIFICACIÓN
 * Endpoints para registrar y consultar notificaciones.
 */
const express = require("express");
const router = express.Router();
const notificacionController = require("../controllers/notificacion.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

/**
 * @openapi
 * tags:
 *   - name: Notificaciones
 *     description: Envío y manejo de notificaciones
 */

/**
 * @openapi
 * /api/notificaciones:
 *   post:
 *     tags: [Notificaciones]
 *     summary: Enviar notificación (requiere auth)
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
 *       401:
 *         description: No autenticado
 *   get:
 *     tags: [Notificaciones]
 *     summary: Obtener notificaciones
 *     responses:
 *       200:
 *         description: Lista de notificaciones
 */

/**
 * @swagger
 * /api/notificaciones:
 *   post:
 *     summary: Registrar notificación
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - usuarioId
 *               - email
 *               - tipo
 *             properties:
 *               usuarioId:
 *                 type: string
 *               email:
 *                 type: string
 *               tipo:
 *                 type: string
 *               asunto:
 *                 type: string
 *               mensaje:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notificación registrada
 *       400:
 *         description: Datos faltantes
 */
router.post(
  "/",
  authMiddleware.autenticar,
  notificacionController.crearNotificacion
);

/**
 * @swagger
 * /api/notificaciones:
 *   get:
 *     summary: Listar notificaciones (admin)
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de notificaciones
 */
router.get(
  "/",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  notificacionController.obtenerNotificaciones
);

/**
 * @swagger
 * /api/notificaciones/{id}:
 *   get:
 *     summary: Obtener notificación por ID (admin)
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
 *         description: Datos de la notificación
 *       404:
 *         description: Notificación no encontrada
 */
router.get(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  notificacionController.obtenerNotificacionPorId
);

module.exports = router;
