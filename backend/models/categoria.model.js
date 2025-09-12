/**
 * @file Modelo de Categoría
 * @module models/categoria
 * @description Define las categorías de especialización que los expertos pueden seleccionar
 */
const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * @typedef {Object} Habilidad
 * @property {string} nombre - Nombre de la habilidad
 * @property {string} descripcion - Descripción de la habilidad
 * @property {string} nivel - Nivel de la habilidad
 */

/**
 * @typedef {Object} Especialidad
 * @property {string} nombre - Nombre de la especialidad
 * @property {string} descripcion - Descripción de la especialidad
 * @property {Array<Habilidad>} habilidades - Habilidades asociadas a la especialidad
 */

/**
 * @typedef {Object} Categoria
 * @property {string} nombre - Nombre único de la categoría
 * @property {string} descripcion - Descripción de la categoría
 * @property {Array<Especialidad>} especialidades - Especialidades dentro de la categoría
 * @property {Date} fechaCreacion - Fecha de creación del registro
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
    descripcion: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    especialidades: [
      {
        nombre: {
          type: String,
          required: true,
          trim: true,
        },
        descripcion: {
          type: String,
          maxlength: 300,
          trim: true,
        },
        habilidades: [
          {
            nombre: {
              type: String,
              required: true,
              trim: true,
            },
            descripcion: {
              type: String,
              maxlength: 300,
              trim: true,
            },
            nivel: {
              type: String,
              trim: true,
              maxlength: 50,
            },
          },
        ],
      },
    ],
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
