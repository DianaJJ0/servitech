/**
 * @file Modelo de Asesoría
 * @module models/asesoria
 * @description Modelo Mongoose para asesorías tecnológicas. Permite registrar sesiones entre clientes y expertos, controlando estado, participantes, pagos y cancelaciones.
/**
 * @file Modelo de Asesoría
 * @module models/asesoria
 * @description Modelo Mongoose para asesorías tecnológicas. Permite registrar sesiones entre clientes y expertos, controlando estado, participantes, pagos y cancelaciones, así como la trazabilidad completa del ciclo de vida de la asesoría.
 *
 * Este modelo es esencial para la gestión de las sesiones de asesoría, su ciclo de vida y la relación con pagos y usuarios. Incluye subesquemas, validaciones, índices y relaciones con otros modelos.
 *
 * Ejemplo de uso:
 * ```js
 * const asesoria = new Asesoria({ titulo: 'Consulta de software', cliente: {...}, experto: {...}, ... });
 * await asesoria.save();
 * ```
/**
 * Sub-esquema para información de participantes (cliente o experto).
 * @typedef {Object} InfoParticipante
 * @property {string} email - Email del participante (cliente o experto)
 * @property {string} nombre - Nombre del participante
 * @property {string} apellido - Apellido del participante
 * @property {string} avatarUrl - URL del avatar
 */
const mongoose = require("mongoose");
const { Schema } = mongoose;

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
 * Esquema principal de Asesoría.
 * @typedef {Object} Asesoria
 * @property {string} codigoAsesoria - Código único de la asesoría
 * @property {string} titulo - Título de la asesoría
 * @property {string} descripcion - Descripción de la asesoría
 * @property {InfoParticipante} cliente - Información del cliente
 * @property {InfoParticipante} experto - Información del experto
 * @property {string} categoria - Categoría de la asesoría
 * @property {string} estado - Estado de la asesoría
 * @property {Date} fechaHoraInicio - Fecha y hora de inicio
 * @property {number} duracionMinutos - Duración en minutos
 * @property {ObjectId} pagoId - ID del pago asociado
 * @property {Date} fechaFinalizacion - Fecha de finalización
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

// Índices para optimizar búsquedas y evitar duplicados.
asesoriaSchema.index({ codigoAsesoria: 1 }, { unique: true });
asesoriaSchema.index({ "cliente.email": 1, fechaCreacion: -1 });
asesoriaSchema.index({ "experto.email": 1, fechaCreacion: -1 });
asesoriaSchema.index({ estado: 1, fechaHoraInicio: 1 });
asesoriaSchema.index({ pagoId: 1 });

/**
 * @openapi
 * components:
 *   schemas:
 *     Asesoria:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         codigoAsesoria:
 *           type: string
 *         titulo:
 *           type: string
 *         descripcion:
 *           type: string
 *         cliente:
 *           $ref: '#/components/schemas/InfoParticipante'
 *         experto:
 *           $ref: '#/components/schemas/InfoParticipante'
 *         categoria:
 *           type: string
 *         estado:
 *           type: string
 *           enum: [pendiente-aceptacion, confirmada, completada, cancelada-cliente, cancelada-experto, rechazada]
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
 *         fechaCreacion:
 *           type: string
 *           format: date-time
 *         fechaActualizacion:
 *           type: string
 *           format: date-time
 *       required:
 *         - codigoAsesoria
 *         - titulo
 *         - descripcion
 *         - cliente
 *         - experto
 *         - categoria
 *         - estado
 *         - fechaHoraInicio
 *         - duracionMinutos
 *         - pagoId
 *
 *   InfoParticipante:
 *     type: object
 *     properties:
 *       email:
 *         type: string
 *       nombre:
 *         type: string
 *       apellido:
 *         type: string
 *       avatarUrl:
 *         type: string
 *     required:
 *       - email
 *       - nombre
 *       - apellido
 *
 *   responses:
 *     AsesoriaResponse:
 *       description: Respuesta exitosa con información de la asesoría
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Asesoria'
 *     AsesoriaNotFound:
 *       description: Asesoría no encontrada
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Asesoría no encontrada
 *     AsesoriaError:
 *       description: Error en la operación de asesoría
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Error procesando la asesoría
 */

// Exporta el modelo Asesoria para su uso en controladores y servicios.
module.exports = mongoose.model("Asesoria", asesoriaSchema);
