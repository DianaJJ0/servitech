// Script de migración para convertir categorias almacenadas como strings a ObjectId
// Uso: node scripts/fix-expertos.js [--apply]

const mongoose = require("mongoose");
const Usuario = require("../models/usuario.model");

const MONGO =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/servitech";

async function main() {
  const apply = process.argv.includes("--apply");
  console.log("Conectando a MongoDB:", MONGO);
  await mongoose.connect(MONGO, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    // 1) Usuarios con roles contiene 'experto' y infoExperto existe y tiene categorias como strings
    const candidates = await Usuario.find({
      roles: "experto",
      "infoExperto.categorias.0": { $exists: true },
    }).lean();
    let needFix = [];
    for (const u of candidates) {
      const info = u.infoExperto || {};
      const cats = Array.isArray(info.categorias) ? info.categorias : [];
      const needs = cats.filter(
        (c) => typeof c === "string" && /^[0-9a-fA-F]{24}$/.test(c)
      );
      if (needs.length > 0) {
        needFix.push({ email: u.email, _id: u._id, count: needs.length });
      }
    }

    console.log(
      "Usuarios con categorias potencialmente a convertir:",
      needFix.length
    );
    if (needFix.length > 0) console.table(needFix.slice(0, 50));

    if (apply && needFix.length > 0) {
      console.log("Aplicando conversiones...");
      for (const u of needFix) {
        const doc = await Usuario.findById(u._id);
        if (
          !doc ||
          !doc.infoExperto ||
          !Array.isArray(doc.infoExperto.categorias)
        )
          continue;
        doc.infoExperto.categorias = doc.infoExperto.categorias.map((c) => {
          if (typeof c === "string" && /^[0-9a-fA-F]{24}$/.test(c))
            return mongoose.Types.ObjectId(c);
          return c;
        });
        await doc.save();
        console.log("Fixed user:", doc.email);
      }
      console.log(
        "Conversion completa. Recomendado reiniciar backend si es necesario."
      );
    }

    // 2) Reportar usuarios con rol 'experto' pero infoExperto null
    const expertsMissingInfo = await Usuario.find({
      roles: "experto",
      infoExperto: { $in: [null, undefined] },
    })
      .select("email _id fechaRegistro")
      .lean();
    console.log(
      "Usuarios con rol experto y infoExperto null:",
      expertsMissingInfo.length
    );
    if (expertsMissingInfo.length > 0)
      console.table(expertsMissingInfo.slice(0, 50));

    // cierre
    await mongoose.disconnect();
    console.log("Done (dry-run:", !apply, ")");
  } catch (e) {
    console.error("Error en script:", e);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
