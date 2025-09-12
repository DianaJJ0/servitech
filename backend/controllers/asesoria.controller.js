/**
 * CONTROLADOR DE ASESORÍAS
 * CRUD + flujo de pago, finalización y notificaciones.
 */
const Asesoria = require("../models/asesoria.model.js");
const Pago = require("../models/pago.model.js");
const Usuario = require("../models/usuario.model.js");
const Notificacion = require("../models/notificacion.model.js");
const Log = require("../models/log.model.js");
const { enviarCorreo } = require("../services/email.service.js");
const generarLogs = require("../services/generarLogs");

/**
 * @openapi
 * tags:
 *   - name: Asesorias
 *     description: Gestión de asesorías (creación, actualización, consultas)
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *         message:
 *           type: string
 *       required:
 *         - error
 *         - message
 */

/**
 * @openapi
 * tags:
 *   - name: Asesorias
 *     description: Gestión de asesorías (creación, actualización, consultas)
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *         message:
 *           type: string
 *       required:
 *         - error
 *         - message
 */

/**
 * Recalcula el promedio de calificaciones para un experto
 * @param {string} expertoEmail - Email del experto
 * @returns {Promise<void>}
 */
const recalcularPromedioExperto = async (expertoEmail) => {
  try {
    // Traer todas las asesorías completadas del experto con reseña válida
    const asesoriasConResena = await Asesoria.find({
      "experto.email": expertoEmail,
      "reseña.calificacion": { $gte: 1 },
    }).select("reseña.calificacion");

    if (!asesoriasConResena || asesoriasConResena.length === 0) {
      // Poner 0 y contar 0
      await Usuario.findOneAndUpdate(
        { email: expertoEmail },
        { calificacion: 0, calificacionesCount: 0 }
      );
      return;
    }

    const suma = asesoriasConResena.reduce(
      (acc, a) => acc + (a.reseña?.calificacion || 0),
      0
    );
    const count = asesoriasConResena.length;
    const promedio = Math.round((suma / count) * 10) / 10; // redondear a 1 decimal

    await Usuario.findOneAndUpdate(
      { email: expertoEmail },
      { calificacion: promedio, calificacionesCount: count }
    );
  } catch (e) {
    console.error("Error recalculando promedio del experto:", e);
  }
};

/**
 * Crear una asesoría.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @openapi
 * /api/asesorias:
 *   post:
 *     tags: [Asesorias]
 *     summary: Crear asesoría
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Asesoria'
 *     responses:
 *       201:
 *         description: Asesoría creada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Asesoria'
 *       400:
 *         description: Petición inválida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * Crea una nueva asesoría con pago asociado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const crearAsesoria = async (req, res) => {
  try {
    const datos = req.body;

    // Validaciones básicas
    if (
      !datos.titulo ||
      !datos.cliente ||
      !datos.cliente.email ||
      !datos.experto ||
      !datos.experto.email ||
      !datos.categoria ||
      !datos.fechaHoraInicio ||
      !datos.duracionMinutos ||
      !datos.pago
    ) {
      return res
        .status(400)
        .json({ mensaje: "Faltan datos obligatorios para la asesoría." });
    }
    // Validar datos mínimos del pago
    if (
      !datos.pago.monto ||
      !datos.pago.metodo ||
      !datos.pago.estado ||
      !datos.pago.clienteId ||
      !datos.pago.expertoId
    ) {
      return res.status(400).json({ mensaje: "Datos de pago incompletos." });
    }

    // La asesoría se crea en estado "confirmada" si el pago está "retenido"
    const estadoAsesoria =
      datos.pago.estado === "retenido" ? "confirmada" : "pendiente-pago";

    // Registra la asesoría
    const asesoria = new Asesoria({
      ...datos,
      estado: estadoAsesoria,
      pago: datos.pago, // Incrusta el objeto de pago completo
    });
    await asesoria.save();

    // Opcional: Actualiza el pago con el id de la asesoría (si necesitas trazabilidad)
    await Pago.findByIdAndUpdate(datos.pago._id, {
      asesoriaId: asesoria._id,
    });

    // Enviar correo y registrar notificación/log
    try {
      const cliente = await Usuario.findOne({ email: datos.cliente.email });
      const experto = await Usuario.findOne({ email: datos.experto.email });

      if (cliente) {
        const asuntoCliente = "Confirmación de asesoría agendada";
        const mensajeCliente = `Hola ${cliente.nombre}, tu asesoría con ${
          experto ? experto.nombre : datos.experto.nombre
        } está agendada para ${datos.fechaHoraInicio}.`;
        await enviarCorreo(cliente.email, asuntoCliente, mensajeCliente);

        // Guardar notificación en la DB
        await Notificacion.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "email",
          asunto: asuntoCliente,
          mensaje: mensajeCliente,
          relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });

        // Guardar log en la DB
        await Log.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "asesoria",
          descripcion:
            "Creación de asesoría y envío de confirmación al cliente",
          entidad: "Asesoria",
          referenciaId: asesoria._id,
          datos: { asunto: asuntoCliente, mensaje: mensajeCliente },
        });
      }
      if (experto) {
        const asuntoExperto = "Nueva asesoría agendada";
        const mensajeExperto = `Hola ${
          experto.nombre
        }, tienes una nueva asesoría agendada con el cliente ${
          cliente ? cliente.nombre : datos.cliente.nombre
        } para ${datos.fechaHoraInicio}.`;
        await enviarCorreo(experto.email, asuntoExperto, mensajeExperto);
        await Notificacion.create({
          usuarioId: experto._id,
          email: experto.email,
          tipo: "email",
          asunto: asuntoExperto,
          mensaje: mensajeExperto,
          relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });
        await Log.create({
          usuarioId: experto._id,
          email: experto.email,
          tipo: "asesoria",
          descripcion:
            "Creación de asesoría y envío de confirmación al experto",
          entidad: "Asesoria",
          referenciaId: asesoria._id,
          datos: { asunto: asuntoExperto, mensaje: mensajeExperto },
        });
      }
    } catch (e) {
      console.error("Error enviando correo/notificación/log de asesoría:", e);
    }

    // Log evento de negocio: creación de asesoría
    generarLogs.registrarEvento({
      usuarioEmail: (datos.cliente && datos.cliente.email) || null,
      nombre: (datos.cliente && datos.cliente.nombre) || null,
      apellido: (datos.cliente && datos.cliente.apellido) || null,
      accion: "CREAR_ASESORIA",
      detalle: `Asesoría creada id:${asesoria._id}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res
      .status(201)
      .json({ mensaje: "Asesoría creada correctamente.", asesoria });
  } catch (error) {
    console.error(error);
    // Log error de negocio
    generarLogs.registrarEvento({
      usuarioEmail: (req.body.cliente && req.body.cliente.email) || null,
      accion: "CREAR_ASESORIA",
      detalle: "Error al crear asesoría",
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "asesoria",
      persistirEnDB: true,
    });
    res.status(500).json({ mensaje: "Error al crear asesoría." });
  }
};

/**
 * Finaliza una asesoría y libera el pago al experto
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const finalizarAsesoria = async (req, res) => {
  try {
    const id = req.params.id;
    const asesoria = await Asesoria.findById(id);
    if (!asesoria)
      return res.status(404).json({ mensaje: "Asesoría no encontrada." });

    // Solo se puede finalizar si está confirmada
    if (asesoria.estado !== "confirmada") {
      return res
        .status(400)
        .json({ mensaje: "Solo asesorías confirmadas pueden finalizarse." });
    }

    // Cambia estado a completada
    asesoria.estado = "completada";
    await asesoria.save();

    // Si la asesoría incluye una reseña con calificación, recalcular promedio del experto
    if (
      asesoria.reseña &&
      typeof asesoria.reseña.calificacion !== "undefined"
    ) {
      await recalcularPromedioExperto(asesoria.experto.email);
    }

    // Actualiza el pago a liberado
    if (asesoria.pago && asesoria.pago.transaccionId) {
      await Pago.findOneAndUpdate(
        { transaccionId: asesoria.pago.transaccionId },
        { estado: "liberado", fechaLiberacion: new Date() }
      );
      asesoria.pago.estado = "liberado";
      asesoria.pago.fechaLiberacion = new Date();
      await asesoria.save();
    }

    // Notifica por correo y registra notificación/log
    try {
      const cliente = await Usuario.findOne({ email: asesoria.cliente.email });
      const experto = await Usuario.findOne({ email: asesoria.experto.email });

      if (experto) {
        const asuntoExperto = "Tu pago por asesoría fue liberado";
        const mensajeExperto = `¡Excelente trabajo! El cliente ha finalizado la asesoría "${asesoria.titulo}" y tu pago ha sido liberado.`;
        await enviarCorreo(experto.email, asuntoExperto, mensajeExperto);
        await Notificacion.create({
          usuarioId: experto._id,
          email: experto.email,
          tipo: "email",
          asunto: asuntoExperto,
          mensaje: mensajeExperto,
          relacionadoCon: { tipo: "Pago", referenciaId: asesoria.pago._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });
        await Log.create({
          usuarioId: experto._id,
          email: experto.email,
          tipo: "pago",
          descripcion: "Liberación de pago tras finalizar asesoría",
          entidad: "Pago",
          referenciaId: asesoria.pago._id,
          datos: { asunto: asuntoExperto, mensaje: mensajeExperto },
        });
      }
      if (cliente) {
        const asuntoCliente = "Asesoría finalizada con éxito";
        const mensajeCliente = `Gracias por usar Servitech. Tu asesoría "${asesoria.titulo}" ha sido finalizada y el pago fue entregado al experto.`;
        await enviarCorreo(cliente.email, asuntoCliente, mensajeCliente);
        await Notificacion.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "email",
          asunto: asuntoCliente,
          mensaje: mensajeCliente,
          relacionadoCon: { tipo: "Pago", referenciaId: asesoria.pago._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });
        await Log.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "pago",
          descripcion: "Liberación de pago tras finalizar asesoría",
          entidad: "Pago",
          referenciaId: asesoria.pago._id,
          datos: { asunto: asuntoCliente, mensaje: mensajeCliente },
        });
      }
    } catch (e) {
      console.error(
        "Error enviando correo/notificación/log de finalización:",
        e
      );
    }

    // Log finalización exitoso
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

    // Si la actualización incluye una reseña con calificación, recalcular promedio
    if (
      actualizaciones.reseña &&
      typeof actualizaciones.reseña.calificacion !== "undefined"
    ) {
      await recalcularPromedioExperto(asesoria.experto.email);
    }

    res.status(200).json({ mensaje: "Asesoría actualizada.", asesoria });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al actualizar asesoría." });
  }
};

/**
 * Endpoint administrativo para recalcular promedio de experto
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const recalcularPromedioEndpoint = async (req, res) => {
  try {
    const email = req.params.email;
    if (!email) return res.status(400).json({ mensaje: "Email requerido." });
    await recalcularPromedioExperto(email);
    res.json({ mensaje: "Recalculo iniciado para " + email });
  } catch (e) {
    console.error("Error en endpoint recalcular:", e);
    res.status(500).json({ mensaje: "Error al recalcular promedio." });
  }
};

/**
 * Genera estadísticas de reseñas agrupadas por experto
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const estadisticasResenas = async (req, res) => {
  try {
    // Pipeline: contar reseñas y agrupar por experto
    const pipeline = [
      { $match: { "reseña.calificacion": { $gte: 1 } } },
      {
        $group: {
          _id: "$experto.email",
          count: { $sum: 1 },
          avg: { $avg: "$reseña.calificacion" },
        },
      },
      { $sort: { count: -1 } },
    ];

    const porExperto = await Asesoria.aggregate(pipeline);
    const total = porExperto.reduce((acc, p) => acc + p.count, 0);

    res.json({ totalResenas: total, porExperto });
  } catch (e) {
    console.error("Error generando estadísticas de reseñas:", e);
    res.status(500).json({ mensaje: "Error generando estadísticas." });
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
  listarAsesorias,
  listarPorCliente,
  listarPorExperto,
  obtenerAsesoriaPorId,
  actualizarAsesoria,
  recalcularPromedioEndpoint,
  estadisticasResenas,
  eliminarAsesoria,
};
