const fs = require("fs");
const path = require("path");

// generateLog sencillo: resuelve ruta, asegura directorio y escribe en modo append
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
      // fallback: intentar escribir con writeFile append flag
      fs.writeFileSync(finalPath, logData, { flag: "a" });
    } catch (e) {
      console.warn("No se pudo escribir el log en:", finalPath, e && e.message);
    }
  }
};
