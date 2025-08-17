// Middleware para proteger rutas sensibles con API Key
module.exports = function (req, res, next) {
  // Obtiene la API Key del encabezado 'x-api-key' de la solicitud
  const apiKey = req.headers["x-api-key"]; // headers es un objeto que contiene los encabezados de la solicitud

  // Verifica si la API Key coincide con la esperada en las variables de entorno
  if (apiKey !== process.env.API_KEY) {
    // Si no coincide, responde con error 403 y mensaje de acceso denegado
    return res
      .status(403)
      .json({ error: "Acceso denegado: API Key inválida." });
  }
  // Si la API Key es válida, continúa con el siguiente middleware/controlador
  next();
};
