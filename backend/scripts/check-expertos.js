// Script de auditoría para perfiles de expertos
// Uso: node scripts/check-expertos.js

const mongoose = require("mongoose");
const Usuario = require("../models/usuario.model");

const MONGO =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/servitech";

async function main() {
  console.log("Conectando a MongoDB:", MONGO);
  await mongoose.connect(MONGO, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  try {
    const expertos = await Usuario.find({ roles: "experto" }).lean();
    console.log("Total expertos encontrados:", expertos.length);

    const infoNull = [];
    const descMissing = [];
    const catsEmpty = [];
    const precioMissing = [];
    const bankMissing = [];
    const catsStrings = [];

    for (const u of expertos) {
      const info = u.infoExperto;
      if (!info) {
        infoNull.push(u.email);
        continue;
      }
      if (!info.descripcion || String(info.descripcion).trim().length < 10)
        descMissing.push(u.email);
      if (!Array.isArray(info.categorias) || info.categorias.length === 0)
        catsEmpty.push(u.email);
      if (info.precioPorHora === undefined || info.precioPorHora === null)
        precioMissing.push(u.email);
      if (!info.banco || !info.numeroCuenta || !info.titular)
        bankMissing.push(u.email);
      if (
        Array.isArray(info.categorias) &&
        info.categorias.some((c) => typeof c === "string")
      )
        catsStrings.push(u.email);
    }

    console.log("Resumen de problemas:");
    console.log(" - infoExperto null:", infoNull.length);
    if (infoNull.length) console.table(infoNull.slice(0, 50));
    console.log(" - descripcion ausente/corta:", descMissing.length);
    if (descMissing.length) console.table(descMissing.slice(0, 50));
    console.log(" - categorias vacías:", catsEmpty.length);
    if (catsEmpty.length) console.table(catsEmpty.slice(0, 50));
    console.log(" - precioPorHora faltante:", precioMissing.length);
    if (precioMissing.length) console.table(precioMissing.slice(0, 50));
    console.log(
      " - datos bancarios faltantes (banco/numeroCuenta/titular):",
      bankMissing.length
    );
    if (bankMissing.length) console.table(bankMissing.slice(0, 50));
    console.log(
      " - categorias como strings (posible populate fallido):",
      catsStrings.length
    );
    if (catsStrings.length) console.table(catsStrings.slice(0, 50));

    await mongoose.disconnect();
    console.log("Auditoría completada.");
  } catch (e) {
    console.error("Error en auditoría:", e);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
