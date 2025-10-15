/**
 * ---------------------------------------------
 * Servicio utilitario para escritura de logs en archivos
 * ---------------------------------------------
 * Este módulo permite:
 * - Escribir logs en archivos, asegurando la existencia del directorio
 * - Usar append para no sobrescribir logs existentes
 * - Fallback a writeFile si appendFile falla
 *
 * @module services/logService
 * @author Equipo Servitech
 */

const fs = require("fs");
const path = require("path");

/**
 * Escribe una línea de log en el archivo especificado, creando el directorio si es necesario.
 * Usa appendFileSync y fallback a writeFileSync si es necesario.
 * @param {string} filename - Ruta del archivo de log
 * @param {string} logData - Línea de log a escribir
 */
exports.generateLog = (filename, logData) => {
  const finalPath = path.isAbsolute(filename)
    ? filename
    : path.resolve(__dirname, "..", filename);
  const dir = path.dirname(finalPath);
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(finalPath, logData);
  } catch (err) {
    try {
      // Fallback: intentar escribir con writeFile append flag
      fs.writeFileSync(finalPath, logData, { flag: "a" });
    } catch (e) {
      console.warn("No se pudo escribir el log en:", finalPath, e && e.message);
    }
  }
};
