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

// Crear una nueva asesoría (requiere objeto de pago ya creado y exitoso)
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

    res
      .status(201)
      .json({ mensaje: "Asesoría creada correctamente.", asesoria });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al crear asesoría." });
  }
};

// Endpoint para finalizar asesoría y liberar pago
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

    res.json({ mensaje: "Asesoría finalizada y pago liberado.", asesoria });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al finalizar asesoría." });
  }
};


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
  eliminarAsesoria,
};
