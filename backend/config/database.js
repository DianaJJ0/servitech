/**
 * ARCHIVO DE CONFIGURACIÓN DE LA BASE DE DATOS
 * Se encarga de establecer la conexión con MongoDB utilizando Mongoose.
 */
const mongoose = require("mongoose");

// Se obtiene la URI de conexión desde las variables de entorno
const MONGO_URI = process.env.MONGO_URI;

// Función asíncrona para conectar a la base de datos
const conectarDB = async () => {
  try {
    // Se intenta establecer la conexión con la base de datos
    const db = await mongoose.connect(MONGO_URI);

    // Si la conexión es exitosa, se muestra un mensaje en la consola
    const url = `${db.connection.host}:${db.connection.port}`;
    console.log(`MongoDB Conectado en: ${url}`);
    console.log("DEBUG: URI de conexión MongoDB usada por el backend:", url);
  } catch (error) {
    // MANEJO DE ERRORES CRÍTICO
    console.error(`Error al conectar a la base de datos: ${error.message}`);

    // Se termina el proceso del servidor con un código de error
    process.exit(1);
  }
};

// Se exporta la función para poder usarla en otros archivos
module.exports = conectarDB;
