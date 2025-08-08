/**
 * CONTROLADOR DE USUARIOS
 * Lógica de negocio para registro, inicio de sesión y gestión de perfiles.
 */
const Usuario = require("../models/usuario.model.js");
const jwt = require("jsonwebtoken");
const { enviarCorreo } = require("../services/email.service.js");

// --- Funciones Auxiliares ---

/**
 * Genera un JSON Web Token (JWT) para un ID de usuario.
 * @param {string} id - El ID del usuario extraído de MongoDB.
 * @returns {string} - El token JWT firmado.
 */
const generarToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// --- Lógica de Rutas ---

/**
 * Maneja el registro de un nuevo usuario.
 * @route POST /api/usuarios/registro
 * @access Public
 */
const registrarUsuario = async (req, res) => {
  const { nombre, apellido, email, password } = req.body;

  try {
    // 1. Validación de campos de entrada
    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({
        mensaje: "Por favor, complete todos los campos obligatorios.",
      });
    }

    // 2. Verificar si el usuario ya existe en la base de datos
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(409).json({
        mensaje: "El correo electrónico ya está registrado.",
      });
    }

    // 3. Crear el nuevo usuario en la base de datos
    const nuevoUsuario = new Usuario({
      nombre,
      apellido,
      email,
      password, // El modelo se encarga del hasheo automáticamente
    });
    await nuevoUsuario.save();

    // 4. Enviar correo de bienvenida (comentado temporalmente para evitar bloqueos)
    /*
    const asuntoBienvenida = "¡Bienvenido/a a ServiTech!";
    const mensajeBienvenida = `¡Hola, ${nuevoUsuario.nombre}!\n\nTu cuenta en ServiTech ha sido creada exitosamente.`;
    await enviarCorreo(nuevoUsuario.email, asuntoBienvenida, mensajeBienvenida);
    */

    // 5. Respuesta exitosa al cliente
    res.status(201).json({
      mensaje: "Usuario registrado exitosamente.",
      token: generarToken(nuevoUsuario._id),
    });
  } catch (error) {
    console.error("Error en el proceso de registro:", error);

    // Error de validación de Mongoose
    if (error.name === "ValidationError") {
      return res.status(400).json({ mensaje: error.message });
    }

    // Error genérico del servidor
    res.status(500).json({
      mensaje: "Error interno del servidor al registrar el usuario.",
    });
  }
};

/**
 * Maneja el inicio de sesión de un usuario.
 * @route POST /api/usuarios/login
 * @access Public
 */
const iniciarSesion = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Validación de campos de entrada
    if (!email || !password) {
      return res.status(400).json({
        mensaje: "Correo y contraseña son requeridos.",
      });
    }

    // 2. Buscar el usuario en la base de datos
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(401).json({
        mensaje: "Credenciales incorrectas.",
      });
    }

    // 3. Verificar la contraseña usando el método del modelo
    if (await usuario.matchPassword(password)) {
      // Login exitoso: generar token y enviar respuesta
      res.json({
        mensaje: "Inicio de sesión exitoso.",
        token: generarToken(usuario._id),
        usuario: {
          _id: usuario._id,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email: usuario.email,
        },
      });
    } else {
      // Contraseña incorrecta
      return res.status(401).json({
        mensaje: "Credenciales incorrectas.",
      });
    }
  } catch (error) {
    console.error("Error en el proceso de inicio de sesión:", error);
    res.status(500).json({
      mensaje: "Error interno del servidor al iniciar sesión.",
    });
  }
};

/**
 * Obtiene el perfil del usuario autenticado.
 * @route GET /api/usuarios/perfil
 * @access Private
 */
const obtenerPerfilUsuario = async (req, res) => {
  try {
    // El middleware auth.middleware.js debe agregar req.usuario
    const usuario = await Usuario.findById(req.usuario.id).select(
      "-passwordHash"
    );

    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    res.json(usuario);
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    res.status(500).json({ mensaje: "Error interno del servidor." });
  }
};

/**
 * Obtiene la lista de todos los usuarios (ruta protegida de administrador).
 * @route GET /api/usuarios/
 * @access Private
 */
const obtenerUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.find({}).select("-passwordHash");
    res.json(usuarios);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ mensaje: "Error interno del servidor." });
  }
};

// CORRECCIÓN CLAVE: Exportamos todas las funciones con los nombres exactos que usan las rutas
module.exports = {
  registrarUsuario,
  iniciarSesion,
  obtenerPerfilUsuario,
  obtenerUsuarios,
};
