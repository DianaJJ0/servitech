/**
 * @file Modelo de Log
 * @module models/log
 * @description Modelo Mongoose para auditoría y registro de acciones relevantes en el sistema. Permite almacenar eventos de usuarios y del sistema para trazabilidad, monitoreo y análisis forense.
 *
 * Este modelo es fundamental para la seguridad, monitoreo y depuración, ya que registra quién hizo qué, cuándo y con qué resultado. Incluye campos flexibles para adaptarse a distintos tipos de eventos y resultados.
 *
 * Ejemplo de uso:
 * ```js
 * await Log.create({ usuarioEmail: 'admin@correo.com', accion: 'LOGIN', resultado: 'éxito' });
 * ```
 */

const mongoose = require("mongoose");

/**
 * @typedef {Object} Log
 * @property {string} usuarioEmail - Email del usuario que realiza la acción
 * @property {string} nombre - Nombre del usuario
 * @property {string} apellido - Apellido del usuario
 * @property {string} accion - Acción ejecutada (ej: "crear pago")
 * @property {string} detalle - Detalles adicionales de la acción
 * @property {string} resultado - Resultado de la acción ("éxito", "error", etc.)
 * @property {string} tipo - Tipo de log ("del sistema", "usuario", etc.)
 * @property {Date} fecha - Fecha y hora del log
 */
const logSchema = new mongoose.Schema({
  usuarioEmail: { type: String, required: false },
  nombre: { type: String, required: false },
  apellido: { type: String, required: false },
  accion: { type: String, required: true },
  detalle: { type: String, required: false }, // Detalles adicionales si aplica
  resultado: { type: String, required: false }, // "éxito", "error", etc.
  tipo: { type: String, required: false }, // Puede ser "del sistema", "usuario", etc.
  fecha: { type: Date, default: Date.now }, // Fecha y hora del log
});

/**
 * @openapi
 * components:
 *   schemas:
 *     Log:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         usuarioEmail:
 *           type: string
 *         nombre:
 *           type: string
 *         apellido:
 *           type: string
 *         accion:
 *           type: string
 *         detalle:
 *           type: string
 *         resultado:
 *           type: string
 *         tipo:
 *           type: string
 *         fecha:
 *           type: string
 *           format: date-time
 *       required:
 *         - accion
 *         - fecha
 *
 *   responses:
 *     LogResponse:
 *       description: Respuesta exitosa con información del log
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Log'
 *     LogNotFound:
 *       description: Log no encontrado
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Log no encontrado
 *     LogError:
 *       description: Error en la operación de log
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Error procesando el log
 */

// Exporta el modelo Log para su uso en controladores y servicios.
module.exports = mongoose.model("Log", logSchema);
