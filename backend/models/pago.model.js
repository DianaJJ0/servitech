/**
 * @file Modelo de Pago
 * @module models/pago
 * @description Modelo Mongoose para pagos simulados y reales. Permite registrar pagos de clientes a expertos, controlar estados (retenido, liberado, reembolsado), y almacenar información relevante para conciliación, reportes y auditoría.
 *
 * Este modelo es esencial para la gestión financiera de la plataforma, soportando integración con pasarelas de pago y simulaciones para pruebas. Incluye validaciones, índices, métodos virtuales y lógica de negocio para el ciclo de vida de un pago.
 *
 * Ejemplo de uso:
 * ```js
 * const pago = new Pago({ clienteId: '...', expertoId: '...', monto: 50000, ... });
 * await pago.save();
 * const resumen = pago.obtenerResumen();
 * ```
 */

const mongoose = require("mongoose");

/**
 * Esquema de Pago Simulado y Real
 * Define la estructura de los pagos en la base de datos, incluyendo integración con Mercado Pago y simulaciones.
 * @typedef {Object} Pago
 * @property {String} clienteId - ID del cliente que realiza el pago
 * @property {String} expertoId - ID del experto que recibe el pago
 * @property {Number} monto - Monto del pago en pesos colombianos
 * @property {String} metodo - Método de pago (simulado, tarjeta, pse, mercadopago)
 * @property {String} estado - Estado del pago (retenido, liberado, reembolsado, reembolsado-parcial)
 * @property {String} descripcion - Descripción del pago
 * @property {String} transaccionId - ID de la transacción
 * @property {String} preferenceId - ID de preferencia de Mercado Pago
 * @property {String} initPoint - URL de inicio de pago
 * @property {String} mpPaymentId - ID de pago en Mercado Pago
 * @property {Date} fechaHoraAsesoria - Fecha y hora de la asesoría asociada
 * @property {Number} duracionMinutos - Duración de la asesoría en minutos
 * @property {ObjectId} asesoriaId - ID de la asesoría asociada
 * @property {Date} fechaCreacion - Fecha de creación del registro
 * @property {Date} fechaLiberacion - Fecha de liberación del pago
 * @property {Date} fechaReembolso - Fecha de reembolso (si aplica)
 * @property {Object} metadatos - Metadatos adicionales (estructura libre)
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
     * Método de pago utilizado
     * @type {String}
     * @enum ["simulado", "tarjeta", "pse", "mercadopago"]
     * @default "mercadopago"
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

/**
 * @openapi
 * components:
 *   schemas:
 *     Pago:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         clienteId:
 *           type: string
 *         expertoId:
 *           type: string
 *         monto:
 *           type: number
 *         metodo:
 *           type: string
 *           enum: [simulado, tarjeta, pse, mercadopago]
 *         estado:
 *           type: string
 *           enum: [retenido, liberado, reembolsado, reembolsado-parcial]
 *         descripcion:
 *           type: string
 *         transaccionId:
 *           type: string
 *         preferenceId:
 *           type: string
 *         initPoint:
 *           type: string
 *         mpPaymentId:
 *           type: string
 *         fechaHoraAsesoria:
 *           type: string
 *           format: date-time
 *         duracionMinutos:
 *           type: number
 *         asesoriaId:
 *           type: string
 *         fechaCreacion:
 *           type: string
 *           format: date-time
 *         fechaLiberacion:
 *           type: string
 *           format: date-time
 *         fechaReembolso:
 *           type: string
 *           format: date-time
 *         metadatos:
 *           type: object
 *       required:
 *         - clienteId
 *         - expertoId
 *         - monto
 *         - metodo
 *         - estado
 *         - fechaHoraAsesoria
 *         - duracionMinutos
 *
 *   responses:
 *     PagoResponse:
 *       description: Respuesta exitosa con información del pago
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Pago'
 *     PagoNotFound:
 *       description: Pago no encontrado
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Pago no encontrado
 *     PagoError:
 *       description: Error en la operación de pago
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Error procesando el pago
 */
// Exporta el modelo Pago para su uso en controladores y servicios.
const Pago = mongoose.model("Pago", pagoSchema);
module.exports = Pago;
