/**
 * @file Modelo de Pago
 * @module models/pago
 * @description Define el esquema para pagos de asesorías con MercadoPago
 */
const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Esquema de Pago para asesorías
 * Estados: pendiente, procesando, retenido, liberado, reembolsado, reembolsado-parcial, fallido
 */
const pagoSchema = new Schema(
  {
    clienteId: {
      type: String,
      required: true,
      ref: "Usuario",
    },
    expertoId: {
      type: String,
      required: true,
      ref: "Usuario",
    },
    monto: {
      type: Number,
      required: true,
      min: 0,
    },
    metodo: {
      type: String,
      enum: ["mercadopago", "pse", "tarjeta", "nequi", "daviplata"],
      default: "mercadopago",
    },
    estado: {
      type: String,
      enum: [
        "pendiente",
        "procesando",
        "retenido",
        "liberado",
        "reembolsado",
        "reembolsado-parcial",
        "fallido",
      ],
      default: "pendiente",
    },
    descripcion: {
      type: String,
      maxlength: 500,
    },
    fechaHoraAsesoria: {
      type: Date,
      required: true,
    },
    duracionMinutos: {
      type: Number,
      required: true,
      enum: [60, 90, 120, 180],
    },
    transaccionId: {
      type: String,
    },
    fechaReembolso: Date,
    asesoriaId: {
      type: Schema.Types.ObjectId,
      ref: "Asesoria",
    },
    metadatos: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: "fechaCreacion", updatedAt: "fechaActualizacion" },
    collection: "pagos",
  }
);

// Indices para optimizar consultas (removemos duplicados)
pagoSchema.index({ clienteId: 1, fechaCreacion: -1 });
pagoSchema.index({ expertoId: 1, fechaCreacion: -1 });
pagoSchema.index({ estado: 1, fechaCreacion: -1 });
pagoSchema.index({ transaccionId: 1 }, { sparse: true });

module.exports = mongoose.model("Pago", pagoSchema);
