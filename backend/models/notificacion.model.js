/**
 * @file Modelo de Notificación
 * @module models/notificacion
 * @description Define el esquema para registrar notificaciones enviadas a usuarios
 */
const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * @typedef {Object} Notificacion
 * @property {ObjectId} usuarioId - ID del usuario destinatario
 * @property {string} email - Email del destinatario
 * @property {string} tipo - Tipo de notificación: email, sms, push
 * @property {string} asunto - Asunto del mensaje
 * @property {string} mensaje - Contenido del mensaje
 * @property {Object} relacionadoCon - Referencia a entidad relacionada
 * @property {string} estado - Estado: pendiente, enviado, fallido
 * @property {Date} fechaEnvio - Fecha de envío de la notificación
 */

const notificacionSchema = new Schema(
  {
    usuarioId: { type: Schema.Types.ObjectId, ref: "Usuario", required: true }, // Usuario destinatario
    email: { type: String, required: true }, // Email del destinatario
    tipo: { type: String, required: true }, // email, sms, push
    asunto: String, // Asunto del mensaje
    mensaje: String, // Texto enviado
    relacionadoCon: {
      tipo: String, // Ej: "Asesoria", "Pago"
      referenciaId: Schema.Types.ObjectId, // Relación opcional
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

module.exports = mongoose.model("Notificacion", notificacionSchema);
