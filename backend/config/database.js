/**
 * Configuración y utilidades de conexión a MongoDB usando Mongoose.
 *
 * - Deshabilita el buffering de comandos para fallar rápido cuando la DB no esté disponible
 * - Expone una función async `conectarDB` que resuelve cuando la conexión está lista
 * - Registra eventos de conexión para facilitar debugging en tiempo de ejecución
 *
 * Uso:
 * const conectarDB = require('../config/database');
 * await conectarDB();
 */
const mongoose = require("mongoose");

// Recomendaciones de Mongoose
mongoose.set("strictQuery", true);
// Deshabilitar bufferCommands hará que las operaciones fallen rápido en lugar de encolarse
mongoose.set("bufferCommands", false);

/**
 * Conecta a MongoDB.
 * @async
 * @throws {Error} Re-lanza el error de conexión después de loguearlo (y puede terminar el proceso en producción)
 */
async function conectarDB() {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    const msg = "MONGO_URI no está definida en las variables de entorno";
    console.error(msg);
    if (process.env.NODE_ENV !== "development") process.exit(1);
    throw new Error(msg);
  }

  const opts = {
    // tiempos cortos para exponer fallos de red/credenciales rápidamente durante dev
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  };

  // Registrar listeners una sola vez
  const conn = mongoose.connection;
  conn.on("connected", () => {
    console.log(
      `MongoDB conectado: ${conn.name || conn.db?.databaseName || "unknown"}`
    );
  });

  conn.on("error", (err) => {
    console.error(
      "MongoDB error de conexión:",
      err && err.message ? err.message : err
    );
  });

  conn.on("disconnected", () => {
    console.warn("MongoDB desconectado");
  });

  process.on("SIGINT", async () => {
    try {
      await mongoose.disconnect();
      console.log("MongoDB desconectado por SIGINT");
      process.exit(0);
    } catch (e) {
      process.exit(1);
    }
  });

  // Intentar conectar y propagar errores
  try {
    await mongoose.connect(mongoURI, opts);
    return;
  } catch (err) {
    console.error(
      "No se pudo conectar a MongoDB:",
      err && err.message ? err.message : err
    );
    // En desarrollo no abortamos automáticamente para facilitar debugging remoto
    if (process.env.NODE_ENV !== "development") {
      // Salir para que el proceso supervisor (pm2/docker/etc.) pueda reiniciar
      process.exit(1);
    }
    throw err;
  }
}

module.exports = conectarDB;
