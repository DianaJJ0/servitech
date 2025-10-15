/**
 * MODELO DE PAGO SIMULADO
 * Esquema de MongoDB para registros de pagos simulados
 * @module models/pago
 */

const mongoose = require("mongoose");

/**
 * Esquema de Pago Simulado
 * @description Define la estructura de los pagos simulados en la base de datos
 */
const pagoSchema = new mongoose.Schema(
  {
    /**
     * ID del cliente que realiza el pago
     * @type {String}
     * @required
     */
    clienteId: {
      type: String,
      required: [true, "El ID del cliente es requerido"],
      trim: true,
      index: true,
    },

    /**
     * ID del experto que recibe el pago
     * @type {String}
     * @required
     */
    expertoId: {
      type: String,
      required: [true, "El ID del experto es requerido"],
      trim: true,
      index: true,
    },

    /**
     * Monto del pago en pesos colombianos
     * @type {Number}
     * @required
     */
    monto: {
      type: Number,
      required: [true, "El monto es requerido"],
      min: [1000, "El monto mínimo es $1.000 COP"],
      max: [10000000, "El monto máximo es $10.000.000 COP"],
    },

    /**
     * Método de pago utilizado (solo simulado)
     * @type {String}
     * @enum ["simulado"]
     * @default "simulado"
     */
    metodo: {
      type: String,
      enum: {
        values: ["simulado", "tarjeta", "pse", "mercadopago"],
        message:
          "Método no válido (esperado: simulado, tarjeta, pse o mercadopago)",
      },
      default: "mercadopago",
      required: true,
    },

    /**
     * Estado actual del pago
     * @type {String}
     * @enum ["retenido", "liberado", "reembolsado", "reembolsado-parcial"]
     * @default "retenido"
     */
    estado: {
      type: String,
      enum: {
        values: ["retenido", "liberado", "reembolsado", "reembolsado-parcial"],
        message: "Estado de pago no válido para pagos simulados",
      },
      default: "retenido",
      required: true,
      index: true,
    },

    /**
     * Descripción del pago
     * @type {String}
     */
    descripcion: {
      type: String,
      trim: true,
      maxlength: [500, "La descripción no puede exceder 500 caracteres"],
    },

    /**
     * ID de transacción simulada
     * @type {String}
     */
    // Id de transacción (puede ser id interno o id de Mercado Pago)
    transaccionId: {
      type: String,
      index: true,
    },

    // Campos específicos para integración con Mercado Pago
    preferenceId: {
      type: String,
      default: null,
      index: true,
    },
    initPoint: {
      type: String,
      default: null,
    },
    mpPaymentId: {
      type: String,
      default: null,
      index: true,
    },

    /**
     * Fecha y hora de la asesoría asociada
     * @type {Date}
     */
    fechaHoraAsesoria: {
      type: Date,
      required: [true, "La fecha de la asesoría es requerida"],
      index: true,
    },

    /**
     * Duración de la asesoría en minutos
     * @type {Number}
     * @enum [60, 90, 120, 180]
     */
    duracionMinutos: {
      type: Number,
      enum: {
        values: [60, 90, 120, 180],
        message: "Duración debe ser 60, 90, 120 o 180 minutos",
      },
      required: [true, "La duración es requerida"],
    },

    /**
     * ID de la asesoría asociada
     * @type {mongoose.Schema.Types.ObjectId}
     */
    asesoriaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asesoria",
      default: null,
      index: true,
    },

    /**
     * Fecha de creación del registro
     * @type {Date}
     * @default Date.now
     */
    fechaCreacion: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true,
    },

    /**
     * Fecha de liberación del pago
     * @type {Date}
     */
    fechaLiberacion: {
      type: Date,
      default: null,
    },

    /**
     * Fecha de reembolso (si aplica)
     * @type {Date}
     */
    fechaReembolso: {
      type: Date,
      default: null,
    },

    /**
     * Metadatos adicionales del pago simulado
     * @type {Object}
     */
    metadatos: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Índices compuestos para optimizar consultas
pagoSchema.index({ clienteId: 1, estado: 1 });
pagoSchema.index({ expertoId: 1, estado: 1 });
pagoSchema.index({ fechaCreacion: -1, estado: 1 });
pagoSchema.index({ asesoriaId: 1, estado: 1 });

// Middleware para generar transaccionId automáticamente
pagoSchema.pre("save", function (next) {
  if (this.isNew && !this.transaccionId) {
    this.transaccionId = `SIM-${Date.now()}-${this._id}`;
  }
  next();
});

/**
 * Método virtual para obtener el estado legible
 * @returns {String} Estado en formato legible
 */
pagoSchema.virtual("estadoLegible").get(function () {
  const estados = {
    retenido: "Dinero Retenido",
    liberado: "Dinero Liberado",
    reembolsado: "Reembolsado Completo",
    "reembolsado-parcial": "Reembolsado Parcial",
  };
  return estados[this.estado] || this.estado;
});

/**
 * Método virtual para formatear el monto
 * @returns {String} Monto formateado con separadores de miles
 */
pagoSchema.virtual("montoFormateado").get(function () {
  return `$${this.monto.toLocaleString("es-CO")} COP`;
});

/**
 * Método virtual para verificar si el pago puede ser liberado
 * @returns {Boolean} True si puede ser liberado
 */
pagoSchema.virtual("puedeLiberar").get(function () {
  return this.estado === "retenido";
});

/**
 * Método virtual para verificar si el pago puede ser reembolsado
 * @returns {Boolean} True si puede ser reembolsado
 */
pagoSchema.virtual("puedeReembolsar").get(function () {
  return ["retenido", "liberado"].includes(this.estado);
});

/**
 * Método virtual para verificar si el pago está en estado final
 * @returns {Boolean} True si está en estado final
 */
pagoSchema.virtual("esFinal").get(function () {
  return ["liberado", "reembolsado", "reembolsado-parcial"].includes(
    this.estado
  );
});

/**
 * Método para obtener resumen del pago
 * @returns {Object} Resumen con información clave
 */
pagoSchema.methods.obtenerResumen = function () {
  return {
    id: this._id,
    cliente: this.clienteId,
    experto: this.expertoId,
    monto: this.monto,
    montoFormateado: this.montoFormateado,
    estado: this.estado,
    estadoLegible: this.estadoLegible,
    metodo: this.metodo,
    fechaCreacion: this.fechaCreacion,
    fechaLiberacion: this.fechaLiberacion,
    fechaReembolso: this.fechaReembolso,
    asesoriaId: this.asesoriaId,
    transaccionId: this.transaccionId,
    puedeLiberar: this.puedeLiberar,
    puedeReembolsar: this.puedeReembolsar,
    esFinal: this.esFinal,
  };
};

/**
 * Método estático para obtener estadísticas de pagos
 * @param {String} filtro - Filtro opcional (clienteId, expertoId, etc.)
 * @returns {Promise<Object>} Estadísticas de pagos
 */
pagoSchema.statics.obtenerEstadisticas = async function (filtro = {}) {
  try {
    const pipeline = [
      { $match: filtro },
      {
        $group: {
          _id: "$estado",
          cantidad: { $sum: 1 },
          montoTotal: { $sum: "$monto" },
        },
      },
      {
        $group: {
          _id: null,
          estados: {
            $push: {
              estado: "$_id",
              cantidad: "$cantidad",
              montoTotal: "$montoTotal",
            },
          },
          totalPagos: { $sum: "$cantidad" },
          montoGrandTotal: { $sum: "$montoTotal" },
        },
      },
    ];

    const resultado = await this.aggregate(pipeline);
    return resultado[0] || { estados: [], totalPagos: 0, montoGrandTotal: 0 };
  } catch (error) {
    throw new Error(`Error obteniendo estadísticas: ${error.message}`);
  }
};

/**
 * Configuración del toJSON para incluir virtuals
 */
pagoSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.id;
    return ret;
  },
});

// Crear y exportar el modelo
const Pago = mongoose.model("Pago", pagoSchema);

module.exports = Pago;
