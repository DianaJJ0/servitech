/**
 * SCRIPT DE INICIALIZACIÓN - SERVITECH (rama develop)
 * Ejecutar: node backend/inicializar.js
 */

require("dotenv").config({ path: __dirname + "/.env" });
const mongoose = require("mongoose");
const conectarDB = require("./config/database.js");

const Categoria = require("./models/categoria.model.js");

const categoriasBase = [
  {
    nombre: "Desarrollo de Software",
    descripcion: "Programación, web y apps.",
  },
  { nombre: "Bases de Datos", descripcion: "Diseño y gestión de datos." },
  {
    nombre: "Inteligencia Artificial y ML",
    descripcion: "Modelos y despliegue.",
  },
  { nombre: "Ciberseguridad", descripcion: "Seguridad y protección de datos." },
  { nombre: "DevOps y Cloud", descripcion: "CI/CD, contenedores, nubes." },
];

async function run() {
  try {
    await conectarDB();

    const existentes = await Categoria.countDocuments({});
    if (existentes === 0) {
      await Categoria.insertMany(categoriasBase);
      console.log("Categorías base creadas.");
    } else {
      console.log("Categorías ya existen. No se insertó nada.");
    }
  } catch (e) {
    console.error("Error en inicialización:", e);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

run();

