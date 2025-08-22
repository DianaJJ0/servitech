/**
 * MODELO DE ASESORÍA - SERVITECH
 * Contiene toda la información necesaria para una asesoría en un solo documento */
const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Define la estructura para la información de un participante (cliente o experto).
 * Es un sub-esquema, lo que significa que es un objeto anidado dentro de Asesoria.
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
      // Generador de código único
      default: () =>
        // Genera un código único basado en la fecha y un número aleatorio
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
    // Categoría de la asesoría, referenciando una categoría existente.
    categoria: {
      type: String,
      required: true,
    },
    estado: {
      type: String,
      enum: [
        "pendiente-pago",
        "confirmada",
        "completada",
        "cancelada",
      ],
      default: "pendiente-pago",
    },
    fechaHoraInicio: {
      type: Date,
      required: true,
    },
    // Duración de la asesoría en minutos
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
    // La reseña asociada a esta asesoría 
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
