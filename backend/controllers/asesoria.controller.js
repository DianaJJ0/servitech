/**
 * Controlador de Asesorías - ServiTech
 * @module controllers/asesoria
 * @description Lógica para crear, aceptar, rechazar, finalizar, listar y eliminar asesorías tecnológicas. Incluye notificaciones clave por email y logs solo en MongoDB.
 */

const Asesoria = require("../models/asesoria.model.js");
const Pago = require("../models/pago.model.js");
const Usuario = require("../models/usuario.model.js");
const Notificacion = require("../models/notificacion.model.js");
const generarLogs = require("../services/generarLogs");
const { enviarCorreo } = require("../services/email.service.js");

/**
 * Crea una nueva asesoría y notifica al experto por email.
 * @openapi
 * /api/asesorias:
 *   post:
 *     summary: Crear asesoría (cliente autenticado)
 *     tags: [Asesorías]
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
 */
const crearAsesoria = async (req, res) => {
  try {
    const datos = req.body;
    if (!req.usuario || req.usuario.email !== datos.cliente.email) {
      return res.status(403).json({
        mensaje:
          "No autorizado. El email del cliente no coincide con el usuario autenticado.",
      });
    }
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
      });
    }
    if (datos.cliente.email === datos.experto.email) {
      return res.status(400).json({
        mensaje: "El cliente y el experto no pueden ser la misma persona.",
      });
    }
    // Validar solapamiento de horarios para el experto por email
    const fechaInicio = new Date(datos.fechaHoraInicio);
    const fechaFin = new Date(
      fechaInicio.getTime() + datos.duracionMinutos * 60000
    );
    const solapamiento = await Asesoria.findOne({
      "experto.email": datos.experto.email,
      $or: [
        {
          fechaHoraInicio: { $lte: fechaInicio },
          fechaFinalizacion: { $gt: fechaInicio },
        },
        {
          fechaHoraInicio: { $lt: fechaFin },
          fechaFinalizacion: { $gte: fechaFin },
        },
        {
          fechaHoraInicio: { $gte: fechaInicio },
          fechaFinalizacion: { $lte: fechaFin },
        },
      ],
      estado: { $in: ["confirmada", "completada"] },
    });
    if (solapamiento) {
      return res.status(409).json({
        mensaje: "El experto ya tiene una asesoría en ese horario.",
      });
    }
    // Validar pago y que esté en estado pendiente o retenido
    const pago = await Pago.findById(datos.pagoId);
    if (
      !pago ||
      pago.clienteId !== datos.cliente.email ||
      pago.expertoId !== datos.experto.email ||
      !["pendiente", "retenido"].includes(pago.estado)
    ) {
      return res.status(400).json({
        mensaje:
          "El pago no existe, no corresponde a los emails dados, o no está pendiente/retenido.",
      });
    }
    // Validar que el pagoId no haya sido usado en otra asesoría
    const asesoriaExistente = await Asesoria.findOne({ pagoId: datos.pagoId });
    if (asesoriaExistente) {
      return res.status(400).json({
        mensaje: "El pagoId ya está asociado a otra asesoría.",
      });
    }

    // Crear asesoría (queda pendiente de aceptación por el experto)
    const nuevaAsesoria = new Asesoria({
      ...datos,
      fechaFinalizacion: fechaFin,
      estado: "pendiente-pago",
    });
    await nuevaAsesoria.save();

    // Notificación y CORREO al EXPERTO para aceptar/rechazar (con datos completos)
    try {
      const experto = await Usuario.findOne({ email: datos.experto.email });
      if (experto) {
        await Notificacion.create({
          usuarioId: experto._id,
          email: experto.email,
          tipo: "email",
          asunto: "Nueva asesoría pendiente",
          mensaje: `Tienes una nueva solicitud de asesoría "${datos.titulo}". Ingresa a ServiTech para aceptarla o rechazarla.`,
          relacionadoCon: { tipo: "Asesoria", referenciaId: nuevaAsesoria._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });

        const fechaLocal = new Date(datos.fechaHoraInicio).toLocaleString("es-CO");
        await enviarCorreo(
          experto.email,
          "Nueva asesoría pendiente de aceptación",
          `Tienes una nueva solicitud de asesoría titulada "${datos.titulo}".\n\nCliente: ${datos.cliente.nombre} ${datos.cliente.apellido}\nFecha y hora: ${fechaLocal}\n\nIngresa a ServiTech para aceptarla o rechazarla.`,
          { nombreDestinatario: experto.nombre, apellidoDestinatario: experto.apellido }
        );
      }
    } catch (e) {}

    await generarLogs.registrarEvento({
      usuarioEmail: datos.cliente.email,
      nombre: datos.cliente.nombre,
      apellido: datos.cliente.apellido,
      accion: "CREAR_ASESORIA",
      detalle: `Asesoría registrada id:${nuevaAsesoria._id}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res.status(201).json({
      mensaje: "Asesoría creada y pendiente de aceptación del experto.",
      asesoria: nuevaAsesoria,
    });
  } catch (error) {
    await generarLogs.registrarEvento({
      usuarioEmail: req.body?.cliente?.email || null,
      accion: "ERROR_CREAR_ASESORIA",
      detalle: error.message,
      resultado: "Error",
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
 * Aceptar asesoría. Notifica al cliente por correo con datos de la asesoría y número de contacto del experto.
 * @openapi
 * /api/asesorias/{id}/aceptar:
 *   put:
 *     summary: Aceptar asesoría por el experto
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Asesoría aceptada y pago retenido
 */
const aceptarAsesoria = async (req, res) => {
  try {
    const id = req.params.id;
    const asesoria = await Asesoria.findById(id);
    if (!asesoria)
      return res.status(404).json({ mensaje: "Asesoría no encontrada." });
    if (
      !req.usuario ||
      !req.usuario.roles.includes("experto") ||
      req.usuario.email !== asesoria.experto.email
    ) {
      return res.status(403).json({
        mensaje: "Solo el experto asignado puede aceptar la asesoría.",
      });
    }
    if (asesoria.estado !== "pendiente-pago") {
      return res
        .status(400)
        .json({ mensaje: "Solo asesorías pendientes pueden aceptarse." });
    }
    asesoria.estado = "confirmada";
    await asesoria.save();

    // Retener pago (si aún no está retenido)
    if (asesoria.pagoId) {
      const pago = await Pago.findById(asesoria.pagoId);
      if (pago && pago.estado !== "retenido") {
        await Pago.findByIdAndUpdate(asesoria.pagoId, { estado: "retenido" });
      }
    }

    // Notificación y CORREO al CLIENTE con datos del experto y asesoría
    try {
      const cliente = await Usuario.findOne({ email: asesoria.cliente.email });
      const experto = await Usuario.findOne({ email: asesoria.experto.email });
      if (cliente && experto) {
        await Notificacion.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "email",
          asunto: "Asesoría confirmada",
          mensaje: `Tu asesoría "${asesoria.titulo}" fue aceptada por el experto. El pago está retenido hasta finalizar.`,
          relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });

        const fechaLocal = new Date(asesoria.fechaHoraInicio).toLocaleString("es-CO");
        await enviarCorreo(
          cliente.email,
          "Tu asesoría fue aceptada",
          `Tu asesoría titulada "${asesoria.titulo}" fue aceptada por el experto.\n\nFecha y hora: ${fechaLocal}\n\nEl número de contacto del experto es: ${experto.infoExperto?.telefonoContacto || "No registrado"}.\nEl pago está retenido hasta finalizar la asesoría.\n\nContacta a tu experto para coordinar la asesoría.`,
          { nombreDestinatario: cliente.nombre, apellidoDestinatario: cliente.apellido }
        );
      }
    } catch (e) {}

    await generarLogs.registrarEvento({
      usuarioEmail: asesoria.experto.email,
      nombre: asesoria.experto.nombre,
      apellido: asesoria.experto.apellido,
      accion: "ACEPTAR_ASESORIA",
      detalle: `Asesoría aceptada id:${asesoria._id}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res.json({ mensaje: "Asesoría aceptada y pago retenido.", asesoria });
  } catch (error) {
    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario?.email || null,
      accion: "ERROR_ACEPTAR_ASESORIA",
      detalle: error.message,
      resultado: "Error",
      tipo: "asesoria",
      persistirEnDB: true,
    });
    res.status(500).json({ mensaje: "Error al aceptar asesoría." });
  }
};

/**
 * Rechazar asesoría. Notifica solo al cliente (el pago se reembolsa, no llega notificación al experto).
 * @openapi
 * /api/asesorias/{id}/rechazar:
 *   put:
 *     summary: Rechazar asesoría por el experto
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Asesoría rechazada y pago reembolsado
 */
const rechazarAsesoria = async (req, res) => {
  try {
    const id = req.params.id;
    const asesoria = await Asesoria.findById(id);
    if (!asesoria)
      return res.status(404).json({ mensaje: "Asesoría no encontrada." });
    if (
      !req.usuario ||
      !req.usuario.roles.includes("experto") ||
      req.usuario.email !== asesoria.experto.email
    ) {
      return res.status(403).json({
        mensaje: "Solo el experto asignado puede rechazar la asesoría.",
      });
    }
    if (asesoria.estado !== "pendiente-pago") {
      return res
        .status(400)
        .json({ mensaje: "Solo asesorías pendientes pueden rechazarse." });
    }
    asesoria.estado = "rechazada";
    await asesoria.save();

    // Reembolsar pago (solo si estaba pendiente o retenido)
    if (asesoria.pagoId) {
      const pago = await Pago.findById(asesoria.pagoId);
      if (pago && ["pendiente", "retenido"].includes(pago.estado)) {
        await Pago.findByIdAndUpdate(asesoria.pagoId, {
          estado: "reembolsado",
        });
      }
    }

    // Notificación y CORREO solo al CLIENTE
    try {
      const cliente = await Usuario.findOne({ email: asesoria.cliente.email });
      if (cliente) {
        await Notificacion.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "email",
          asunto: "Asesoría rechazada",
          mensaje: `Tu asesoría "${asesoria.titulo}" fue rechazada por el experto. El pago ha sido reembolsado.`,
          relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });

        await enviarCorreo(
          cliente.email,
          "Tu asesoría fue rechazada",
          `Tu asesoría titulada "${asesoria.titulo}" fue rechazada por el experto. El pago ha sido reembolsado. Por favor agenda una nueva asesoría en una fecha diferente.`,
          { nombreDestinatario: cliente.nombre, apellidoDestinatario: cliente.apellido }
        );
      }
    } catch (e) {}

    await generarLogs.registrarEvento({
      usuarioEmail: asesoria.experto.email,
      nombre: asesoria.experto.nombre,
      apellido: asesoria.experto.apellido,
      accion: "RECHAZAR_ASESORIA",
      detalle: `Asesoría rechazada id:${asesoria._id}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res.json({ mensaje: "Asesoría rechazada y pago reembolsado.", asesoria });
  } catch (error) {
    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario?.email || null,
      accion: "ERROR_RECHAZAR_ASESORIA",
      detalle: error.message,
      resultado: "Error",
      tipo: "asesoria",
      persistirEnDB: true,
    });
    res.status(500).json({ mensaje: "Error al rechazar asesoría." });
  }
};

/**
 * @openapi
 * /api/asesorias/{id}/finalizar:
 *   put:
 *     summary: Finalizar asesoría y liberar pago
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Asesoría finalizada y pago liberado
 */
const finalizarAsesoria = async (req, res) => {
  try {
    const id = req.params.id;
    const asesoria = await Asesoria.findById(id);
    if (!asesoria)
      return res.status(404).json({ mensaje: "Asesoría no encontrada." });
    if (asesoria.estado !== "confirmada") {
      return res
        .status(400)
        .json({ mensaje: "Solo asesorías confirmadas pueden finalizarse." });
    }
    asesoria.estado = "completada";
    asesoria.fechaFinalizacion = new Date();
    await asesoria.save();
    // Liberar pago al experto (solo si estaba retenido)
    if (asesoria.pagoId) {
      const pago = await Pago.findById(asesoria.pagoId);
      if (pago && pago.estado === "retenido") {
        await Pago.findByIdAndUpdate(asesoria.pagoId, {
          estado: "liberado",
          fechaLiberacion: new Date(),
        });
      }
    }

    // Notificación y correo a cliente y experto
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

        // Enviar correo personalizado al experto
        await enviarCorreo(
          experto.email,
          "Pago liberado de tu asesoría",
          `El pago correspondiente a la asesoría titulada "${asesoria.titulo}" ha sido liberado. Puedes revisar tu cuenta.`,
          experto.nombre,
          experto.apellido
        );
      }
      if (cliente) {
        await Notificacion.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "email",
          asunto: "Asesoría finalizada",
          mensaje: `Tu asesoría "${asesoria.titulo}" ha sido finalizada y el pago fue entregado al experto.`,
          relacionadoCon: { tipo: "Pago", referenciaId: asesoria.pagoId },
          estado: "enviado",
          fechaEnvio: new Date(),
        });

        // Enviar correo personalizado al cliente
        await enviarCorreo(
          cliente.email,
          "Asesoría finalizada",
          `Tu asesoría titulada "${asesoria.titulo}" ha sido finalizada y el pago fue entregado al experto.`,
          cliente.nombre,
          cliente.apellido
        );
      }
    } catch (e) {}

    await generarLogs.registrarEvento({
      usuarioEmail: asesoria.cliente?.email || null,
      accion: "FINALIZAR_ASESORIA",
      detalle: `Asesoría finalizada id:${asesoria._id}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res.json({ mensaje: "Asesoría finalizada y pago liberado.", asesoria });
  } catch (error) {
    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario?.email || null,
      accion: "ERROR_FINALIZAR_ASESORIA",
      detalle: error.message,
      resultado: "Error",
      tipo: "asesoria",
      persistirEnDB: true,
    });
    res.status(500).json({ mensaje: "Error al finalizar asesoría." });
  }
};

// ... El resto de funciones (listarAsesorias, listarPorCliente, listarPorExperto, obtenerAsesoriaPorId, eliminarAsesoria) permanece igual ...

const listarAsesorias = async (req, res) => {
  try {
    const asesorias = await Asesoria.find();
    res.status(200).json(asesorias);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al listar asesorías." });
  }
};

const listarPorCliente = async (req, res) => {
  try {
    const email = req.params.email;
    const asesorias = await Asesoria.find({ "cliente.email": email });
    res.status(200).json(asesorias);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al listar asesorías por cliente." });
  }
};

const listarPorExperto = async (req, res) => {
  try {
    const email = req.params.email;
    const asesorias = await Asesoria.find({ "experto.email": email });
    res.status(200).json(asesorias);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al listar asesorías por experto." });
  }
};

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
  aceptarAsesoria,
  rechazarAsesoria,
  finalizarAsesoria,
  listarAsesorias,
  listarPorCliente,
  listarPorExperto,
  obtenerAsesoriaPorId,
  eliminarAsesoria,
};
