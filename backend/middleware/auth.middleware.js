/**
 * @file Middleware de autenticación JWT
 * @module middleware/auth
 * @description Middleware para proteger rutas y verificar roles de usuario
 */
const jwt = require("jsonwebtoken");
const Usuario = require("../models/usuario.model");

/**
 * Middleware de autenticación JWT
 */
const autenticar = async (req, res, next) => {
  try {
    // Rutas públicas que no requieren autenticación
    // IMPORTANTE: Estas son las rutas SIN el prefijo /api porque el middleware
    // se aplica ya en /api, entonces req.path viene sin ese prefijo
    const rutasPublicas = [
      "/health",
      "/usuarios/login",
      "/usuarios/registro",
      "/usuarios/recuperar-password",
      "/usuarios/reset-password",
      "/categorias",
      "/expertos",
      "/dev/create-admin",
    ];

    // Verificar si la ruta actual es pública
    const rutaActual = req.path;
    const esRutaPublica = rutasPublicas.some((ruta) => {
      // Permitir la ruta exacta o que empiece con la ruta (para sub-rutas)
      return rutaActual === ruta || rutaActual.startsWith(ruta + "/");
    });

    if (esRutaPublica) {
      console.log(`Ruta pública permitida: ${req.method} ${rutaActual}`);
      return next();
    }

    // Para rutas protegidas, verificar token
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn(
        `Token requerido para ruta protegida: ${req.method} ${req.path}`
      );
      return res.status(401).json({
        mensaje: "Token de autenticación requerido",
        error: "UNAUTHORIZED",
      });
    }

    const token = authHeader.substring(7); // Remover 'Bearer '

    if (!token) {
      return res.status(401).json({
        mensaje: "Token de autenticación inválido",
        error: "INVALID_TOKEN",
      });
    }

    // Verificar y decodificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar el usuario en la base de datos
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

    // Añadir usuario al request para uso en rutas protegidas
    req.usuario = usuario;
    console.log(
      `Usuario autenticado: ${usuario.email} para ${req.method} ${req.path}`
    );
    next();
  } catch (error) {
    console.error("Error en middleware de autenticación:", error.message);

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
 * Middleware para asegurar roles específicos
 */
const asegurarRol = (...rolesRequeridos) => {
  return (req, res, next) => {
    try {
      if (!req.usuario) {
        return res.status(401).json({
          mensaje: "Usuario no autenticado",
          error: "NOT_AUTHENTICATED",
        });
      }

      const userRoles = req.usuario.roles || [];
      const tieneRolRequerido = rolesRequeridos.some((rol) =>
        userRoles.includes(rol)
      );

      if (!tieneRolRequerido) {
        return res.status(403).json({
          mensaje: `Acceso denegado. Roles requeridos: ${rolesRequeridos.join(
            ", "
          )}`,
          error: "INSUFFICIENT_PERMISSIONS",
        });
      }

      next();
    } catch (error) {
      console.error("Error en middleware de roles:", error.message);
      return res.status(500).json({
        mensaje: "Error interno de autorización",
        error: "INTERNAL_ERROR",
      });
    }
  };
};

module.exports = {
  autenticar,
  asegurarRol,
};
