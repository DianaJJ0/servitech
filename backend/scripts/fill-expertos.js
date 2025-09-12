// Script para rellenar infoExperto mínimo y completo para usuarios con rol 'experto' y infoExperto null
// Uso: node scripts/fill-expertos.js [--apply]

const mongoose = require("mongoose");
const Usuario = require("../models/usuario.model");
const Categoria = require("../models/categoria.model");

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
    // Buscar una categoria por defecto para usar su _id en los expertos rellenos
    const defaultCat = await Categoria.findOne().lean();
    const defaultCatId = defaultCat ? defaultCat._id : null;
    if (!defaultCatId)
      console.log(
        "Aviso: no se encontró ninguna categoría; las categorías quedarán vacías."
      );

    // Obtener usuarios con rol 'experto' y infoExperto null
    const users = await Usuario.find({
      roles: "experto",
      infoExperto: { $in: [null, undefined] },
    }).lean();
    console.log("Usuarios objetivo encontrados:", users.length);
    if (users.length === 0) {
      await mongoose.disconnect();
      console.log("Nada que hacer. Salida.");
      return;
    }

    const template = (catId) => ({
      especialidad: "General",
      descripcion:
        "Perfil creado por el administrador. Experto disponible para asesorías y proyectos. Por favor contacte para más detalles.",
      categorias: catId ? [catId] : [],
      precioPorHora: 50,
      skills: ["Asesoría", "Consultoría"],
      banco: "Banco por defecto",
      tipoCuenta: "Ahorros",
      numeroCuenta: "000000000",
      titular: "Titular por defecto",
      tipoDocumento: "DNI",
      numeroDocumento: "00000000",
      telefonoContacto: "5020000000",
      diasDisponibles: ["Lunes", "Miercoles", "Viernes"],
    });

    let changed = 0;
    for (const u of users) {
      console.log("-> Preparando:", u.email);
      const info = template(defaultCatId);
      if (apply) {
        // Usar updateOne con $set para evitar validación estricta en save
        const setObj = { infoExperto: info };
        await Usuario.updateOne({ _id: u._id }, { $set: setObj });
        changed++;
      }
    }

    console.log(
      "Dry-run:",
      !apply,
      "| Usuarios objetivo:",
      users.length,
      "| Aplicados:",
      changed
    );
    await mongoose.disconnect();
  } catch (e) {
    console.error("Error en script:", e);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
