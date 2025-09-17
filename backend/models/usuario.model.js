/**
 * @file Modelo de Usuario
 * @module models/usuario
 * @description Define el esquema de Mongoose para usuarios con roles, autenticación y perfil de experto
 */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Schema } = mongoose;

/**
 * @typedef {Object} InfoExperto
 * @property {string} descripcion - Descripción del perfil profesional
 * @property {Array<ObjectId>} categorias - Referencias a categorías de especialización
 * @property {number} precioPorHora - Tarifa por hora en COP
 * @property {Object} horario - Horario de disponibilidad flexible
 * @property {string} banco - Entidad bancaria
 * @property {string} tipoCuenta - Tipo de cuenta bancaria
 * @property {string} numeroCuenta - Número de cuenta bancaria
 * @property {string} titular - Titular de la cuenta
 * @property {string} tipoDocumento - Tipo de documento de identidad
 * @property {string} numeroDocumento - Número de documento
 * @property {string} telefonoContacto - Teléfono de contacto
 * @property {Array<string>} diasDisponibles - Días disponibles para asesorías
 */

// Sub-esquema para la información específica de un experto.
const expertoSubSchema = new Schema({
  descripcion: { type: String, required: true, maxlength: 1000 },
  categorias: [{ type: Schema.Types.ObjectId, ref: "Categoria" }],
  precioPorHora: { type: Number, required: true, min: 0 },
  horario: {
    type: Schema.Types.Mixed, // Horario flexible
    default: null,
  },
  // Campos bancarios y de contacto
  banco: { type: String, required: true, trim: true },
  tipoCuenta: { type: String, required: true, trim: true },
  numeroCuenta: { type: String, required: true, trim: true },
  titular: { type: String, required: true, trim: true },
  tipoDocumento: { type: String, required: true, trim: true },
  numeroDocumento: { type: String, required: true, trim: true },
  telefonoContacto: { type: String, trim: true },
  diasDisponibles: [{ type: String, trim: true }],
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

// Esquema principal del usuario.
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
      type: expertoSubSchema, // Usar el sub-esquema definido arriba
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
    // Habilitar el uso de campos virtuales en las conversiones a JSON.
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: "usuarios",
  }
);

// --- CAMPO VIRTUAL PARA MANEJO DE CONTRASEÑA ---
// Se crea un campo 'password' que no se guarda en la base de datos.
usuarioSchema
  .virtual("password")
  // El 'setter' se activa cuando se asigna un valor a 'usuario.password'.
  .set(function (password) {
    // Se genera la 'salt' y se encripta la contraseña.
    const salt = bcrypt.genSaltSync(10);
    // El resultado se asigna directamente al campo que sí se guarda en la BD.
    this.passwordHash = bcrypt.hashSync(password, salt);
  });

/**
 * Compara una contraseña en texto plano con el hash almacenado
 * @async
 * @method matchPassword
 * @param {string} enteredPassword - Contraseña en texto plano a verificar
 * @returns {Promise<boolean>} True si la contraseña coincide
 * @example
 * const isValid = await usuario.matchPassword('miPassword123');
 */
usuarioSchema.methods.matchPassword = async function (enteredPassword) {
  // bcrypt.compare se encarga de forma segura de comparar el texto plano con el hash.
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

/**
 * Middleware pre-save que limpia infoExperto si no tiene rol de experto
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
 *         bio:
 *           type: string
 *         rating:
 *           type: number
 *           format: float
 *         isAdmin:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - email
 *         - nombre
 */

module.exports = mongoose.model("Usuario", usuarioSchema);
