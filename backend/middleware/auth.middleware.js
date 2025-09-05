/**
 * MIDDLEWARE DE AUTENTICACIÓN - Identificación por email
 */
const jwt = require("jsonwebtoken");
const Usuario = require("../models/usuario.model.js");

// Middleware para proteger rutas
const protect = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    let token = req.headers.authorization.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const usuario = await Usuario.findById(decoded.id).select("-password");
      if (!usuario) {
        return res.status(401).json({
          mensaje: "No autorizado, el usuario del token ya no existe.",
        });
      }
      // Guardar _id, email y roles para los controladores
      req.usuario = {
        _id: usuario._id,
        email: usuario.email,
        roles: usuario.roles,
      };
      next();
    } catch (error) {
      return res
        .status(401)
        .json({ mensaje: "No autorizado, token inválido o expirado." });
    }
  } else {
    return res
      .status(401)
      .json({ mensaje: "No autorizado, no se proporcionó un token." });
  }
};

// Middleware para verificar si el usuario es administrador
const esAdmin = (req, res, next) => {
  if (req.usuario && req.usuario.roles.includes("admin")) {
    next();
  } else {
    res
      .status(403)
      .json({ mensaje: "Acceso denegado. Se requiere rol de administrador." });
  }
};

module.exports = {
  protect,
  protegerRuta: protect,
  esAdmin,
};
