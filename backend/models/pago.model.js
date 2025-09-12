/**
 * @file Modelo de Pago
 * @module models/pago
 * @description Define el esquema para registrar pagos asociados a asesorías
 */
const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * @typedef {Object} Pago
 * @property {ObjectId} asesoriaId - ID de la asesoría asociada
 * @property {ObjectId} clienteId - ID del cliente que paga
 * @property {ObjectId} expertoId - ID del experto que recibe el pago
 * @property {number} monto - Cantidad pagada
 * @property {string} moneda - Moneda del pago (default: COP)
 * @property {string} metodo - Método de pago utilizado
 * @property {string} estado - Estado del pago: pendiente, retenido, liberado, reembolsado, fallido
 * @property {Date} fechaPago - Fecha en que se realizó el pago
 * @property {Date} fechaLiberacion - Fecha en que se liberó el pago al experto
 * @property {string} transaccionId - ID de transacción externa
 * @property {Object} detalles - Información adicional de la pasarela de pago
 */

const pagoSchema = new Schema(
  {
    asesoriaId: {
      type: Schema.Types.ObjectId,
      ref: "Asesoria",
      required: false,
    }, // Relación con asesoría
    clienteId: { type: Schema.Types.ObjectId, ref: "Usuario", required: true }, // Cliente pagador
    expertoId: { type: Schema.Types.ObjectId, ref: "Usuario", required: true }, // Experto receptor
    monto: { type: Number, required: true }, // Valor pagado
    moneda: { type: String, default: "COP" }, // Moneda
    metodo: { type: String, required: true }, // Método de pago
    estado: {
      type: String,
      enum: ["pendiente", "retenido", "liberado", "reembolsado", "fallido"],
      default: "pendiente",
    },
    fechaPago: Date, // Fecha de pago
    fechaLiberacion: Date, // Fecha de liberación al experto
    transaccionId: String, // ID externo si la pasarela lo provee
    detalles: Schema.Types.Mixed, // Info adicional de la pasarela si se requiere
  },
  {
    timestamps: true,
    collection: "pagos",
  }
);

/**
 * @openapi
 * components:
 *   schemas:
 *     Pago:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         usuarioId:
 *           type: string
 *         asesoríaId:
 *           type: string
 *         monto:
 *           type: number
 *           format: float
 *         moneda:
 *           type: string
 *         estado:
 *           type: string
 *         metodo:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

module.exports = mongoose.model("Pago", pagoSchema);
