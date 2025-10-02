/**
 * @file Modelo de Pago
 * @module models/pago
 * @description Define el esquema para registrar pagos asociados a asesorías con Mercado Pago
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * @typedef {Object} Pago
 * @property {ObjectId} asesoriaId - ID de la asesoría asociada
 * @property {string} clienteId - Email del cliente
 * @property {string} expertoId - Email del experto
 * @property {number} monto - Cantidad pagada total
 * @property {number} montoExperto - Monto final a transferir al experto (después de comisión)
 * @property {number} comisionPlataforma - Comisión retenida por la plataforma (ej: 15%)
 * @property {string} moneda - Moneda del pago (default: COP)
 * @property {string} metodo - Método de pago utilizado
 * @property {string} estado - Estado del pago
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
    },
    clienteId: { type: String, required: true },
    expertoId: { type: String, required: true },
    monto: { type: Number, required: true },
    montoExperto: { type: Number, required: true },
    comisionPlataforma: { type: Number, required: true },
    moneda: { type: String, default: "COP" },
    metodo: { type: String, required: true },
    estado: {
      type: String,
      enum: [
        "pendiente",
        "procesando",
        "retenido",
        "liberado",
        "reembolsado-total",
        "reembolsado-parcial",
        "fallido",
      ],
      default: "pendiente",
    },
    fechaPago: Date,
    fechaLiberacion: Date,
    transaccionId: String,
    detalles: Schema.Types.Mixed,
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
 *         asesoriaId:
 *           type: string
 *         clienteId:
 *           type: string
 *         expertoId:
 *           type: string
 *         monto:
 *           type: number
 *         montoExperto:
 *           type: number
 *         comisionPlataforma:
 *           type: number
 *         moneda:
 *           type: string
 *         metodo:
 *           type: string
 *         estado:
 *           type: string
 *           enum: [pendiente, procesando, retenido, liberado, reembolsado-total, reembolsado-parcial, fallido]
 *         transaccionId:
 *           type: string
 *         fechaPago:
 *           type: string
 *           format: date-time
 *         fechaLiberacion:
 *           type: string
 *           format: date-time
 *         detalles:
 *           type: object
 */

module.exports = mongoose.model("Pago", pagoSchema);
