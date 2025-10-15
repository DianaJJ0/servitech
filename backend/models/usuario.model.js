/**
 * @file Modelo de Usuario
 * @module models/usuario
 * @description Modelo Mongoose para usuarios del sistema (clientes, expertos y administradores). Gestiona autenticación, roles, perfil de experto, recuperación de contraseña y relaciones con asesorías y pagos.
 *
 * Este modelo es fundamental para la autenticación y autorización en la plataforma. Permite almacenar información personal, roles, credenciales seguras y datos bancarios para expertos. Incluye validaciones estrictas, subesquemas y middlewares para mantener la integridad y seguridad de los datos.
 *
 * Ejemplo de uso:
 * ```js
 * const usuario = new Usuario({ email: 'test@correo.com', nombre: 'Juan', ... });
 * await usuario.save();
 * const valido = await usuario.matchPassword('123456');
 * ```
 */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Schema } = mongoose;

/**
 * Sub-esquema para la información específica de un experto.
 * Incluye datos profesionales, bancarios y de disponibilidad.
 * @typedef {Object} InfoExperto
 * @property {string} descripcion - Descripción del perfil profesional
 * @property {Array<ObjectId>} categorias - Referencias a categorías de especialización
 * @property {number} precioPorHora - Tarifa por hora en COP
 * @property {Object} horario - Horario de disponibilidad flexible (estructura libre)
 * @property {string} banco - Entidad bancaria (solo Bancolombia o Nequi)
 * @property {string} tipoCuenta - Tipo de cuenta bancaria (Ahorros, Corriente, Nequi)
 * @property {string} numeroCuenta - Número de cuenta bancaria (solo dígitos, 10-34 caracteres)
 * @property {string} titular - Titular de la cuenta bancaria
 * @property {string} tipoDocumento - Tipo de documento de identidad (CC, CE, NIT)
 * @property {string} numeroDocumento - Número de documento (solo dígitos, 6-11 caracteres)
 * @property {string} telefonoContacto - Teléfono de contacto
 * @property {Array<string>} diasDisponibles - Días disponibles para asesorías
 * @property {boolean} activo - Si el perfil de experto está activo
 */

// Sub-esquema InfoExperto: almacena datos profesionales y bancarios de expertos.
const expertoSubSchema = new Schema({
  descripcion: { type: String, required: true, maxlength: 1000 },
  categorias: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categoria", // Referencia a categorías de especialización
    },
  ],
  precioPorHora: { type: Number, required: true, min: 0 },
  horario: {
    type: Schema.Types.Mixed, // Horario flexible (estructura libre)
    default: null,
  },
  // Campos bancarios y de contacto
  banco: {
    type: String,
    required: [true, "El banco es obligatorio."],
    trim: true,
    enum: {
      values: ["Bancolombia", "Nequi"],
      message: "Banco inválido. Opciones válidas: Bancolombia, Nequi.",
    },
  },
  tipoCuenta: {
    type: String,
    required: [true, "El tipo de cuenta es obligatorio."],
    trim: true,
    enum: {
      values: ["Ahorros", "Corriente", "Nequi"],
      message: "Tipo de cuenta inválido. Opciones: Ahorros, Corriente, Nequi.",
    },
  },
  numeroCuenta: {
    type: String,
    required: [true, "El número de cuenta es obligatorio."],
    trim: true,
    match: [/^\d+$/, "Número de cuenta inválido. Debe contener solo dígitos."],
    minlength: [10, "Número de cuenta demasiado corto (mínimo 10 dígitos)."],
    maxlength: [34, "Número de cuenta demasiado largo (máximo 34 dígitos)."],
  },
  titular: { type: String, required: true, trim: true },
  tipoDocumento: {
    type: String,
    required: [true, "El tipo de documento es obligatorio."],
    trim: true,
    enum: {
      values: ["CC", "CE", "NIT"],
      message: "Tipo de documento inválido. Opciones: CC, CE, NIT.",
    },
  },
  numeroDocumento: {
    type: String,
    required: [true, "El número de documento es obligatorio."],
    trim: true,
    match: [
      /^[0-9]+$/,
      "Número de documento inválido. Debe contener solo dígitos.",
    ],
    minlength: [6, "Número de documento demasiado corto (mínimo 6 dígitos)."],
    maxlength: [11, "Número de documento demasiado largo (máximo 11 dígitos)."],
  },
  telefonoContacto: { type: String, trim: true },
  diasDisponibles: [{ type: String, trim: true }],
  activo: { type: Boolean, default: true },
});

/**
 * @typedef {Object} Usuario
 * @property {string} email - Email único del usuario
 * @property {string} nombre - Nombre del usuario
 * @property {string} apellido - Apellido del usuario
 * @property {string} passwordHash - Contraseña hasheada (no accesible directamente)
 * @property {string} avatarUrl - URL del avatar del usuario
 * @property {Array<string>} roles - Roles del usuario: cliente, experto, admin
 * @property {string} estado - Estado de la cuenta: activo, inactivo, suspendido, pendiente-verificacion
 * @property {InfoExperto} infoExperto - Información adicional si es experto
 * @property {string} passwordResetToken - Token para recuperación de contraseña
 * @property {Date} passwordResetExpires - Expiración del token de recuperación
 */

/**
 * Esquema principal del usuario.
 * Incluye autenticación, roles, perfil de experto y recuperación de contraseña.
 * @typedef {Object} Usuario
 * @property {string} email - Email único del usuario
 * @property {string} nombre - Nombre del usuario
 * @property {string} apellido - Apellido del usuario
 * @property {string} passwordHash - Contraseña hasheada (no accesible directamente)
 * @property {string} avatarUrl - URL del avatar del usuario
 * @property {Array<string>} roles - Roles del usuario: cliente, experto, admin
 * @property {string} estado - Estado de la cuenta: activo, inactivo, suspendido, pendiente-verificacion
 * @property {InfoExperto} infoExperto - Información adicional si es experto
 * @property {string} passwordResetToken - Token para recuperación de contraseña
 * @property {Date} passwordResetExpires - Expiración del token de recuperación
 */
const usuarioSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "El correo electrónico es obligatorio."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Por favor, introduce un correo electrónico válido.",
      ],
    },
    nombre: {
      type: String,
      required: [true, "El nombre es obligatorio."],
      trim: true,
    },
    apellido: {
      type: String,
      required: [true, "El apellido es obligatorio."],
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, "La contraseña es obligatoria."],
    },
    avatarUrl: {
      type: String,
      default: "https://ui-avatars.com/api/?name=User&background=random",
    },
    roles: {
      type: [String],
      enum: ["cliente", "experto", "admin"],
      default: ["cliente"],
    },
    estado: {
      type: String,
      enum: ["activo", "inactivo", "suspendido", "pendiente-verificacion"],
      default: "activo",
    },
    infoExperto: {
      type: expertoSubSchema, // Sub-esquema para expertos
      default: null,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: {
      createdAt: "fechaRegistro",
      updatedAt: "fechaActualizacion",
    },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: "usuarios",
  }
);

// Campo virtual 'password' para asignar y hashear la contraseña de forma segura.
usuarioSchema.virtual("password").set(function (password) {
  const salt = bcrypt.genSaltSync(10);
  this.passwordHash = bcrypt.hashSync(password, salt);
});

/**
 * Compara una contraseña en texto plano con el hash almacenado
 * @async
 * @function matchPassword
 * @param {string} enteredPassword - Contraseña en texto plano a verificar
 * @returns {Promise<boolean>} True si la contraseña coincide
 * @example
 * const isValid = await usuario.matchPassword('miPassword123');
 */
usuarioSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

/**
 * Middleware pre-save: limpia infoExperto si el usuario no tiene rol de experto.
 * @function
 * @param {Function} next - Callback para continuar
 */
usuarioSchema.pre("save", function (next) {
  if (this.roles && !this.roles.includes("experto")) {
    this.infoExperto = undefined;
  }
  next();
});

/**
 * @openapi
 * components:
 *   schemas:
 *     Usuario:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Identificador único
 *         nombre:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         roles:
 *           type: array
 *           items:
 *             type: string
 *         avatar:
 *           type: string
 *           format: uri
 *         estado:
 *           type: string
 *           description: Estado de la cuenta
 *         infoExperto:
 *           $ref: '#/components/schemas/InfoExperto'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - email
 *         - nombre
 *
 *   InfoExperto:
 *     type: object
 *     properties:
 *       descripcion:
 *         type: string
 *       categorias:
 *         type: array
 *         items:
 *           type: string
 *       precioPorHora:
 *         type: number
 *       horario:
 *         type: object
 *       banco:
 *         type: string
 *       tipoCuenta:
 *         type: string
 *       numeroCuenta:
 *         type: string
 *       titular:
 *         type: string
 *       tipoDocumento:
 *         type: string
 *       numeroDocumento:
 *         type: string
 *       telefonoContacto:
 *         type: string
 *       diasDisponibles:
 *         type: array
 *         items:
 *           type: string
 *       activo:
 *         type: boolean
 *     required:
 *       - descripcion
 *       - categorias
 *       - precioPorHora
 *       - banco
 *       - tipoCuenta
 *       - numeroCuenta
 *       - titular
 *       - tipoDocumento
 *       - numeroDocumento
 */

// Exporta el modelo de usuario para su uso en controladores y servicios.
module.exports = mongoose.model("Usuario", usuarioSchema);
