/**
 * @file Modelo de Categoría
 * @module models/categoria
 * @description Modelo Mongoose para categorías de especialización. Permite organizar y clasificar los servicios de los expertos, facilitando búsquedas, filtrado y navegación jerárquica en la plataforma.
 *
 * Este modelo es clave para la taxonomía de la plataforma, permitiendo jerarquías, slugs amigables y personalización visual. Incluye validaciones, campos para SEO y relaciones jerárquicas.
 *
 * Ejemplo de uso:
 * ```js
 * const cat = new Categoria({ nombre: 'Desarrollo Web', slug: 'desarrollo-web', ... });
 * await cat.save();
 * ```
 *
/**
 * @typedef {Object} Categoria
 * @property {string} nombre - Nombre único de la categoría
 * @property {string} descripcion - Descripción de la categoría
 * @property {Date} fechaCreacion - Fecha de creación del registro
 * @property {string} nombreNormalized - Nombre normalizado para búsquedas
 * @property {string} slug - Slug único para URL amigable
 * @property {string} slugNormalized - Slug normalizado para búsquedas
 * @property {string} [parent] - ID de la categoría padre (opcional)
 * @property {string} estado - Estado de la categoría (active, inactive)
 * @property {string} [icon] - Nombre del icono (Font Awesome)
 * @property {string} [color] - Color del icono en formato hexadecimal
 * @property {Date} fechaActualizacion - Fecha de última actualización
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

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
      type: String, // ID de la categoría padre (opcional)
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
 *         nombreNormalized:
 *           type: string
 *         slug:
 *           type: string
 *         slugNormalized:
 *           type: string
 *         parent:
 *           type: string
 *         estado:
 *           type: string
 *           enum: [active, inactive]
 *         icon:
 *           type: string
 *         color:
 *           type: string
 *         fechaCreacion:
 *           type: string
 *           format: date-time
 *         fechaActualizacion:
 *           type: string
 *           format: date-time
 *       required:
 *         - nombre
 *         - nombreNormalized
 *         - slug
 *         - slugNormalized
 *         - estado
 *
 *   responses:
 *     CategoriaResponse:
 *       description: Respuesta exitosa con información de la categoría
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Categoria'
 *     CategoriaNotFound:
 *       description: Categoría no encontrada
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Categoría no encontrada
 *     CategoriaError:
 *       description: Error en la operación de categoría
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Error procesando la categoría
 */

// Exporta el modelo Categoria para su uso en controladores y servicios.
module.exports = mongoose.model("Categoria", categoriaSchema);
