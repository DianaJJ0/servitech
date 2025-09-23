/**
 * @file Modelo de Notificación
 * @module models/notificacion
 * @description Define el esquema para registrar notificaciones enviadas a usuarios
 */
const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * @typedef {Object} Notificacion
 * @property {ObjectId} usuarioId
 * @property {string} email
 * @property {string} tipo
 * @property {string} asunto
 * @property {string} mensaje
 * @property {Object} relacionadoCon
 * @property {string} estado
 * @property {Date} fechaEnvio
 */
const notificacionSchema = new Schema(
  {
    usuarioId: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },
    email: { type: String, required: true },
    tipo: { type: String, required: true },
    asunto: String,
    mensaje: String,
    relacionadoCon: {
      tipo: String,
      referenciaId: Schema.Types.ObjectId,
    },
    estado: {
      type: String,
      enum: ["pendiente", "enviado", "fallido"],
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
 *         mensaje:
 *           type: string
 *         asunto:
 *           type: string
 *         estado:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

module.exports = mongoose.model("Notificacion", notificacionSchema);
