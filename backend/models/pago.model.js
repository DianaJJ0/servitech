/**
 * MODELO DE PAGO - SERVITECH
 * Registra los pagos asociados a asesorías, clientes y expertos.
 */
const mongoose = require("mongoose");
const { Schema } = mongoose;

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

module.exports = mongoose.model("Pago", pagoSchema);
