/**
 * @file Controlador de usuarios
 * @module controllers/usuario
 * @description Lógica de negocio para registro, inicio de sesión, recuperación, gestión de perfiles y desactivación segura de usuarios en Servitech.
 */

const Usuario = require("../models/usuario.model.js");
const Categoria = require("../models/categoria.model.js");
const Asesoria = require("../models/asesoria.model.js");
const Pago = require("../models/pago.model.js");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
  enviarCorreo,
  generarCuerpoRecuperacion,
} = require("../services/email.service.js");
const mongoose = require("mongoose");
const { generateLog } = require("../services/logService.js");
const generarLogs = require("../services/generarLogs");

/**
 * @openapi
 * tags:
 *   - name: Usuarios
 *     description: Operaciones relacionadas con usuarios (registro, login, perfil)
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *         message:
 *           type: string
 *       required:
 *         - error
 *         - message
 */

/**
 * Genera un token JWT para el usuario
 * @param {string} id - ID del usuario
 * @returns {string} Token JWT generado
 */
const generarToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "2d" });
};

/**
 * @swagger
 * /api/usuarios/registro:
 *   post:
 *     summary: Registra un nuevo usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, apellido, email, password]
 *             properties:
 *               nombre: { type: string }
 *               apellido: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               roles: { type: array, items: { type: string } }
 *               infoExperto: { type: object }
 *     responses:
 *       201: { description: Usuario registrado exitosamente }
 *       400: { description: Error en la solicitud }
 *       409: { description: Usuario ya existe }
 */
/**
 * Registra un usuario y permite solicitar ser experto
 */
const registrarUsuario = async (req, res) => {
  const { nombre, apellido, email, password, roles, infoExperto } = req.body;
  try {
    if (!nombre || !apellido || !email || !password) {
      return res
        .status(400)
        .json({
          mensaje: "Por favor, complete todos los campos obligatorios.",
        });
    }
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res
        .status(409)
        .json({ mensaje: "El correo electrónico ya está registrado." });
    }
    // Siempre es cliente y puede ser experto
    let nuevosRoles = ["cliente"];
    if (Array.isArray(roles) && roles.includes("experto"))
      nuevosRoles.push("experto");
    // Si infoExperto viene en la solicitud, es una solicitud de experto (queda pendiente)
    let infoExpToSave = undefined;
    let estadoUsuario = "activo";
    if (infoExperto && typeof infoExperto === "object") {
      // Validar campos requeridos de experto
      const requiredFields = [
        "descripcion",
        "precioPorHora",
        "banco",
        "tipoCuenta",
        "numeroCuenta",
        "titular",
        "tipoDocumento",
        "numeroDocumento",
        "categorias",
        "diasDisponibles",
        "telefonoContacto",
      ];
      const missing = requiredFields.filter(
        (f) => !infoExperto[f] || String(infoExperto[f]).trim() === ""
      );
      if (missing.length > 0) {
        return res.status(400).json({
          mensaje:
            "Faltan campos obligatorios para crear el perfil de experto en el registro.",
          camposFaltantes: missing,
        });
      }
      // Procesar categorías y díasDisponibles
      let categoriasArray = [];
      if (infoExperto.categorias) {
        if (Array.isArray(infoExperto.categorias))
          categoriasArray = infoExperto.categorias.map(String);
        else if (typeof infoExperto.categorias === "string")
          categoriasArray = infoExperto.categorias
            .split(",")
            .map((id) => id.trim());
      }
      let diasArray = [];
      if (infoExperto.diasDisponibles) {
        if (Array.isArray(infoExperto.diasDisponibles))
          diasArray = infoExperto.diasDisponibles.map(String);
        else if (typeof infoExperto.diasDisponibles === "string")
          diasArray = infoExperto.diasDisponibles
            .split(",")
            .map((d) => d.trim());
      }
      infoExpToSave = {
        descripcion: String(infoExperto.descripcion),
        precioPorHora: Number(infoExperto.precioPorHora),
        banco: String(infoExperto.banco),
        tipoCuenta: String(infoExperto.tipoCuenta),
        numeroCuenta: String(infoExperto.numeroCuenta),
        titular: String(infoExperto.titular),
        tipoDocumento: String(infoExperto.tipoDocumento),
        numeroDocumento: String(infoExperto.numeroDocumento),
        categorias: categoriasArray,
        diasDisponibles: diasArray,
        telefonoContacto: infoExperto.telefonoContacto
          ? String(infoExperto.telefonoContacto)
          : undefined,
      };
      // Use the enum defined in the Usuario model
      estadoUsuario = "pendiente-verificacion"; // Experto queda pendiente hasta aprobación admin
      // Si el usuario solicitó ser experto, asegúrate de incluir el rol 'experto'
      if (!nuevosRoles.includes("experto")) {
        nuevosRoles.push("experto");
      }
    }
    const nuevoUsuario = new Usuario({
      nombre,
      apellido,
      email,
      password,
      roles: nuevosRoles,
      infoExperto: infoExpToSave,
      estado: estadoUsuario,
    });
    await nuevoUsuario.save();
    generarLogs.registrarEvento({
      usuarioEmail: nuevoUsuario.email,
      nombre: nuevoUsuario.nombre,
      apellido: nuevoUsuario.apellido,
      accion: "REGISTRO",
      detalle: "Usuario registrado",
      resultado: "Exito",
      tipo: "usuarios",
      persistirEnDB: true,
    });
    let mensaje = "Usuario registrado exitosamente.";
    if (infoExpToSave) {
      mensaje =
        "Solicitud de perfil de experto enviada. Revisaremos tu perfil y activaremos tu cuenta de experto.";
    }
    res.status(201).json({
      mensaje,
      token: generarToken(nuevoUsuario._id),
      estado: estadoUsuario,
      roles: nuevosRoles,
    });
  } catch (error) {
    console.error("Error en el proceso de registro:", error);
    generarLogs.registrarEvento({
      usuarioEmail: req.body.email || null,
      nombre: req.body.nombre || null,
      apellido: req.body.apellido || null,
      accion: "REGISTRO",
      detalle: "Error al registrar usuario",
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "usuarios",
      persistirEnDB: true,
    });
    if (error.name === "ValidationError") {
      return res.status(400).json({ mensaje: error.message });
    }
    res
      .status(500)
      .json({ mensaje: "Error interno del servidor al registrar el usuario." });
  }
};

/**
 * Inicia sesión de usuario y guarda nombre/apellido reales en sesión.
 * @openapi
 * /api/usuarios/login:
 *   post:
 *     summary: Inicia sesión de usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login exitoso }
 *       401: { description: Credenciales incorrectas }
 */
const iniciarSesion = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ mensaje: "Correo y contraseña son requeridos." });
    }
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      generarLogs.registrarEvento({
        usuarioEmail: email || null,
        accion: "LOGIN",
        detalle: "Credenciales incorrectas - usuario no encontrado",
        resultado: "Error: credenciales incorrectas",
        tipo: "usuarios",
        persistirEnDB: true,
      });
      return res.status(401).json({ mensaje: "Credenciales incorrectas." });
    }
    if (await usuario.matchPassword(password)) {
      const token = generarToken(usuario._id);
      if (req.session) {
        // Guarda SIEMPRE nombre y apellido reales para mostrar en el header
        req.session.user = {
          _id: usuario._id,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email: usuario.email,
          roles: usuario.roles,
          token: token,
        };
      }
      generarLogs.registrarEvento({
        usuarioEmail: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        accion: "LOGIN",
        detalle: "Inicio de sesión exitoso",
        resultado: "Exito",
        tipo: "usuarios",
        persistirEnDB: true,
      });
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
      generarLogs.registrarEvento({
        usuarioEmail: email || null,
        accion: "LOGIN",
        detalle: "Credenciales incorrectas - contraseña inválida",
        resultado: "Error: credenciales incorrectas",
        tipo: "usuarios",
        persistirEnDB: true,
      });
      return res.status(401).json({ mensaje: "Credenciales incorrectas." });
    }
  } catch (error) {
    console.error("Error en el proceso de inicio de sesión:", error);
    generarLogs.registrarEvento({
      usuarioEmail: req.body.email || null,
      nombre: null,
      apellido: null,
      accion: "LOGIN",
      detalle: "Error interno en inicio de sesión",
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "usuarios",
      persistirEnDB: true,
    });
    res
      .status(500)
      .json({ mensaje: "Error interno del servidor al iniciar sesión." });
  }
};

/**
 * Obtiene el perfil del usuario autenticado
 */
const obtenerPerfilUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario._id).select(
      "-passwordHash"
    );
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }
    const userObj = usuario.toObject({ getters: true, virtuals: false });

    if (userObj.infoExperto) {
      try {
        const cats = userObj.infoExperto.categorias || [];
        if (Array.isArray(cats) && cats.length > 0) {
          const foundCats = await Categoria.find({ _id: { $in: cats } }).select(
            "nombre"
          );
          const mapCat = {};
          foundCats.forEach((c) => (mapCat[String(c._id)] = c.nombre));
          userObj.infoExperto.categorias = cats.map(
            (c) => mapCat[String(c)] || c
          );
        }
      } catch (e) {}
    }
    res.json(userObj);
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    res.status(500).json({ mensaje: "Error interno del servidor." });
  }
};

/**
 * Lista usuarios con filtros y paginación (solo admin)
 */
const obtenerUsuarios = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      email,
      estado,
      roles,
      soloClientesPuros,
    } = req.query;
    const filtro = {};

    if (email) {
      filtro.email = { $regex: email, $options: "i" };
    }
    if (typeof estado !== "undefined" && estado !== "") {
      filtro.estado = estado;
    }
    if (soloClientesPuros === "true" || roles === "cliente") {
      filtro.roles = ["cliente"];
    } else if (roles) {
      const rolesArray = Array.isArray(roles)
        ? roles
        : roles.split(",").map((r) => r.trim());
      filtro.roles = { $in: rolesArray };
    }

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
 * Solicita recuperación de contraseña por email
 * @openapi
 * /api/usuarios/recuperar-password:
 *   post:
 *     summary: Solicita recuperación de contraseña
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Si el email existe, se enviaron instrucciones
 *       400:
 *         description: Email requerido
 */
const solicitarRecuperacionPassword = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email || !email.trim()) {
      return res.status(400).json({
        mensaje: "El correo electrónico es requerido.",
      });
    }

    const usuario = await Usuario.findOne({ email: email.trim() });
    // Siempre responder igual para no filtrar emails existentes
    if (!usuario) {
      return res.status(200).json({
        mensaje: "Si el email existe, se enviaron instrucciones.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    usuario.passwordResetToken = token;
    usuario.passwordResetExpires = Date.now() + 60 * 60 * 1000;
    await usuario.save();

    const baseUrl =
      process.env.FRONTEND_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      process.env.APP_URL ||
      `http://localhost:${process.env.PORT || 5020}`;
    const enlace = `${baseUrl}/recuperarPassword.html?token=${token}`;

    // Cuerpo del email según imagen y estándares.
    const { mensaje, html } = generarCuerpoRecuperacion(
      usuario.nombre,
      usuario.apellido,
      enlace
    );
    await enviarCorreo(
      usuario.email,
      "Recupera tu contraseña - ServiTech",
      mensaje,
      {
        nombreDestinatario: usuario.nombre,
        apellidoDestinatario: usuario.apellido,
        html,
      }
    );

    generarLogs.registrarEvento({
      usuarioEmail: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      accion: "RECUPERACION_PASSWORD",
      detalle: "Solicitud de recuperación enviada",
      resultado: "Exito",
      tipo: "usuarios",
      persistirEnDB: true,
    });

    res.status(200).json({
      mensaje: "Si el email existe, se enviaron instrucciones.",
    });
  } catch (error) {
    console.error("Error detallado en recuperación de contraseña:", {
      error: error.message,
      stack: error.stack,
      email: req.body.email,
    });

    generarLogs.registrarEvento({
      usuarioEmail: req.body.email || null,
      accion: "RECUPERACION_PASSWORD",
      detalle: "Error en recuperación de contraseña: " + error.message,
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "usuarios",
      persistirEnDB: true,
    });

    res.status(500).json({
      mensaje: "Error interno del servidor. Por favor, inténtalo más tarde.",
    });
  }
};

/**
 * Restablece contraseña usando token de recuperación
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

    generarLogs.registrarEvento({
      usuarioEmail: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      accion: "RESET_PASSWORD",
      detalle: "Contraseña restablecida con token",
      resultado: "Exito",
      tipo: "usuarios",
      persistirEnDB: true,
    });

    res
      .status(200)
      .json({ mensaje: "Contraseña actualizada. Puedes iniciar sesión." });
  } catch (error) {
    console.error("Error al actualizar contraseña:", error);
    generarLogs.registrarEvento({
      usuarioEmail: null,
      accion: "RESET_PASSWORD",
      detalle: "Error al restablecer contraseña",
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "usuarios",
      persistirEnDB: true,
    });
    res.status(500).json({ mensaje: "Error al actualizar contraseña." });
  }
};

/**
 * Actualiza perfil de usuario autenticado (cliente o experto).
 * @swagger
 * /api/usuarios/perfil:
 *   put:
 *     summary: Actualiza el perfil del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200: { description: Perfil actualizado }
 *       400: { description: Datos faltantes o inválidos }
 *       404: { description: Usuario no encontrado }
 */
const actualizarPerfilUsuario = async (req, res) => {
  try {
    if (!req.usuario || !req.usuario._id) {
      return res.status(401).json({ mensaje: "No autenticado" });
    }
    const usuario = await Usuario.findById(req.usuario._id);
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }
    const datos = req.body;
    // Validar nombre y apellido siempre
    if (!datos.nombre || !datos.apellido) {
      return res
        .status(400)
        .json({ mensaje: "Nombre y apellido son obligatorios." });
    }
    const regNombre = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s'-]{1,80}$/;
    if (!regNombre.test(datos.nombre) || !regNombre.test(datos.apellido)) {
      return res
        .status(400)
        .json({
          mensaje:
            "Nombre y apellido solo pueden tener letras y hasta 80 caracteres.",
        });
    }
    usuario.nombre = datos.nombre.trim();
    usuario.apellido = datos.apellido.trim();

    // Solo puede editar nombre/apellido si es cliente puro
    if (!usuario.roles.includes("experto")) {
      await usuario.save();
      generarLogs.registrarEvento({
        usuarioEmail: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        accion: "EDITAR_PERFIL_CLIENTE",
        detalle: "Perfil básico actualizado",
        resultado: "Exito",
        tipo: "usuarios",
        persistirEnDB: true,
      });
      return res
        .status(200)
        .json({ mensaje: "Perfil actualizado correctamente.", usuario });
    }

    // Si es experto Y el payload trae campos de experto, validar y actualizar infoExperto
    const camposExperto = [
      "descripcion",
      "precioPorHora",
      "categorias",
      "banco",
      "tipoCuenta",
      "numeroCuenta",
      "titular",
      "tipoDocumento",
      "numeroDocumento",
    ];
    const tieneCamposExperto = camposExperto.some(
      (campo) => typeof datos[campo] !== "undefined"
    );
    if (usuario.roles.includes("experto") && tieneCamposExperto) {
      let categoriasArray = [];
      if (datos.categorias) {
        if (Array.isArray(datos.categorias))
          categoriasArray = datos.categorias.map(String);
        else if (typeof datos.categorias === "string")
          categoriasArray = datos.categorias.split(",").map((id) => id.trim());
      }
      let diasArray = [];
      if (datos.diasDisponibles) {
        if (Array.isArray(datos.diasDisponibles))
          diasArray = datos.diasDisponibles.map(String);
        else if (typeof datos.diasDisponibles === "string")
          diasArray = datos.diasDisponibles.split(",").map((dia) => dia.trim());
      }
      if (
        !datos.descripcion ||
        !datos.precioPorHora ||
        categoriasArray.length === 0 ||
        !datos.banco ||
        !datos.tipoCuenta ||
        !datos.numeroCuenta ||
        !datos.titular ||
        !datos.tipoDocumento ||
        !datos.numeroDocumento
      ) {
        return res.status(400).json({
          mensaje:
            "Faltan campos obligatorios para actualizar el perfil de experto. Revisa todos los campos y selecciona al menos una categoría.",
        });
      }
      usuario.infoExperto = {
        descripcion: datos.descripcion,
        precioPorHora: datos.precioPorHora,
        diasDisponibles: diasArray,
        categorias: categoriasArray,
        banco: datos.banco,
        tipoCuenta: datos.tipoCuenta,
        numeroCuenta: datos.numeroCuenta,
        titular: datos.titular,
        tipoDocumento: datos.tipoDocumento,
        numeroDocumento: datos.numeroDocumento,
        telefonoContacto: datos.telefonoContacto,
      };
    }
    await usuario.save();
    generarLogs.registrarEvento({
      usuarioEmail: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      accion: "EDITAR_PERFIL",
      detalle: "Perfil actualizado",
      resultado: "Exito",
      tipo: "usuarios",
      persistirEnDB: true,
    });
    return res
      .status(200)
      .json({ mensaje: "Perfil actualizado correctamente.", usuario });
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    generarLogs.registrarEvento({
      usuarioEmail:
        (req.usuario && req.usuario.email) || req.body.email || null,
      nombre: req.body.nombre || null,
      apellido: req.body.apellido || null,
      accion: "EDITAR_PERFIL",
      detalle: "Error al actualizar perfil",
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "usuarios",
      persistirEnDB: true,
    });
    res.status(500).json({
      mensaje: "Error interno del servidor al actualizar el perfil.",
      error: error.message,
    });
  }
};
/**
 * Sube un avatar para el usuario autenticado (campo 'avatar')
 */
const subirAvatar = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario._id);
    if (!usuario)
      return res.status(404).json({ mensaje: "Usuario no encontrado." });

    if (!req.file) {
      return res.status(400).json({ mensaje: "Archivo no recibido." });
    }

    const filename = req.file.filename;
    const uploadsPath = process.env.UPLOAD_PATH || "uploads";
    const configured = (process.env.BACKEND_URL || "").trim();
    const base = configured || "http://localhost:5020";
    const avatarUrl = `${base.replace(/\/$/, "")}/${uploadsPath.replace(
      /^\//,
      ""
    )}/${filename}`;
    usuario.avatarUrl = avatarUrl;
    await usuario.save();

    generarLogs.registrarEvento({
      usuarioEmail: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      accion: "SUBIR_AVATAR",
      detalle: "Avatar subido",
      resultado: "Exito",
      tipo: "usuarios",
      persistirEnDB: true,
    });

    return res.json({
      mensaje: "Avatar subido correctamente.",
      avatarUrl,
      usuario,
    });
  } catch (error) {
    console.error("Error al subir avatar:", error);
    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      nombre: null,
      apellido: null,
      accion: "SUBIR_AVATAR",
      detalle: "Error al subir avatar",
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "usuarios",
      persistirEnDB: true,
    });
    return res.status(500).json({ mensaje: "Error al subir avatar." });
  }
};

/**
 * Desactiva cuenta del usuario autenticado y actualiza asesorías/pagos asociados
 * @openapi
 * /api/usuarios/perfil:
 *   delete:
 *     summary: Desactiva usuario autenticado y reembolsa pagos/asesorías
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cuenta desactivada y pagos/asesorías actualizados
 *       404:
 *         description: Usuario no encontrado
 */
const eliminarUsuarioPropio = async (req, res) => {
  try {
    const usuarioId = req.usuario._id;
    const usuario = await Usuario.findById(usuarioId);

    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    // Desactivar usuario
    usuario.estado = "inactivo";
    await usuario.save();

    // Buscar asesorías "confirmadas" donde el usuario es cliente o experto
    const asesorias = await Asesoria.find({
      $or: [
        { "cliente.email": usuario.email },
        { "experto.email": usuario.email },
      ],
      estado: "confirmada",
    });

    // Actualizar estado de asesorías y pagos asociados
    for (const asesoria of asesorias) {
      asesoria.estado = "reembolsada";
      await asesoria.save();
      if (asesoria.pagoId) {
        const pago = await Pago.findById(asesoria.pagoId);
        if (pago && ["retenido", "liberado"].includes(pago.estado)) {
          pago.estado = "reembolsado";
          pago.fechaLiberacion = new Date();
          await pago.save();
        }
      }
    }

    generarLogs.registrarEvento({
      usuarioEmail: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      accion: "DESACTIVAR_CUENTA",
      detalle: "Cuenta desactivada y asesorías/pagos reembolsados.",
      resultado: "Exito",
      tipo: "usuarios",
      persistirEnDB: true,
    });

    res.json({
      mensaje:
        "Cuenta desactivada correctamente. Todas las asesorías y pagos confirmados han sido reembolsados.",
    });
  } catch (error) {
    console.error("Error al desactivar usuario propio:", error);
    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      accion: "DESACTIVAR_CUENTA",
      detalle: "Error al desactivar cuenta",
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "usuarios",
      persistirEnDB: true,
    });
    res
      .status(500)
      .json({ mensaje: "Error interno del servidor al desactivar la cuenta." });
  }
};

/**
 * Desactiva usuario por email (admin) y reembolsa pagos/asesorías
 * @openapi
 * /api/usuarios/{email}:
 *   delete:
 *     summary: Desactiva usuario por email (admin)
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: Email del usuario
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuario desactivado y pagos/asesorías actualizados
 *       404:
 *         description: Usuario no encontrado
 */
const eliminarUsuarioPorAdmin = async (req, res) => {
  try {
    const email = req.params.email;
    const usuario = await Usuario.findOne({ email });

    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    // Desactivar usuario
    usuario.estado = "inactivo";
    await usuario.save();

    // Buscar asesorías "confirmadas" donde el usuario es cliente o experto
    const asesorias = await Asesoria.find({
      $or: [{ "cliente.email": email }, { "experto.email": email }],
      estado: "confirmada",
    });

    // Actualizar estado de asesorías y pagos asociados
    for (const asesoria of asesorias) {
      asesoria.estado = "reembolsada";
      await asesoria.save();
      if (asesoria.pagoId) {
        const pago = await Pago.findById(asesoria.pagoId);
        if (pago && ["retenido", "liberado"].includes(pago.estado)) {
          pago.estado = "reembolsado";
          pago.fechaLiberacion = new Date();
          await pago.save();
        }
      }
    }

    generarLogs.registrarEvento({
      usuarioEmail: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      accion: "DESACTIVAR_POR_ADMIN",
      detalle: "Usuario desactivado por admin y asesorías/pagos reembolsados.",
      resultado: "Exito",
      tipo: "usuarios",
      persistirEnDB: true,
    });

    res.json({
      mensaje:
        "Usuario desactivado correctamente por admin. Todas las asesorías y pagos confirmados han sido reembolsados.",
    });
  } catch (error) {
    console.error("Error al desactivar usuario por admin:", error);
    generarLogs.registrarEvento({
      usuarioEmail: req.params.email || null,
      accion: "DESACTIVAR_POR_ADMIN",
      detalle: "Error al desactivar usuario por admin",
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "usuarios",
      persistirEnDB: true,
    });
    res.status(500).json({
      mensaje: "Error interno del servidor al desactivar usuario.",
      error: error.message,
    });
  }
};

/**
 * Actualiza usuario por email (solo admin)
 */
const actualizarUsuarioPorEmailAdmin = async (req, res) => {
  try {
    const email = req.params.email;
    const datos = req.body;
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    if (datos.roles && datos.roles.includes("experto")) {
      if (!datos.infoExperto) {
        if (!usuario.infoExperto) usuario.infoExperto = undefined;
      }
    } else {
      usuario.infoExperto = undefined;
    }

    if (datos.nombre) usuario.nombre = datos.nombre;
    if (datos.apellido) usuario.apellido = datos.apellido;
    if (datos.estado) usuario.estado = datos.estado;
    if (datos.roles) usuario.roles = datos.roles;
    if (datos.avatarUrl) usuario.avatarUrl = datos.avatarUrl;
    if (datos.email) usuario.email = datos.email;

    if (datos.infoExperto && typeof datos.infoExperto === "object") {
      let categoriasArray = [];
      if (datos.infoExperto.categorias) {
        if (Array.isArray(datos.infoExperto.categorias)) {
          categoriasArray = datos.infoExperto.categorias.map((c) => String(c));
        } else if (typeof datos.infoExperto.categorias === "string") {
          categoriasArray = datos.infoExperto.categorias
            .split(",")
            .map((c) => c.trim());
        }
      }
      let skillsArray = [];
      if (datos.infoExperto.skills) {
        if (Array.isArray(datos.infoExperto.skills)) {
          skillsArray = datos.infoExperto.skills.map((s) => String(s));
        } else if (typeof datos.infoExperto.skills === "string") {
          skillsArray = datos.infoExperto.skills
            .split(",")
            .map((s) => s.trim());
        }
      }

      const existingInfo =
        usuario.infoExperto && typeof usuario.infoExperto === "object"
          ? usuario.infoExperto.toObject
            ? usuario.infoExperto.toObject()
            : usuario.infoExperto
          : {};
      if (!datos.infoExperto) datos.infoExperto = {};
      if (datos.especialidad && !datos.infoExperto.especialidad) {
        datos.infoExperto.especialidad = datos.especialidad;
      }

      const mergedInfo = Object.assign({}, existingInfo, datos.infoExperto);
      if (categoriasArray.length > 0) mergedInfo.categorias = categoriasArray;
      if (skillsArray.length > 0) mergedInfo.skills = skillsArray;

      try {
        if (mergedInfo && Array.isArray(mergedInfo.categorias)) {
          mergedInfo.categorias = mergedInfo.categorias.map((c) => {
            try {
              const s = String(c || "");
              return s.match(/^[0-9a-fA-F]{24}$/)
                ? mongoose.Types.ObjectId(s)
                : s;
            } catch (e) {
              return c;
            }
          });
        }
      } catch (e) {}

      try {
        if (
          mergedInfo &&
          typeof mergedInfo.especialidad !== "undefined" &&
          mergedInfo.especialidad !== null
        ) {
          const s = String(mergedInfo.especialidad).trim();
          if (s.match(/^[0-9a-fA-F]{24}$/)) {
            mergedInfo.especialidad = mongoose.Types.ObjectId(s);
          } else {
            mergedInfo.especialidad = s;
          }
        }
      } catch (e) {}

      const setObj = { infoExperto: mergedInfo };
      if (datos.nombre) setObj["nombre"] = datos.nombre;
      if (datos.apellido) setObj["apellido"] = datos.apellido;
      if (datos.estado) setObj["estado"] = datos.estado;
      if (datos.avatarUrl) setObj["avatarUrl"] = datos.avatarUrl;
      if (datos.email) setObj["email"] = datos.email;
      if (datos.roles) setObj["roles"] = datos.roles;
      else if (
        !Array.isArray(usuario.roles) ||
        !usuario.roles.includes("experto")
      ) {
        setObj["roles"] = Array.from(
          new Set([...(usuario.roles || []), "experto"])
        );
      }

      try {
        const r = await Usuario.updateOne({ email }, { $set: setObj });
        const refreshed = await Usuario.findOne({ email }).select(
          "-passwordHash"
        );
        return res.json({
          mensaje: "Usuario actualizado correctamente.",
          usuario: refreshed,
        });
      } catch (uerr) {
        console.error("Error applying partial update to usuario:", uerr);
        return res
          .status(500)
          .json({ mensaje: "Error interno al aplicar actualización parcial." });
      }
    }

    try {
      await usuario.save();

      generarLogs.registrarEvento({
        usuarioEmail: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        accion: "ACTUALIZAR_USUARIO_ADMIN",
        detalle: "Usuario actualizado por admin",
        resultado: "Exito",
        tipo: "usuarios",
        persistirEnDB: true,
      });

      return res.json({
        mensaje: "Usuario actualizado correctamente.",
        usuario,
      });
    } catch (error) {
      console.error("Error saving usuario:", error);
      generarLogs.registrarEvento({
        usuarioEmail: usuario.email || email,
        accion: "ACTUALIZAR_USUARIO_ADMIN",
        detalle: "Error al actualizar usuario por admin",
        resultado: "Error: " + (error.message || "desconocido"),
        tipo: "usuarios",
        persistirEnDB: true,
      });
      return res
        .status(500)
        .json({ mensaje: "Error interno al actualizar usuario." });
    }
  } catch (error) {
    console.error("Error al actualizar usuario por admin:", error);
    res.status(500).json({ mensaje: "Error interno al actualizar usuario." });
  }
};

/**
 * Obtiene usuario por email (solo admin)
 */
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
  subirAvatar,
};
