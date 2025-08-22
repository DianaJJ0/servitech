/**
 * MODELO DE NOTIFICACIÓN - SERVITECH
 * Registra emails, alertas y notificaciones enviadas a los usuarios.
 */
const mongoose = require("mongoose");
const { Schema } = mongoose;

const notificacionSchema = new Schema(
  {
    usuarioId: { type: Schema.Types.ObjectId, ref: "Usuario", required: true }, // Usuario destinatario
    email: { type: String, required: true }, // Email del destinatario
    tipo: { type: String, required: true }, // email, sms, push
    asunto: String, // Asunto del mensaje
    mensaje: String, // Texto enviado
    relacionadoCon: {
      tipo: String, // Ej: "Asesoria", "Pago"
      referenciaId: Schema.Types.ObjectId, // Relación opcional
    },
    estado: {
      type: String,
      enum: ["pendiente", "enviado", "fallido"],
      default: "pendiente",
    },
    fechaEnvio: Date,
  },
  {
    timestamps: true,
    collection: "notificaciones",
  }
);

module.exports = mongoose.model("Notificacion", notificacionSchema);
