/**
 * Modelo de Log para auditoría en MongoDB
 * Guarda cada acción relevante del sistema.
 * Ubicación: backend/models/log.model.js
 */

const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
  usuarioEmail: { type: String, required: false }, // Email del usuario que realiza la acción
  nombre: { type: String, required: false },
  apellido: { type: String, required: false },
  accion: { type: String, required: true }, // Acción ejecutada (ej: "crear pago")
  detalle: { type: String, required: false }, // Detalles adicionales si aplica
  resultado: { type: String, required: false }, // "éxito", "error", etc.
  tipo: { type: String, required: false }, // Puede ser "del sistema", "usuario", etc.
  fecha: { type: Date, default: Date.now }, // Fecha y hora del log
});

module.exports = mongoose.model("Log", logSchema);
