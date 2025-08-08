/**
 * MODELO DE ASESORÍA (DESNORMALIZADO) - SERVITECH
 * Contiene toda la información necesaria para una asesoría en un solo documento,
 * incluyendo datos del cliente y experto, para minimizar consultas a la base de datos.
 */
const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Define la estructura para la información de un participante (cliente o experto).
 * Es un sub-esquema, lo que significa que es un objeto anidado dentro de Asesoria.
 * Almacena una copia de los datos en el momento de la creación de la asesoría.
 */
const infoParticipanteSchema = new Schema(
  {
    email: { type: String, required: true }, // Clave para vincular al usuario original
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    avatarUrl: String,
  },
  { _id: false } // Indicamos que este sub-objeto no necesita su propio _id de MongoDB.
);

const asesoriaSchema = new Schema(
  {
    // Identificador legible para el usuario y para soporte.
    codigoAsesoria: {
      type: String,
      unique: true,
      required: true,
      default: () =>
        `ASE-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase()}`,
    },
    titulo: {
      type: String,
      required: true,
      maxlength: 200,
    },
    // Datos incrustados del cliente, usando nuestra estructura más clara.
    cliente: {
      type: infoParticipanteSchema,
      required: true,
    },
    // Datos incrustados del experto, reusando la misma estructura.
    experto: {
      type: infoParticipanteSchema,
      required: true,
    },
    categoria: {
      type: String,
      required: true,
    },
    estado: {
      type: String,
      enum: [
        "pendiente-pago",
        "confirmada",
        "en-curso",
        "completada",
        "cancelada",
        "reembolsada",
      ],
      default: "pendiente-pago",
    },
    fechaHoraInicio: {
      type: Date,
      required: true,
    },
    duracionMinutos: {
      type: Number,
      required: true,
      enum: [30, 60, 90],
      default: 60,
    },
    // Información de pago incrustada.
    pago: {
      transaccionId: { type: String },
      metodo: String,
      monto: { type: Number },
      moneda: { type: String, default: "COP" },
      fechaPago: Date,
    },
    // Enlace a la sala de videollamada.
    videollamada: {
      salaUrl: String,
      iniciadaEn: Date,
      finalizadaEn: Date,
    },
    // La reseña asociada a esta asesoría (RF-CAL-01 y RF-CAL-02).
    reseña: {
      calificacion: { type: Number, min: 1, max: 5 },
      comentario: String,
      fecha: Date,
    },
  },
  {
    timestamps: {
      createdAt: "fechaCreacion",
      updatedAt: "fechaActualizacion",
    },
    collection: "asesorias",
  }
);

// Índices para optimizar las búsquedas más comunes
asesoriaSchema.index({ "cliente.email": 1, fechaHoraInicio: -1 });
asesoriaSchema.index({ "experto.email": 1, fechaHoraInicio: -1 });
asesoriaSchema.index({ estado: 1, fechaHoraInicio: 1 });

module.exports = mongoose.model("Asesoria", asesoriaSchema);
