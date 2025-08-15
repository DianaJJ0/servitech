/**
 * MODELO DE CONFIGURACIÓN - SERVITECH
 * Guarda parámetros globales editables por el administrador.
 */
const mongoose = require("mongoose");
const { Schema } = mongoose;

const configuracionSchema = new Schema(
  {
    clave: { type: String, required: true, unique: true }, // Ej: "comision", "metodosPago"
    valor: Schema.Types.Mixed, // Valor puede ser string, number, array, objeto
    descripcion: String, // Descripción corta
    ultimaModificacion: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: "configuraciones",
  }
);

module.exports = mongoose.model("Configuracion", configuracionSchema);
