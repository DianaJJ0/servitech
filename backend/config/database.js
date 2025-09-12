/**
 * Configuración y utilidades de conexión a la base de datos.
 *
 * @module config/database
 */
const mongoose = require("mongoose");

// Se obtiene la URI de conexión desde las variables de entorno
const MONGO_URI = process.env.MONGO_URI;

/**
 * Opciones de conexión a la base de datos.
 * @typedef {Object} DBConfig
 * @property {string} uri - URI de conexión a MongoDB
 * @property {Object} [options] - Opciones adicionales para el cliente de MongoDB
 */

/**
 * Inicializa la conexión a la base de datos.
 * @async
 * @function connectDatabase
 * @param {DBConfig} config - Configuración de la base de datos
 * @returns {Promise<void>} Resuelve cuando la conexión está establecida
 * @description Conecta a MongoDB usando la URI de las variables de entorno
 * @throws {Error} Termina el proceso si no puede conectar
 * @example
 * // En app.js
 * const conectarDB = require('./config/database');
 * await conectarDB();
 */
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
