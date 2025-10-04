/**
 * RUTAS DE ASESORÍAS
 * Endpoints para gestión completa del ciclo de vida de asesorías
 * @module routes/asesoria
 */
const express = require("express");
const router = express.Router();
const asesoriaController = require("../controllers/asesoria.controller.js");
const authMiddleware = require("../middleware/auth.middleware");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

/**
 * @swagger
 * tags:
 *   - name: Asesorías
 *     description: Gestión de asesorías y su ciclo de vida
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Asesoria:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID único de la asesoría
 *         titulo:
 *           type: string
 *           description: Título de la asesoría
 *         descripcion:
 *           type: string
 *           description: Descripción detallada
 *         cliente:
 *           type: object
 *           properties:
 *             email:
 *               type: string
 *             nombre:
 *               type: string
 *             apellido:
 *               type: string
 *             avatarUrl:
 *               type: string
 *         experto:
 *           type: object
 *           properties:
 *             email:
 *               type: string
 *             nombre:
 *               type: string
 *             apellido:
 *               type: string
 *             avatarUrl:
 *               type: string
 *         categoria:
 *           type: string
 *           description: Categoría de la asesoría
 *         fechaHoraInicio:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de inicio
 *         fechaHoraFin:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de fin
 *         duracionMinutos:
 *           type: integer
 *           description: Duración en minutos
 *         estado:
 *           type: string
 *           enum: [pendiente-aceptacion, confirmada, en-progreso, completada, cancelada, rechazada]
 *           description: Estado actual de la asesoría
 *         pagoId:
 *           type: string
 *           description: ID del pago asociado
 *         fechaCreacion:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación
 *         fechaAceptacion:
 *           type: string
 *           format: date-time
 *           description: Fecha de aceptación
 *         fechaInicio:
 *           type: string
 *           format: date-time
 *           description: Fecha de inicio real
 *         fechaFinalizacion:
 *           type: string
 *           format: date-time
 *           description: Fecha de finalización
 *         calificacion:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Calificación de la asesoría
 *         comentarios:
 *           type: string
 *           description: Comentarios sobre la asesoría
 */

// Rutas protegidas con autenticación
/**
 * @swagger
 * /api/asesorias/mis-asesorias:
 *   get:
 *     summary: Obtener mis asesorías
 *     description: Obtiene todas las asesorías donde el usuario autenticado es cliente o experto
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [pendiente-aceptacion, confirmada, en-progreso, completada, cancelada, rechazada]
 *         description: Filtrar por estado específico
 *         example: "pendiente-aceptacion"
 *       - in: query
 *         name: rol
 *         schema:
 *           type: string
 *           enum: [cliente, experto]
 *         description: Filtrar por rol (cliente o experto)
 *         example: "experto"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Número de página
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Elementos por página
 *         example: 20
 *     responses:
 *       200:
 *         description: Lista de asesorías obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 asesorias:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Asesoria'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 150
 *                     pages:
 *                       type: integer
 *                       example: 8
 *       401:
 *         description: No autorizado - Token inválido
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  "/mis-asesorias",
  authMiddleware.autenticar,
  asesoriaController.obtenerMisAsesorias
);

/**
 * @swagger
 * /api/asesorias/{id}/aceptar:
 *   post:
 *     summary: Aceptar asesoría
 *     description: Permite al experto aceptar una asesoría pendiente de aceptación
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la asesoría
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Asesoría aceptada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Asesoría aceptada exitosamente"
 *                 asesoriaId:
 *                   type: string
 *                   example: "507f1f77bcf86cd799439011"
 *                 estado:
 *                   type: string
 *                   example: "confirmada"
 *       400:
 *         description: La asesoría no puede ser aceptada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "La asesoría no puede ser aceptada. Estado actual: completada"
 *                 conflicto:
 *                   type: object
 *                   description: Información sobre conflicto de horario (si aplica)
 *       403:
 *         description: Solo el experto puede aceptar la asesoría
 *       404:
 *         description: Asesoría no encontrada
 */
router.post(
  "/:id/aceptar",
  authMiddleware.autenticar,
  asesoriaController.aceptarAsesoria
);

/**
 * @swagger
 * /api/asesorias/{id}/rechazar:
 *   post:
 *     summary: Rechazar asesoría
 *     description: Permite al experto rechazar una asesoría pendiente y procesar reembolso automático
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la asesoría
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *                 description: Motivo del rechazo
 *                 example: "No puedo atender en ese horario"
 *           examples:
 *             horario_ocupado:
 *               summary: Horario ocupado
 *               value:
 *                 motivo: "Ya tengo otra asesoría programada en ese horario"
 *             emergencia:
 *               summary: Emergencia personal
 *               value:
 *                 motivo: "Emergencia personal, no podré atender"
 *     responses:
 *       200:
 *         description: Asesoría rechazada y reembolso procesado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Asesoría rechazada y reembolso procesado"
 *                 asesoriaId:
 *                   type: string
 *                   example: "507f1f77bcf86cd799439011"
 *                 estado:
 *                   type: string
 *                   example: "rechazada"
 *                 reembolsoProcesado:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: La asesoría no puede ser rechazada
 *       403:
 *         description: Solo el experto puede rechazar la asesoría
 *       404:
 *         description: Asesoría no encontrada
 */
router.post(
  "/:id/rechazar",
  authMiddleware.autenticar,
  asesoriaController.rechazarAsesoria
);

/**
 * @swagger
 * /api/asesorias/{id}/iniciar:
 *   post:
 *     summary: Iniciar asesoría
 *     description: Marca una asesoría confirmada como iniciada
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la asesoría
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Asesoría iniciada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Asesoría iniciada exitosamente"
 *                 asesoriaId:
 *                   type: string
 *                   example: "507f1f77bcf86cd799439011"
 *                 estado:
 *                   type: string
 *                   example: "en-progreso"
 *       400:
 *         description: La asesoría no puede ser iniciada
 *       403:
 *         description: Sin permisos para iniciar la asesoría
 *       404:
 *         description: Asesoría no encontrada
 */
router.post(
  "/:id/iniciar",
  authMiddleware.autenticar,
  asesoriaController.iniciarAsesoria
);

/**
 * @swagger
 * /api/asesorias/{id}/finalizar:
 *   post:
 *     summary: Finalizar asesoría
 *     description: Finaliza una asesoría en progreso y libera el pago al experto automáticamente
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la asesoría
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comentarios:
 *                 type: string
 *                 description: Comentarios adicionales sobre la asesoría
 *                 example: "Excelente asesoría, muy útil"
 *               calificacion:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Calificación de la asesoría (1-5)
 *                 example: 5
 *           examples:
 *             con_calificacion:
 *               summary: Con calificación y comentarios
 *               value:
 *                 comentarios: "Excelente asesoría, resolvió todas mis dudas"
 *                 calificacion: 5
 *             solo_finalizacion:
 *               summary: Solo finalizar
 *               value: {}
 *     responses:
 *       200:
 *         description: Asesoría finalizada y pago liberado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Asesoría finalizada exitosamente"
 *                 asesoriaId:
 *                   type: string
 *                   example: "507f1f77bcf86cd799439011"
 *                 estado:
 *                   type: string
 *                   example: "completada"
 *                 pagoLiberado:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: La asesoría no puede ser finalizada
 *       403:
 *         description: Sin permisos para finalizar la asesoría
 *       404:
 *         description: Asesoría no encontrada
 */
router.post(
  "/:id/finalizar",
  authMiddleware.autenticar,
  asesoriaController.finalizarAsesoria
);

/**
 * @swagger
 * /api/asesorias/{id}/cancelar:
 *   post:
 *     summary: Cancelar asesoría
 *     description: Cancela una asesoría y procesa el reembolso automático
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la asesoría
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *                 description: Motivo de la cancelación
 *                 example: "Emergencia personal"
 *           examples:
 *             emergencia:
 *               summary: Emergencia personal
 *               value:
 *                 motivo: "Emergencia familiar, no podré asistir"
 *             cambio_planes:
 *               summary: Cambio de planes
 *               value:
 *                 motivo: "Cambio en mi agenda, necesito reprogramar"
 *     responses:
 *       200:
 *         description: Asesoría cancelada y reembolso procesado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Asesoría cancelada exitosamente"
 *                 asesoriaId:
 *                   type: string
 *                   example: "507f1f77bcf86cd799439011"
 *                 estado:
 *                   type: string
 *                   example: "cancelada"
 *                 reembolsoProcesado:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: La asesoría no puede ser cancelada
 *       403:
 *         description: Sin permisos para cancelar la asesoría
 *       404:
 *         description: Asesoría no encontrada
 */
router.post(
  "/:id/cancelar",
  authMiddleware.autenticar,
  asesoriaController.cancelarAsesoria
);

/**
 * @swagger
 * /api/asesorias/{id}:
 *   get:
 *     summary: Obtener asesoría por ID
 *     description: Obtiene información detallada de una asesoría específica
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la asesoría
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Información de la asesoría
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Asesoria'
 *       403:
 *         description: Sin permisos para ver esta asesoría
 *       404:
 *         description: Asesoría no encontrada
 */
router.get(
  "/:id",
  authMiddleware.autenticar,
  asesoriaController.obtenerAsesoriaPorId
);

module.exports = router;
