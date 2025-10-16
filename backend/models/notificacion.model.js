/**
 * @file Modelo de Notificación
 * @module models/notificacion
 * @description Modelo Mongoose para notificaciones enviadas a usuarios. Permite registrar eventos, avisos y alertas relacionados con acciones en la plataforma, incluyendo emails, recordatorios y cambios de estado.
 *
 * Este modelo es útil para el historial de comunicaciones y la trazabilidad de eventos importantes para los usuarios. Incluye campos para asociar notificaciones a entidades del sistema y controlar su estado de entrega.
 *
 * Ejemplo de uso:
 * ```js
 * const noti = new Notificacion({ usuarioId, email, tipo: 'email', asunto: '...', mensaje: '...' });
 * await noti.save();
 * ```
 */
const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * @typedef {Object} Notificacion
 * @property {ObjectId} usuarioId - ID del usuario destinatario
 * @property {string} email - Email del destinatario
 * @property {string} tipo - Tipo de notificación (sistema, recordatorio, email, etc.)
 * @property {string} asunto - Asunto de la notificación
 * @property {string} mensaje - Mensaje enviado
 * @property {Object} relacionadoCon - Objeto relacionado (ej: asesoría, pago)
 * @property {string} estado - Estado de la notificación (pendiente, enviado, fallido)
 * @property {Date} fechaEnvio - Fecha de envío
 */
const notificacionSchema = new Schema(
  {
    // usuarioId puede ser opcional en casos donde solo tenemos el email (ej. subdocumentos en Asesoria)
    usuarioId: { type: Schema.Types.ObjectId, ref: "Usuario" },
    email: { type: String, required: true },
    tipo: { type: String, required: true },
    asunto: String,
    mensaje: String,
    relacionadoCon: {
      tipo: String,
      referenciaId: Schema.Types.ObjectId,
    },
    // Aceptar tanto 'error' como 'fallido' por compatibilidad con controladores existentes
    estado: {
      type: String,
      enum: ["pendiente", "enviado", "fallido", "error"],
      default: "pendiente",
    },
    fechaEnvio: Date,
  },
  {
    timestamps: true,
    collection: "notificaciones",
  }
);

/**
 * @openapi
 * components:
 *   schemas:
 *     Notificacion:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         usuarioId:
 *           type: string
 *         email:
 *           type: string
 *         tipo:
 *           type: string
 *         asunto:
 *           type: string
 *         mensaje:
 *           type: string
 *         relacionadoCon:
 *           type: object
 *         estado:
 *           type: string
 *           enum: [pendiente, enviado, fallido]
 *         fechaEnvio:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - usuarioId
 *         - email
 *         - tipo
 *         - estado
 *
 *   responses:
 *     NotificacionResponse:
 *       description: Respuesta exitosa con información de la notificación
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Notificacion'
 *     NotificacionNotFound:
 *       description: Notificación no encontrada
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Notificación no encontrada
 *     NotificacionError:
 *       description: Error en la operación de notificación
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Error procesando la notificación
 */

// Exporta el modelo Notificacion para su uso en controladores y servicios.
module.exports = mongoose.model("Notificacion", notificacionSchema);
