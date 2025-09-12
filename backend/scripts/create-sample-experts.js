// Script para crear 8 perfiles de expertos de ejemplo
// Uso: node scripts/create-sample-experts.js

const mongoose = require("mongoose");
const Categoria = require("../models/categoria.model");

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
    // Asegurar categoría 'General'
    let cat = await Categoria.findOne({ nombre: "General" });
    if (!cat) {
      cat = await Categoria.create({
        nombre: "General",
        descripcion: "Categoria por defecto",
      });
      console.log("Categoria creada:", cat._id.toString());
    }

    const col = mongoose.connection.collection("usuarios");
    const bcrypt = require("bcryptjs");
    const pwHash = bcrypt.hashSync("Passw0rd!", 10);

    const created = [];
    for (let i = 1; i <= 8; i++) {
      const email = `sample_expert${i}@example.com`;
      const exists = await col.findOne({ email });
      if (exists) {
        console.log("Ya existe:", email);
        continue;
      }

      const doc = {
        email,
        nombre: `Expert${i}`,
        apellido: "Demo",
        passwordHash: pwHash,
        avatarUrl: "https://ui-avatars.com/api/?name=User&background=random",
        roles: ["experto"],
        estado: "activo",
        usuario: `sample_expert${i}`,
        infoExperto: {
          especialidad: "Desarrollo Web",
          descripcion: `Experto de ejemplo ${i}. Servicios: asesoria, desarrollo y soporte.`,
          categorias: [cat._id],
          precioPorHora: 40 + i,
          skills: ["JavaScript", "Node.js", "Express"],
          horario: null,
          banco: "Banco Demo",
          tipoCuenta: "Ahorros",
          numeroCuenta: `0000${i}000${i}`,
          titular: `Expert Demo ${i}`,
          tipoDocumento: "DNI",
          numeroDocumento: `0000000${i}`,
          telefonoContacto: `50200000${i}`,
          diasDisponibles: ["Lunes", "Miercoles", "Viernes"],
        },
        fechaRegistro: new Date(),
        fechaActualizacion: new Date(),
      };

      try {
        await col.insertOne(doc);
        created.push(email);
        console.log("Creado:", email);
      } catch (err) {
        console.error(
          "Error creando",
          email,
          err && err.message ? err.message : err
        );
      }
    }

    console.log("Creacion completada. Usuarios creados:", created.length);
    if (created.length) console.table(created);

    await mongoose.disconnect();
  } catch (e) {
    console.error("Error creando usuarios de ejemplo:", e);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
