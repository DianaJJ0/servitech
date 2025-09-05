const mongoose = require("mongoose");
const conectarDB = require("../config/database");
const Usuario = require("../models/usuario.model");

/**
 * Script para normalizar/corregir `infoExperto.especialidad` en documentos Usuario.
 * Uso:
 *   MONGO_URI='mongodb://...' node fix-especialidad.js --dry-run
 *   MONGO_URI='mongodb://...' node fix-especialidad.js --apply
 * Por defecto hace un dry-run (no modifica). Pasa --apply para aplicar cambios.
 */
async function run() {
  if (!process.env.MONGO_URI) {
    console.error("Setea MONGO_URI en env antes de ejecutar.");
    process.exit(1);
  }

  const doApply = process.argv.includes("--apply");

  await conectarDB();
  const expertos = await Usuario.find({ roles: { $in: ["experto"] } }).lean();
  let changed = 0;
  for (const u of expertos) {
    try {
      const info = u.infoExperto || {};
      const hasEspecialidad =
        typeof info.especialidad !== "undefined" &&
        info.especialidad !== null &&
        String(info.especialidad).trim() !== "";
      if (!hasEspecialidad) {
        const fallback =
          u.especialidad && String(u.especialidad).trim()
            ? u.especialidad
            : "General";
        console.log("Would update", u._id.toString(), "->", fallback);
        if (doApply) {
          // Si parece un ObjectId, convertir
          let valueToSet = fallback;
          try {
            if (String(fallback).match(/^[0-9a-fA-F]{24}$/)) {
              valueToSet = mongoose.Types.ObjectId(String(fallback));
            }
          } catch (e) {}
          await Usuario.updateOne(
            { _id: u._id },
            { $set: { "infoExperto.especialidad": valueToSet } }
          );
          changed++;
          console.log("Updated", u._id.toString(), "->", valueToSet);
        }
      }
    } catch (err) {
      console.error("Error en", u._id, err.message || err);
    }
  }
  console.log(
    "Total updated:",
    changed,
    "(applied:" + (doApply ? "yes" : "no") + ")"
  );
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
