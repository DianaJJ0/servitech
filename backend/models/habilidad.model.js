/**
 * Modelo Habilidad Tecnológica
 * Representa una habilidad específica dentro del sector tecnológico (ej: JavaScript, Python, TensorFlow, etc.)
 * Usado para el registro de expertos y gestión de perfiles.
 */
const mongoose = require("mongoose");

const HabilidadSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  descripcion: {
    type: String,
    default: "",
  },
});

module.exports = mongoose.model("Habilidad", HabilidadSchema);
