/**
 * RUTAS DE PAGO
 * Endpoints para registrar y consultar pagos.
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

/**
 * @openapi
 * tags:
 *   - name: Pagos
 *     description: Gestión de pagos
 */

/**
 * @swagger
 * /api/pagos:
 *   post:
 *     summary: Registrar pago
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
 *               - clienteId
 *               - expertoId
 *               - monto
 *               - metodo
 *               - estado
 *             properties:
 *               clienteId:
 *                 type: string
 *               expertoId:
 *                 type: string
 *               monto:
 *                 type: number
 *               metodo:
 *                 type: string
 *               estado:
 *                 type: string
 *               transaccionId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Pago registrado
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: Transacción duplicada
 */
router.post("/", authMiddleware.autenticar, pagoController.crearPago);

/**
 * @openapi
 * /api/pagos:
 *   post:
 *     tags: [Pagos]
 *     summary: Procesar pago (requiere auth)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Pago'
 *     responses:
 *       200:
 *         description: Pago procesado
 *       401:
 *         description: No autenticado
 */

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
 *       404:
 *         description: Pago no encontrado
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
 *                 enum: [pendiente, retenido, liberado, reembolsado, fallido]
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       400:
 *         description: Estado inválido
 *       404:
 *         description: Pago no encontrado
 */
router.put(
  "/:id/estado",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  pagoController.actualizarEstadoPago
);

module.exports = router;
