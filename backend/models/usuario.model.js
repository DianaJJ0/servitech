/**
 * MODELO DE USUARIO - SERVITECH
 * Define el esquema de Mongoose para los usuarios, incluyendo la lógica
 * de encriptación y comparación de contraseñas mediante un campo VIRTUAL.
 */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Schema } = mongoose;

// Sub-esquema para la información específica de un experto.
const expertoSubSchema = new Schema({
  especialidad: { type: String, required: true, trim: true },
  descripcion: { type: String, required: true, maxlength: 1000 },
  categorias: [{ type: Schema.Types.ObjectId, ref: "Categoria" }],
  precioPorHora: { type: Number, required: true, min: 0 },
  skills: [{ type: String, trim: true }],
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
    // Promedio de calificaciones públicas para este usuario (si es experto)
    calificacion: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    // Cantidad de reseñas consideradas para el promedio
    calificacionesCount: {
      type: Number,
      default: 0,
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

// --- MÉTODO DE INSTANCIA PARA COMPARAR CONTRASEÑAS ---
// Se añade un método personalizado a cada documento de usuario.
usuarioSchema.methods.matchPassword = async function (enteredPassword) {
  // bcrypt.compare se encarga de forma segura de comparar el texto plano con el hash.
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Middleware para asegurar que si el rol 'experto' no está, infoExperto sea null.
usuarioSchema.pre("save", function (next) {
  if (this.roles && !this.roles.includes("experto")) {
    this.infoExperto = undefined;
  }
  next();
});

// Índice para optimizar búsquedas por calificación
usuarioSchema.index({ calificacion: -1 });

module.exports = mongoose.model("Usuario", usuarioSchema);
