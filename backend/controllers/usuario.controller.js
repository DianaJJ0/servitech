/**
 * CONTROLADOR DE USUARIOS
 * Lógica de negocio para registro, inicio de sesión, recuperación y gestión de perfiles.
 */
const Usuario = require("../models/usuario.model.js");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { enviarCorreo } = require("../services/email.service.js");
const mongoose = require("mongoose");

// --- Funciones Auxiliares ---
// Genera un JWT para el usuario
const generarToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// --- Lógica de Rutas ---

// Registro de usuario nuevo (ahora permite roles personalizados)
const registrarUsuario = async (req, res) => {
  // Extrae todos los campos relevantes del body (incluyendo roles)
  const { nombre, apellido, email, password, roles } = req.body;
  try {
    // Validación básica de campos obligatorios
    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({
        mensaje: "Por favor, complete todos los campos obligatorios.",
      });
    }
    // Verifica si el correo ya está registrado
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(409).json({
        mensaje: "El correo electrónico ya está registrado.",
      });
    }
    // Si roles viene en el body y es un array válido, se usa. Si no, se usa el valor por defecto.
    const nuevoUsuario = new Usuario({
      nombre,
      apellido,
      email,
      password, // Se procesa por el campo virtual del modelo
      roles: Array.isArray(roles) && roles.length > 0 ? roles : undefined,
    });

    await nuevoUsuario.save();
    res.status(201).json({
      mensaje: "Usuario registrado exitosamente.",
      token: generarToken(nuevoUsuario._id),
    });
  } catch (error) {
    console.error("Error en el proceso de registro:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ mensaje: error.message });
    }
    res.status(500).json({
      mensaje: "Error interno del servidor al registrar el usuario.",
    });
  }
};

// Login de usuario. Devuelve token JWT y datos básicos.
const iniciarSesion = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({
        mensaje: "Correo y contraseña son requeridos.",
      });
    }
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(401).json({
        mensaje: "Credenciales incorrectas.",
      });
    }
    if (await usuario.matchPassword(password)) {
      // Genera el token JWT
      const token = generarToken(usuario._id);

      // Guarda el usuario en la sesión para el frontend
      if (req.session) {
        req.session.user = {
          _id: usuario._id,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email: usuario.email,
          roles: usuario.roles,
        };
      }

      // Devuelve token y datos del usuario
      return res.status(200).json({
        mensaje: "Login exitoso.",
        token,
        usuario: {
          _id: usuario._id,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email: usuario.email,
          roles: usuario.roles,
        },
      });
    } else {
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

// Obtiene datos del perfil del usuario autenticado
const obtenerPerfilUsuario = async (req, res) => {
  try {
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

// Devuelve la lista de todos los usuarios (protegida)
const obtenerUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.find({}).select("-passwordHash");
    res.json(usuarios);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ mensaje: "Error interno del servidor." });
  }
};

/**
 * Solicita recuperación de contraseña (envía email con token)
 * @route POST /api/usuarios/recuperar-password
 */
const solicitarRecuperacionPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const usuario = await Usuario.findOne({ email });
    if (!usuario)
      return res
        .status(200)
        .json({ mensaje: "Si el email existe, se enviaron instrucciones." });
    // Generar token seguro
    const token = crypto.randomBytes(32).toString("hex");
    usuario.passwordResetToken = token;
    usuario.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hora
    await usuario.save();
    // Enviar email
    const enlace = `${process.env.FRONTEND_URL}/recuperarPassword.html?token=${token}`;
    const asunto = "Recupera tu contraseña - ServiTech";
    const mensaje = `
      <p>Hola ${usuario.nombre},</p>
      <p>Recibimos una solicitud para recuperar tu contraseña.</p>
      <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
      <p><a href="${enlace}">${enlace}</a></p>
      <p>Si no solicitaste esto, puedes ignorar este correo.</p>
      <br>
      <p>Saludos,<br>Equipo ServiTech</p>
    `;
    await enviarCorreo(usuario.email, asunto, mensaje, mensaje);
    res
      .status(200)
      .json({ mensaje: "Si el email existe, se enviaron instrucciones." });
  } catch (error) {
    console.error("Error en recuperación de contraseña:", error);
    res.status(500).json({ mensaje: "Error en la recuperación." });
  }
};

/**
 * Restablece contraseña usando el token
 * @route POST /api/usuarios/reset-password
 */
const resetearPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const usuario = await Usuario.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });
    if (!usuario)
      return res.status(400).json({ mensaje: "Token inválido o expirado." });
    usuario.password = newPassword; // Campo virtual
    usuario.passwordResetToken = undefined;
    usuario.passwordResetExpires = undefined;
    await usuario.save();
    res
      .status(200)
      .json({ mensaje: "Contraseña actualizada. Puedes iniciar sesión." });
  } catch (error) {
    console.error("Error al actualizar contraseña:", error);
    res.status(500).json({ mensaje: "Error al actualizar contraseña." });
  }
};

// Actualiza el perfil del usuario autenticado
const actualizarPerfilUsuario = async (req, res) => {
  try {
    const datos = req.body;
    const usuario = await Usuario.findById(req.usuario.id);

    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    // Procesar categorías correctamente (array de ObjectId)
    let categoriasArray = [];
    if (datos.categorias) {
      if (Array.isArray(datos.categorias)) {
        // Si ya es array, convierte cada id a ObjectId
        categoriasArray = datos.categorias.map((id) => new mongoose.Types.ObjectId(id));
      } else if (typeof datos.categorias === "string") {
        // Si es string separado por comas, lo convierte
        categoriasArray = datos.categorias.split(",").map((id) => new mongoose.Types.ObjectId(id.trim()));
      }
    }

    // Procesar skills como array de strings
    let skillsArray = [];
    if (datos.skills) {
      if (Array.isArray(datos.skills)) {
        skillsArray = datos.skills;
      } else if (typeof datos.skills === "string") {
        skillsArray = datos.skills.split(",").map((skill) => skill.trim());
      }
    }

    // Procesar diasDisponibles como array de strings
    let diasArray = [];
    if (datos.diasDisponibles) {
      if (Array.isArray(datos.diasDisponibles)) {
        diasArray = datos.diasDisponibles;
      } else if (typeof datos.diasDisponibles === "string") {
        diasArray = datos.diasDisponibles.split(",").map((dia) => dia.trim());
      }
    }

    // Construir el objeto infoExperto si se están enviando datos de experto
    if (
      datos.descripcion ||
      datos.precio ||
      categoriasArray.length > 0 ||
      datos.especialidad ||
      skillsArray.length > 0 ||
      datos.banco
    ) {
      usuario.infoExperto = {
        descripcion: datos.descripcion,
        precioPorHora: datos.precio,
        diasDisponibles: diasArray,
        categorias: categoriasArray,
        especialidad: datos.especialidad,
        skills: skillsArray,
        banco: datos.banco,
        tipoCuenta: datos.tipoCuenta,
        numeroCuenta: datos.numeroCuenta,
        titular: datos.titular,
        tipoDocumento: datos.tipoDocumento,
        numeroDocumento: datos.numeroDocumento,
        telefonoContacto: datos.telefonoContacto,
      };
      // Asegurar el rol experto
      if (!usuario.roles.includes("experto")) {
        usuario.roles.push("experto");
      }
    }

    // Actualizar otros datos personales si se envían
    if (datos.nombre) usuario.nombre = datos.nombre;
    if (datos.apellido) usuario.apellido = datos.apellido;
    if (datos.email) usuario.email = datos.email;
    if (datos.avatarUrl) {
      usuario.avatarUrl = datos.avatarUrl;
    }

    await usuario.save();
    res.json(usuario);
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    res.status(500).json({ mensaje: "Error interno del servidor." });
  }
};

// Elimina el usuario autenticado
const eliminarUsuarioPropio = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const usuario = await Usuario.findByIdAndDelete(usuarioId);
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }
    res.json({ mensaje: "Cuenta eliminada correctamente." });
  } catch (error) {
    console.error("Error al eliminar usuario propio:", error);
    res
      .status(500)
      .json({ mensaje: "Error interno del servidor al eliminar la cuenta." });
  }
};

// Elimina un usuario por su ID (admin + API Key)
const eliminarUsuarioPorAdmin = async (req, res) => {
  try {
    const usuarioId = req.params.id;
    const usuario = await Usuario.findByIdAndDelete(usuarioId);
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }
    res.json({ mensaje: "Usuario eliminado correctamente por el admin." });
  } catch (error) {
    console.error("Error al eliminar usuario por admin:", error);
    res
      .status(500)
      .json({ mensaje: "Error interno del servidor al eliminar el usuario." });
  }
};

// Exportamos todas las funciones del controlador
module.exports = {
  registrarUsuario,
  iniciarSesion,
  obtenerPerfilUsuario,
  obtenerUsuarios,
  solicitarRecuperacionPassword,
  resetearPassword,
  actualizarPerfilUsuario,
  eliminarUsuarioPropio,
  eliminarUsuarioPorAdmin,
};
