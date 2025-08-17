/**
 * MIDDLEWARE DE AUTENTICACIÓN
 * Protege las rutas verificando el token JWT y los roles del usuario.
 */
const jwt = require("jsonwebtoken"); // Importa la librería jsonwebtoken para manejar JWT
const Usuario = require("../models/usuario.model.js"); // Importa el modelo de usuario de la base de datos

/**
 * Middleware principal para proteger rutas. Verifica el token y añade el usuario a 'req'.
 * Usado por las rutas de usuario.
 */
const protect = async (req, res, next) => { // Define el middleware 'protect' como función asíncrona, next es una función de callback para continuar con el siguiente middleware
  let token; // Inicializa la variable 'token' para almacenar el JWT

  if (
    req.headers.authorization && // Verifica si existe el header 'authorization'
    req.headers.authorization.startsWith("Bearer") // Verifica si el header comienza con 'Bearer'
  ) {
    try {
      token = req.headers.authorization.split(" ")[1]; // Extrae el token JWT del header
      const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verifica y decodifica el token usando la clave secreta
      req.usuario = await Usuario.findById(decoded.id).select("-password"); // Busca el usuario por ID y excluye el campo 'password'
      if (!req.usuario) { // Si no se encuentra el usuario
        return res
          .status(401) // Devuelve estado 401 (no autorizado)
          .json({
            mensaje: "No autorizado, el usuario del token ya no existe.", // Mensaje de error si el usuario no existe
          });
      }
      next(); // Si todo es correcto, llama al siguiente middleware
    } catch (error) { // Si ocurre algún error en la verificación del token
      return res
        .status(401) // Devuelve estado 401 (no autorizado)
        .json({ mensaje: "No autorizado, token inválido o expirado." }); // Mensaje de error si el token es inválido o expiró
    }
  }

  if (!token) { // Si no se proporcionó un token
    return res
      .status(401) // Devuelve estado 401 (no autorizado)
      .json({ mensaje: "No autorizado, no se proporcionó un token." }); // Mensaje de error si falta el token
  }
};

/**
 * Middleware para verificar si el usuario tiene rol de 'admin'.
 * Debe usarse DESPUÉS de 'protect' o 'protegerRuta'.
 */
const esAdmin = (req, res, next) => { // Define el middleware 'esAdmin'
  if (req.usuario && req.usuario.roles.includes("admin")) { // Verifica si el usuario existe y tiene el rol 'admin'
    next(); // Si es admin, llama al siguiente middleware
  } else {
    res
      .status(403) // Devuelve estado 403 (acceso denegado)
      .json({ mensaje: "Acceso denegado. Se requiere rol de administrador." }); // Mensaje de error si no es admin
  }
};

// 'protegerRuta' será un alias de 'protect' para mantener la compatibilidad con archivos.
module.exports = {
  protect, // Exporta el middleware 'protect'
  protegerRuta: protect, // Exporta 'protect' bajo el alias 'protegerRuta'
  esAdmin, // Exporta el middleware 'esAdmin'
};
