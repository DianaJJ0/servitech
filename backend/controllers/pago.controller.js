/**
 * Controlador de Pagos Simulados - ServiTech
 * @module controllers/pago
 * @description Gestión completa de pagos simulados sin integración externa
 */

const Pago = require("../models/pago.model.js");
const Usuario = require("../models/usuario.model.js");
const Asesoria = require("../models/asesoria.model.js");
const Notificacion = require("../models/notificacion.model.js");
const generarLogs = require("../services/generarLogs");
const { enviarCorreo } = require("../services/email.service.js");
const axios = require("axios");

/**
 * Crear pago simulado y asesoría
 * @function crearPagoSimulado
 * @description Procesa un pago simulado y crea la asesoría correspondiente
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Resultado del pago simulado
 *
 * @openapi
 * /api/pagos/crear-pago-simulado:
 *   post:
 *     summary: Crear pago simulado y asesoría
 *     description: Procesa un pago de forma simulada y crea la asesoría automáticamente
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - titulo
 *               - descripcion
 */
/**
 * Envía notificaciones cuando se crea una nueva asesoría
 * @function enviarNotificacionesNuevaAsesoria
 * @private
 */
async function enviarNotificacionesNuevaAsesoria(
  asesoria,
  pago,
  experto,
  cliente
) {
  try {
    const fechaLocal = asesoria.fechaHoraInicio.toLocaleString("es-CO");
    const duracionTexto =
      asesoria.duracionMinutos === 60
        ? "1 hora"
        : asesoria.duracionMinutos === 90
        ? "1.5 horas"
        : asesoria.duracionMinutos === 120
        ? "2 horas"
        : "3 horas";

    // Notificación al experto (registro pendiente)
    const notExp = await Notificacion.create({
      usuarioId: experto._id,
      email: experto.email,
      tipo: "email",
      asunto: "Nueva asesoría pendiente - Pago confirmado",
      mensaje: `Tienes una nueva solicitud de asesoría "${asesoria.titulo}". El pago ya fue procesado y está retenido de forma segura.`,
      relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
      estado: "pendiente",
      fechaEnvio: new Date(),
    });

    try {
      // If payment metadata indicates simulation for emails, mark as sent without calling SendGrid
      if (pago && pago.metadatos && pago.metadatos.simulateEmail) {
        await Notificacion.findByIdAndUpdate(notExp._id, { estado: "enviado" });
      } else {
        await enviarCorreo(
          experto.email,
          "Nueva asesoría pendiente - Pago confirmado",
          `Tienes una nueva solicitud de asesoría titulada "${
            asesoria.titulo
          }".\n\nCliente: ${cliente.nombre} ${
            cliente.apellido
          }\nFecha y hora: ${fechaLocal}\nDuración: ${duracionTexto}\nMonto: $${pago.monto.toLocaleString(
            "es-CO"
          )} COP \n\nIngresa a ServiTech para aceptar o rechazar esta solicitud. Tienes 24 horas para responder.`,
          {
            nombreDestinatario: experto.nombre,
            apellidoDestinatario: experto.apellido,
          }
        );
        await Notificacion.findByIdAndUpdate(notExp._id, { estado: "enviado" });
      }
    } catch (errEmail) {
      console.error(
        "Error enviando correo al experto:",
        errEmail.message || errEmail
      );
      const msgLower = (errEmail.message || "").toLowerCase();
      const isAuthError =
        msgLower.includes("authorization grant is invalid") ||
        msgLower.includes("unauthorized") ||
        msgLower.includes("invalid grant");
      const fallbackEnabled =
        String(process.env.SENDGRID_FALLBACK || "").toLowerCase() === "true" ||
        (process.env.NODE_ENV || "development") !== "production";
      if (isAuthError && fallbackEnabled) {
        // Fallback: marcar como enviado para desarrollo y volcar contenido al log
        await Notificacion.findByIdAndUpdate(notExp._id, {
          estado: "enviado",
          detalleError: `SendGrid auth failed; fallback marcado como enviado.`,
        });
        console.warn(
          "SendGrid auth failed. Email to experto logged below (DEV FALLBACK):"
        );
        console.warn(`TO: ${experto.email}`);
        console.warn(`SUBJECT: Nueva asesoría pendiente - Pago confirmado`);
        console.warn(
          `BODY: Tienes una nueva solicitud de asesoría titulada "${
            asesoria.titulo
          }". Cliente: ${cliente.nombre} ${
            cliente.apellido
          } Fecha y hora: ${fechaLocal} Duración: ${duracionTexto} Monto: $${pago.monto.toLocaleString(
            "es-CO"
          )} COP`
        );
      } else {
        await Notificacion.findByIdAndUpdate(notExp._id, {
          estado: "error",
          detalleError: errEmail.message || String(errEmail),
        });
      }
    }

    // Notificación al cliente (registro pendiente)
    const notCli = await Notificacion.create({
      usuarioId: cliente._id,
      email: cliente.email,
      tipo: "email",
      asunto: "Pago procesado - Asesoría enviada al experto",
      mensaje: `Tu pago fue procesado exitosamente. La solicitud de asesoría "${asesoria.titulo}" fue enviada al experto para su revisión.`,
      relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
      estado: "pendiente",
      fechaEnvio: new Date(),
    });

    try {
      await enviarCorreo(
        cliente.email,
        "Pago procesado - Asesoría enviada al experto",
        `Tu pago de $${pago.monto.toLocaleString(
          "es-CO"
        )} COP fue procesado exitosamente.\n\nLa solicitud de asesoría "${
          asesoria.titulo
        }" fue enviada a ${experto.nombre} ${
          experto.apellido
        } para su revisión.\n\nEl experto tiene 24 horas para aceptar o rechazar tu solicitud. Recibirás una notificación con su respuesta.`,
        {
          nombreDestinatario: cliente.nombre,
          apellidoDestinatario: cliente.apellido,
        }
      );
      await Notificacion.findByIdAndUpdate(notCli._id, { estado: "enviado" });
    } catch (errCli) {
      console.error(
        "Error enviando correo al cliente:",
        errCli.message || errCli
      );
      const msgLowerCli = (errCli.message || "").toLowerCase();
      const isAuthErrorCli =
        msgLowerCli.includes("authorization grant is invalid") ||
        msgLowerCli.includes("unauthorized") ||
        msgLowerCli.includes("invalid grant");
      const fallbackEnabledCli =
        String(process.env.SENDGRID_FALLBACK || "").toLowerCase() === "true" ||
        (process.env.NODE_ENV || "development") !== "production";
      if (isAuthErrorCli && fallbackEnabledCli) {
        await Notificacion.findByIdAndUpdate(notCli._id, {
          estado: "enviado",
          detalleError: `SendGrid auth failed; fallback marcado como enviado.`,
        });
        console.warn(
          "SendGrid auth failed. Email to cliente logged below (DEV FALLBACK):"
        );
        console.warn(`TO: ${cliente.email}`);
        console.warn(`SUBJECT: Confirmación de solicitud - Pago recibido`);
        console.warn(
          `BODY: Hemos recibido tu pago de $${pago.monto.toLocaleString(
            "es-CO"
          )} COP para la asesoría "${
            asesoria.titulo
          }". El pago está retenido hasta que el experto acepte la solicitud.`
        );
      } else {
        await Notificacion.findByIdAndUpdate(notCli._id, {
          estado: "error",
          detalleError: errCli.message || String(errCli),
        });
      }
    }
  } catch (error) {
    console.error("Error enviando notificaciones de nueva asesoría:", error);
  }
}
const crearPagoConMercadoPago = async (req, res) => {
  try {
    const {
      titulo,
      descripcion,
      expertoEmail,
      fechaHoraInicio,
      duracionMinutos,
      monto,
    } = req.body;

    console.log("=== CREAR PAGO ===");
    console.log("Datos recibidos:", {
      titulo,
      descripcion,
      expertoEmail,
      fechaHoraInicio,
      duracionMinutos,
      monto,
    });

    // Validaciones básicas

    if (
      !titulo ||
      !descripcion ||
      !expertoEmail ||
      !fechaHoraInicio ||
      !duracionMinutos ||
      !monto
    ) {
      return res.status(400).json({
        mensaje: "Todos los campos son requeridos",
      });
    }

    // No se requieren datos de tarjeta en el servidor cuando se usa Mercado Pago Checkout Pro.
    // La identificación del cliente proviene de `req.usuario` (autenticación) y ya registramos
    // un pago interno sin almacenar datos sensibles.

    if (monto < 1000) {
      return res.status(400).json({
        mensaje: "El monto mínimo es $10.000 COP",
      });
    }

    // Verificar que el experto existe y está activo
    const experto = await Usuario.findOne({
      email: expertoEmail,
      roles: "experto",
      estado: "activo",
    });

    if (!experto) {
      return res.status(404).json({
        mensaje: "Experto no encontrado o no está activo",
      });
    }

    // Verificar que no sea el mismo usuario
    if (req.usuario.email === expertoEmail) {
      return res.status(400).json({
        mensaje: "No puedes crear una asesoría contigo mismo",
      });
    }

    const fechaAsesoria = new Date(fechaHoraInicio);
    const ahora = new Date();

    // Validar que la fecha sea futura
    if (fechaAsesoria <= ahora) {
      return res.status(400).json({
        mensaje: "La fecha de la asesoría debe ser futura",
      });
    }

    // Verificar disponibilidad del experto
    const fechaFin = new Date(
      fechaAsesoria.getTime() + duracionMinutos * 60000
    );

    const asesoriaConflicto = await Asesoria.findOne({
      "experto.email": expertoEmail,
      estado: { $in: ["confirmada", "en-progreso"] },
      $or: [
        {
          // Asesoría existente que empieza antes y termina después del inicio de la nueva
          fechaHoraInicio: { $lte: fechaAsesoria },
          fechaHoraFin: { $gt: fechaAsesoria },
        },
        {
          // Asesoría existente que empieza antes del fin de la nueva y termina después
          fechaHoraInicio: { $lt: fechaFin },
          fechaHoraFin: { $gte: fechaFin },
        },
        {
          // Asesoría existente que está completamente dentro de la nueva
          fechaHoraInicio: { $gte: fechaAsesoria },
          fechaHoraFin: { $lte: fechaFin },
        },
      ],
    });

    if (asesoriaConflicto) {
      return res.status(400).json({
        mensaje: "El experto ya tiene una asesoría programada en ese horario",
        conflicto: {
          titulo: asesoriaConflicto.titulo,
          fecha: asesoriaConflicto.fechaHoraInicio,
          estado: asesoriaConflicto.estado,
        },
      });
    }

    // Crear registro de pago inicial (sin datos sensibles)
    const nuevoPago = new Pago({
      clienteId: req.usuario.email,
      expertoId: expertoEmail,
      monto: parseFloat(monto),
      metodo: "mercadopago",
      estado: "retenido", // consideraremos retenido hasta confirmación de MP
      descripcion: `Asesoría: ${titulo}`,
      fechaHoraAsesoria: fechaAsesoria,
      duracionMinutos: parseInt(duracionMinutos),
      metadatos: {
        titulo: titulo,
        descripcion: descripcion,
        expertoNombre: `${experto.nombre} ${experto.apellido}`,
        clienteNombre: `${req.usuario.nombre} ${req.usuario.apellido}`,
        creadoEn: new Date(),
      },
    });
    await nuevoPago.save();
    console.log("Pago (registro) creado:", nuevoPago._id);

    // Crear asesoría automáticamente
    const nuevaAsesoria = new Asesoria({
      titulo: titulo,
      descripcion: descripcion,
      cliente: {
        email: req.usuario.email,
        nombre: req.usuario.nombre,
        apellido: req.usuario.apellido,
        avatarUrl: req.usuario.avatarUrl || null,
      },
      experto: {
        email: experto.email,
        nombre: experto.nombre,
        apellido: experto.apellido,
        avatarUrl: experto.avatarUrl || null,
      },
      categoria: "Tecnologia",
      fechaHoraInicio: fechaAsesoria,
      fechaHoraFin: fechaFin,
      duracionMinutos: parseInt(duracionMinutos),
      estado: "pendiente-aceptacion",
      pagoId: nuevoPago._id,
    });

    await nuevaAsesoria.save();
    console.log("Asesoría creada:", nuevaAsesoria._id);

    // Actualizar pago con ID de asesoría
    await Pago.findByIdAndUpdate(nuevoPago._id, {
      asesoriaId: nuevaAsesoria._id,
    });

    // Crear preferencia en Mercado Pago (Checkout Pro) mediante HTTP (axios)
    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({
        mensaje:
          "Falta configuración de Mercado Pago (MP_ACCESS_TOKEN) en el servidor",
      });
    }

    const preferenceBody = {
      items: [
        {
          title: `Asesoría: ${titulo}`,
          quantity: 1,
          currency_id: "COP",
          unit_price: parseFloat(monto),
          description: descripcion,
        },
      ],
      external_reference: `${nuevoPago._id}`,
      back_urls: {
        success: `${
          process.env.APP_URL || "http://localhost:5020"
        }/confirmacion-asesoria`,
        failure: `${
          process.env.APP_URL || "http://localhost:5020"
        }/pasarelaPagos`,
        pending: `${
          process.env.APP_URL || "http://localhost:5020"
        }/pasarelaPagos`,
      },
    };

    let preferenceId = null;
    let initPoint = null;
    try {
      console.log(
        "Crear preferencia MP. preferenceBody:",
        JSON.stringify(preferenceBody)
      );

      const mpResponse = await axios.post(
        "https://api.mercadopago.com/checkout/preferences",
        preferenceBody,
        {
          headers: {
            Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      // Log completo de la respuesta de Mercado Pago para facilitar debugging
      console.log("MP response status:", mpResponse.status);
      console.log("MP response data:", JSON.stringify(mpResponse.data));

      preferenceId = mpResponse.data.id;
      // Algunos entornos/sandboxes pueden devolver campos distintos; guardamos init_point si existe
      initPoint =
        mpResponse.data.init_point ||
        mpResponse.data.sandbox_init_point ||
        null;
    } catch (mpErr) {
      // Si Mercado Pago devuelve error 4xx/5xx axios lo deja en mpErr.response
      console.error("Error creando preferencia MP:", mpErr.message);
      if (mpErr.response) {
        console.error("MP response status:", mpErr.response.status);
        console.error("MP response data:", mpErr.response.data);
        return res.status(mpErr.response.status).json({
          mensaje: "Error interno al procesar la solicitud",
          error: mpErr.response.data || mpErr.message,
        });
      }
      return res.status(500).json({
        mensaje: "Error interno al procesar la solicitud",
        error: mpErr.message,
      });
    }

    // Guardar referencia de Mercado Pago en pago
    await Pago.findByIdAndUpdate(nuevoPago._id, { preferenceId, initPoint });

    // If client requested simulation fallback, create a simulated payment record
    // with a fake mpPaymentId and card metadata so the confirmation page and
    // notifications show card details even if Mercado Pago UI later fails.
    const simulateFlag = req.body?.simulate || req.query?.simulate || false;
    if (simulateFlag) {
      const simulatedPaymentId = `SIM-MP-${Date.now()}`;
      const simulatedCard = {
        metodo: "tarjeta",
        numeroTarjeta: "4242424242424242",
        // store masked for display
        numeroTarjetaMask: `**** **** **** ${"4242424242424242".slice(-4)}`,
        expiracionTarjeta: "12/30",
        titular: `${req.usuario.nombre} ${req.usuario.apellido}`,
        nombre: req.usuario.nombre,
        email: req.usuario.email,
      };

      await Pago.findByIdAndUpdate(nuevoPago._id, {
        mpPaymentId: simulatedPaymentId,
        transaccionId: simulatedPaymentId,
        metodo: "tarjeta",
        metadatos: {
          ...nuevoPago.metadatos,
          datosPago: simulatedCard,
          simulateEmail: true,
        },
      });

      // Refresh the nuevoPago object reference for notifications
      const refreshedPago = await Pago.findById(nuevoPago._id);
      // Use the refreshed pago for notifications
      enviarNotificacionesNuevaAsesoria(
        nuevaAsesoria,
        refreshedPago,
        experto,
        req.usuario
      )
        .then(() => console.log("Notificaciones (async, simulate) enviadas"))
        .catch((err) =>
          console.error("Error async enviando notificaciones (simulate):", err)
        );
    } else {
      // Enviar notificaciones en background (no bloquean la respuesta al frontend)
      enviarNotificacionesNuevaAsesoria(
        nuevaAsesoria,
        nuevoPago,
        experto,
        req.usuario
      )
        .then(() => {
          console.log("Notificaciones (async) enviadas");
        })
        .catch((err) => {
          console.error(
            "Error async enviando notificaciones:",
            err.message || err
          );
        });
    }

    // Enviar notificaciones en background (no bloquean la respuesta al frontend)
    enviarNotificacionesNuevaAsesoria(
      nuevaAsesoria,
      nuevoPago,
      experto,
      req.usuario
    )
      .then(() => {
        console.log("Notificaciones (async) enviadas");
      })
      .catch((err) => {
        console.error(
          "Error async enviando notificaciones:",
          err.message || err
        );
      });

    // Responder con URL de checkout (para frontend usar Checkout Pro)
    return res.status(201).json({
      mensaje: "Preferencia creada",
      pagoId: nuevoPago._id,
      asesoriaId: nuevaAsesoria._id,
      preferenceId,
      initPoint,
    });
  } catch (error) {
    console.error("Error creando pago simulado:", error);

    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario?.email || null,
      accion: "ERROR_CREAR_PAGO_SIMULADO",
      detalle: error.message,
      resultado: "Error",
      tipo: "pago",
      persistirEnDB: true,
    });

    res.status(500).json({
      mensaje: "Error interno al procesar la solicitud",
      error: error.message,
    });
  }
};

/**
 * Webhook handler para notificaciones de Mercado Pago
 * - Actualiza pago y asesoría según el evento
 */
const mpWebhook = async (req, res) => {
  try {
    // Validar firma HMAC (si MP_WEBHOOK_SECRET está configurada)
    const mpWebhookSecret = process.env.MP_WEBHOOK_SECRET || null;
    if (mpWebhookSecret) {
      const signatureHeader =
        req.headers["x-hook-signature"] ||
        req.headers["x-hub-signature-256"] ||
        req.headers["x-hub-signature"] ||
        null;
      if (!signatureHeader) {
        console.warn("Webhook MP recibido sin header de firma");
        return res.status(400).send("Missing signature header");
      }
      const crypto = require("crypto");
      const raw = req.rawBody
        ? req.rawBody
        : Buffer.from(JSON.stringify(req.body));
      const hmacHex = crypto
        .createHmac("sha256", mpWebhookSecret)
        .update(raw)
        .digest("hex");
      const hmacBase64 = crypto
        .createHmac("sha256", mpWebhookSecret)
        .update(raw)
        .digest("base64");
      if (signatureHeader !== hmacHex && signatureHeader !== hmacBase64) {
        console.warn("Firma de webhook inválida", {
          header: signatureHeader,
          hmacHex,
          hmacBase64,
        });
        return res.status(400).send("Invalid signature");
      }
    }

    // Mercado Pago envía información en body o query según configuración
    const topic = req.body.type || req.query.type || null;
    const data = req.body || req.query || {};

    // Para simplicidad, si recibimos external_reference en data
    let externalReference = null;
    if (req.body && req.body.data && req.body.data.id) {
      // si es notificación de pago, debemos consultar la API de MP para obtener detalles
      const paymentId = req.body.data.id;
      // Consultar detalle del pago en Mercado Pago
      const paymentResp = await axios.get(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
        }
      );
      const mpPayment = paymentResp.data;
      externalReference = mpPayment.external_reference;

      // Actualizar pago según estado
      const pago = await Pago.findById(externalReference);
      if (!pago) return res.status(200).send();

      // Guardar mpPaymentId y estado
      await Pago.findByIdAndUpdate(pago._id, {
        mpPaymentId: mpPayment.id,
        transaccionId: mpPayment.id,
        estado: mpPayment.status === "approved" ? "retenido" : pago.estado,
        metadatos: { ...pago.metadatos, mpPayment },
      });

      // Si pago aprobado, mantener retenido hasta liberación manual
      // Si pago rechazado/cancelado -> marcar reembolsado y notificar
      if (mpPayment.status === "rejected" || mpPayment.status === "cancelled") {
        await Pago.findByIdAndUpdate(pago._id, { estado: "reembolsado" });
        // enviar notificaciones si es necesario
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Error webhook MP:", error);
    res.status(500).send();
  }
};

/**
 * Liberar pago al finalizar asesoría
 * @function liberarPago
 * @description Libera el pago retenido cuando se finaliza una asesoría
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Resultado de la liberación
 *
 * @openapi
 * /api/pagos/{id}/liberar:
 *   post:
 *     summary: Liberar pago retenido
 *     description: Libera el dinero retenido al experto cuando se finaliza una asesoría
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del pago
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Pago liberado exitosamente
 *       400:
 *         description: El pago no puede ser liberado
 *       404:
 *         description: Pago no encontrado
 *       403:
 *         description: Sin permisos para liberar el pago
 */
/**
 * Liberar pago al finalizar asesoría
 * - Verifica que el pago exista y que en Mercado Pago esté aprobado
 * - Calcula cortes y registra metadatos de transferencia
 * - (Opcional) Si MP_TRANSFERS_ENABLED=true, aquí se integraría la transferencia real
 */
const liberarPago = async (req, res) => {
  try {
    const pagoId = req.params.id;

    console.log("=== LIBERAR PAGO ===");
    console.log("PagoId:", pagoId);

    const pago = await Pago.findById(pagoId);
    if (!pago) {
      return res.status(404).json({ mensaje: "Pago no encontrado" });
    }

    // Verificar que el pago esté en estado retenido
    if (pago.estado !== "retenido") {
      return res.status(400).json({
        mensaje: `El pago no puede ser liberado. Estado actual: ${pago.estado}`,
      });
    }

    // Verificar permisos (cliente, experto o admin)
    const esCliente = req.usuario.email === pago.clienteId;
    const esExperto = req.usuario.email === pago.expertoId;
    const esAdmin = req.usuario.roles && req.usuario.roles.includes("admin");

    if (!esCliente && !esExperto && !esAdmin) {
      return res.status(403).json({
        mensaje: "No tienes permisos para liberar este pago",
      });
    }

    // Si el pago tiene un mpPaymentId, consultamos a Mercado Pago para verificar que esté aprobado
    let mpPayment = null;
    if (pago.mpPaymentId && process.env.MP_ACCESS_TOKEN) {
      try {
        const mpResp = await axios.get(
          `https://api.mercadopago.com/v1/payments/${pago.mpPaymentId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
            },
          }
        );
        mpPayment = mpResp.data;
      } catch (err) {
        console.warn(
          "No se pudo consultar MP para verificar pago:",
          err.message
        );
      }
    }

    // Si hay mpPayment y no está aprobado, no dejamos liberar
    if (mpPayment && mpPayment.status !== "approved") {
      return res.status(400).json({
        mensaje: `El pago en Mercado Pago no está aprobado (estado: ${mpPayment.status}). No se puede liberar.`,
      });
    }

    // Calcular reparto: 95% experto, 5% ServiTech
    const monto = pago.monto || 0;
    const expertoPorcentaje = 0.95;
    const serviTechPorcentaje = 0.05;
    const montoExperto = Math.round(monto * expertoPorcentaje);
    const montoServiTech = monto - montoExperto;

    // Actualizar estado del pago a liberado y registrar metadatos de reparto
    await Pago.findByIdAndUpdate(pagoId, {
      estado: "liberado",
      fechaLiberacion: new Date(),
      metadatos: {
        ...pago.metadatos,
        liberadoPor: req.usuario.email,
        fechaLiberacion: new Date(),
        repartos: {
          experto: montoExperto,
          serviTech: montoServiTech,
        },
        transferExecuted: false,
      },
    });

    console.log(
      "Pago marcado como liberado (registro interno). Reparto calculado."
    );

    // NOTA: Para realizar la transferencia real al experto se requiere la funcionalidad de "payouts"
    // o "transfers" de Mercado Pago que depende del tipo de cuenta y permisos. Aquí solo registramos
    // el intento. Para habilitar transferencias automáticas configure MP_TRANSFERS_ENABLED=true y
    // reemplace la sección siguiente por la llamada a la API de transferencias de Mercado Pago.

    // Si la opción está habilitada, intentar crear transferencia (payout) a la cuenta del experto
    const pagoActualizado = await Pago.findById(pagoId);
    if (
      String(process.env.MP_TRANSFERS_ENABLED || "false").toLowerCase() ===
      "true"
    ) {
      try {
        // El experto debe tener configurado un identificador para recibir pagos en MP (ej: collector_account o entidad similar)
        const expertoUsuario = await Usuario.findOne({ email: pago.expertoId });
        const recipientId = expertoUsuario?.infoExperto?.mpAccountId || null;
        if (!recipientId) {
          console.warn(
            "No se encontró mpAccountId para el experto; transferencia no ejecutada."
          );
        } else {
          // Scaffold: llamar al endpoint de transferencias /v1/merchant_orders o endpoints de payouts
          // Nota: la API de MP para transferencias varía según tipo de integración; aquí llamamos a un endpoint genérico
          const transferBody = {
            amount: montoExperto,
            currency: "COP",
            recipient_id: recipientId,
            reference: `Pago ${pagoId}`,
          };

          const transferResp = await axios.post(
            `https://api.mercadopago.com/v1/transfers`,
            transferBody,
            {
              headers: {
                Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
              },
            }
          );

          // Guardar resultado de la transferencia en metadatos
          await Pago.findByIdAndUpdate(pagoId, {
            metadatos: {
              ...pagoActualizado.metadatos,
              transferResult: transferResp.data,
            },
          });
        }
      } catch (err) {
        console.error("Error ejecutando transferencia MP:", err.message);
        // Guardar el error en metadatos
        await Pago.findByIdAndUpdate(pagoId, {
          metadatos: {
            ...pagoActualizado.metadatos,
            transferError: err.message,
          },
        });
      }
    }

    await enviarNotificacionesLiberacionPago(pagoActualizado);

    // Registrar evento
    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario.email,
      nombre: req.usuario.nombre,
      apellido: req.usuario.apellido,
      accion: "LIBERAR_PAGO",
      detalle: `Pago ${pagoId} liberado exitosamente`,
      resultado: "Exito",
      tipo: "pago",
      persistirEnDB: true,
    });

    res.json({
      mensaje: "Pago liberado exitosamente",
      pagoId: pagoId,
      estado: "liberado",
    });
  } catch (error) {
    console.error("Error liberando pago:", error);
    res.status(500).json({
      mensaje: "Error interno liberando pago",
      error: error.message,
    });
  }
};

/**
 * Reembolsar pago
 * @function reembolsarPago
 * @description Procesa un reembolso total o parcial de un pago
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Resultado del reembolso
 *
 * @openapi
 * /api/pagos/{id}/reembolsar:
 *   post:
 *     summary: Procesar reembolso de pago
 *     description: Procesa un reembolso cuando se cancela una asesoría
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del pago
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *                 description: Motivo del reembolso
 *                 example: "Asesoría cancelada por el experto"
 *               monto:
 *                 type: number
 *                 description: Monto a reembolsar (opcional, por defecto el total)
 *                 example: 25000
 *     responses:
 *       200:
 *         description: Reembolso procesado exitosamente
 *       400:
 *         description: El pago no puede ser reembolsado
 *       404:
 *         description: Pago no encontrado
 *       403:
 *         description: Sin permisos para reembolsar
 */
const reembolsarPago = async (req, res) => {
  try {
    const pagoId = req.params.id;
    const { motivo = "Asesoría cancelada", monto } = req.body;

    console.log("=== REEMBOLSAR PAGO ===");
    console.log("PagoId:", pagoId, "Motivo:", motivo);

    const pago = await Pago.findById(pagoId);
    if (!pago) {
      return res.status(404).json({ mensaje: "Pago no encontrado" });
    }

    // Verificar que el pago pueda ser reembolsado
    if (!["retenido", "liberado"].includes(pago.estado)) {
      return res.status(400).json({
        mensaje: "El pago no puede ser reembolsado en su estado actual",
      });
    }

    // Verificar permisos
    const esCliente = req.usuario.email === pago.clienteId;
    const esExperto = req.usuario.email === pago.expertoId;
    const esAdmin = req.usuario.roles && req.usuario.roles.includes("admin");

    if (!esCliente && !esExperto && !esAdmin) {
      return res.status(403).json({
        mensaje: "No tienes permisos para reembolsar este pago",
      });
    }

    const montoReembolso = monto || pago.monto;

    if (montoReembolso > pago.monto) {
      return res.status(400).json({
        mensaje: "El monto a reembolsar no puede ser mayor al monto original",
      });
    }

    const nuevoEstado =
      montoReembolso === pago.monto ? "reembolsado" : "reembolsado-parcial";

    // Si el pago tiene mpPaymentId y tenemos token, intentar refund en Mercado Pago
    if (pago.mpPaymentId && process.env.MP_ACCESS_TOKEN) {
      try {
        const refundBody = {};
        if (monto && monto < pago.monto) refundBody.amount = monto;

        await axios.post(
          `https://api.mercadopago.com/v1/payments/${pago.mpPaymentId}/refunds`,
          refundBody,
          {
            headers: {
              Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );
      } catch (err) {
        console.error("Error solicitando refund a Mercado Pago:", err.message);
        // No bloquear la respuesta; igual actualizamos registro y notificamos
      }
    }

    // Actualizar estado del pago internamente
    await Pago.findByIdAndUpdate(pagoId, {
      estado: nuevoEstado,
      fechaReembolso: new Date(),
      metadatos: {
        ...pago.metadatos,
        motivoReembolso: motivo,
        montoReembolsado: montoReembolso,
        procesadoPor: req.usuario.email,
        fechaReembolso: new Date(),
      },
    });

    // Enviar notificaciones de reembolso
    await enviarNotificacionesReembolso(pago, motivo, montoReembolso);

    // Registrar evento
    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario.email,
      nombre: req.usuario.nombre,
      apellido: req.usuario.apellido,
      accion: "REEMBOLSAR_PAGO",
      detalle: `Reembolso procesado para pago ${pagoId}, monto: $${montoReembolso}`,
      resultado: "Exito",
      tipo: "pago",
      persistirEnDB: true,
    });

    res.json({
      mensaje: "Reembolso procesado exitosamente",
      pagoId: pagoId,
      montoReembolsado: montoReembolso,
      estado: nuevoEstado,
    });
  } catch (error) {
    console.error("Error procesando reembolso:", error);
    res.status(500).json({
      mensaje: "Error interno procesando reembolso",
      error: error.message,
    });
  }
};

/**
 * Obtener estado de notificaciones asociadas a un pago
 * Devuelve si las notificaciones fueron enviadas o si hubo errores (simplificado)
 */
const obtenerEstadoNotificaciones = async (req, res) => {
  try {
    const pagoId = req.params.id;
    const pago = await Pago.findById(pagoId);
    if (!pago) return res.status(404).json({ mensaje: "Pago no encontrado" });

    // Buscar notificaciones relacionadas con la asesoria o pago
    const notis = await Notificacion.find({
      $or: [
        { "relacionadoCon.referenciaId": pago.asesoriaId },
        { "relacionadoCon.referenciaId": pagoId },
      ],
    })
      .sort({ fechaEnvio: -1 })
      .limit(5)
      .lean();

    if (!notis || notis.length === 0) {
      return res.json({ enviado: false, detalles: [] });
    }

    const detalles = notis.map((n) => ({
      email: n.email,
      asunto: n.asunto,
      estado: n.estado,
      fechaEnvio: n.fechaEnvio,
    }));

    const enviado = notis.some((n) => n.estado === "enviado");
    return res.json({ enviado, detalles });
  } catch (error) {
    console.error("Error obteniendo estado de notificaciones:", error);
    return res.status(500).json({ mensaje: "Error interno" });
  }
};

/**
 * Reenviar notificaciones manualmente para un pago/asesoria
 */
const reenviarNotificaciones = async (req, res) => {
  try {
    const pagoId = req.params.id;
    const pago = await Pago.findById(pagoId);
    if (!pago) return res.status(404).json({ mensaje: "Pago no encontrado" });

    const asesoria = await Asesoria.findById(pago.asesoriaId);
    if (!asesoria)
      return res.status(404).json({ mensaje: "Asesoría no encontrada" });

    const experto = await Usuario.findOne({ email: pago.expertoId });

    // Ejecutar en background
    enviarNotificacionesNuevaAsesoria(asesoria, pago, experto, {
      nombre: pago.clienteId,
      email: pago.clienteId,
    })
      .then(() => console.log("Reenvío notificaciones completado"))
      .catch((err) => console.error("Error en reenvío notificaciones:", err));

    return res.json({ mensaje: "Reenvío iniciado" });
  } catch (error) {
    console.error("Error reenviando notificaciones:", error);
    return res.status(500).json({ mensaje: "Error interno" });
  }
};

/**
 * Obtener pagos con paginación
 * @function obtenerPagos
 * @description Obtiene lista paginada de pagos (solo administradores)
 */
const obtenerPagos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filtros = {};
    if (req.query.estado) {
      filtros.estado = req.query.estado;
    }
    if (req.query.metodo) {
      filtros.metodo = req.query.metodo;
    }

    const pagos = await Pago.find(filtros)
      .sort({ fechaCreacion: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Pago.countDocuments(filtros);

    res.json({
      pagos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error obteniendo pagos:", error);
    res.status(500).json({ mensaje: "Error interno obteniendo pagos" });
  }
};

/**
 * Obtener pago por ID
 * @function obtenerPagoPorId
 * @description Obtiene información de un pago específico
 */
const obtenerPagoPorId = async (req, res) => {
  try {
    const pago = await Pago.findById(req.params.id);

    if (!pago) {
      return res.status(404).json({ mensaje: "Pago no encontrado" });
    }

    res.json(pago);
  } catch (error) {
    console.error("Error obteniendo pago:", error);
    res.status(500).json({ mensaje: "Error interno obteniendo pago" });
  }
};

// Funciones auxiliares para notificaciones

/**
 * Envía notificaciones cuando se crea una nueva asesoría
 * @function enviarNotificacionesNuevaAsesoria
 * @private
 */
async function enviarNotificacionesNuevaAsesoria(
  asesoria,
  pago,
  experto,
  cliente
) {
  try {
    const fechaLocal = asesoria.fechaHoraInicio.toLocaleString("es-CO");
    const duracionTexto =
      asesoria.duracionMinutos === 60
        ? "1 hora"
        : asesoria.duracionMinutos === 90
        ? "1.5 horas"
        : asesoria.duracionMinutos === 120
        ? "2 horas"
        : "3 horas";

    // Notificación al experto
    // Crear registro de notificación con estado pendiente (intento)
    const notExp = await Notificacion.create({
      usuarioId: experto._id,
      email: experto.email,
      tipo: "email",
      asunto: "Nueva asesoría pendiente - Pago confirmado",
      mensaje: `Tienes una nueva solicitud de asesoría "${asesoria.titulo}". El pago ya fue procesado y está retenido de forma segura.`,
      relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
      estado: "pendiente",
      fechaEnvio: new Date(),
    });

    try {
      await enviarCorreo(
        experto.email,
        "Nueva asesoría pendiente - Pago confirmado",
        `Tienes una nueva solicitud de asesoría titulada "${
          asesoria.titulo
        }".\n\nCliente: ${cliente.nombre} ${
          cliente.apellido
        }\nFecha y hora: ${fechaLocal}\nDuración: ${duracionTexto}\nMonto: $${pago.monto.toLocaleString(
          "es-CO"
        )} COP\n\nEl pago fue procesado en modo simulación y está retenido de forma segura. Ingresa a ServiTech para aceptar o rechazar esta solicitud.\n\nTienes 24 horas para responder a esta solicitud.`,
        {
          nombreDestinatario: experto.nombre,
          apellidoDestinatario: experto.apellido,
        }
      );
      // marcar como enviado
      await Notificacion.findByIdAndUpdate(notExp._id, { estado: "enviado" });
    } catch (errEmail) {
      console.error(
        "Error enviando correo al experto:",
        errEmail.message || errEmail
      );
      await Notificacion.findByIdAndUpdate(notExp._id, {
        estado: "error",
        detalleError: errEmail.message || String(errEmail),
      });
    }

    // Notificación al cliente
    try {
      const clienteNot = await Notificacion.create({
        usuarioId: cliente._id,
        email: cliente.email,
        tipo: "email",
        asunto: "Confirmación de solicitud - Pago recibido",
        mensaje: `Tu solicitud de asesoría "${asesoria.titulo}" ha sido recibida y el pago se encuentra retenido. Pronto el experto responderá.`,
        relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
        estado: "pendiente",
        fechaEnvio: new Date(),
      });

      try {
        if (pago && pago.metadatos && pago.metadatos.simulateEmail) {
          await Notificacion.findByIdAndUpdate(clienteNot._id, {
            estado: "enviado",
          });
        } else {
          await enviarCorreo(
            cliente.email,
            "Confirmación de solicitud - Pago recibido ",
            `Hemos recibido tu pago de $${pago.monto.toLocaleString(
              "es-CO"
            )} COP para la asesoría "${
              asesoria.titulo
            }". El pago está retenido hasta que el experto acepte la solicitud.`,
            {
              nombreDestinatario: cliente.nombre,
              apellidoDestinatario: cliente.apellido,
            }
          );
          await Notificacion.findByIdAndUpdate(clienteNot._id, {
            estado: "enviado",
          });
        }
      } catch (errCli) {
        console.error(
          "Error enviando correo al cliente:",
          errCli.message || errCli
        );
        await Notificacion.findByIdAndUpdate(clienteNot._id, {
          estado: "error",
          detalleError: errCli.message || String(errCli),
        });
      }
    } catch (errCreateNot) {
      console.error("Error creando notificación para cliente:", errCreateNot);
    }
  } catch (err) {
    console.error("Error en enviarNotificacionesNuevaAsesoria:", err);
  }
}

async function enviarNotificacionesLiberacionPago(pago) {
  try {
    const cliente = await Usuario.findOne({ email: pago.clienteId });
    const experto = await Usuario.findOne({ email: pago.expertoId });

    if (!cliente || !experto) return;

    // Notificación al experto
    await enviarCorreo(
      experto.email,
      "Pago liberado - Asesoría completada",
      `El pago de $${pago.monto.toLocaleString(
        "es-CO"
      )} COP ha sido liberado exitosamente.

La asesoría con ${cliente.nombre} ${
        cliente.apellido
      } fue completada satisfactoriamente.

Este fue un pago simulado para desarrollo. En producción, el dinero sería transferido a tu cuenta.`,
      {
        nombreDestinatario: experto.nombre,
        apellidoDestinatario: experto.apellido,
      }
    );

    // Notificación al cliente
    await enviarCorreo(
      cliente.email,
      "Asesoría completada - Pago liberado",
      `Tu asesoría con ${experto.nombre} ${
        experto.apellido
      } ha sido completada exitosamente.

El pago de $${pago.monto.toLocaleString(
        "es-CO"
      )} COP ha sido liberado al experto.

Gracias por usar ServiTech. ¡Esperamos que hayas tenido una excelente experiencia!`,
      {
        nombreDestinatario: cliente.nombre,
        apellidoDestinatario: cliente.apellido,
      }
    );

    console.log("Notificaciones de liberación de pago enviadas exitosamente");
  } catch (error) {
    console.error("Error enviando notificaciones de liberación:", error);
  }
}

/**
 * Envía notificaciones cuando se reembolsa un pago
 * @function enviarNotificacionesReembolso
 * @private
 */
async function enviarNotificacionesReembolso(pago, motivo, montoReembolsado) {
  try {
    const cliente = await Usuario.findOne({ email: pago.clienteId });
    if (!cliente) return;

    await enviarCorreo(
      cliente.email,
      "Reembolso procesado",
      `Tu reembolso de $${montoReembolsado.toLocaleString(
        "es-CO"
      )} COP ha sido procesado exitosamente.

Motivo: ${motivo}

Este fue un pago simulado para desarrollo. En producción, el dinero sería devuelto a tu método de pago original.

Si tienes alguna pregunta, no dudes en contactarnos.`,
      {
        nombreDestinatario: cliente.nombre,
        apellidoDestinatario: cliente.apellido,
      }
    );

    console.log("Notificación de reembolso enviada exitosamente");
  } catch (error) {
    console.error("Error enviando notificación de reembolso:", error);
  }
}

module.exports = {
  crearPagoConMercadoPago,
  mpWebhook,
  liberarPago,
  reembolsarPago,
  obtenerPagos,
  obtenerPagoPorId,
  obtenerEstadoNotificaciones,
  reenviarNotificaciones,
};
