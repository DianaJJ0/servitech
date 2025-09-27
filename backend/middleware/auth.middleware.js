/**
 * @file Middleware de autenticación JWT
 * @module middleware/auth
 * @description Middleware para proteger rutas y verificar roles de usuario
 */

const jwt = require("jsonwebtoken");
const Usuario = require("../models/usuario.model");

/**
 * Middleware para autenticar usuarios usando JWT.
 * @swagger
 * securitySchemes:
 *   bearerAuth:
 *     type: http
 *     scheme: bearer
 *     bearerFormat: JWT
 */
const autenticar = async (req, res, next) => {
  try {
    // Rutas públicas que no requieren autenticación.
    const rutasPublicas = [
      "/health",
      "/usuarios/login",
      "/usuarios/registro",
      "/usuarios/recuperar-password",
      "/usuarios/reset-password",
      "/categorias",
      "/expertos",
    ];

    // Revisar si la ruta es pública.
    const rutaActual = req.path;
    const esRutaPublica = rutasPublicas.some(
      (ruta) => rutaActual === ruta || rutaActual.startsWith(ruta + "/")
    );

    if (esRutaPublica) {
      return next();
    }

    // Para rutas protegidas, validar Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        mensaje: "Token de autenticación requerido",
        error: "UNAUTHORIZED",
      });
    }
    const token = authHeader.substring(7);
    if (!token) {
      return res.status(401).json({
        mensaje: "Token de autenticación inválido",
        error: "INVALID_TOKEN",
      });
    }
    // Decodificar y validar JWT.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Buscar usuario
    const usuario = await Usuario.findById(decoded.id).select("-passwordHash");
    if (!usuario) {
      return res.status(401).json({
        mensaje: "Usuario no encontrado",
        error: "USER_NOT_FOUND",
      });
    }
    if (usuario.estado === "inactivo") {
      return res.status(401).json({
        mensaje: "Cuenta desactivada",
        error: "ACCOUNT_INACTIVE",
      });
    }
    req.usuario = usuario;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        mensaje: "Token inválido",
        error: "INVALID_TOKEN",
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        mensaje: "Token expirado",
        error: "TOKEN_EXPIRED",
      });
    }
    return res.status(500).json({
      mensaje: "Error interno de autenticación",
      error: "INTERNAL_ERROR",
    });
  }
};

/**
 * Middleware para asegurar que el usuario tiene al menos uno de los roles requeridos.
 * @param {...string} rolesRequeridos
 * @returns {function}
 */
const asegurarRol = (...rolesRequeridos) => {
  return (req, res, next) => {
    if (!req.usuario || !Array.isArray(req.usuario.roles)) {
      return res.status(401).json({
        mensaje: "Usuario no autenticado o sin roles.",
        error: "NOT_AUTHENTICATED",
      });
    }
    const tienePermiso = req.usuario.roles.some((rol) =>
      rolesRequeridos.includes(rol)
    );
    if (!tienePermiso) {
      return res.status(403).json({
        mensaje: `Acceso denegado. Roles requeridos: ${rolesRequeridos.join(
          ", "
        )}`,
        error: "INSUFFICIENT_PERMISSIONS",
      });
    }
    next();
  };
};

module.exports = { autenticar, asegurarRol };
