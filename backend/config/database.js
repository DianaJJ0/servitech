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

    console.log(` MongoDB conectado: ${conn.connection.name}`);
  } catch (error) {
    console.error(" Error conectando a MongoDB:", error.message);
    if (process.env.NODE_ENV !== "development") {
      process.exit(1);
    }
  }
};
// Se exporta la función para poder usarla en otros archivos
module.exports = conectarDB;
