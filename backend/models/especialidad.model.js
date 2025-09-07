/**
 * @file Modelo de Especialidad Tecnológica
 * @module models/especialidad
 * @description Define el esquema para especialidades del sector tecnológico
 */
const mongoose = require("mongoose");

/**
 * @typedef {Object} Especialidad
 * @property {string} nombre - Nombre único de la especialidad (ej: Backend, IA, DevOps)
 * @property {string} descripcion - Descripción opcional de la especialidad
 */

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
