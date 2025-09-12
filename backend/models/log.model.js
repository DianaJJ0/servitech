/**
 * @file Modelo de Log/Bitácora
 * @module models/log
 * @description Define el esquema para registrar acciones del sistema para auditoría
 */
const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * @typedef {Object} Log
 * @property {ObjectId} usuarioId - ID del usuario que realizó la acción
 * @property {string} email - Email del usuario
 * @property {string} tipo - Tipo de acción: login, cambio-estado, pago, admin
 * @property {string} descripcion - Descripción breve de la acción
 * @property {string} entidad - Entidad afectada: Usuario, Asesoria, Pago
 * @property {ObjectId} referenciaId - ID de la entidad relacionada
 * @property {Object} datos - Información adicional relevante
 * @property {Date} fecha - Fecha y hora del evento
 */

const logSchema = new Schema(
  {
    usuarioId: { type: Schema.Types.ObjectId, ref: "Usuario" }, // Usuario que hizo la acción
    email: { type: String, required: true }, // Email del usuario
    tipo: { type: String, required: true }, // login, cambio-estado, pago, admin
    descripcion: { type: String, required: true }, // Breve descripción de la acción
    entidad: { type: String }, // Ej: Usuario, Asesoria, Pago
    referenciaId: Schema.Types.ObjectId, // ID de la entidad relacionada
    datos: Schema.Types.Mixed, // Info adicional relevante
    fecha: { type: Date, default: Date.now }, // Fecha del evento
  },
  {
    timestamps: true,
    collection: "logs",
  }
);

/**
 * @openapi
 * components:
 *   schemas:
 *     LogEntry:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         nivel:
 *           type: string
 *         mensaje:
 *           type: string
 *         meta:
 *           type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 */

module.exports = mongoose.model("Log", logSchema);
