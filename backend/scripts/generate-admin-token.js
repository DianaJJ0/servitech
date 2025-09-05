// Script que crea/asegura un usuario admin y genera un JWT con JWT_SECRET de .env
const mongoose = require("mongoose");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const Usuario = require("../models/usuario.model.js");

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI not set");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const email = process.argv[2] || "devadmin-script@example.com";
  let user = await Usuario.findOne({ email });
  if (!user) {
    user = new Usuario({ email, nombre: "DevAdmin", apellido: "Script" });
    user.password = "Password123!";
    user.roles = ["admin"];
    await user.save();
    console.log("Created admin user:", email);
  } else if (!user.roles.includes("admin")) {
    user.roles.push("admin");
    await user.save();
    console.log("Added admin role to user:", email);
  } else {
    console.log("Admin user exists:", email);
  }

  const secret = process.env.JWT_SECRET || "testsecret";
  const token = jwt.sign({ id: user._id }, secret, { expiresIn: "7d" });
  console.log(token);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
