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
const fs = require("fs");
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
 *     Usuario:
 *       type: object
 *       required:
 *         - nombre
 *         - apellido
 *         - email
 *         - password
 *       properties:
 *         _id:
 *           type: string
 *           description: ID único del usuario
 *         nombre:
 *           type: string
 *           minLength: 1
 *           maxLength: 80
 *           description: Nombre del usuario
 *           example: "Juan"
 *         apellido:
 *           type: string
 *           minLength: 1
 *           maxLength: 80
 *           description: Apellido del usuario
 *           example: "Pérez"
 *         email:
 *           type: string
 *           format: email
 *           description: Email único del usuario
 *           example: "juan.perez@ejemplo.com"
 *         password:
 *           type: string
 *           minLength: 6
 *           description: Contraseña del usuario (se hashea automáticamente)
 *           example: "miPassword123"
 *         roles:
 *           type: array
 *           items:
 *             type: string
 *             enum: [cliente, experto, admin]
 *           description: Roles asignados al usuario
 *           example: ["cliente", "experto"]
 *         estado:
 *           type: string
 *           enum: [activo, inactivo, pendiente-verificacion]
 *           default: activo
 *           description: Estado actual del usuario
 *         avatarUrl:
 *           type: string
 *           format: uri
 *           description: URL del avatar del usuario
 *           example: "http://localhost:5020/uploads/avatar_123456789.jpg"
 *         infoExperto:
 *           type: object
 *           description: Información adicional para usuarios expertos
 *           properties:
 *             descripcion:
 *               type: string
 *               description: Descripción profesional del experto
 *             precioPorHora:
 *               type: number
 *               minimum: 1000
 *               description: Precio por hora en COP
 *             categorias:
 *               type: array
 *               items:
 *                 type: string
 *               description: IDs de categorías de especialización
 *             banco:
 *               type: string
 *               description: Nombre del banco para pagos
 *             tipoCuenta:
 *               type: string
 *               enum: [ahorros, corriente]
 *               description: Tipo de cuenta bancaria
 *             numeroCuenta:
 *               type: string
 *               description: Número de cuenta bancaria
 *             titular:
 *               type: string
 *               description: Titular de la cuenta bancaria
 *             tipoDocumento:
 *               type: string
 *               enum: [cedula, pasaporte, extranjeria]
 *               description: Tipo de documento de identidad
 *             numeroDocumento:
 *               type: string
 *               description: Número de documento de identidad
 *             telefonoContacto:
 *               type: string
 *               description: Teléfono de contacto para asesorías
 *             diasDisponibles:
 *               type: array
 *               items:
 *                 type: string
 *                 enum: [lunes, martes, miercoles, jueves, viernes, sabado, domingo]
 *               description: Días disponibles para asesorías
 *         fechaCreacion:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación del usuario
 *         fechaActualizacion:
 *           type: string
 *           format: date-time
 *           description: Fecha de última actualización
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         mensaje:
 *           type: string
 *           description: Mensaje descriptivo del error
 *         error:
 *           type: string
 *           description: Detalles técnicos del error
 *       required:
 *         - mensaje
 */

/**
 * Genera un token JWT para el usuario
 * @function generarToken
 * @description Crea un token JWT válido por 2 días para autenticación
 * @param {string} id - ID único del usuario
 * @returns {string} Token JWT generado
 * @private
 */
const generarToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "2d" });
};

/**
 * Registra un nuevo usuario en el sistema
 * @function registrarUsuario
 * @description Registra un nuevo usuario con validaciones completas y opción de solicitar perfil de experto
 * @param {Object} req - Request object
 * @param {Object} req.body - Datos del nuevo usuario
 * @param {string} req.body.nombre - Nombre del usuario
 * @param {string} req.body.apellido - Apellido del usuario
 * @param {string} req.body.email - Email único del usuario
 * @param {string} req.body.password - Contraseña del usuario
 * @param {Array<string>} [req.body.roles] - Roles solicitados (cliente, experto)
 * @param {Object} [req.body.infoExperto] - Información de experto si aplica
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Usuario registrado con token de autenticación
 * @throws {400} Datos faltantes o inválidos
 * @throws {409} Usuario ya existe
 * @throws {500} Error interno del servidor
 * @example
 * // Registro básico como cliente
 * POST /api/usuarios/registro
 * {
 *   "nombre": "Juan",
 *   "apellido": "Pérez",
 *   "email": "juan@ejemplo.com",
 *   "password": "miPassword123"
 * }
 *
 * @openapi
 * /api/usuarios/registro:
 *   post:
 *     summary: Registra un nuevo usuario
 *     description: |
 *       Registra un nuevo usuario en el sistema. Por defecto se asigna el rol 'cliente'.
 *       Si se incluye información de experto, se crea una solicitud que requiere aprobación admin.
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - apellido
 *               - email
 *               - password
 *             properties:
 *               nombre:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 80
 *                 pattern: '^[A-Za-zÁÉÍÓÚáéíóúÑñ\s\'-]+$'
 *                 description: Nombre del usuario (solo letras)
 *                 example: "Juan Carlos"
 *               apellido:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 80
 *                 pattern: '^[A-Za-zÁÉÍÓÚáéíóúÑñ\s\'-]+$'
 *                 description: Apellido del usuario (solo letras)
 *                 example: "Pérez García"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email único del usuario
 *                 example: "juan.perez@ejemplo.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Contraseña del usuario
 *                 example: "miPassword123"
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [cliente, experto]
 *                 description: Roles solicitados (cliente siempre incluido)
 *                 example: ["cliente", "experto"]
 *               infoExperto:
 *                 type: object
 *                 description: Información requerida para solicitar ser experto
 *                 required:
 *                   - descripcion
 *                   - precioPorHora
 *                   - banco
 *                   - tipoCuenta
 *                   - numeroCuenta
 *                   - titular
 *                   - tipoDocumento
 *                   - numeroDocumento
 *                   - categorias
 *                   - diasDisponibles
 *                   - telefonoContacto
 *                 properties:
 *                   descripcion:
 *                     type: string
 *                     minLength: 10
 *                     description: Descripción profesional del experto
 *                     example: "Desarrollador Full Stack con 5 años de experiencia"
 *                   precioPorHora:
 *                     type: number
 *                     minimum: 1000
 *                     description: Precio por hora en COP
 *                     example: 50000
 *                   banco:
 *                     type: string
 *                     description: Nombre del banco
 *                     example: "Bancolombia"
 *                   tipoCuenta:
 *                     type: string
 *                     enum: [ahorros, corriente]
 *                     example: "ahorros"
 *                   numeroCuenta:
 *                     type: string
 *                     description: Número de cuenta bancaria
 *                     example: "1234567890"
 *                   titular:
 *                     type: string
 *                     description: Titular de la cuenta
 *                     example: "Juan Carlos Pérez García"
 *                   tipoDocumento:
 *                     type: string
 *                     enum: [cedula, pasaporte, extranjeria]
 *                     example: "cedula"
 *                   numeroDocumento:
 *                     type: string
 *                     description: Número de documento
 *                     example: "12345678"
 *                   categorias:
 *                     type: array
 *                     items:
 *                       type: string
 *                     minItems: 1
 *                     description: IDs de categorías de especialización
 *                     example: ["507f1f77bcf86cd799439011"]
 *                   diasDisponibles:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [lunes, martes, miercoles, jueves, viernes, sabado, domingo]
 *                     minItems: 1
 *                     description: Días disponibles para asesorías
 *                     example: ["lunes", "martes", "miercoles"]
 *                   telefonoContacto:
 *                     type: string
 *                     pattern: '^[0-9]{10}$'
 *                     description: Teléfono de contacto (10 dígitos)
 *                     example: "3001234567"
 *           examples:
 *             registro_cliente:
 *               summary: Registro básico como cliente
 *               value:
 *                 nombre: "Ana"
 *                 apellido: "García"
 *                 email: "ana.garcia@ejemplo.com"
 *                 password: "miPassword123"
 *             registro_experto:
 *               summary: Registro como cliente y solicitud de experto
 *               value:
 *                 nombre: "Carlos"
 *                 apellido: "López"
 *                 email: "carlos.lopez@ejemplo.com"
 *                 password: "miPassword123"
 *                 roles: ["cliente", "experto"]
 *                 infoExperto:
 *                   descripcion: "Desarrollador Full Stack especializado en React y Node.js"
 *                   precioPorHora: 75000
 *                   banco: "Bancolombia"
 *                   tipoCuenta: "ahorros"
 *                   numeroCuenta: "1234567890"
 *                   titular: "Carlos López"
 *                   tipoDocumento: "cedula"
 *                   numeroDocumento: "87654321"
 *                   categorias: ["507f1f77bcf86cd799439011"]
 *                   diasDisponibles: ["lunes", "martes", "miercoles", "jueves", "viernes"]
 *                   telefonoContacto: "3009876543"
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *       400:
 *         description: Datos faltantes o inválidos
 *       409:
 *         description: Email ya registrado
 *       500:
 *         description: Error interno del servidor
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
 * Inicia sesión de usuario
 * @function iniciarSesion
 * @description Autentica usuario con email y contraseña, guarda sesión y devuelve token JWT
 * @param {Object} req - Request object
 * @param {Object} req.body - Credenciales de login
 * @param {string} req.body.email - Email del usuario
 * @param {string} req.body.password - Contraseña del usuario
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Token JWT y datos del usuario
 * @throws {400} Credenciales faltantes
 * @throws {401} Credenciales incorrectas
 * @throws {500} Error interno del servidor
 *
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
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login exitoso
 *       400:
 *         description: Credenciales faltantes
 *       401:
 *         description: Credenciales incorrectas
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
    if (!usuario || usuario.estado === "inactivo") {
      generarLogs.registrarEvento({
        usuarioEmail: email || null,
        accion: "LOGIN",
        detalle: !usuario
          ? "Credenciales incorrectas - usuario no encontrado"
          : "Intento de login con cuenta inactiva",
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
 * @function obtenerPerfilUsuario
 * @description Retorna la información completa del perfil del usuario autenticado
 * @param {Object} req - Request object
 * @param {Object} req.usuario - Usuario autenticado desde middleware
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Perfil completo del usuario
 * @throws {404} Usuario no encontrado
 * @throws {500} Error interno del servidor
 *
 * @openapi
 * /api/usuarios/perfil:
 *   get:
 *     summary: Obtiene el perfil del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil de usuario obtenido
 *       404:
 *         description: Usuario no encontrado
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
 * @function obtenerUsuarios
 * @description Obtiene lista paginada de usuarios con filtros opcionales (solo administradores)
 * @param {Object} req - Request object
 * @param {Object} req.query - Query parameters para filtros y paginación
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Lista paginada de usuarios
 * @throws {403} Sin permisos de administrador
 * @throws {500} Error interno del servidor
 *
 * @openapi
 * /api/usuarios:
 *   get:
 *     summary: Lista usuarios con filtros y paginación (admin)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *       - in: query
 *         name: roles
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuarios listados
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
 * @function solicitarRecuperacionPassword
 * @description Genera token de recuperación y envía email con enlace para restablecer contraseña
 * @param {Object} req - Request object
 * @param {Object} req.body - Datos de la solicitud
 * @param {string} req.body.email - Email del usuario que solicita recuperación
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Confirmación de envío (siempre exitosa por seguridad)
 * @throws {400} Email faltante
 * @throws {500} Error interno del servidor
 *
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

    const baseUrl = process.env.BACKEND_URL;
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
 * @function resetearPassword
 * @description Valida token de recuperación y actualiza la contraseña del usuario
 * @param {Object} req - Request object
 * @param {Object} req.body - Datos del restablecimiento
 * @param {string} req.body.token - Token de recuperación generado previamente
 * @param {string} req.body.newPassword - Nueva contraseña del usuario
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Confirmación de actualización exitosa
 * @throws {400} Token inválido, expirado o datos faltantes
 * @throws {500} Error interno del servidor
 *
 * @openapi
 * /api/usuarios/reset-password:
 *   post:
 *     summary: Restablece contraseña usando token
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 *       400:
 *         description: Token inválido o expirado
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
 * Actualiza perfil de usuario autenticado
 * @function actualizarPerfilUsuario
 * @description Actualiza datos básicos del usuario y opcionalmente información de experto
 * @param {Object} req - Request object
 * @param {Object} req.usuario - Usuario autenticado desde middleware
 * @param {Object} req.body - Datos a actualizar
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Usuario actualizado
 * @throws {400} Datos faltantes o inválidos
 * @throws {401} Usuario no autenticado
 * @throws {404} Usuario no encontrado
 * @throws {500} Error interno del servidor
 *
 * @openapi
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
 *       200:
 *         description: Perfil actualizado
 *       400:
 *         description: Datos faltantes o inválidos
 *       404:
 *         description: Usuario no encontrado
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
    // Validar nombre y apellido solo si vienen en el payload
    const nombrePresente = typeof datos.nombre !== "undefined";
    const apellidoPresente = typeof datos.apellido !== "undefined";
    if (nombrePresente || apellidoPresente) {
      // Si se envía alguno de los dos, se requieren ambos
      if (!datos.nombre || !datos.apellido) {
        return res
          .status(400)
          .json({ mensaje: "Nombre y apellido son obligatorios." });
      }
      const regNombre = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s'-]{1,80}$/;
      if (!regNombre.test(datos.nombre) || !regNombre.test(datos.apellido)) {
        return res.status(400).json({
          mensaje:
            "Nombre y apellido solo pueden tener letras y hasta 80 caracteres.",
        });
      }
      usuario.nombre = datos.nombre.trim();
      usuario.apellido = datos.apellido.trim();
    }

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
 * Sube un avatar para el usuario autenticado
 * @function subirAvatar
 * @description Permite al usuario subir una imagen de avatar que se almacena en el servidor
 * @param {Object} req - Request object
 * @param {Object} req.usuario - Usuario autenticado desde middleware
 * @param {Object} req.file - Archivo subido por multer
 * @param {Object} res - Response object
 * @returns {Promise<Object>} URL del avatar subido y usuario actualizado
 * @throws {400} Archivo no recibido
 * @throws {404} Usuario no encontrado
 * @throws {500} Error interno del servidor
 *
 * @openapi
 * /api/usuarios/avatar:
 *   post:
 *     summary: Sube avatar del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Archivo de imagen para el avatar
 *     responses:
 *       200:
 *         description: Avatar subido correctamente
 *       400:
 *         description: Archivo no recibido
 *       404:
 *         description: Usuario no encontrado
 */
const subirAvatar = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario._id);
    if (!usuario)
      return res.status(404).json({ mensaje: "Usuario no encontrado." });

    if (!req.file) {
      return res.status(400).json({ mensaje: "Archivo no recibido." });
    }

    // Validar tipo y tamaño mínimo/permitido en el servidor (extra a validación cliente)
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    const file = req.file;
    if (!allowed.includes(file.mimetype)) {
      // eliminar archivo
      try {
        fs.unlinkSync(file.path);
      } catch (e) {}
      return res.status(400).json({ mensaje: "Tipo de archivo no permitido." });
    }
    const maxBytes = Number(process.env.MAX_FILE_SIZE || 2 * 1024 * 1024);
    if (file.size > maxBytes) {
      try {
        fs.unlinkSync(file.path);
      } catch (e) {}
      return res.status(400).json({ mensaje: "Archivo demasiado grande." });
    }

    // Construir URL y guardar
    const filename = req.file.filename;
    const uploadsPath = process.env.UPLOAD_PATH || "uploads";
    const configured = (process.env.BACKEND_URL || "").trim();
    const base = configured || "http://localhost:5020";
    const avatarUrl = `${base.replace(/\/$/, "")}/${uploadsPath.replace(
      /\//,
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
 * Desactiva cuenta del usuario autenticado
 * @function eliminarUsuarioPropio
 * @description Desactiva la cuenta del usuario autenticado y procesa reembolsos automáticos
 * @param {Object} req - Request object
 * @param {Object} req.usuario - Usuario autenticado desde middleware
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Confirmación de desactivación
 * @throws {404} Usuario no encontrado
 * @throws {500} Error interno del servidor
 *
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
 * Desactiva usuario por email (admin)
 * @function eliminarUsuarioPorAdmin
 * @description Desactiva usuario por email (solo administradores) y procesa reembolsos
 * @param {Object} req - Request object
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.email - Email del usuario a desactivar
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Confirmación de desactivación
 * @throws {404} Usuario no encontrado
 * @throws {500} Error interno del servidor
 *
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
 * @function actualizarUsuarioPorEmailAdmin
 * @description Actualiza cualquier campo de un usuario específico (solo administradores)
 * @param {Object} req - Request object
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.email - Email del usuario a actualizar
 * @param {Object} req.body - Datos a actualizar
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Usuario actualizado
 * @throws {404} Usuario no encontrado
 * @throws {500} Error interno del servidor
 *
 * @openapi
 * /api/usuarios/{email}:
 *   put:
 *     summary: Actualiza usuario por email (admin + API Key)
 *     description: |
 *       Actualiza cualquier campo de un usuario específico por su email.
 *       Requiere permisos de administrador y API Key válida.
 *       Permite actualizar información básica e información de experto.
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email del usuario a actualizar
 *         example: "usuario@ejemplo.com"
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nuevo nombre del usuario
 *               apellido:
 *                 type: string
 *                 description: Nuevo apellido del usuario
 *               estado:
 *                 type: string
 *                 enum: [activo, inactivo, pendiente-verificacion]
 *                 description: Nuevo estado del usuario
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [cliente, experto, admin]
 *                 description: Nuevos roles del usuario
 *               avatarUrl:
 *                 type: string
 *                 format: uri
 *                 description: Nueva URL del avatar
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Nuevo email del usuario
 *               infoExperto:
 *                 type: object
 *                 description: Información de experto a actualizar
 *                 properties:
 *                   descripcion:
 *                     type: string
 *                   precioPorHora:
 *                     type: number
 *                   categorias:
 *                     type: array
 *                     items:
 *                       type: string
 *                   banco:
 *                     type: string
 *                   tipoCuenta:
 *                     type: string
 *                   numeroCuenta:
 *                     type: string
 *                   titular:
 *                     type: string
 *                   tipoDocumento:
 *                     type: string
 *                   numeroDocumento:
 *                     type: string
 *                   telefonoContacto:
 *                     type: string
 *                   diasDisponibles:
 *                     type: array
 *                     items:
 *                       type: string
 *           examples:
 *             activar_experto:
 *               summary: Activar usuario experto
 *               value:
 *                 estado: "activo"
 *                 roles: ["cliente", "experto"]
 *             cambiar_email:
 *               summary: Cambiar email de usuario
 *               value:
 *                 email: "nuevo.email@ejemplo.com"
 *             actualizar_completo:
 *               summary: Actualización completa
 *               value:
 *                 nombre: "Juan Carlos"
 *                 apellido: "Pérez Actualizado"
 *                 estado: "activo"
 *                 roles: ["cliente", "experto"]
 *                 infoExperto:
 *                   descripcion: "Experto actualizado"
 *                   precioPorHora: 80000
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Usuario actualizado correctamente."
 *                 usuario:
 *                   $ref: '#/components/schemas/Usuario'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               mensaje: "Usuario no encontrado."
 *       403:
 *         description: Sin permisos de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               mensaje: "Acceso denegado. Se requieren permisos de administrador."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               mensaje: "Error interno al actualizar usuario."
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

        generarLogs.registrarEvento({
          usuarioEmail: refreshed.email,
          nombre: refreshed.nombre,
          apellido: refreshed.apellido,
          accion: "ACTUALIZAR_USUARIO_ADMIN",
          detalle: "Usuario actualizado por admin con infoExperto",
          resultado: "Exito",
          tipo: "usuarios",
          persistirEnDB: true,
        });

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

    generarLogs.registrarEvento({
      usuarioEmail: req.params.email || null,
      accion: "ACTUALIZAR_USUARIO_ADMIN",
      detalle:
        "Error general al actualizar usuario por admin: " + error.message,
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "usuarios",
      persistirEnDB: true,
    });

    res.status(500).json({
      mensaje: "Error interno al actualizar usuario.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Error interno",
    });
  }
};

/**
 * Obtiene usuario por email (solo admin)
 * @function obtenerUsuarioPorEmailAdmin
 * @description Obtiene la información completa de un usuario específico por email (solo administradores)
 * @param {Object} req - Request object
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.email - Email del usuario a obtener
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Información completa del usuario
 * @throws {404} Usuario no encontrado
 * @throws {500} Error interno del servidor
 * @example
 * // Obtener usuario por email
 * GET /api/usuarios/juan@ejemplo.com
 * Headers: { Authorization: "Bearer TOKEN_JWT", "X-API-Key": "API_KEY" }
 *
 * @openapi
 * /api/usuarios/{email}:
 *   get:
 *     summary: Obtiene usuario por email (admin + API Key)
 *     description: |
 *       Obtiene la información completa de un usuario específico por su email.
 *       Requiere permisos de administrador y API Key válida.
 *       Devuelve toda la información del usuario excepto datos sensibles.
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email del usuario a obtener
 *         example: "usuario@ejemplo.com"
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Usuario encontrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Usuario'
 *                 - type: object
 *                   properties:
 *                     passwordHash:
 *                       type: undefined
 *                       description: Campo excluido por seguridad
 *                     passwordResetToken:
 *                       type: undefined
 *                       description: Campo excluido por seguridad
 *                     passwordResetExpires:
 *                       type: undefined
 *                       description: Campo excluido por seguridad
 *             example:
 *               _id: "507f1f77bcf86cd799439011"
 *               nombre: "Juan"
 *               apellido: "Pérez"
 *               email: "juan@ejemplo.com"
 *               roles: ["cliente", "experto"]
 *               estado: "activo"
 *               avatarUrl: "http://localhost:5020/uploads/avatar_123.jpg"
 *               infoExperto:
 *                 descripcion: "Desarrollador Full Stack"
 *                 precioPorHora: 75000
 *                 categorias: ["507f1f77bcf86cd799439012"]
 *               fechaCreacion: "2024-01-15T10:30:00.000Z"
 *               fechaActualizacion: "2024-01-20T15:45:00.000Z"
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               mensaje: "Usuario no encontrado."
 *       403:
 *         description: Sin permisos de administrador o API Key inválida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               sin_permisos:
 *                 value:
 *                   mensaje: "Acceso denegado. Se requieren permisos de administrador."
 *               api_key_invalida:
 *                 value:
 *                   mensaje: "API Key requerida o inválida."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               mensaje: "Error interno al obtener usuario."
 */
const obtenerUsuarioPorEmailAdmin = async (req, res) => {
  try {
    const email = req.params.email;

    // Validar formato de email
    if (!email || !email.trim()) {
      return res.status(400).json({
        mensaje: "Email es requerido",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        mensaje: "Formato de email inválido",
      });
    }

    const usuario = await Usuario.findOne({ email }).select(
      "-passwordHash -passwordResetToken -passwordResetExpires"
    );

    if (!usuario) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado.",
      });
    }

    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario?.email || null,
      nombre: req.usuario?.nombre || null,
      apellido: req.usuario?.apellido || null,
      accion: "OBTENER_USUARIO_ADMIN",
      detalle: `Usuario consultado por admin: ${email}`,
      resultado: "Exito",
      tipo: "usuarios",
      persistirEnDB: false, // No persistir para evitar spam de logs
    });

    res.json(usuario);
  } catch (error) {
    console.error("Error obteniendo usuario por email:", error);

    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario?.email || null,
      accion: "ERROR_OBTENER_USUARIO_ADMIN",
      detalle: `Error obteniendo usuario ${req.params.email}: ${error.message}`,
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "usuarios",
      persistirEnDB: true,
    });

    res.status(500).json({
      mensaje: "Error interno al obtener usuario.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Error interno",
    });
  }
};

/**
 * Buscar usuario por email (público)
 * @function buscarUsuarioPorEmail
 * @description Busca un usuario activo por su email (usado para validaciones públicas)
 * @param {Object} req - Request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.email - Email del usuario a buscar
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Información básica del usuario
 * @throws {400} Email no proporcionado o inválido
 * @throws {404} Usuario no encontrado
 * @throws {500} Error interno del servidor
 * @example
 * // Buscar usuario por email
 * GET /api/usuarios/buscar?email=usuario@ejemplo.com
 *
 * @openapi
 * /api/usuarios/buscar:
 *   get:
 *     summary: Buscar usuario por email
 *     description: |
 *       Busca un usuario activo por su email. Esta es una ruta pública
 *       utilizada principalmente para validaciones en el frontend.
 *       Solo devuelve información básica del usuario.
 *     tags: [Usuarios]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email del usuario a buscar
 *         example: "usuario@ejemplo.com"
 *     responses:
 *       200:
 *         description: Usuario encontrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: ID único del usuario
 *                 nombre:
 *                   type: string
 *                   description: Nombre del usuario
 *                 apellido:
 *                   type: string
 *                   description: Apellido del usuario
 *                 email:
 *                   type: string
 *                   description: Email del usuario
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Roles del usuario
 *                 avatarUrl:
 *                   type: string
 *                   description: URL del avatar (opcional)
 *                 estado:
 *                   type: string
 *                   description: Estado del usuario
 *               example:
 *                 _id: "507f1f77bcf86cd799439011"
 *                 nombre: "Juan"
 *                 apellido: "Pérez"
 *                 email: "juan@ejemplo.com"
 *                 roles: ["cliente", "experto"]
 *                 estado: "activo"
 *       400:
 *         description: Email no proporcionado o formato inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *               examples:
 *                 email_faltante:
 *                   value:
 *                     mensaje: "Email requerido"
 *                 email_invalido:
 *                   value:
 *                     mensaje: "Formato de email inválido"
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Usuario no encontrado"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                 error:
 *                   type: string
 *               example:
 *                 mensaje: "Error al buscar usuario"
 *                 error: "Database connection error"
 */
const buscarUsuarioPorEmail = async (req, res) => {
  try {
    console.log("GET /api/usuarios/buscar - Email:", req.query.email);

    const { email } = req.query;

    // Validar que se proporcione el email
    if (!email || !email.trim()) {
      console.log("Error: Email no proporcionado");
      return res.status(400).json({
        mensaje: "Email requerido",
      });
    }

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      console.log("Error: Formato de email inválido");
      return res.status(400).json({
        mensaje: "Formato de email inválido",
      });
    }

    // Buscar usuario activo por email
    const usuario = await Usuario.findOne({
      email: email.trim().toLowerCase(),
      estado: "activo",
    }).select("-passwordHash -passwordResetToken -passwordResetExpires"); // Excluir campos sensibles

    if (!usuario) {
      console.log("Usuario no encontrado para email:", email);
      return res.status(404).json({
        mensaje: "Usuario no encontrado",
      });
    }

    console.log(
      "Usuario encontrado:",
      usuario.nombre,
      usuario.apellido,
      "Roles:",
      usuario.roles
    );

    await generarLogs.registrarEvento({
      usuarioEmail: null, // Es una consulta pública
      accion: "BUSCAR_USUARIO_EMAIL",
      detalle: `Usuario encontrado: ${email}`,
      resultado: "Exito",
      tipo: "usuarios",
      persistirEnDB: false, // No persistir para evitar spam de logs
    });

    res.json(usuario);
  } catch (error) {
    console.error("Error en /api/usuarios/buscar:", error);

    await generarLogs.registrarEvento({
      usuarioEmail: null,
      accion: "ERROR_BUSCAR_USUARIO_EMAIL",
      detalle: `Error buscando usuario: ${req.query.email}, error: ${error.message}`,
      resultado: "Error",
      tipo: "usuarios",
      persistirEnDB: true,
    });

    res.status(500).json({
      mensaje: "Error al buscar usuario",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Error interno",
    });
  }
};

// Exportar todas las funciones del controlador
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
  buscarUsuarioPorEmail,
};
