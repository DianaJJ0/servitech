#!/usr/bin/env node
/**
 * Script para crear un usuario admin y devolver/guardar un JWT para pruebas locales.
 * Uso:
 *   node backend/scripts/create-admin.js --email admin@test.com --password Password123! --nombre Admin --apellido Dev
 * El token se guarda en /tmp/admin_token.txt
 */

const path = require("path");
const fs = require("fs");
// Cargar variables de entorno desde backend/.env (misma convención que otros scripts)
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const conectarDB = require("../config/database.js");
const Usuario = require("../models/usuario.model.js");
const jwt = require("jsonwebtoken");

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = a.replace(/^--/, "");
      const val =
        args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

async function main() {
  const argv = parseArgs();
  const email = argv.email || "admin@local.dev";
  const password = argv.password || "Password123!";
  const nombre = argv.nombre || "Admin";
  const apellido = argv.apellido || "Dev";

  try {
    await conectarDB();
    // Buscar usuario existente
    let user = await Usuario.findOne({ email });
    if (user) {
      // Asegurar rol admin
      if (!user.roles.includes("admin")) {
        user.roles = Array.from(new Set([...(user.roles || []), "admin"]));
      }
      // Si se pasó password, actualizarla
      if (password) user.password = password; // virtual setter
      user.nombre = nombre;
      user.apellido = apellido;
      await user.save();
      console.log("Usuario actualizado:", email);
    } else {
      user = new Usuario({
        email,
        nombre,
        apellido,
        roles: ["admin", "cliente"],
      });
      user.password = password; // virtual setter -> passwordHash
      await user.save();
      console.log("Usuario creado:", email);
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "testsecret",
      { expiresIn: "2d" }
    );
    const outPath = "/tmp/admin_token.txt";
    fs.writeFileSync(outPath, token, { encoding: "utf8" });
    console.log("Token JWT generado y guardado en:", outPath);
    console.log(token);
    process.exit(0);
  } catch (err) {
    console.error("Error creando admin:", err);
    process.exit(1);
  }
}

if (require.main === module) main();
