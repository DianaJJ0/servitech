/**
 * MODELO DE CATEGORIA - SERVITECH
 * Define las categorías de especialización que los expertos pueden seleccionar.
 * Esta colección es para los filtros y la administración.
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

module.exports = mongoose.model("Categoria", categoriaSchema);
