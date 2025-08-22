/**
 * CONTROLADOR DE USUARIOS
 * Lógica de negocio para registro, inicio de sesión, recuperación y gestión de perfiles.
 * Valida que el admin no pueda asignar el rol "experto" sin infoExperto completa (solo en edición por admin).
 */
const Usuario = require("../models/usuario.model.js");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { enviarCorreo } = require("../services/email.service.js");
const mongoose = require("mongoose");

// --- Funciones Auxiliares ---
const generarToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "2d" });
};

// Registro de usuario nuevo (sin validación extra)
const registrarUsuario = async (req, res) => {
  const { nombre, apellido, email, password, roles } = req.body;
  try {
    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({
        mensaje: "Por favor, complete todos los campos obligatorios.",
      });
    }
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(409).json({
        mensaje: "El correo electrónico ya está registrado.",
      });
    }
    const nuevoUsuario = new Usuario({
      nombre,
      apellido,
      email,
      password,
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
      const token = generarToken(usuario._id);
      if (req.session) {
        req.session.user = {
          _id: usuario._id,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email: usuario.email,
          roles: usuario.roles,
        };
      }
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
    const usuario = await Usuario.findById(req.usuario._id).select(
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

// Devuelve la lista de usuarios con paginación, filtro por email, estado y roles (por defecto: solo activos)
const obtenerUsuarios = async (req, res) => {
  try {
    const { page = 1, limit = 10, email, estado, roles } = req.query;
    const filtro = {};

    if (email) {
      filtro.email = { $regex: email, $options: "i" };
    }

    if (typeof estado !== "undefined" && estado !== "") {
      filtro.estado = estado;
    } else {
      filtro.estado = "activo";
    }

    if (roles) {
      const rolesArray = Array.isArray(roles)
        ? roles
        : roles.split(",").map((r) => r.trim());
      filtro.roles = { $in: rolesArray };
    }

    // Paginación y selección de campos
    // Se omiten el hash de la contraseña y otros campos sensibles
    const usuarios = await Usuario.find(filtro)
      .select("-passwordHash")
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Usuario.countDocuments(filtro);

    res.json({ usuarios, total });
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ mensaje: "Error interno del servidor." });
  }
};

/**
 * Solicita recuperación de contraseña (envía email con token)
 */
const solicitarRecuperacionPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const usuario = await Usuario.findOne({ email });
    if (!usuario)
      return res
        .status(200)
        .json({ mensaje: "Si el email existe, se enviaron instrucciones." });
    // Generar token de recuperación con crypto
    const token = crypto.randomBytes(32).toString("hex");
    usuario.passwordResetToken = token;
    usuario.passwordResetExpires = Date.now() + 60 * 60 * 1000;
    await usuario.save();
    // Construir enlace de recuperación y enviar email de notificación
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
    // Enviar correo electrónico
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
    usuario.password = newPassword;
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
    const usuario = await Usuario.findById(req.usuario._id);

    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    // --- VALIDACIÓN SEGURA DE CATEGORÍAS ---
    let categoriasArray = [];
    if (datos.categorias) {
      if (Array.isArray(datos.categorias)) {
        categoriasArray = datos.categorias
          .map((id) => typeof id === "string" && id.match(/^[0-9a-fA-F]{24}$/) ? new mongoose.Types.ObjectId(id) : null)
          .filter((id) => id !== null);
      } else if (typeof datos.categorias === "string") {
        categoriasArray = datos.categorias
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length === 24 && id.match(/^[0-9a-fA-F]{24}$/))
          .map((id) => new mongoose.Types.ObjectId(id));
      }
    }

    // --- VALIDACIÓN DE SKILLS ---
    let skillsArray = [];
    if (datos.skills) {
      if (Array.isArray(datos.skills)) {
        skillsArray = datos.skills.map((skill) => String(skill));
      } else if (typeof datos.skills === "string") {
        skillsArray = datos.skills.split(",").map((skill) => skill.trim());
      }
    }

    // --- VALIDACIÓN DE DÍAS DISPONIBLES ---
    let diasArray = [];
    if (datos.diasDisponibles) {
      if (Array.isArray(datos.diasDisponibles)) {
        diasArray = datos.diasDisponibles.map((dia) => String(dia));
      } else if (typeof datos.diasDisponibles === "string") {
        diasArray = datos.diasDisponibles.split(",").map((dia) => dia.trim());
      }
    }

    // --- Actualiza infoExperto solo si hay datos relevantes ---
    if (
      datos.descripcion ||
      datos.precioPorHora ||
      categoriasArray.length > 0 ||
      datos.especialidad ||
      skillsArray.length > 0 ||
      datos.banco
    ) {
      usuario.infoExperto = {
        descripcion: datos.descripcion,
        precioPorHora: datos.precioPorHora,
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
      if (!usuario.roles.includes("experto")) {
        usuario.roles.push("experto");
      }
    }

    if (datos.nombre) usuario.nombre = datos.nombre;
    if (datos.apellido) usuario.apellido = datos.apellido;
    if (datos.email) usuario.email = datos.email;
    if (datos.avatarUrl) usuario.avatarUrl = datos.avatarUrl;

    await usuario.save();
    res.json(usuario);
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    res.status(500).json({ mensaje: "Error interno del servidor." });
  }
};

// Desactiva el usuario autenticado (no lo elimina de la base de datos)
const eliminarUsuarioPropio = async (req, res) => {
  try {
    const usuarioId = req.usuario._id;
    // Busca el usuario
    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }
    // Cambia el estado a inactivo
    usuario.estado = "inactivo";
    await usuario.save();
    res.json({ mensaje: "Cuenta desactivada correctamente." });
  } catch (error) {
    console.error("Error al desactivar usuario propio:", error);
    res
      .status(500)
      .json({ mensaje: "Error interno del servidor al desactivar la cuenta." });
  }
};

// Elimina (desactiva) un usuario por admin + API Key
const eliminarUsuarioPorAdmin = async (req, res) => {
  try {
    const usuarioId = req.params.id;
    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }
    usuario.estado = "inactivo";
    await usuario.save();
    res.json({ mensaje: "Usuario desactivado correctamente por el admin." });
  } catch (error) {
    console.error("Error al desactivar usuario por admin:", error);
    res.status(500).json({
      mensaje: "Error interno del servidor al desactivar el usuario.",
    });
  }
};

// --- EDITAR USUARIO POR EMAIL (ADMIN) ---
// Solo valida que si se asigna el rol experto, infoExperto debe estar presente y completo
const actualizarUsuarioPorEmailAdmin = async (req, res) => {
  try {
    const email = req.params.email;
    const datos = req.body;
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    // Si se le asigna el rol experto, infoExperto debe estar completo
    if (datos.roles && datos.roles.includes("experto")) {
      if (
        !datos.infoExperto ||
        !datos.infoExperto.descripcion ||
        !datos.infoExperto.precioPorHora ||
        !datos.infoExperto.especialidad ||
        !datos.infoExperto.categorias ||
        !datos.infoExperto.skills ||
        !datos.infoExperto.banco ||
        !datos.infoExperto.tipoCuenta ||
        !datos.infoExperto.numeroCuenta ||
        !datos.infoExperto.titular ||
        !datos.infoExperto.tipoDocumento ||
        !datos.infoExperto.numeroDocumento
      ) {
        return res.status(400).json({
          mensaje:
            "Para asignar el rol 'experto' debes llenar toda la información de experto (infoExperto).",
        });
      }
      usuario.infoExperto = datos.infoExperto;
    } else {
      usuario.infoExperto = undefined;
    }

    if (datos.nombre) usuario.nombre = datos.nombre;
    if (datos.apellido) usuario.apellido = datos.apellido;
    if (datos.estado) usuario.estado = datos.estado;
    if (datos.roles) usuario.roles = datos.roles;
    if (datos.avatarUrl) usuario.avatarUrl = datos.avatarUrl;
    if (datos.email) usuario.email = datos.email;

    await usuario.save();
    res.json({ mensaje: "Usuario actualizado correctamente.", usuario });
  } catch (error) {
    console.error("Error al actualizar usuario por admin:", error);
    res.status(500).json({ mensaje: "Error interno al actualizar usuario." });
  }
};

// Obtener usuario individual por email (admin)
const obtenerUsuarioPorEmailAdmin = async (req, res) => {
  try {
    const email = req.params.email;
    const usuario = await Usuario.findOne({ email }).select("-passwordHash");
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ mensaje: "Error interno al obtener usuario." });
  }
};

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
  actualizarUsuarioPorEmailAdmin,
  obtenerUsuarioPorEmailAdmin,
};
