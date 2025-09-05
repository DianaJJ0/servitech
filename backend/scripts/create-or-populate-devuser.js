// Script para crear o actualizar devuser@example.com con infoExperto
const mongoose = require("mongoose");
require("dotenv").config();
const Usuario = require("../models/usuario.model.js");

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI not set in environment");
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const email = process.argv[2] || "devuser@example.com";
  const categoriaId = process.argv[3];

  let user = await Usuario.findOne({ email });
  if (!user) {
    console.log("User not found. Creating:", email);
    user = new Usuario({ email, nombre: "DevUser", apellido: "Test" });
    user.password = "Password123!";
    user.roles = ["cliente"];
  }

  // Ensure experto role and populate infoExperto
  user.roles = Array.from(new Set([...(user.roles || []), "experto"]));
  user.infoExperto = {
    especialidad: "Frontend",
    descripcion: "Creado/poblado por script de desarrollo",
    categorias: categoriaId ? [categoriaId] : [],
    precioPorHora: 50,
    skills: ["JavaScript", "HTML"],
    banco: "BancoTest",
    tipoCuenta: "Ahorros",
    numeroCuenta: "1234567890",
    titular: user.nombre + " " + (user.apellido || ""),
    tipoDocumento: "DNI",
    numeroDocumento: "987654321",
  };

  await user.save();
  console.log("Saved user:", user.email);
  console.log(
    JSON.stringify(
      {
        _id: user._id,
        email: user.email,
        roles: user.roles,
        infoExperto: user.infoExperto,
      },
      null,
      2
    )
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
