/**
 * SCRIPT DE INICIALIZACIÓN - SERVITECH (rama develop)
 * Ejecutar: node backend/inicializar.js
 */

require("dotenv").config({ path: __dirname + "/.env" });
const mongoose = require("mongoose");
const conectarDB = require("./config/database.js");

const Categoria = require("./models/categoria.model.js");

// Función para generar un slug a partir de un nombre
function toSlug(text) {
  if (!text) return "";
  const a =
    "àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;";
  const b =
    "aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------";
  const p = new RegExp(a.split("").join("|"), "g");

  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(p, (c) => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, "-and-") // Replace & with 'and'
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}

// Función para normalizar texto para comparación
function normalizeForCompare(text) {
  if (!text) return "";
  const from = "ÁÀÂÄáàâäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÖóòôöÚÙÛÜúùûüÑñÇç";
  const to = "AAAAaaaaEEEEeeeeIIIIiiiiOOOOooooUUUUuuuuNnCc";
  let s = String(text);
  for (let i = 0; i < from.length; i++) {
    s = s.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
  }
  return s.toLowerCase().trim();
}

const categoriasBase = [
  {
    nombre: "Desarrollo de Software",
    descripcion:
      "Todo sobre programación, aplicaciones web, móviles y de escritorio.",
    icon: "laptop-code",
    color: "#3a8eff",
  },
  {
    nombre: "Infraestructura y Redes",
    descripcion:
      "Administración de sistemas, redes, servidores y cloud computing.",
    icon: "network-wired",
    color: "#ff8c00",
  },
  {
    nombre: "Ciberseguridad",
    descripcion:
      "Protección de sistemas, redes y datos contra ataques digitales.",
    icon: "shield-alt",
    color: "#dc3545",
  },
  {
    nombre: "Ciencia de Datos e Inteligencia Artificial",
    descripcion: "Análisis de datos, machine learning, deep learning y IA.",
    icon: "brain",
    color: "#6f42c1",
  },
  {
    nombre: "Bases de Datos",
    descripcion:
      "Diseño, administración y optimización de bases de datos SQL y NoSQL.",
    icon: "database",
    color: "#20c997",
  },
  {
    nombre: "Diseño y UX/UI",
    descripcion: "Diseño de interfaces, experiencia de usuario y prototipado.",
    icon: "drafting-compass",
    color: "#fd7e14",
  },
  {
    nombre: "Tecnologías Emergentes",
    descripcion:
      "Blockchain, IoT, Realidad Aumentada/Virtual y computación cuántica.",
    icon: "rocket",
    color: "#17a2b8",
  },
  {
    nombre: "E-commerce y Marketing Digital",
    descripcion:
      "Plataformas de comercio electrónico, SEO, SEM y estrategias de marketing.",
    icon: "shopping-cart",
    color: "#e83e8c",
  },
  {
    nombre: "Soporte Técnico y TI",
    descripcion:
      "Resolución de problemas de hardware, software y soporte a usuarios.",
    icon: "headset",
    color: "#6c757d",
  },
  {
    nombre: "Transformación Digital",
    descripcion:
      "Estrategias para la adopción de tecnología en negocios y organizaciones.",
    icon: "building",
    color: "#007bff",
  },
  {
    nombre: "Carrera y Educación Tecnológica",
    descripcion:
      "Consejos profesionales, certificaciones, cursos y desarrollo de carrera en TI.",
    icon: "graduation-cap",
    color: "#ffc107",
  },
];

async function run() {
  try {
    await conectarDB();

    const existentes = await Categoria.countDocuments({});
    if (existentes === 0) {
      const categoriasParaInsertar = categoriasBase.map((c) => ({
        ...c,
        slug: toSlug(c.nombre),
        nombreNormalized: normalizeForCompare(c.nombre),
        slugNormalized: normalizeForCompare(toSlug(c.nombre)),
      }));

      await Categoria.insertMany(categoriasParaInsertar);
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
