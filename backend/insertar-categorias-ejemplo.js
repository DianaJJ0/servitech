/**
 * Script para insertar categorías con especialidades y habilidades de ejemplo en MongoDB
 */
const mongoose = require("mongoose");
const Categoria = require("./models/categoria.model");

const categoriasEjemplo = [
  {
    nombre: "Tecnología e Informática",
    descripcion: "Soporte técnico, programación, redes y sistemas.",
    especialidades: [
      { nombre: "Programación", descripcion: "Frontend, Backend, Fullstack" },
      {
        nombre: "Bases de Datos",
        descripcion: "MongoDB, administración de datos NoSQL",
      },
      {
        nombre: "Redes",
        descripcion: "Administración y configuración de redes",
      },
      {
        nombre: "Ciberseguridad",
        descripcion: "Protección de sistemas y datos",
      },
    ],
    habilidades: [
      { nombre: "JavaScript", descripcion: "Programación en JS" },
      { nombre: "Python", descripcion: "Programación en Python" },
      { nombre: "Node.js", descripcion: "Desarrollo backend" },
      { nombre: "MongoDB", descripcion: "Bases de datos NoSQL" },
      { nombre: "Linux", descripcion: "Administración de sistemas Linux" },
      { nombre: "React", descripcion: "Desarrollo frontend moderno" },
      { nombre: "Docker", descripcion: "Contenedores y despliegue" },
    ],
  },
];

async function insertarCategorias() {
  await mongoose.connect("mongodb://localhost/servitech", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await Categoria.deleteMany({});
  await Categoria.insertMany(categoriasEjemplo);
  console.log("Categorías de ejemplo insertadas correctamente.");
  mongoose.disconnect();
}

insertarCategorias();
