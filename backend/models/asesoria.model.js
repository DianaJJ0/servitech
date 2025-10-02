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
 * @property {string} descripcion
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
      required: true,
      default: () =>
        `ASE-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase()}`,
    },
    titulo: { type: String, required: true, maxlength: 300 },
    descripcion: { type: String, required: true, maxlength: 2000 },
    cliente: { type: infoParticipanteSchema, required: true },
    experto: { type: infoParticipanteSchema, required: true },
    categoria: { type: String, required: true, default: "Tecnologia" },
    estado: {
      type: String,
      enum: [
        "pendiente-aceptacion",
        "confirmada",
        "completada",
        "cancelada-cliente",
        "cancelada-experto",
        "rechazada",
      ],
      default: "pendiente-aceptacion",
    },
    fechaHoraInicio: { type: Date, required: true },
    duracionMinutos: {
      type: Number,
      required: true,
      enum: [60, 90, 120, 180],
      default: 60,
    },
    pagoId: { type: Schema.Types.ObjectId, ref: "Pago", required: true },
    fechaFinalizacion: Date,
    motivoCancelacion: { type: String, maxlength: 500 },
    fechaCancelacion: Date,
  },
  {
    timestamps: { createdAt: "fechaCreacion", updatedAt: "fechaActualizacion" },
    collection: "asesorias",
  }
);

// Indices únicos para optimizar consultas (removemos duplicados)
asesoriaSchema.index({ codigoAsesoria: 1 }, { unique: true });
asesoriaSchema.index({ "cliente.email": 1, fechaCreacion: -1 });
asesoriaSchema.index({ "experto.email": 1, fechaCreacion: -1 });
asesoriaSchema.index({ estado: 1, fechaHoraInicio: 1 });
asesoriaSchema.index({ pagoId: 1 });

module.exports = mongoose.model("Asesoria", asesoriaSchema);
