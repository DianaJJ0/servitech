// Script para limpiar toda la colección y dejar solo la categoría de tecnología
const mongoose = require("mongoose");
require("dotenv").config({ path: __dirname + "/.env" });
console.log("DEBUG MONGO_URI:", process.env.MONGO_URI);
const Categoria = require("./models/categoria.model");

const categoriaTecnologia = {
  nombre: "Tecnología e Informática",
  descripcion: "Soporte técnico, programación, redes y sistemas.",
  especialidades: [
    { nombre: "Programación", descripcion: "Frontend, Backend, Fullstack" },
    {
      nombre: "Bases de Datos",
      descripcion: "MongoDB, administración de datos NoSQL",
    },
    { nombre: "Redes", descripcion: "Administración y configuración de redes" },
    { nombre: "Ciberseguridad", descripcion: "Protección de sistemas y datos" },
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
};

async function limpiarYInsertarTecnologia() {
  await mongoose.connect(process.env.MONGO_URI);
  const deleteResult = await Categoria.deleteMany({});
  console.log(`Categorías eliminadas: ${deleteResult.deletedCount}`);
  const doc = await Categoria.create([
    {
      nombre: "Desarrollo de Software",
      descripcion: "Asesorías relacionadas con creación de software",
      especialidades: [
        {
          nombre: "Desarrollo Web",
          descripcion: "Front-end y back-end para aplicaciones web",
          habilidades: [
            {
              nombre: "React.js",
              descripcion: "Biblioteca JavaScript para interfaces de usuario",
              nivel: "Intermedio",
            },
            {
              nombre: "Node.js",
              descripcion:
                "Entorno de ejecución para JavaScript en el servidor",
              nivel: "Avanzado",
            },
            {
              nombre: "HTML/CSS",
              descripcion: "Lenguajes base para desarrollo web",
              nivel: "Básico",
            },
          ],
        },
        {
          nombre: "Desarrollo Móvil",
          descripcion: "Aplicaciones para iOS y Android",
          habilidades: [
            {
              nombre: "Flutter",
              descripcion: "Framework para desarrollo multiplataforma",
              nivel: "Intermedio",
            },
            {
              nombre: "Kotlin",
              descripcion: "Lenguaje para desarrollo Android",
              nivel: "Intermedio",
            },
          ],
        },
      ],
    },
    {
      nombre: "Infraestructura IT",
      descripcion: "Asesorías sobre redes, servidores y sistemas",
      especialidades: [
        {
          nombre: "Redes",
          descripcion: "Configuración y mantenimiento de redes",
          habilidades: [
            {
              nombre: "Cisco CCNA",
              descripcion: "Certificación en redes Cisco",
              nivel: "Avanzado",
            },
            {
              nombre: "MikroTik",
              descripcion: "Configuración de routers MikroTik",
              nivel: "Intermedio",
            },
          ],
        },
        {
          nombre: "Servidores",
          descripcion: "Administración de servidores Linux y Windows",
          habilidades: [
            {
              nombre: "Linux",
              descripcion: "Administración de sistemas Linux",
              nivel: "Avanzado",
            },
            {
              nombre: "Windows Server",
              descripcion: "Administración de servidores Windows",
              nivel: "Intermedio",
            },
          ],
        },
      ],
    },
    {
      nombre: "Ciberseguridad",
      descripcion: "Protección de sistemas y datos",
      especialidades: [
        {
          nombre: "Pentesting",
          descripcion: "Pruebas de penetración y seguridad ofensiva",
          habilidades: [
            {
              nombre: "Metasploit",
              descripcion: "Framework para pruebas de penetración",
              nivel: "Intermedio",
            },
            {
              nombre: "Nmap",
              descripcion: "Escaneo de redes y puertos",
              nivel: "Intermedio",
            },
          ],
        },
        {
          nombre: "Forense Digital",
          descripcion: "Análisis forense de sistemas y redes",
          habilidades: [
            {
              nombre: "Autopsy",
              descripcion: "Herramienta de análisis forense",
              nivel: "Básico",
            },
          ],
        },
      ],
    },
    {
      nombre: "Ciencia de Datos",
      descripcion: "Análisis y procesamiento de datos",
      especialidades: [
        {
          nombre: "Machine Learning",
          descripcion: "Modelos de aprendizaje automático",
          habilidades: [
            {
              nombre: "Python",
              descripcion: "Programación en Python para ML",
              nivel: "Avanzado",
            },
            {
              nombre: "scikit-learn",
              descripcion: "Librería de ML en Python",
              nivel: "Intermedio",
            },
          ],
        },
        {
          nombre: "Big Data",
          descripcion: "Procesamiento de grandes volúmenes de datos",
          habilidades: [
            {
              nombre: "Hadoop",
              descripcion: "Framework para Big Data",
              nivel: "Intermedio",
            },
            {
              nombre: "Spark",
              descripcion: "Procesamiento distribuido de datos",
              nivel: "Intermedio",
            },
          ],
        },
      ],
    },
  ]);
  console.log("Categoría insertada:", doc);
  mongoose.disconnect();
}

limpiarYInsertarTecnologia();
