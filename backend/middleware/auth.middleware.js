/**
 * ---------------------------------------------
 * Middleware de autenticación y autorización JWT
 * ---------------------------------------------
 * Este módulo:
 * - Protege rutas privadas exigiendo JWT válido o sesión activa
 * - Permite definir rutas públicas que no requieren autenticación
 * - Permite asegurar roles mínimos requeridos para ciertas rutas
 *
 * @module middleware/auth
 * @author Equipo Servitech
 */

const jwt = require("jsonwebtoken");
const Usuario = require("../models/usuario.model");

/**
 * Middleware para autenticar usuarios usando JWT o sesión.
 * Si la ruta es pública, permite el acceso sin autenticación.
 * Si la ruta es privada, valida JWT o sesión y adjunta el usuario a req.usuario.
 * @function autenticar
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 * @returns {void}
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

    // Autenticación por sesión (cuando la UI del frontend usa sesiones)
    if (req.session && req.session.user && req.session.user.email) {
      const usuarioSession = await Usuario.findOne({
        email: req.session.user.email,
      }).select("-passwordHash");
      if (usuarioSession) {
        if (usuarioSession.estado === "inactivo") {
          return res.status(401).json({
            mensaje: "Cuenta desactivada",
            error: "ACCOUNT_INACTIVE",
          });
        }
        req.usuario = usuarioSession;
        return next();
      }
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
 * @function asegurarRol
 * @param {...string} rolesRequeridos - Roles requeridos para acceder a la ruta
 * @returns {function} Middleware de autorización
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
