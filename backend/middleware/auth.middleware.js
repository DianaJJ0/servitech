/**
 * @file Middleware de autenticación JWT
 * @module middleware/auth
 * @description Middleware para proteger rutas y verificar roles de usuario
 */
const jwt = require("jsonwebtoken");
const Usuario = require("../models/usuario.model");

/**
 * Verifica y decodifica un token JWT usando JWT_SECRET.
 * @param {string} token
 * @returns {Object} payload decodificado
 * @throws {Error} si no hay secreto o el token es inválido
 */
function verificarToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET no configurado");
  }
  return jwt.verify(token, secret);
}

/**
 * Middleware que exige un Bearer token válido y adjunta req.usuario
 */
function autenticar(req, res, next) {
  const authHeader = req.headers["authorization"];
  // Debug: log presence of Authorization header (dev only)
  try {
    if (authHeader) {
      // show only prefix for privacy
      const preview = String(authHeader).slice(0, 30);
      console.log("auth.middleware: Authorization header present:", preview);
    } else {
      console.log("auth.middleware: No Authorization header in request");
    }
  } catch (e) {}

  if (!authHeader) {
    return res.status(401).send("Token requerido");
  }
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).send("Formato de token inválido");
  }
  const token = parts[1];
  try {
    const payload = verificarToken(token);
    req.usuario = payload;
    // Compatibilidad: algunos tokens colocan el id en req.usuario.id mientras los controladores esperan req.usuario._id
    if (req.usuario && !req.usuario._id && req.usuario.id) {
      req.usuario._id = req.usuario.id;
    }
    // Debug: log that token verification succeeded and minimal payload
    try {
      console.log(
        "auth.middleware: token verificado, usuario id:",
        req.usuario && (req.usuario._id || req.usuario.id || "<no-id>")
      );
    } catch (e) {}
    return next();
  } catch (err) {
    return res.status(401).send("Token inválido o expirado");
  }
}

/**
 * Middleware factory que comprueba que el usuario tenga un rol específico (p.ej. 'admin')
 * @param {string} rol
 */
function asegurarRol(rol) {
  return async (req, res, next) => {
    const usuario = req.usuario;
    if (!usuario) {
      return res.status(401).send("No autenticado");
    }

    // Si el token no trae roles, intentar recuperar roles desde BD
    let rolesFromToken = Array.isArray(usuario.roles) ? usuario.roles : null;
    let isAdminFlag = usuario.isAdmin === true;
    if (!rolesFromToken && (usuario._id || usuario.id)) {
      try {
        const u = await Usuario.findById(usuario._id || usuario.id).select(
          "roles isAdmin"
        );
        if (u) {
          rolesFromToken = Array.isArray(u.roles) ? u.roles : null;
          isAdminFlag = u.isAdmin === true;
          // sincronizar en req.usuario para usos posteriores
          req.usuario.roles = u.roles;
          req.usuario.isAdmin = u.isAdmin;
        }
      } catch (e) {
        console.error(
          "Error al obtener usuario para asegurarRol:",
          e && e.message
        );
      }
    }

    const tieneRol =
      usuario &&
      (usuario.role === rol ||
        (Array.isArray(rolesFromToken) && rolesFromToken.includes(rol)) ||
        isAdminFlag === true);

    if (!tieneRol) {
      return res.status(403).send("Se requiere rol " + rol);
    }

    return next();
  };
}

module.exports = {
  verificarToken,
  autenticar,
  asegurarRol,
};
