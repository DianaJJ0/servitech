// Genera un token JWT en una sola línea para el admin
const mongoose = require("mongoose");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const Usuario = require("../models/usuario.model.js");

(async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI not set");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const email = process.argv[2] || "devadmin-oneline@example.com";
  let user = await Usuario.findOne({ email });
  if (!user) {
    user = new Usuario({ email, nombre: "DevAdminOL", apellido: "Script" });
    user.password = "Password123!";
    user.roles = ["admin"];
    await user.save();
  } else if (!user.roles.includes("admin")) {
    user.roles.push("admin");
    await user.save();
  }
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET || "testsecret",
    { expiresIn: "7d" }
  );
  process.stdout.write(token);
  process.exit(0);
})();
