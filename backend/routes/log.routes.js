/**
 * RUTAS DE LOGS
 * Endpoints para registrar y consultar logs del sistema.
 */
const express = require("express");
const router = express.Router();
const logController = require("../controllers/log.controller");
const authMiddleware = require("../middleware/auth.middleware");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

/**
 * @swagger
 * tags:
 *   - name: Logs
 *     description: Sistema de registro de eventos
 */

/**
 * @swagger
 * /api/logs:
 *   post:
 *     summary: Registrar log
 *     tags: [Logs]
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
 *               - descripcion
 *             properties:
 *               usuarioId:
 *                 type: string
 *               email:
 *                 type: string
 *               tipo:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               entidad:
 *                 type: string
 *               referenciaId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Log registrado
 *       400:
 *         description: Datos faltantes
 */
router.post("/", authMiddleware.autenticar, logController.crearLog);

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: Listar logs (admin)
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de logs
 */
router.get(
  "/",
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  logController.obtenerLogs
);

/**
 * @swagger
 * /api/logs/{id}:
 *   get:
 *     summary: Obtener log por ID (admin)
 *     tags: [Logs]
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
 *         description: Datos del log
 *       404:
 *         description: Log no encontrado
 */
router.get(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  logController.obtenerLogPorId
);

/**
 * @openapi
 * tags:
 *   - name: Logs
 *     description: Consultas sobre logs
 */

/**
 * @openapi
 * /api/logs:
 *   get:
 *     tags: [Logs]
 *     summary: Obtener logs (requiere rol admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: nivel
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de logs
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Requiere rol admin
 */

module.exports = router;
