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

/**
 * Define la estructura para la información de un participante (cliente o experto).
 * Es un sub-esquema, lo que significa que es un objeto anidado dentro de Asesoria.
 */
const infoParticipanteSchema = new Schema(
  {
    email: { type: String, required: true }, // Clave para vincular al usuario original
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    avatarUrl: String,
  },
  { _id: false } // Indicamos que este sub-objeto no necesita su propio _id de MongoDB.
);

/**
 * @typedef {Object} Asesoria
 * @property {string} codigoAsesoria - Código único identificador
 * @property {string} titulo - Título de la asesoría
 * @property {InfoParticipante} cliente - Información del cliente
 * @property {InfoParticipante} experto - Información del experto
 * @property {string} categoria - Categoría de la asesoría
 * @property {string} estado - Estado: pendiente-pago, confirmada, completada, cancelada
 * @property {Date} fechaHoraInicio - Fecha y hora de inicio
 * @property {number} duracionMinutos - Duración en minutos (30, 60, 90)
 * @property {Object} pago - Información del pago
 * @property {Object} videollamada - Información de la videollamada
 * @property {Object} reseña - Reseña y calificación
 */

const asesoriaSchema = new Schema(
  {
    // Identificador legible para el usuario y para soporte.
    codigoAsesoria: {
      type: String,
      unique: true,
      required: true,
      // Generador de código único
      default: () =>
        // Genera un código único basado en la fecha y un número aleatorio
        `ASE-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase()}`,
    },
    titulo: {
      type: String,
      required: true,
      maxlength: 200,
    },
    // Datos incrustados del cliente, usando nuestra estructura más clara.
    cliente: {
      type: infoParticipanteSchema,
      required: true,
    },
    // Datos incrustados del experto, reusando la misma estructura.
    experto: {
      type: infoParticipanteSchema,
      required: true,
    },
    // Categoría de la asesoría, referenciando una categoría existente.
    categoria: {
      type: String,
      required: true,
    },
    estado: {
      type: String,
      enum: ["pendiente-pago", "confirmada", "completada", "cancelada"],
      default: "pendiente-pago",
    },
    fechaHoraInicio: {
      type: Date,
      required: true,
    },
    // Duración de la asesoría en minutos
    duracionMinutos: {
      type: Number,
      required: true,
      enum: [30, 60, 90],
      default: 60,
    },
    // Información de pago incrustada.
    pago: {
      transaccionId: { type: String },
      metodo: String,
      monto: { type: Number },
      moneda: { type: String, default: "COP" },
      fechaPago: Date,
    },
    // Enlace a la sala de videollamada.
    videollamada: {
      salaUrl: String,
      iniciadaEn: Date,
      finalizadaEn: Date,
    },
    // La reseña asociada a esta asesoría
    reseña: {
      calificacion: { type: Number, min: 1, max: 5 },
      comentario: String,
      fecha: Date,
    },
  },
  {
    timestamps: {
      createdAt: "fechaCreacion",
      updatedAt: "fechaActualizacion",
    },
    collection: "asesorias",
  }
);

// Índices para optimizar las búsquedas más comunes
asesoriaSchema.index({ "cliente.email": 1, fechaHoraInicio: -1 });
asesoriaSchema.index({ "experto.email": 1, fechaHoraInicio: -1 });
asesoriaSchema.index({ estado: 1, fechaHoraInicio: 1 });

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
 *         descripcion:
 *           type: string
 *         usuarioId:
 *           type: string
 *         expertoId:
 *           type: string
 *         precio:
 *           type: number
 *           format: float
 *         estado:
 *           type: string
 *           description: Estado de la asesoría (pendiente, aceptada, finalizada, cancelada)
 *         calificacion:
 *           type: number
 *           format: float
 *         createdAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - titulo
 *         - usuarioId
 */

module.exports = mongoose.model("Asesoria", asesoriaSchema);
