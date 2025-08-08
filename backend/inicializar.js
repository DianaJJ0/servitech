/**
 *  SCRIPT DE INICIALIZACIÓN Y SIEMBRA DE DATOS - SERVITECH
 *  Crea datos esenciales para el funcionamiento inicial de la aplicación.
 *  Ejecutar con: node backend/inicializar.js
 */
const mongoose = require("mongoose");
require("dotenv").config({ path: __dirname + "/.env" });

const conectarDB = require("./config/database.js");
const Usuario = require("./models/usuario.model.js");
const Categoria = require("./models/categoria.model.js");

const categoriasPredeterminadas = [
  {
    nombre: "Tecnología e Informática",
    descripcion: "Soporte técnico, programación, redes y sistemas.",
  },
  {
    nombre: "Diseño y Creatividad",
    descripcion: "Diseño gráfico, web, UX/UI y contenido visual.",
  },
  {
    nombre: "Marketing Digital",
    descripcion: "SEO, SEM, redes sociales y estrategias online.",
  },
  {
    nombre: "Negocios y Finanzas",
    descripcion: "Consultoría empresarial, contabilidad y finanzas.",
  },
];

const usuariosPrueba = [
  {
    nombre: "Admin",
    apellido: "ServiTech",
    email: "admin@servitech.com",
    password: "adminpassword123",
    roles: ["admin", "cliente"],
  },
  {
    nombre: "Experto",
    apellido: "Prueba",
    email: "experto@servitech.com",
    password: "expertopassword123",
    roles: ["experto", "cliente"],
  },
  {
    nombre: "Cliente",
    apellido: "Prueba",
    email: "cliente@servitech.com",
    password: "clientepassword123",
    roles: ["cliente"],
  },
];

const inicializar = async () => {
  try {
    await conectarDB();
    console.log("Base de datos conectada. Iniciando siembra de datos...");

    // Limpiar colecciones para un estado limpio
    await Categoria.deleteMany({});
    await Usuario.deleteMany({});
    console.log("Colecciones limpiadas.");

    // 1. Crear Categorías
    const categoriasCreadas = await Categoria.insertMany(
      categoriasPredeterminadas
    );
    console.log(`${categoriasCreadas.length} categorías creadas.`);

    // 2. Crear Usuarios (usando .save() para activar hooks y virtuals)
    for (const userData of usuariosPrueba) {
      const usuario = new Usuario(userData);
      await usuario.save();
    }
    console.log(`${usuariosPrueba.length} usuarios de prueba creados.`);

    // 3. Actualizar usuario experto con su información
    const usuarioExperto = await Usuario.findOne({
      email: "experto@servitech.com",
    });
    if (usuarioExperto) {
      usuarioExperto.infoExperto = {
        especialidad: "Desarrollo Full-Stack",
        descripcion:
          "Más de 10 años creando aplicaciones web robustas y escalables.",
        precioPorHora: 75000,
        categorias: [
          categoriasCreadas.find((c) => c.nombre === "Tecnología e Informática")
            ._id,
          categoriasCreadas.find((c) => c.nombre === "Diseño y Creatividad")
            ._id,
        ],
        skills: ["React", "Node.js", "MongoDB", "Docker"],
        horario: {
          diasDisponibles: ["lunes", "miercoles", "viernes"],
          horaInicio: "09:00",
          horaFin: "17:00",
        },
      };
      await usuarioExperto.save();
      console.log("Usuario experto actualizado con su perfil.");
    }

    console.log("\nSiembra de datos completada exitosamente.");
    console.log("--- Credenciales de Prueba ---");
    console.log("Admin: admin@servitech.com / adminpassword123");
    console.log("Experto: experto@servitech.com / expertopassword123");
    console.log("Cliente: cliente@servitech.com / clientepassword123");
  } catch (error) {
    console.error("\nError durante la inicialización:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("\nConexión a la base de datos cerrada.");
  }
};

// Ejecutar la función de inicialización si el script es llamado directamente
if (require.main === module) {
  inicializar();
}

// No es necesario exportar nada si este archivo solo se usa como un script.
module.exports = { inicializar };
