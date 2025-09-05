// Script para listar expertos y poblar infoExperto.categorias
const mongoose = require("mongoose");
require("dotenv").config();
const Usuario = require("../models/usuario.model.js");
// Asegurar registro del modelo Categoria para que populate funcione
require("../models/categoria.model.js");

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI not set in environment");
    process.exit(1);
  }
  await mongoose.connect(uri);
  // Print connection notice to stderr so stdout remains valid JSON for callers
  console.error("Connected to MongoDB");

  const limit = parseInt(process.argv[2] || "20", 10);
  const expertos = await Usuario.find({ roles: "experto" })
    .select("-passwordHash")
    .limit(limit)
    .populate({ path: "infoExperto.categorias", select: "nombre" })
    .exec();

  // Write the JSON to stdout explicitly. Keep human-readable logs on stderr.
  process.stdout.write(
    JSON.stringify({ total: expertos.length, expertos: expertos }, null, 2) +
      "\n"
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
