/**
 * CONTROLADOR DE ASESORÍAS
 * CRUD + flujo de pago, finalización y notificaciones.
 */
const Asesoria = require("../models/asesoria.model.js");
const Pago = require("../models/pago.model.js");
const Usuario = require("../models/usuario.model.js");
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

    // Enviar correo de confirmación de asesoría al cliente y experto
    try {
      const cliente = await Usuario.findOne({ email: datos.cliente.email });
      const experto = await Usuario.findOne({ email: datos.experto.email });

      if (cliente) {
        await enviarCorreo(
          cliente.email,
          "Confirmación de asesoría agendada",
          `Hola ${cliente.nombre}, tu asesoría con ${
            experto ? experto.nombre : datos.experto.nombre
          } está agendada para ${datos.fechaHoraInicio}.`
        );
      }
      if (experto) {
        await enviarCorreo(
          experto.email,
          "Nueva asesoría agendada",
          `Hola ${
            experto.nombre
          }, tienes una nueva asesoría agendada con el cliente ${
            cliente ? cliente.nombre : datos.cliente.nombre
          } para ${datos.fechaHoraInicio}.`
        );
      }
    } catch (e) {
      // Loguea pero no falla la asesoría si el correo no se manda
      console.error("Error enviando correo de confirmación de asesoría:", e);
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

    // Notifica al cliente y experto por correo
    try {
      const cliente = await Usuario.findOne({ email: asesoria.cliente.email });
      const experto = await Usuario.findOne({ email: asesoria.experto.email });

      if (experto) {
        await enviarCorreo(
          experto.email,
          "Tu pago por asesoría fue liberado",
          `¡Felicidades! El cliente ha finalizado la asesoría "${asesoria.titulo}" y tu pago ha sido liberado.`
        );
      }
      if (cliente) {
        await enviarCorreo(
          cliente.email,
          "Asesoría finalizada con éxito",
          `Gracias por usar Servitech. Tu asesoría "${asesoria.titulo}" ha sido finalizada y el pago fue entregado al experto.`
        );
      }
    } catch (e) {
      console.error("Error enviando correo de finalización de asesoría:", e);
    }

    res.json({ mensaje: "Asesoría finalizada y pago liberado.", asesoria });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al finalizar asesoría." });
  }
};

// Resto del CRUD se mantiene igual (listar, actualizar, eliminar, obtener por ID, etc.)

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
  finalizarAsesoria, // Nuevo endpoint
  listarAsesorias,
  listarPorCliente,
  listarPorExperto,
  obtenerAsesoriaPorId,
  actualizarAsesoria,
  eliminarAsesoria,
};
