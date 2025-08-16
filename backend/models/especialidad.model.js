/**
 * Modelo Especialidad Tecnológica
 * Representa una especialidad dentro del sector tecnológico (ej: Backend, IA, DevOps, etc.)
 * Usado para el registro de expertos y gestión de perfiles.
 */
const mongoose = require("mongoose");

const EspecialidadSchema = new mongoose.Schema({
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

module.exports = mongoose.model("Especialidad", EspecialidadSchema);
