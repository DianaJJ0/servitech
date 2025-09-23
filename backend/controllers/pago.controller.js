const Pago = require("../models/pago.model.js");
const Usuario = require("../models/usuario.model.js");
const Notificacion = require("../models/notificacion.model.js");
const Log = require("../models/log.model.js");
const generarLogs = require("../services/generarLogs");

const mercadopago = require("mercadopago");
mercadopago.access_token = process.env.MP_ACCESS_TOKEN_SANDBOX || "";

// Estados válidos para un pago
const ESTADOS_VALIDOS = [
  "pendiente",
  "retenido",
  "liberado",
  "reembolsado",
  "fallido",
];

// Valida si un usuario tiene el rol requerido (o ambos)
function tieneRol(usuario, rol) {
  return (
    usuario &&
    usuario.roles &&
    (usuario.roles.includes(rol) ||
      usuario.roles.includes("cliente,experto") ||
      usuario.roles.length > 1)
  );
}

const crearPago = async (req, res) => {
  try {
    const datosPago = req.body;

    // Validación básica de campos obligatorios
    if (
      !datosPago.clienteId ||
      !datosPago.expertoId ||
      !datosPago.monto ||
      !datosPago.metodo ||
      !datosPago.estado
    ) {
      return res.status(400).json({
        mensaje: "Faltan datos obligatorios para el registro del pago.",
        error:
          "Campos requeridos: clienteId, expertoId, monto, metodo, estado.",
      });
    }

    // Validar monto: número y mínimo 10000
    if (
      typeof datosPago.monto !== "number" ||
      isNaN(datosPago.monto) ||
      datosPago.monto < 10000
    ) {
      return res.status(400).json({
        mensaje: "El monto debe ser un número mayor o igual a 10000.",
        error: "Monto inválido.",
      });
    }

    // Validar estado permitido
    if (!ESTADOS_VALIDOS.includes(datosPago.estado)) {
      return res.status(400).json({
        mensaje: "Estado de pago inválido.",
        error: `Estados permitidos: ${ESTADOS_VALIDOS.join(", ")}`,
      });
    }

    // Validar unicidad de transaccionId
    if (datosPago.transaccionId) {
      const pagoExistente = await Pago.findOne({
        transaccionId: datosPago.transaccionId,
      });
      if (pagoExistente) {
        return res.status(409).json({
          mensaje: "Ya existe un pago con ese transaccionId.",
          error: "Pago duplicado.",
        });
      }
    }

    // Validar existencia y roles del cliente
    const cliente = await Usuario.findOne({ email: datosPago.clienteId });
    if (!cliente || !tieneRol(cliente, "cliente")) {
      return res.status(400).json({
        mensaje: "El email de cliente no existe o no tiene el rol adecuado.",
        error: "clienteId inválido.",
      });
    }

    // Validar existencia y roles del experto
    const experto = await Usuario.findOne({ email: datosPago.expertoId });
    if (!experto || !tieneRol(experto, "experto")) {
      return res.status(400).json({
        mensaje: "El email de experto no existe o no tiene el rol adecuado.",
        error: "expertoId inválido.",
      });
    }

    // Calcular comisión y monto a experto
    const comision = +(datosPago.monto * 0.15).toFixed(2);
    const montoExperto = +(datosPago.monto - comision).toFixed(2);

    // Simulación sandbox Mercado Pago (puedes implementar preferencia si quieres)
    // const preference = await mercadopago.preferences.create({...});

    const nuevoPago = new Pago({
      ...datosPago,
      comisionPlataforma: comision,
      montoExperto,
    });
    await nuevoPago.save();

    // Notificación y log (pueden ser opcionales)
    try {
      const asunto = "Confirmación de pago";
      const mensaje = `Tu pago de $${nuevoPago.monto} COP se ha registrado correctamente para la asesoría.`;

      await Notificacion.create({
        usuarioId: cliente._id,
        email: cliente.email,
        tipo: "email",
        asunto,
        mensaje,
        relacionadoCon: { tipo: "Pago", referenciaId: nuevoPago._id },
        estado: "enviado",
        fechaEnvio: new Date(),
      });
      await Log.create({
        usuarioId: cliente._id,
        email: cliente.email,
        tipo: "pago",
        descripcion: "Registro de pago",
        entidad: "Pago",
        referenciaId: nuevoPago._id,
        datos: { asunto, mensaje },
      });
    } catch (e) {
      console.error("Error guardando log en BD:", e.message);
    }

    generarLogs.registrarEvento({
      usuarioEmail: cliente.email,
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      accion: "CREAR_PAGO",
      detalle: `Pago registrado id:${nuevoPago._id} monto:${nuevoPago.monto}`,
      resultado: "Exito",
      tipo: "pago",
      persistirEnDB: true,
    });

    res.status(201).json({ mensaje: "Pago registrado.", pago: nuevoPago });
  } catch (error) {
    generarLogs.registrarEvento({
      usuarioEmail: (req.body && req.body.clienteId) || null,
      nombre: null,
      apellido: null,
      accion: "CREAR_PAGO",
      detalle: "Error al registrar pago",
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "pago",
      persistirEnDB: true,
    });
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ mensaje: "Error de validación.", error: error.message });
    }
    if (error.code === 11000) {
      return res.status(409).json({
        mensaje: "Pago duplicado por campo único.",
        error: error.message,
      });
    }
    res.status(500).json({
      mensaje: "Error interno al registrar pago.",
      error: error.message,
    });
  }
};

const obtenerPagos = async (req, res) => {
  try {
    const pagos = await Pago.find().sort({ createdAt: -1 });
    res.status(200).json(pagos);
  } catch (error) {
    res
      .status(500)
      .json({ mensaje: "Error al listar pagos.", error: error.message });
  }
};

const obtenerPagoPorId = async (req, res) => {
  try {
    const pago = await Pago.findById(req.params.id);
    if (!pago) return res.status(404).json({ mensaje: "Pago no encontrado." });
    res.status(200).json(pago);
  } catch (error) {
    res
      .status(500)
      .json({ mensaje: "Error al buscar pago.", error: error.message });
  }
};

const actualizarEstadoPago = async (req, res) => {
  try {
    const { estado } = req.body;
    if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({
        mensaje: "Estado de pago inválido.",
        error: `Estados permitidos: ${ESTADOS_VALIDOS.join(", ")}`,
      });
    }
    const pago = await Pago.findByIdAndUpdate(
      req.params.id,
      { estado },
      { new: true }
    );
    if (!pago) return res.status(404).json({ mensaje: "Pago no encontrado." });

    // Notificación/log de cambio de estado
    try {
      const cliente = await Usuario.findOne({ email: pago.clienteId });
      if (cliente) {
        const asunto = "Actualización de estado de pago";
        const mensaje = `Tu pago ha cambiado de estado a "${estado}".`;

        await Notificacion.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "email",
          asunto,
          mensaje,
          relacionadoCon: { tipo: "Pago", referenciaId: pago._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });
        await Log.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "pago",
          descripcion: "Actualización de estado de pago",
          entidad: "Pago",
          referenciaId: pago._id,
          datos: { asunto, mensaje, nuevoEstado: estado },
        });
      }
    } catch (e) {
      console.error("Error guardando log en BD:", e.message);
    }

    generarLogs.registrarEvento({
      usuarioEmail: pago.clienteId,
      nombre: null,
      apellido: null,
      accion: "ACTUALIZAR_ESTADO_PAGO",
      detalle: `Pago ${pago._id} cambiado a ${estado}`,
      resultado: "Exito",
      tipo: "pago",
      persistirEnDB: true,
    });

    res.status(200).json({ mensaje: "Estado actualizado.", pago });
  } catch (error) {
    generarLogs.registrarEvento({
      usuarioEmail: null,
      nombre: null,
      apellido: null,
      accion: "ACTUALIZAR_ESTADO_PAGO",
      detalle: "Error al actualizar estado de pago",
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "pago",
      persistirEnDB: true,
    });
    res.status(500).json({
      mensaje: "Error al actualizar estado del pago.",
      error: error.message,
    });
  }
};

module.exports = {
  crearPago,
  obtenerPagos,
  obtenerPagoPorId,
  actualizarEstadoPago,
};
