/**
 * RUTAS DE PAGOS
 * ---------------------------------------------
 * Define los endpoints de la API para la gestión de pagos simulados y reales, incluyendo integración con Mercado Pago.
 * Incluye protección con middlewares de autenticación y autorización para operaciones administrativas y de usuario autenticado.
 *
 * @module routes/pago.routes
 * @requires express
 * @requires controllers/pago.controller
 * @requires middleware/auth.middleware
 * @requires middleware/apiKey.middleware
 *
 * Uso típico:
 *   const pagoRoutes = require('./routes/pago.routes');
 *   app.use('/api/pagos', pagoRoutes);
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
 *     description: Gestión de pagos simulados
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PagoSimulado:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID único del pago
 *         clienteId:
 *           type: string
 *           description: Email del cliente
 *         expertoId:
 *           type: string
 *           description: Email del experto
 *         monto:
 *           type: number
 *           description: Monto en pesos colombianos
 *         metodo:
 *           type: string
 *           enum: [simulado]
 *           description: Método de pago
 *         estado:
 *           type: string
 *           enum: [retenido, liberado, reembolsado]
 *           description: Estado del pago
 *         descripcion:
 *           type: string
 *           description: Descripción del pago
 *         fechaHoraAsesoria:
 *           type: string
 *           format: date-time
 *           description: Fecha de la asesoría
 *         duracionMinutos:
 *           type: integer
 *           description: Duración en minutos
 *         asesoriaId:
 *           type: string
 *           description: ID de la asesoría asociada
 *         fechaCreacion:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación
 *         metadatos:
 *           type: object
 *           description: Información adicional del pago
 */

// Rutas protegidas con autenticación
/**
 * @swagger
 * /api/pagos/crear-pago-simulado:
 *   post:
 *     summary: Crear pago simulado y asesoría
 *     description: Procesa un pago de forma simulada y crea la asesoría automáticamente
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
 *               - descripcion
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
 *                 format: email
 *               fechaHoraInicio:
 *                 type: string
 *                 format: date-time
 *               duracionMinutos:
 *                 type: integer
 *                 enum: [60, 90, 120, 180]
 *               monto:
 *                 type: number
 *                 minimum: 1000
 *     responses:
 *       201:
 *         description: Pago procesado y asesoría creada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                 pagoId:
 *                   type: string
 *                 asesoriaId:
 *                   type: string
 *                 estadoPago:
 *                   type: string
 *       400:
 *         description: Datos inválidos o conflicto de horario
 *       404:
 *         description: Experto no encontrado
 */
/**
 * @swagger
 * /api/pagos/crear-preferencia-mp:
 *   post:
 *     summary: Crear preferencia de Mercado Pago (Checkout Pro)
 *     description: Crea un registro de Pago y Asesoria y genera una preferencia de Mercado Pago. Devuelve init_point para redirección al Checkout Pro.
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
 *               - descripcion
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
 *                 format: email
 *               fechaHoraInicio:
 *                 type: string
 *                 format: date-time
 *               duracionMinutos:
 *                 type: integer
 *               monto:
 *                 type: number
 *     responses:
 *       201:
 *         description: Preferencia creada
 *       400:
 *         description: Datos inválidos
 */
router.post(
  "/crear-preferencia-mp",
  authMiddleware.autenticar,
  pagoController.crearPagoConMercadoPago
);

/**
 * @swagger
 * /api/pagos/webhook/mp:
 *   post:
 *     summary: Webhook público para notificaciones de Mercado Pago
 *     description: Endpoint público que recibe notificaciones de Mercado Pago. Se recomienda validar y/o consultar la API de Mercado Pago para confirmar el evento.
 *     tags: [Pagos]
 *     responses:
 *       200:
 *         description: Notificación recibida
 */
// Webhook público de Mercado Pago (no autenticar)
router.post("/webhook/mp", pagoController.mpWebhook);

/**
 * @swagger
 * /api/pagos/{id}/liberar:
 *   post:
 *     summary: Liberar pago retenido
 *     description: Libera el dinero al experto cuando se finaliza una asesoría
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del pago
 *     responses:
 *       200:
 *         description: Pago liberado exitosamente
 *       400:
 *         description: El pago no puede ser liberado
 *       404:
 *         description: Pago no encontrado
 */
router.post(
  "/:id/liberar",
  authMiddleware.autenticar,
  pagoController.liberarPago
);

/**
 * @swagger
 * /api/pagos/{id}/reembolsar:
 *   post:
 *     summary: Procesar reembolso de pago
 *     description: Reembolsa el dinero cuando se cancela una asesoría
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del pago
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *                 description: Motivo del reembolso
 *               monto:
 *                 type: number
 *                 description: Monto a reembolsar (opcional)
 *     responses:
 *       200:
 *         description: Reembolso procesado exitosamente
 *       400:
 *         description: El pago no puede ser reembolsado
 */
router.post(
  "/:id/reembolsar",
  authMiddleware.autenticar,
  pagoController.reembolsarPago
);

// Rutas de administrador
/**
 * @swagger
 * /api/pagos:
 *   get:
 *     summary: Listar pagos (admin)
 *     description: Obtiene lista paginada de pagos (solo administradores)
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Elementos por página
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [retenido, liberado, reembolsado]
 *         description: Filtrar por estado
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
 *     description: Obtiene información detallada de un pago específico
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del pago
 *     responses:
 *       200:
 *         description: Información del pago
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PagoSimulado'
 *       404:
 *         description: Pago no encontrado
 */
// Permitir que el usuario autenticado (cliente o admin) consulte su propio pago
router.get("/:id", authMiddleware.autenticar, pagoController.obtenerPagoPorId);

// Obtener estado de notificaciones asociadas a un pago
router.get(
  "/:id/notificaciones",
  authMiddleware.autenticar,
  pagoController.obtenerEstadoNotificaciones
);

// Reenviar notificaciones (intento manual)
router.post(
  "/:id/reenviar-notificaciones",
  authMiddleware.autenticar,
  pagoController.reenviarNotificaciones
);

module.exports = router;
