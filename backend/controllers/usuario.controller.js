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
const { enviarCorreo } = require("../services/email.service.js");
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
 * Crea un nuevo usuario.
 * @param {import('express').Request} req - objeto request de Express
 * @param {import('express').Response} res - objeto response de Express
 * @returns {Promise<void>} Respuesta HTTP
 * @openapi
 * /api/usuarios:
 *   post:
 *     tags: [Usuarios]
 *     summary: Crear un usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Usuario'
 *     responses:
 *       201:
 *         description: Usuario creado
 */
const registrarUsuario = async (req, res) => {
  const { nombre, apellido, email, password, roles, infoExperto } = req.body;
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

    // Si el payload solicita rol 'experto' y viene infoExperto, validar y guardarlo
    if (
      Array.isArray(roles) &&
      roles.includes("experto") &&
      infoExperto &&
      typeof infoExperto === "object"
    ) {
      // Normalizar categorias
      let categoriasArray = [];
      if (infoExperto.categorias) {
        if (Array.isArray(infoExperto.categorias)) {
          categoriasArray = infoExperto.categorias
            .map((id) =>
              typeof id === "string" && id.match(/^[0-9a-fA-F]{24}$/)
                ? new mongoose.Types.ObjectId(id)
                : null
            )
            .filter((id) => id !== null);
        } else if (typeof infoExperto.categorias === "string") {
          categoriasArray = infoExperto.categorias
            .split(",")
            .map((id) => id.trim())
            .filter((id) => id.length === 24 && id.match(/^[0-9a-fA-F]{24}$/))
            .map((id) => new mongoose.Types.ObjectId(id));
        }
      }

      // Normalizar diasDisponibles (opcional)
      let diasArray = [];
      if (infoExperto.diasDisponibles) {
        if (Array.isArray(infoExperto.diasDisponibles)) {
          diasArray = infoExperto.diasDisponibles.map((d) => String(d));
        } else if (typeof infoExperto.diasDisponibles === "string") {
          diasArray = infoExperto.diasDisponibles
            .split(",")
            .map((d) => d.trim());
        }
      }

      // Campos obligatorios del sub-esquema experto
      const requiredFields = [
        "descripcion",
        "precioPorHora",
        "banco",
        "tipoCuenta",
        "numeroCuenta",
        "titular",
        "tipoDocumento",
        "numeroDocumento",
      ];

      const missing = requiredFields.filter((f) => {
        const v = infoExperto[f];
        return (
          typeof v === "undefined" || v === null || String(v).trim() === ""
        );
      });

      if (missing.length > 0) {
        return res.status(400).json({
          mensaje:
            "Faltan campos obligatorios para crear el perfil de experto en el registro: " +
            missing.join(", ") +
            ". Proporciona todos los campos requeridos o usa el flujo de actualización de perfil.",
        });
      }

      // Construir objeto infoExperto completo para guardar
      const info = {
        descripcion: String(infoExperto.descripcion),
        precioPorHora: Number(infoExperto.precioPorHora),
        banco: String(infoExperto.banco),
        tipoCuenta: String(infoExperto.tipoCuenta),
        numeroCuenta: String(infoExperto.numeroCuenta),
        titular: String(infoExperto.titular),
        tipoDocumento: String(infoExperto.tipoDocumento),
        numeroDocumento: String(infoExperto.numeroDocumento),
      };

      if (categoriasArray.length > 0) info.categorias = categoriasArray;
      if (diasArray.length > 0) info.diasDisponibles = diasArray;
      if (infoExperto.horario) info.horario = infoExperto.horario;
      if (infoExperto.telefonoContacto)
        info.telefonoContacto = String(infoExperto.telefonoContacto);

      nuevoUsuario.infoExperto = info;
    }

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

    res.status(201).json({
      mensaje: "Usuario registrado exitosamente.",
      token: generarToken(nuevoUsuario._id),
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
    res.status(500).json({
      mensaje: "Error interno del servidor al registrar el usuario.",
    });
  }
};

/**
 * Loguear un usuario.
 */
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
      generarLogs.registrarEvento({
        usuarioEmail: email || null,
        accion: "LOGIN",
        detalle: "Credenciales incorrectas - usuario no encontrado",
        resultado: "Error: credenciales incorrectas",
        tipo: "usuarios",
        persistirEnDB: true,
      });
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
      return res.status(401).json({
        mensaje: "Credenciales incorrectas.",
      });
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
    res.status(500).json({
      mensaje: "Error interno del servidor al iniciar sesión.",
    });
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
 * Actualiza perfil del usuario autenticado
 */
const actualizarPerfilUsuario = async (req, res) => {
  try {
    const datos = req.body;
    if (!req.usuario || !req.usuario._id) {
      return res.status(401).json({ mensaje: "No autenticado" });
    }
    const usuario = await Usuario.findById(req.usuario._id);

    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    let categoriasArray = [];
    if (datos.categorias) {
      if (Array.isArray(datos.categorias)) {
        categoriasArray = datos.categorias.map((id) => String(id));
      } else if (typeof datos.categorias === "string") {
        categoriasArray = datos.categorias.split(",").map((id) => id.trim());
      }
    }

    let diasArray = [];
    if (datos.diasDisponibles) {
      if (Array.isArray(datos.diasDisponibles)) {
        diasArray = datos.diasDisponibles.map((dia) => String(dia));
      } else if (typeof datos.diasDisponibles === "string") {
        diasArray = datos.diasDisponibles.split(",").map((dia) => dia.trim());
      }
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
          "Faltan campos obligatorios para crear el perfil de experto. Revisa todos los campos y selecciona al menos una categoría.",
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
    if (!usuario.roles.includes("experto")) {
      usuario.roles.push("experto");
    }

    if (datos.nombre) usuario.nombre = datos.nombre;
    if (datos.apellido) usuario.apellido = datos.apellido;
    if (datos.email) usuario.email = datos.email;
    if (datos.avatarUrl) usuario.avatarUrl = datos.avatarUrl;

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

    return res.status(200).json({
      mensaje: "Perfil de experto actualizado correctamente.",
      usuario,
    });
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
      mensaje: "Error interno del servidor al actualizar el perfil de experto.",
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
