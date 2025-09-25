const path = require("path");
const fs = require("fs");
const logService = require("../services/logService");

const logsDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

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

function obtenerArchivo(tipo) {
  return tipoMap[tipo] || tipoMap.general;
}

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

module.exports = { registrarEvento };
