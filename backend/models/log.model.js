/**
 * MODELO DE LOG/BITÁCORA - SERVITECH
 * Registra acciones relevantes para auditoría y panel de administración.
 */
const mongoose = require("mongoose");
const { Schema } = mongoose;

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

module.exports = mongoose.model("Log", logSchema);
