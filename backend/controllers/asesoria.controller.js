/**
 * Controlador de Asesorías - ServiTech
 * Valida la creación de asesorías, roles, horarios, unicidad de pagoId y otros requisitos de negocio.
 */

const Asesoria = require("../models/asesoria.model.js");
const Usuario = require("../models/usuario.model.js");
const Pago = require("../models/pago.model.js");
const Notificacion = require("../models/notificacion.model.js");
const Log = require("../models/log.model.js");
const generarLogs = require("../services/generarLogs");

// Validar que un usuario exista y tenga el rol requerido
async function validarUsuarioPorEmail(email, rolRequerido) {
  const usuario = await Usuario.findOne({ email });
  if (!usuario) return { ok: false, error: "No existe el usuario: " + email };
  if (!usuario.roles.includes(rolRequerido) && usuario.roles.length < 2) {
    return {
      ok: false,
      error: `El usuario ${email} no tiene el rol requerido: ${rolRequerido}`,
    };
  }
  return { ok: true, usuario };
}

const crearAsesoria = async (req, res) => {
  try {
    const datos = req.body;

    // Validar campos obligatorios
    if (
      !datos.titulo ||
      !datos.categoria ||
      !datos.fechaHoraInicio ||
      !datos.duracionMinutos ||
      !datos.cliente ||
      !datos.experto ||
      !datos.cliente.email ||
      !datos.experto.email ||
      !datos.pagoId
    ) {
      return res.status(400).json({
        mensaje: "Faltan datos obligatorios para la asesoría.",
        error:
          "Campos requeridos: titulo, categoria, fechaHoraInicio, duracionMinutos, cliente.email, experto.email, pagoId",
      });
    }

    // Validar que cliente y experto no sean iguales
    if (datos.cliente.email === datos.experto.email) {
      return res.status(400).json({
        mensaje: "El cliente y el experto no pueden ser la misma persona.",
        error: "Datos inválidos: emails iguales.",
      });
    }

    // Validar usuarios y roles
    const validCliente = await validarUsuarioPorEmail(
      datos.cliente.email,
      "cliente"
    );
    if (!validCliente.ok) {
      return res.status(400).json({
        mensaje: "Error con cliente.",
        error: validCliente.error,
      });
    }
    const validExperto = await validarUsuarioPorEmail(
      datos.experto.email,
      "experto"
    );
    if (!validExperto.ok) {
      return res.status(400).json({
        mensaje: "Error con experto.",
        error: validExperto.error,
      });
    }

    // Validar pago: debe existir y pertenecer a ambos emails
    const pago = await Pago.findById(datos.pagoId);
    if (
      !pago ||
      pago.clienteId !== datos.cliente.email ||
      pago.expertoId !== datos.experto.email
    ) {
      return res.status(400).json({
        mensaje: "El pago no existe o no corresponde a los emails dados.",
        error: "pagoId inválido.",
      });
    }

    // Validar que el pagoId no haya sido usado en otra asesoría
    const asesoriaExistente = await Asesoria.findOne({ pagoId: datos.pagoId });
    if (asesoriaExistente) {
      return res.status(400).json({
        mensaje: "El pagoId ya está asociado a otra asesoría.",
        error: "Cada pago solo puede usarse una vez para una asesoría.",
      });
    }

    // Validar solapamiento de horarios para el experto
    const fechaInicio = new Date(datos.fechaHoraInicio);
    const ahora = new Date();
    if (fechaInicio < ahora) {
      return res.status(400).json({
        mensaje: "No se pueden crear asesorías en el pasado.",
        error: "La fecha de inicio debe ser igual o posterior a la actual.",
      });
    }
    const fechaFin = new Date(
      fechaInicio.getTime() + datos.duracionMinutos * 60000
    );
    // Validar solapamiento de horarios para el experto
    const solapamiento = await Asesoria.findOne({
      "experto.email": datos.experto.email,
      $or: [
        {
          fechaHoraInicio: { $lte: fechaInicio },
          fechaHoraFin: { $gt: fechaInicio },
        },
        {
          fechaHoraInicio: { $lt: fechaFin },
          fechaHoraFin: { $gte: fechaFin },
        },
        {
          fechaHoraInicio: { $gte: fechaInicio },
          fechaHoraFin: { $lte: fechaFin },
        },
      ],
      estado: { $in: ["confirmada", "completada"] },
    });

    if (solapamiento) {
      return res.status(409).json({
        mensaje: "El experto ya tiene una asesoría en ese horario.",
        error: "Horario ocupado.",
      });
    }

    // Crear asesoría
    const nuevaAsesoria = new Asesoria({
      ...datos,
      cliente: validCliente.usuario,
      experto: validExperto.usuario,
      fechaHoraFin: fechaFin,
      estado: "confirmada",
    });

    await nuevaAsesoria.save();

    // Notificación y log
    try {
      await Notificacion.create({
        usuarioId: validCliente.usuario._id,
        email: validCliente.usuario.email,
        tipo: "email",
        asunto: "Confirmación de asesoría",
        mensaje: `Tu asesoría con ${validExperto.usuario.nombre} ha sido confirmada.`,
        relacionadoCon: { tipo: "Asesoria", referenciaId: nuevaAsesoria._id },
        estado: "enviado",
        fechaEnvio: new Date(),
      });
      await Log.create({
        usuarioId: validCliente.usuario._id,
        email: validCliente.usuario.email,
        tipo: "asesoria",
        descripcion: "Registro de asesoría",
        entidad: "Asesoria",
        referenciaId: nuevaAsesoria._id,
        datos: { titulo: datos.titulo },
      });
    } catch (e) {
      console.error("Error guardando log en BD:", e.message);
    }

    generarLogs.registrarEvento({
      usuarioEmail: validCliente.usuario.email,
      nombre: validCliente.usuario.nombre,
      apellido: validCliente.usuario.apellido,
      accion: "CREAR_ASESORIA",
      detalle: `Asesoría registrada id:${nuevaAsesoria._id} cliente:${validCliente.usuario.email} experto:${validExperto.usuario.email}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res
      .status(201)
      .json({ mensaje: "Asesoría registrada.", asesoria: nuevaAsesoria });
  } catch (error) {
    generarLogs.registrarEvento({
      usuarioEmail:
        (req.body && req.body.cliente && req.body.cliente.email) || null,
      nombre: null,
      apellido: null,
      accion: "CREAR_ASESORIA",
      detalle: "Error al registrar asesoría",
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "asesoria",
      persistirEnDB: true,
    });
    res.status(500).json({
      mensaje: "Error interno al registrar asesoría.",
      error: error.message,
    });
  }
};

/**
 * Finaliza una asesoría y libera el pago al experto (manual o automático).
 */
const finalizarAsesoria = async (req, res) => {
  try {
    const id = req.params.id;
    const asesoria = await Asesoria.findById(id);
    if (!asesoria)
      return res.status(404).json({ mensaje: "Asesoría no encontrada." });

    // Solo puede finalizar si está confirmada
    if (asesoria.estado !== "confirmada") {
      return res
        .status(400)
        .json({ mensaje: "Solo asesorías confirmadas pueden finalizarse." });
    }

    // Cambia estado a completada y guarda fecha
    asesoria.estado = "completada";
    asesoria.fechaFinalizacion = new Date();
    await asesoria.save();

    // Actualiza el pago a liberado
    if (asesoria.pagoId) {
      await Pago.findByIdAndUpdate(asesoria.pagoId, {
        estado: "liberado",
        fechaLiberacion: new Date(),
      });
    }

    // Notificar por correo/log
    try {
      const cliente = await Usuario.findOne({ email: asesoria.cliente.email });
      const experto = await Usuario.findOne({ email: asesoria.experto.email });

      if (experto) {
        await Notificacion.create({
          usuarioId: experto._id,
          email: experto.email,
          tipo: "email",
          asunto: "Tu pago fue liberado",
          mensaje: `El pago de tu asesoría "${asesoria.titulo}" ha sido liberado.`,
          relacionadoCon: { tipo: "Pago", referenciaId: asesoria.pagoId },
          estado: "enviado",
          fechaEnvio: new Date(),
        });
      }
      if (cliente) {
        await Notificacion.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "email",
          asunto: "Asesoría finalizada",
          mensaje: `Gracias por usar Servitech. Tu asesoría "${asesoria.titulo}" ha sido finalizada y el pago fue entregado al experto.`,
          relacionadoCon: { tipo: "Pago", referenciaId: asesoria.pagoId },
          estado: "enviado",
          fechaEnvio: new Date(),
        });
      }
    } catch (e) {
      console.error("Error en notificación de finalización:", e);
    }

    generarLogs.registrarEvento({
      usuarioEmail: (asesoria.cliente && asesoria.cliente.email) || null,
      nombre: (asesoria.cliente && asesoria.cliente.nombre) || null,
      apellido: (asesoria.cliente && asesoria.cliente.apellido) || null,
      accion: "FINALIZAR_ASESORIA",
      detalle: `Asesoría finalizada id:${asesoria._id}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res.json({ mensaje: "Asesoría finalizada y pago liberado.", asesoria });
  } catch (error) {
    console.error(error);
    generarLogs.registrarEvento({
      usuarioEmail: null,
      accion: "FINALIZAR_ASESORIA",
      detalle: "Error al finalizar asesoría",
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "asesoria",
      persistirEnDB: true,
    });
    res.status(500).json({ mensaje: "Error al finalizar asesoría." });
  }
};

/**
 * Actualiza una asesoría existente
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const actualizarAsesoria = async (req, res) => {
  try {
    const id = req.params.id;
    const actualizaciones = req.body;
    const asesoria = await Asesoria.findByIdAndUpdate(id, actualizaciones, {
      new: true,
      runValidators: true,
    });
    if (!asesoria)
      return res.status(404).json({ mensaje: "Asesoría no encontrada." });

    res.status(200).json({ mensaje: "Asesoría actualizada.", asesoria });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al actualizar asesoría." });
  }
};

/**
 * Lista todas las asesorías (solo admin)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const listarAsesorias = async (req, res) => {
  try {
    const asesorias = await Asesoria.find();
    res.status(200).json(asesorias);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al listar asesorías." });
  }
};

/**
 * Lista asesorías por email de cliente
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const listarPorCliente = async (req, res) => {
  try {
    const email = req.params.email;
    const asesorias = await Asesoria.find({ "cliente.email": email });
    res.status(200).json(asesorias);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al listar asesorías por cliente." });
  }
};

/**
 * Lista asesorías por email de experto
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const listarPorExperto = async (req, res) => {
  try {
    const email = req.params.email;
    const asesorias = await Asesoria.find({ "experto.email": email });
    res.status(200).json(asesorias);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al listar asesorías por experto." });
  }
};

/**
 * Obtener una asesoría por id.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @openapi
 * /api/asesorias/{id}:
 *   get:
 *     tags: [Asesorias]
 *     summary: Obtener asesoría por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Asesoría encontrada
 */
/**
 * Obtiene una asesoría por su ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const obtenerAsesoriaPorId = async (req, res) => {
  try {
    const id = req.params.id;
    const asesoria = await Asesoria.findById(id);
    if (!asesoria)
      return res.status(404).json({ mensaje: "Asesoría no encontrada." });
    res.status(200).json(asesoria);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener asesoría." });
  }
};

/**
 * Elimina una asesoría por ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const eliminarAsesoria = async (req, res) => {
  try {
    const id = req.params.id;
    const asesoria = await Asesoria.findByIdAndDelete(id);
    if (!asesoria)
      return res.status(404).json({ mensaje: "Asesoría no encontrada." });
    res.status(200).json({ mensaje: "Asesoría eliminada." });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al eliminar asesoría." });
  }
};

module.exports = {
  crearAsesoria,
  finalizarAsesoria,
  listarAsesorias: async (req, res) => {},
  listarPorCliente: async (req, res) => {},
  listarPorExperto: async (req, res) => {},
  obtenerAsesoriaPorId: async (req, res) => {},
  actualizarAsesoria: async (req, res) => {},
  eliminarAsesoria: async (req, res) => {},
};
