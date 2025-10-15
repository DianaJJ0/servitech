/**
 * ---------------------------------------------
 * Servicio para generación y registro de logs
 * ---------------------------------------------
 * Este módulo permite:
 * - Registrar eventos en archivos de log por tipo de entidad o general
 * - Crear archivos de log si no existen
 * - Persistir logs en la base de datos si se requiere
 *
 * @module services/generarLogs
 * @author Equipo Servitech
 */

const path = require("path");
const fs = require("fs");
const logService = require("../services/logService");

// Directorio donde se almacenan los logs
const logsDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

// Mapeo de tipos de log a archivos
const tipoMap = {
  usuarios: "usuarios.log",
  asesoria: "asesoria.log",
  categoria: "categoria.log",
  experto: "experto.log",
  pago: "pago.log",
  notificacion: "notificacion.log",
  general: "general.log",
};

// Crear archivos vacíos si faltan
Object.values(tipoMap).forEach((filename) => {
  const p = path.join(logsDir, filename);
  if (!fs.existsSync(p)) {
    try {
      fs.writeFileSync(p, "", { flag: "a" });
    } catch (e) {
      /* ignore */
    }
  }
});

/**
 * Obtiene el nombre de archivo de log según el tipo.
 * @param {string} tipo - Tipo de log (usuarios, asesoria, etc.)
 * @returns {string} Nombre de archivo de log
 */
function obtenerArchivo(tipo) {
  return tipoMap[tipo] || tipoMap.general;
}

/**
 * Registra un evento en el log correspondiente y opcionalmente en la base de datos.
 * @param {object} params - Parámetros del evento
 * @param {string} [params.usuarioEmail]
 * @param {string} [params.nombre]
 * @param {string} [params.apellido]
 * @param {string} [params.accion] - Acción realizada
 * @param {string} [params.detalle] - Detalle del evento
 * @param {string} [params.resultado] - Resultado (Exito/Error)
 * @param {string} [params.recursoId]
 * @param {string} [params.tipo] - Tipo de log
 * @param {object} [params.meta] - Información adicional
 * @param {boolean} [params.persistirEnDB] - Si se debe guardar en la base de datos
 * @returns {Promise<void>}
 */
async function registrarEvento({
  usuarioEmail = null,
  nombre = "",
  apellido = "",
  accion = "OTRA",
  detalle = "",
  resultado = "Exito",
  recursoId = null,
  tipo = "general",
  meta = null,
  persistirEnDB = false,
} = {}) {
  const ts = new Date().toISOString();
  const nombreCompleto = `${nombre || ""} ${apellido || ""}`.trim() || "-";
  const linea = `${ts} | ${accion} | ${
    usuarioEmail || "-"
  } | ${nombreCompleto} | Resultado: ${resultado}`;
  const archivo = path.join(logsDir, obtenerArchivo(tipo));
  try {
    logService.generateLog(archivo, linea + "\n");
  } catch (e) {
    console.warn("Error escribiendo log:", e && e.message);
  }
  if (persistirEnDB) {
    try {
      const Log = require("../models/log.model");
      const doc = new Log({
        usuarioEmail,
        nombre,
        apellido,
        accion,
        detalle,
        resultado,
        tipo,
        fecha: new Date(),
      });
      if (recursoId) doc.recursoId = recursoId;
      if (meta) doc.meta = meta;
      await doc.save();
    } catch (e) {
      console.warn("Error guardando log en BD:", e && e.message);
    }
  }
}

// Retrocompatibilidad: exportar una función principal que acepta (tipo, payload)
// y mantener `registrarEvento` como miembro para llamadas que usan la forma
// generarLogs.registrarEvento(...)
module.exports = function (tipo, payload = {}) {
  // Si el primer argumento es un objeto (llamada vieja con objeto), soportarlo
  if (typeof tipo === "object" && tipo !== null && !payload) {
    return module.exports.registrarEvento(tipo);
  }
  return module.exports.registrarEvento({ ...payload, tipo });
};

module.exports.registrarEvento = registrarEvento;
