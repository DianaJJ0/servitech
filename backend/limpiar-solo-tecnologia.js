// Script para limpiar la colección y dejar solo la categoría de tecnología
const mongoose = require("mongoose");
const Categoria = require("./models/categoria.model");

async function limpiarSoloTecnologia() {
  await mongoose.connect("mongodb://localhost/servitech");
  await Categoria.deleteMany({ nombre: { $ne: "Tecnología e Informática" } });
  console.log("Solo la categoría de tecnología permanece.");
  mongoose.disconnect();
}

limpiarSoloTecnologia();
