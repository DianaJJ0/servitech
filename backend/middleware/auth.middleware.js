/**
 * @file Middleware de autenticación JWT
 * @module middleware/auth
 * @description Middleware para proteger rutas y verificar roles de usuario
 */
const jwt = require("jsonwebtoken");
const Usuario = require("../models/usuario.model.js");

/**
 * Middleware para proteger rutas con autenticación JWT
 * @async
 * @function protect
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 * @description Verifica el token Bearer y agrega usuario a req.usuario
 * @throws {401} Si no hay token, es inválido o el usuario no existe
 * @throws {401} Si el token está expirado
 * @example
 * // En una ruta protegida
 * router.get('/perfil', protect, obtenerPerfil);
 */
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

/**
 * Middleware para verificar si el usuario autenticado es administrador
 * @function esAdmin
 * @param {Object} req - Request object (debe contener req.usuario del middleware protect)
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 * @description Verifica que el usuario tenga rol 'admin'
 * @throws {403} Si el usuario no tiene rol de administrador
 * @example
 * // Ruta solo para administradores
 * router.delete('/usuarios/:id', protect, esAdmin, eliminarUsuario);
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

module.exports = {
  protect,
  protegerRuta: protect,
  esAdmin,
};
