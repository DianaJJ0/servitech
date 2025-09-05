// Middleware para proteger rutas sensibles con API Key
module.exports = function (req, res, next) {
  // Obtiene la API Key del encabezado 'x-api-key' de la solicitud
  const apiKey = req.headers["x-api-key"];

  // Normalizar y comparar con la clave esperada (trim para tolerar espacios accidentales)
  const expected = (process.env.API_KEY || "").toString().trim();

  if (!apiKey || apiKey !== expected) {
    return res
      .status(403)
      .json({ error: "Acceso denegado: API Key inválida." });
  }

  // Si la API Key es válida, continúa con el siguiente middleware/controlador
  next();
};
