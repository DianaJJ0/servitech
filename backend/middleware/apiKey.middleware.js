/**
 * @file Middleware de validación de API Key
 * @module middleware/apiKey
 * @description Middleware para proteger rutas administrativas con API Key
 */

/**
 * Middleware para validar API Key en rutas sensibles
 * @function apiKeyMiddleware
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 * @description Verifica la API Key del header 'x-api-key'
 * @throws {403} Si la API Key es inválida o no está presente
 * @example
 * // En rutas administrativas
 * router.get('/admin/users', apiKeyMiddleware, protect, esAdmin, obtenerUsuarios);
 */
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
