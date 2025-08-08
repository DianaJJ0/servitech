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
      unique: true, // El nombre visible también debe ser único
      trim: true,
    },
    descripcion: {
      type: String,
      maxlength: 500,
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

module.exports = mongoose.model("Categoria", categoriaSchema);
