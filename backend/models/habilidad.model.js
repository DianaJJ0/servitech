/**
 * @file Modelo de Habilidad Tecnológica
 * @module models/habilidad
 * @description Define el esquema para habilidades específicas del sector tecnológico
 */
const mongoose = require("mongoose");

/**
 * @typedef {Object} Habilidad
 * @property {string} nombre - Nombre único de la habilidad (ej: JavaScript, Python, TensorFlow)
 * @property {string} descripcion - Descripción opcional de la habilidad
 */

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
