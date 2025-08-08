/**
 * MIDDLEWARE DE AUTENTICACIÓN
 * Protege las rutas verificando el token JWT y los roles del usuario.
 */
const jwt = require("jsonwebtoken");
const Usuario = require("../models/usuario.model.js");

/**
 * Middleware principal para proteger rutas. Verifica el token y añade el usuario a 'req'.
 * Usado por las rutas de usuario.
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.usuario = await Usuario.findById(decoded.id).select("-password");
      if (!req.usuario) {
        return res
          .status(401)
          .json({
            mensaje: "No autorizado, el usuario del token ya no existe.",
          });
      }
      next();
    } catch (error) {
      return res
        .status(401)
        .json({ mensaje: "No autorizado, token inválido o expirado." });
    }
  }

  if (!token) {
    return res
      .status(401)
      .json({ mensaje: "No autorizado, no se proporcionó un token." });
  }
};

/**
 * Middleware para verificar si el usuario tiene rol de 'admin'.
 * Debe usarse DESPUÉS de 'protect' o 'protegerRuta'.
 */
const esAdmin = (req, res, next) => {
  if (req.usuario && req.usuario.roles.includes("admin")) {
    next();
  } else {
    res
      .status(403)
      .json({ mensaje: "Acceso denegado. Se requiere rol de administrador." });
  }
};

// 'protegerRuta' será un alias de 'protect' para mantener la compatibilidad con  archivos.
module.exports = {
  protect,
  protegerRuta: protect, // Alias para las rutas que usan 'protegerRuta'
  esAdmin,
};
