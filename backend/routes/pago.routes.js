/**
 * RUTAS DE PAGO
 * Endpoints para registrar y consultar pagos con MercadoPago integrado.
 */
const express = require("express");
const router = express.Router();
const pagoController = require("../controllers/pago.controller.js");
const authMiddleware = require("../middleware/auth.middleware");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

/**
 * @swagger
 * tags:
 *   - name: Pagos
 *     description: Gestión de pagos y transacciones
 */

// Rutas públicas (webhooks)
/**
 * @swagger
 * /api/pagos/webhook:
 *   post:
 *     summary: Webhook de MercadoPago
 *     tags: [Pagos]
 *     responses:
 *       200:
 *         description: Webhook procesado
 */
router.post("/webhook", pagoController.webhookMercadoPago);

// Rutas protegidas
/**
 * @swagger
 * /api/pagos/crear-preferencia:
 *   post:
 *     summary: Crear preferencia de pago para asesoría
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - titulo
 *               - expertoEmail
 *               - fechaHoraInicio
 *               - duracionMinutos
 *               - monto
 *             properties:
 *               titulo:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               expertoEmail:
 *                 type: string
 *               fechaHoraInicio:
 *                 type: string
 *               duracionMinutos:
 *                 type: number
 *               monto:
 *                 type: number
 *     responses:
 *       201:
 *         description: Preferencia creada
 */
router.post(
  "/crear-preferencia",
  authMiddleware.autenticar,
  pagoController.crearPreferenciaPago
);

/**
 * @swagger
 * /api/pagos/{id}/reembolsar:
 *   post:
 *     summary: Procesar reembolso
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *               monto:
 *                 type: number
 *     responses:
 *       200:
 *         description: Reembolso procesado
 */
router.post(
  "/:id/reembolsar",
  authMiddleware.autenticar,
  pagoController.procesarReembolso
);

/**
 * @swagger
 * /api/pagos:
 *   get:
 *     summary: Listar pagos (admin)
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pagos
 */
router.get(
  "/",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  pagoController.obtenerPagos
);

/**
 * @swagger
 * /api/pagos/{id}:
 *   get:
 *     summary: Obtener pago por ID (admin)
 *     tags: [Pagos]
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
 *         description: Datos del pago
 */
router.get(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  pagoController.obtenerPagoPorId
);

/**
 * @swagger
 * /api/pagos/{id}/estado:
 *   put:
 *     summary: Actualizar estado de pago (admin)
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estado
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [pendiente, procesando, retenido, liberado, reembolsado, reembolsado-parcial, fallido]
 *     responses:
 *       200:
 *         description: Estado actualizado
 */
router.put(
  "/:id/estado",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  pagoController.actualizarEstadoPago
);

module.exports = router;
