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
    titulo: { type: String, required: true, maxlength: 300 }, // Título descriptivo de la asesoría
    cliente: { type: infoParticipanteSchema, required: true }, 
    experto: { type: infoParticipanteSchema, required: true },
    categoria: { type: String, required: true },
    estado: { // estados de la asesoria
      type: String,
      enum: [
        "pendiente-pago",
        "confirmada",
        "completada",
        "cancelada",
        "reembolsada",
        "rechazada",
      ],
      default: "pendiente-pago", // Estado inicial al crear una asesoría
    },
    fechaHoraInicio: { type: Date, required: true },
    duracionMinutos: {
      type: Number,
      required: true,
      enum: [60, 120, 180],
      default: 60,
    },
    pagoId: { type: Schema.Types.ObjectId, ref: "Pago" }, // Relación con el pago
    fechaFinalizacion: Date, // Fecha cuando fue marcada como completada
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
 */

module.exports = mongoose.model("Asesoria", asesoriaSchema);
