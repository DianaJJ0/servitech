/**
 * @file Modelo de Asesoría
 * @module models/asesoria
 * @description Define el esquema para asesorías tecnológicas con información completa
 */
const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * @typedef {Object} InfoParticipante
 * @property {string} email - Email del participante (cliente o experto)
 * @property {string} nombre - Nombre del participante
 * @property {string} apellido - Apellido del participante
 * @property {string} avatarUrl - URL del avatar
 */
const infoParticipanteSchema = new Schema(
  {
    email: { type: String, required: true },
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    avatarUrl: String,
  },
  { _id: false }
);

/**
 * @typedef {Object} Asesoria
 * @property {string} codigoAsesoria
 * @property {string} titulo
 * @property {InfoParticipante} cliente
 * @property {InfoParticipante} experto
 * @property {string} categoria
 * @property {string} estado
 * @property {Date} fechaHoraInicio
 * @property {number} duracionMinutos
 * @property {ObjectId} pagoId
 * @property {Date} fechaFinalizacion
 * @property {string} motivoCancelacion - Motivo de cancelación si aplica
 * @property {Date} fechaCancelacion - Fecha de cancelación si aplica
 */
const asesoriaSchema = new Schema(
  {
    codigoAsesoria: {
      type: String,
      unique: true,
      required: true,
      default: () =>
        `ASE-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase()}`,
    },
    titulo: { type: String, required: true, maxlength: 300 },
    cliente: { type: infoParticipanteSchema, required: true },
    experto: { type: infoParticipanteSchema, required: true },
    categoria: { type: String, required: true },
    estado: {
      type: String,
      enum: [
        "pendiente-pago",
        "pendiente-aceptacion",
        "confirmada",
        "completada",
        "cancelada-cliente",
        "cancelada-experto",
        "rechazada",
      ],
      default: "pendiente-pago",
    },
    fechaHoraInicio: { type: Date, required: true },
    duracionMinutos: {
      type: Number,
      required: true,
      enum: [60, 120, 180],
      default: 60,
    },
    pagoId: { type: Schema.Types.ObjectId, ref: "Pago" },
    fechaFinalizacion: Date,
    motivoCancelacion: { type: String, maxlength: 500 },
    fechaCancelacion: Date,
  },
  {
    timestamps: { createdAt: "fechaCreacion", updatedAt: "fechaActualizacion" },
    collection: "asesorias",
  }
);

/**
 * @openapi
 * components:
 *   schemas:
 *     Asesoria:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         titulo:
 *           type: string
 *         cliente:
 *           $ref: '#/components/schemas/Usuario'
 *         experto:
 *           $ref: '#/components/schemas/Usuario'
 *         categoria:
 *           type: string
 *         estado:
 *           type: string
 *           enum: [pendiente-pago, pendiente-aceptacion, confirmada, completada, cancelada-cliente, cancelada-experto, rechazada]
 *         fechaHoraInicio:
 *           type: string
 *           format: date-time
 *         duracionMinutos:
 *           type: number
 *         pagoId:
 *           type: string
 *         fechaFinalizacion:
 *           type: string
 *           format: date-time
 *         motivoCancelacion:
 *           type: string
 *         fechaCancelacion:
 *           type: string
 *           format: date-time
 */

module.exports = mongoose.model("Asesoria", asesoriaSchema);
