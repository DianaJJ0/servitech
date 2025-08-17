/**
 *  SCRIPT DE INICIALIZACIÓN Y SIEMBRA DE DATOS - SERVITECH
 *  Crea datos esenciales para el funcionamiento inicial de la aplicación.
 *  Ejecutar con: node backend/inicializar.js
 */

// Importa la librería mongoose para interactuar con MongoDB
const mongoose = require("mongoose");
// Carga las variables de entorno desde el archivo .env ubicado en el mismo directorio
require("dotenv").config({ path: __dirname + "/.env" });

// Importa la función para conectar a la base de datos desde la configuración
const conectarDB = require("./config/database.js");
// Importa el modelo de Usuario para crear y manipular usuarios en la base de datos
const Usuario = require("./models/usuario.model.js");
// Importa el modelo de Categoria para crear y manipular categorías en la base de datos
const Categoria = require("./models/categoria.model.js");

// Define un arreglo con las categorías predeterminadas, cada una con especialidades y habilidades anidadas
const categoriasPredeterminadas = [
  // Cada objeto representa una categoría principal
  {
    nombre: "Transformación Digital", // Nombre de la categoría
    descripcion: "Procesos de cambio y digitalización empresarial.", // Descripción de la categoría
    especialidades: [
      // Lista de especialidades dentro de la categoría
      {
        nombre: "Diagnóstico de madurez digital", // Nombre de la especialidad
        habilidades: [
          // Habilidades asociadas a la especialidad
          { nombre: "Liderazgo de cambio" },
          { nombre: "Gestión de proyectos de transformación" },
          { nombre: "Comunicación efectiva" },
          { nombre: "Análisis de procesos" },
          { nombre: "Evaluación de tecnologías emergentes" },
          { nombre: "Capacidad de adaptación" },
          { nombre: "Negociación estratégica" },
        ],
      },
      // ... (más especialidades y habilidades, estructura repetida)
    ],
  },
  // ... (más categorías, cada una con su estructura)
];

// Define un arreglo con usuarios de prueba para poblar la base de datos
const usuariosPrueba = [
  {
    nombre: "Admin", // Nombre del usuario
    apellido: "ServiTech", // Apellido del usuario
    email: "admin@servitech.com", // Correo electrónico
    password: "adminpassword123", // Contraseña en texto plano (solo para pruebas)
    roles: ["admin", "cliente"], // Roles asignados al usuario
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

// Función principal asíncrona para inicializar la base de datos
const inicializar = async () => {
  try {
    // Conecta a la base de datos usando la función importada
    await conectarDB();
    console.log("Base de datos conectada. Iniciando siembra de datos...");

    // Elimina todos los documentos de la colección Categoria para empezar limpio
    await Categoria.deleteMany({});
    // Elimina todos los documentos de la colección Usuario para empezar limpio
    await Usuario.deleteMany({});
    console.log("Colecciones limpiadas.");

    // Inserta todas las categorías predeterminadas en la base de datos
    const categoriasCreadas = await Categoria.insertMany(
      categoriasPredeterminadas
    );
    // Muestra cuántas categorías fueron creadas
    console.log(`${categoriasCreadas.length} categorías creadas.`);

    // Recorre el arreglo de usuarios de prueba y los guarda uno por uno
    for (const userData of usuariosPrueba) {
      // Crea una instancia del modelo Usuario con los datos de prueba
      const usuario = new Usuario(userData);
      // Guarda el usuario en la base de datos (usa .save() para activar hooks y virtuals)
      await usuario.save();
    }
    // Muestra cuántos usuarios de prueba fueron creados
    console.log(`${usuariosPrueba.length} usuarios de prueba creados.`);

    // Busca el usuario experto por su email para actualizar su información de experto
    const usuarioExperto = await Usuario.findOne({
      email: "experto@servitech.com",
    });
    // Si el usuario experto existe, actualiza su perfil con información adicional
    if (usuarioExperto) {
      usuarioExperto.infoExperto = {
        especialidad: "Desarrollo de Software", // Especialidad principal
        descripcion:
          "Más de 10 años creando aplicaciones web robustas y escalables.", // Descripción profesional
        precioPorHora: 75000, // Precio por hora en moneda local
        categorias: [
          // Asocia categorías por su _id obtenido de las categorías creadas
          categoriasCreadas.find((c) => c.nombre === "Transformación Digital")
            ._id,
          categoriasCreadas.find((c) => c.nombre === "Desarrollo de Software")
            ._id,
        ],
        skills: [
          // Lista de habilidades principales del experto
          "Programación en varios lenguajes (Python, Java, etc.)",
          "Gestión de versiones (Git)",
          "Metodologías ágiles",
        ],
        horario: {
          // Horario de disponibilidad del experto
          diasDisponibles: ["lunes", "miércoles", "viernes"],
          horaInicio: "09:00",
          horaFin: "17:00",
        },
      };
      // Guarda los cambios en el usuario experto
      await usuarioExperto.save();
      console.log("Usuario experto actualizado con su perfil.");
    }

    // Mensaje final indicando que la siembra de datos fue exitosa
    console.log("\nSiembra de datos completada exitosamente.");
    // Muestra las credenciales de prueba para facilitar el acceso
    console.log("--- Credenciales de Prueba ---");
    console.log("Admin: admin@servitech.com / adminpassword123");
    console.log("Experto: experto@servitech.com / expertopassword123");
    console.log("Cliente: cliente@servitech.com / clientepassword123");
  } catch (error) {
    // Si ocurre algún error, lo muestra y termina el proceso con código de error
    console.error("\nError durante la inicialización:", error);
    process.exit(1);
  } finally {
    // Cierra la conexión a la base de datos al finalizar el proceso
    await mongoose.connection.close();
    console.log("\nConexión a la base de datos cerrada.");
  }
};

// Verifica si el script fue ejecutado directamente desde la línea de comandos
if (require.main === module) {
  // Si es así, ejecuta la función de inicialización
  inicializar();
}

// Exporta la función inicializar por si se requiere desde otro archivo (opcional)
module.exports = { inicializar };

