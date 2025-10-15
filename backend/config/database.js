/**
 * Configuración y utilidades de conexión a la base de datos.
 *
 * @module config/database
 */
const mongoose = require("mongoose");

/**
 * Inicializa la conexión a la base de datos.
 * @async
 * @function connectDatabase
 * @returns {Promise<void>} Resuelve cuando la conexión está establecida
 * @description Conecta a MongoDB usando la URI de las variables de entorno
 * @throws {Error} Termina el proceso si no puede conectar
 * @example

/**
 * ---------------------------------------------
 * Configuración y utilidades de conexión a la base de datos MongoDB
 * ---------------------------------------------
 * Este módulo permite:
 * - Inicializar la conexión a MongoDB usando Mongoose
 * - Validar la URI desde variables de entorno
 * - Manejar errores y terminar el proceso si la conexión falla (excepto en desarrollo)
 *
 * @module config/database
 * @author Equipo Servitech
 */

const mongoose = require("mongoose");

/**
 * Inicializa la conexión a la base de datos MongoDB.
 * @async
 * @function conectarDB
 * @returns {Promise<void>} Resuelve cuando la conexión está establecida
 * @throws {Error} Termina el proceso si no puede conectar (excepto en desarrollo)
 * @example
 * // En app.js
 * const conectarDB = require('./config/database');
 * await conectarDB();
 */
const conectarDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      throw new Error("MONGO_URI no está definida en las variables de entorno");
    }

    const conn = await mongoose.connect(mongoURI);

    console.log(`MongoDB conectado: ${conn.connection.name}`);
  } catch (error) {
    console.error("Error conectando a MongoDB:", error.message);
    if (process.env.NODE_ENV !== "development") {
      process.exit(1);
    }
  }
};

// Exporta la función para ser utilizada en app.js y otros módulos
module.exports = conectarDB;
