/**
 * @file Modelo de Categoría
 * @module models/categoria
 * @description Define las categorías de especialización que los expertos pueden seleccionar
 */
const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * @typedef {Object} Categoria
 * @property {string} nombre - Nombre único de la categoría
 * @property {string} descripcion - Descripción de la categoría
 * @property {Date} fechaCreacion - Fecha de creación del registro
 * @property {string} nombreNormalized - Nombre normalizado para búsquedas
 * @property {string} slug - Slug único para URL amigable
 * @property {string} slugNormalized - Slug normalizado para búsquedas
 * @property {string} [parent] - ID de la categoría padre (opcional)
 * @property {string} estado - Estado de la categoría (activa, inactiva)
 * @property {string} [icon] - Nombre del icono (Font Awesome)
 * @property {string} [color] - Color del icono en formato hexadecimal
 * @property {Date} fechaActualizacion - Fecha de última actualización
 */

const categoriaSchema = new Schema(
  {
    nombre: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    nombreNormalized: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    slugNormalized: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    parent: {
      type: String, // Usamos String para IDs predefinidos como "development"
      default: "",
      trim: true,
    },
    estado: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    descripcion: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      default: "#3a8eff", // Color por defecto
      trim: true,
    },
  },
  {
    timestamps: {
      createdAt: "fechaCreacion",
      updatedAt: "fechaActualizacion",
    },
    collection: "categorias",
  }
);

/**
 * @openapi
 * components:
 *   schemas:
 *     Categoria:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         nombre:
 *           type: string
 *         descripcion:
 *           type: string
 *       required:
 *         - nombre
 */

module.exports = mongoose.model("Categoria", categoriaSchema);
