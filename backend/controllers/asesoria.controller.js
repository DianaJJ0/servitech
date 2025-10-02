/**
 * Controlador de Asesorías - ServiTech
 * @module controllers/asesoria
 * @description Lógica completa para gestión de asesorías con validaciones, notificaciones y manejo de estados
 */

const Asesoria = require("../models/asesoria.model.js");
const Pago = require("../models/pago.model.js");
const Usuario = require("../models/usuario.model.js");
const Notificacion = require("../models/notificacion.model.js");
const generarLogs = require("../services/generarLogs");
const { enviarCorreo } = require("../services/email.service.js");

/**
 * Obtener asesorías del usuario autenticado
 * @openapi
 * /api/asesorias/mias:
 *   get:
 *     summary: Obtener asesorías del usuario autenticado
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de asesorías del usuario
 *       401:
 *         description: No autenticado
 */
const obtenerMisAsesorias = async (req, res) => {
  try {
    const userEmail = req.usuario.email;
    const esExperto = req.usuario.roles.includes("experto");

    let asesorias;

    if (esExperto) {
      asesorias = await Asesoria.find({
        "experto.email": userEmail,
      }).sort({ fechaHoraInicio: 1 });
    } else {
      asesorias = await Asesoria.find({
        "cliente.email": userEmail,
      }).sort({ fechaHoraInicio: 1 });
    }

    // Agrupar por estado para mejor organización
    const asesoriasPorEstado = {
      pendientesAceptacion: asesorias.filter(
        (a) => a.estado === "pendiente-aceptacion"
      ),
      confirmadas: asesorias.filter((a) => a.estado === "confirmada"),
      completadas: asesorias.filter((a) => a.estado === "completada"),
      canceladas: asesorias.filter((a) => a.estado.includes("cancelada")),
      rechazadas: asesorias.filter((a) => a.estado === "rechazada"),
    };

    res.json({
      success: true,
      data: asesorias,
      agrupadas: asesoriasPorEstado,
      rol: esExperto ? "experto" : "cliente",
    });
  } catch (error) {
    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario?.email || null,
      accion: "ERROR_OBTENER_MIS_ASESORIAS",
      detalle: error.message,
      resultado: "Error",
      tipo: "asesoria",
      persistirEnDB: true,
    });
    res.status(500).json({
      success: false,
      mensaje: "Error al obtener asesorías.",
      error: error.message,
    });
  }
};

/**
 * Validar disponibilidad de horario para experto
 * @param {string} expertoEmail - Email del experto
 * @param {Date} fechaInicio - Fecha y hora de inicio
 * @param {number} duracionMinutos - Duración en minutos
 * @returns {Promise<boolean>} True si está disponible
 */
const validarDisponibilidadExperto = async (
  expertoEmail,
  fechaInicio,
  duracionMinutos
) => {
  const fechaFin = new Date(fechaInicio.getTime() + duracionMinutos * 60000);

  const solapamiento = await Asesoria.findOne({
    "experto.email": expertoEmail,
    $or: [
      {
        fechaHoraInicio: { $lte: fechaInicio },
        $expr: {
          $gt: [
            {
              $add: [
                "$fechaHoraInicio",
                { $multiply: ["$duracionMinutos", 60000] },
              ],
            },
            fechaInicio,
          ],
        },
      },
      {
        fechaHoraInicio: { $lt: fechaFin },
        $expr: {
          $gte: [
            {
              $add: [
                "$fechaHoraInicio",
                { $multiply: ["$duracionMinutos", 60000] },
              ],
            },
            fechaFin,
          ],
        },
      },
      {
        fechaHoraInicio: { $gte: fechaInicio },
        $expr: {
          $lte: [
            {
              $add: [
                "$fechaHoraInicio",
                { $multiply: ["$duracionMinutos", 60000] },
              ],
            },
            fechaFin,
          ],
        },
      },
    ],
    estado: { $in: ["pendiente-aceptacion", "confirmada"] },
  });

  return !solapamiento;
};

/**
 * Aceptar asesoría (solo experto)
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
 *         description: Asesoría aceptada exitosamente
 *       400:
 *         description: Estado inválido o validaciones fallidas
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Asesoría no encontrada
 */
const aceptarAsesoria = async (req, res) => {
  try {
    const id = req.params.id;

    // Validar que el ID sea válido
    if (!id) {
      return res.status(400).json({
        success: false,
        mensaje: "ID de asesoría requerido.",
      });
    }

    const asesoria = await Asesoria.findById(id);

    if (!asesoria) {
      return res.status(404).json({
        success: false,
        mensaje: "Asesoría no encontrada.",
      });
    }

    // Validar autorización
    if (req.usuario.email !== asesoria.experto.email) {
      return res.status(403).json({
        success: false,
        mensaje: "Solo el experto asignado puede aceptar esta asesoría.",
      });
    }

    // Validar estado
    if (asesoria.estado !== "pendiente-aceptacion") {
      return res.status(400).json({
        success: false,
        mensaje:
          "Solo asesorías pendientes de aceptación pueden ser aceptadas.",
      });
    }

    // Validar que no haya conflictos de horario
    const disponible = await validarDisponibilidadExperto(
      asesoria.experto.email,
      new Date(asesoria.fechaHoraInicio),
      asesoria.duracionMinutos
    );

    if (!disponible) {
      return res.status(409).json({
        success: false,
        mensaje: "Ya tienes otra asesoría programada en ese horario.",
      });
    }

    // Actualizar estado
    asesoria.estado = "confirmada";
    await asesoria.save();

    // Notificar al cliente
    try {
      const cliente = await Usuario.findOne({ email: asesoria.cliente.email });
      const experto = await Usuario.findOne({ email: asesoria.experto.email });

      if (cliente) {
        await Notificacion.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "email",
          asunto: "Tu asesoría fue aceptada",
          mensaje: `El experto ${asesoria.experto.nombre} aceptó tu solicitud de asesoría "${asesoria.titulo}".`,
          relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });

        const fechaLocal = new Date(asesoria.fechaHoraInicio).toLocaleString(
          "es-CO"
        );

        await enviarCorreo(
          cliente.email,
          "Tu asesoría fue aceptada",
          `¡Excelente noticia! El experto ${asesoria.experto.nombre} ${
            asesoria.experto.apellido
          } ha aceptado tu solicitud de asesoría.\n\nDetalles de tu asesoría:\n- Título: ${
            asesoria.titulo
          }\n- Fecha y hora: ${fechaLocal}\n- Duración: ${
            asesoria.duracionMinutos
          } minutos\n\nDatos de contacto del experto:\n- Email: ${
            asesoria.experto.email
          }\n- Teléfono: ${
            experto?.infoExperto?.telefonoContacto || "No disponible"
          }\n\nTu pago permanecerá retenido de forma segura hasta que la asesoría termine.`,
          {
            nombreDestinatario: cliente.nombre,
            apellidoDestinatario: cliente.apellido,
          }
        );
      }
    } catch (e) {
      console.error("Error enviando notificación al cliente:", e);
    }

    await generarLogs.registrarEvento({
      usuarioEmail: asesoria.experto.email,
      nombre: asesoria.experto.nombre,
      apellido: asesoria.experto.apellido,
      accion: "ACEPTAR_ASESORIA",
      detalle: `Asesoría aceptada: ${asesoria._id}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res.json({
      success: true,
      mensaje: "Asesoría aceptada exitosamente.",
      data: asesoria,
    });
  } catch (error) {
    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario?.email || null,
      accion: "ERROR_ACEPTAR_ASESORIA",
      detalle: error.message,
      resultado: "Error",
      tipo: "asesoria",
      persistirEnDB: true,
    });
    res.status(500).json({
      success: false,
      mensaje: "Error interno al aceptar asesoría.",
      error: error.message,
    });
  }
};

/**
 * Rechazar asesoría (solo experto) con reembolso total
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
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Asesoría rechazada y reembolso procesado
 *       400:
 *         description: Estado inválido o validaciones fallidas
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Asesoría no encontrada
 */
const rechazarAsesoria = async (req, res) => {
  try {
    const id = req.params.id;
    const { motivo } = req.body;

    // Validaciones básicas
    if (!id) {
      return res.status(400).json({
        success: false,
        mensaje: "ID de asesoría requerido.",
      });
    }

    if (motivo && motivo.length > 500) {
      return res.status(400).json({
        success: false,
        mensaje: "El motivo no puede exceder 500 caracteres.",
      });
    }

    const asesoria = await Asesoria.findById(id);

    if (!asesoria) {
      return res.status(404).json({
        success: false,
        mensaje: "Asesoría no encontrada.",
      });
    }

    // Validar autorización
    if (req.usuario.email !== asesoria.experto.email) {
      return res.status(403).json({
        success: false,
        mensaje: "Solo el experto asignado puede rechazar esta asesoría.",
      });
    }

    // Validar estado
    if (asesoria.estado !== "pendiente-aceptacion") {
      return res.status(400).json({
        success: false,
        mensaje:
          "Solo asesorías pendientes de aceptación pueden ser rechazadas.",
      });
    }

    // Actualizar asesoría
    asesoria.estado = "rechazada";
    asesoria.motivoCancelacion =
      motivo || "El experto no puede atender la asesoría";
    asesoria.fechaCancelacion = new Date();
    await asesoria.save();

    // Procesar reembolso total si hay pago asociado
    if (asesoria.pagoId) {
      try {
        await Pago.findByIdAndUpdate(asesoria.pagoId, {
          estado: "reembolsado-total",
          fechaLiberacion: new Date(),
        });
      } catch (reembolsoError) {
        console.error("Error procesando reembolso:", reembolsoError);
      }
    }

    // Notificar al cliente
    try {
      const cliente = await Usuario.findOne({ email: asesoria.cliente.email });
      if (cliente) {
        await Notificacion.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "email",
          asunto: "Asesoría rechazada - Reembolso procesado",
          mensaje: `Tu asesoría "${asesoria.titulo}" fue rechazada. Se ha procesado el reembolso completo.`,
          relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });

        await enviarCorreo(
          cliente.email,
          "Asesoría rechazada - Reembolso procesado",
          `Lamentamos informarte que el experto ${asesoria.experto.nombre} ${asesoria.experto.apellido} no puede atender tu solicitud de asesoría "${asesoria.titulo}".\n\nMotivo: ${asesoria.motivoCancelacion}\n\nHemos procesado el reembolso completo del pago. El dinero será devuelto a tu método de pago original en los próximos 5-10 días hábiles.\n\nTe invitamos a agendar una nueva asesoría con otro experto disponible.`,
          {
            nombreDestinatario: cliente.nombre,
            apellidoDestinatario: cliente.apellido,
          }
        );
      }
    } catch (e) {
      console.error("Error enviando notificación al cliente:", e);
    }

    await generarLogs.registrarEvento({
      usuarioEmail: asesoria.experto.email,
      nombre: asesoria.experto.nombre,
      apellido: asesoria.experto.apellido,
      accion: "RECHAZAR_ASESORIA",
      detalle: `Asesoría rechazada: ${asesoria._id}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res.json({
      success: true,
      mensaje: "Asesoría rechazada y reembolso procesado.",
      data: asesoria,
    });
  } catch (error) {
    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario?.email || null,
      accion: "ERROR_RECHAZAR_ASESORIA",
      detalle: error.message,
      resultado: "Error",
      tipo: "asesoria",
      persistirEnDB: true,
    });
    res.status(500).json({
      success: false,
      mensaje: "Error interno al rechazar asesoría.",
      error: error.message,
    });
  }
};

/**
 * Cancelar asesoría por cliente (80% reembolso cliente, 20% compensación experto)
 * @openapi
 * /api/asesorias/{id}/cancelar-cliente:
 *   put:
 *     summary: Cancelar asesoría por el cliente
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Asesoría cancelada y reembolso parcial procesado
 *       400:
 *         description: Estado inválido o validaciones fallidas
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Asesoría no encontrada
 */
const cancelarAsesoriaPorCliente = async (req, res) => {
  try {
    const id = req.params.id;
    const { motivo } = req.body;

    // Validaciones básicas
    if (!id) {
      return res.status(400).json({
        success: false,
        mensaje: "ID de asesoría requerido.",
      });
    }

    if (motivo && motivo.length > 500) {
      return res.status(400).json({
        success: false,
        mensaje: "El motivo no puede exceder 500 caracteres.",
      });
    }

    const asesoria = await Asesoria.findById(id);

    if (!asesoria) {
      return res.status(404).json({
        success: false,
        mensaje: "Asesoría no encontrada.",
      });
    }

    // Validar autorización
    if (req.usuario.email !== asesoria.cliente.email) {
      return res.status(403).json({
        success: false,
        mensaje: "Solo el cliente puede cancelar su propia asesoría.",
      });
    }

    // Validar estado
    if (asesoria.estado !== "confirmada") {
      return res.status(400).json({
        success: false,
        mensaje:
          "Solo asesorías confirmadas pueden ser canceladas por el cliente.",
      });
    }

    // Actualizar asesoría
    asesoria.estado = "cancelada-cliente";
    asesoria.motivoCancelacion =
      motivo || "Cancelación solicitada por el cliente";
    asesoria.fechaCancelacion = new Date();
    await asesoria.save();

    // Procesar reembolso parcial (80% al cliente)
    if (asesoria.pagoId) {
      try {
        await Pago.findByIdAndUpdate(asesoria.pagoId, {
          estado: "reembolsado-parcial",
          fechaLiberacion: new Date(),
        });
      } catch (reembolsoError) {
        console.error("Error procesando reembolso:", reembolsoError);
      }
    }

    // Notificar al experto
    try {
      const experto = await Usuario.findOne({ email: asesoria.experto.email });
      if (experto) {
        await Notificacion.create({
          usuarioId: experto._id,
          email: experto.email,
          tipo: "email",
          asunto: "Asesoría cancelada por el cliente",
          mensaje: `La asesoría "${asesoria.titulo}" fue cancelada por el cliente. Has recibido una compensación del 20% del pago.`,
          relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });

        await enviarCorreo(
          experto.email,
          "Asesoría cancelada por el cliente",
          `Te informamos que la asesoría "${asesoria.titulo}" programada con ${asesoria.cliente.nombre} ${asesoria.cliente.apellido} ha sido cancelada por el cliente.\n\nMotivo: ${asesoria.motivoCancelacion}\n\nComo compensación por el tiempo apartado, has recibido el 20% del valor de la asesoría. Este monto será transferido a tu cuenta en los próximos días hábiles.`,
          {
            nombreDestinatario: experto.nombre,
            apellidoDestinatario: experto.apellido,
          }
        );
      }
    } catch (e) {
      console.error("Error enviando notificación al experto:", e);
    }

    await generarLogs.registrarEvento({
      usuarioEmail: asesoria.cliente.email,
      nombre: asesoria.cliente.nombre,
      apellido: asesoria.cliente.apellido,
      accion: "CANCELAR_ASESORIA_CLIENTE",
      detalle: `Asesoría cancelada por cliente: ${asesoria._id}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res.json({
      success: true,
      mensaje:
        "Asesoría cancelada. Se procesó el reembolso del 80% y compensación del 20% al experto.",
      data: asesoria,
    });
  } catch (error) {
    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario?.email || null,
      accion: "ERROR_CANCELAR_ASESORIA_CLIENTE",
      detalle: error.message,
      resultado: "Error",
      tipo: "asesoria",
      persistirEnDB: true,
    });
    res.status(500).json({
      success: false,
      mensaje: "Error interno al cancelar asesoría.",
      error: error.message,
    });
  }
};

/**
 * Cancelar asesoría por experto (100% reembolso al cliente)
 * @openapi
 * /api/asesorias/{id}/cancelar-experto:
 *   put:
 *     summary: Cancelar asesoría por el experto
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Asesoría cancelada y reembolso total procesado
 *       400:
 *         description: Estado inválido o validaciones fallidas
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Asesoría no encontrada
 */
const cancelarAsesoriaPorExperto = async (req, res) => {
  try {
    const id = req.params.id;
    const { motivo } = req.body;

    // Validaciones básicas
    if (!id) {
      return res.status(400).json({
        success: false,
        mensaje: "ID de asesoría requerido.",
      });
    }

    if (motivo && motivo.length > 500) {
      return res.status(400).json({
        success: false,
        mensaje: "El motivo no puede exceder 500 caracteres.",
      });
    }

    const asesoria = await Asesoria.findById(id);

    if (!asesoria) {
      return res.status(404).json({
        success: false,
        mensaje: "Asesoría no encontrada.",
      });
    }

    // Validar autorización
    if (req.usuario.email !== asesoria.experto.email) {
      return res.status(403).json({
        success: false,
        mensaje: "Solo el experto puede cancelar esta asesoría.",
      });
    }

    // Validar estado
    if (asesoria.estado !== "confirmada") {
      return res.status(400).json({
        success: false,
        mensaje:
          "Solo asesorías confirmadas pueden ser canceladas por el experto.",
      });
    }

    // Actualizar asesoría
    asesoria.estado = "cancelada-experto";
    asesoria.motivoCancelacion = motivo || "Cancelación por parte del experto";
    asesoria.fechaCancelacion = new Date();
    await asesoria.save();

    // Procesar reembolso total (100% al cliente)
    if (asesoria.pagoId) {
      try {
        await Pago.findByIdAndUpdate(asesoria.pagoId, {
          estado: "reembolsado-total",
          fechaLiberacion: new Date(),
        });
      } catch (reembolsoError) {
        console.error("Error procesando reembolso:", reembolsoError);
      }
    }

    // Notificar al cliente
    try {
      const cliente = await Usuario.findOne({ email: asesoria.cliente.email });
      if (cliente) {
        await Notificacion.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "email",
          asunto: "Asesoría cancelada por el experto",
          mensaje: `La asesoría "${asesoria.titulo}" fue cancelada por el experto. Se ha procesado el reembolso completo.`,
          relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });

        await enviarCorreo(
          cliente.email,
          "Asesoría cancelada - Reembolso completo",
          `Lamentamos informarte que el experto ${asesoria.experto.nombre} ${asesoria.experto.apellido} tuvo que cancelar tu asesoría "${asesoria.titulo}".\n\nMotivo: ${asesoria.motivoCancelacion}\n\nHemos procesado el reembolso completo del pago. El dinero será devuelto a tu método de pago original en los próximos 5-10 días hábiles.\n\nTe invitamos a agendar una nueva asesoría con otro experto disponible.`,
          {
            nombreDestinatario: cliente.nombre,
            apellidoDestinatario: cliente.apellido,
          }
        );
      }
    } catch (e) {
      console.error("Error enviando notificación al cliente:", e);
    }

    await generarLogs.registrarEvento({
      usuarioEmail: asesoria.experto.email,
      nombre: asesoria.experto.nombre,
      apellido: asesoria.experto.apellido,
      accion: "CANCELAR_ASESORIA_EXPERTO",
      detalle: `Asesoría cancelada por experto: ${asesoria._id}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res.json({
      success: true,
      mensaje:
        "Asesoría cancelada. Se procesó el reembolso completo al cliente.",
      data: asesoria,
    });
  } catch (error) {
    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario?.email || null,
      accion: "ERROR_CANCELAR_ASESORIA_EXPERTO",
      detalle: error.message,
      resultado: "Error",
      tipo: "asesoria",
      persistirEnDB: true,
    });
    res.status(500).json({
      success: false,
      mensaje: "Error interno al cancelar asesoría.",
      error: error.message,
    });
  }
};

/**
 * Finalizar asesoría y liberar pago al experto
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
 *       400:
 *         description: Estado inválido o validaciones fallidas
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Asesoría no encontrada
 */
const finalizarAsesoria = async (req, res) => {
  try {
    const id = req.params.id;

    // Validaciones básicas
    if (!id) {
      return res.status(400).json({
        success: false,
        mensaje: "ID de asesoría requerido.",
      });
    }

    const asesoria = await Asesoria.findById(id);

    if (!asesoria) {
      return res.status(404).json({
        success: false,
        mensaje: "Asesoría no encontrada.",
      });
    }

    // Validar autorización (cliente o admin)
    const puedeFinalizarCliente = req.usuario.email === asesoria.cliente.email;
    const esAdmin = req.usuario.roles.includes("admin");

    if (!puedeFinalizarCliente && !esAdmin) {
      return res.status(403).json({
        success: false,
        mensaje:
          "Solo el cliente o un administrador pueden finalizar la asesoría.",
      });
    }

    // Validar estado
    if (asesoria.estado !== "confirmada") {
      return res.status(400).json({
        success: false,
        mensaje: "Solo asesorías confirmadas pueden ser finalizadas.",
      });
    }

    // Actualizar asesoría
    asesoria.estado = "completada";
    asesoria.fechaFinalizacion = new Date();
    await asesoria.save();

    // Liberar pago al experto
    if (asesoria.pagoId) {
      await Pago.findByIdAndUpdate(asesoria.pagoId, {
        estado: "liberado",
        fechaLiberacion: new Date(),
      });
    }

    // Notificar a ambos participantes
    try {
      const [cliente, experto] = await Promise.all([
        Usuario.findOne({ email: asesoria.cliente.email }),
        Usuario.findOne({ email: asesoria.experto.email }),
      ]);

      if (experto) {
        await Notificacion.create({
          usuarioId: experto._id,
          email: experto.email,
          tipo: "email",
          asunto: "Pago liberado - Asesoría completada",
          mensaje: `El pago de tu asesoría "${asesoria.titulo}" ha sido liberado.`,
          relacionadoCon: { tipo: "Pago", referenciaId: asesoria.pagoId },
          estado: "enviado",
          fechaEnvio: new Date(),
        });

        await enviarCorreo(
          experto.email,
          "Pago liberado - Asesoría completada",
          `¡Excelente trabajo! La asesoría "${asesoria.titulo}" ha sido completada exitosamente.\n\nEl pago correspondiente ha sido liberado y será transferido a tu cuenta en los próximos días hábiles.\n\nGracias por brindar un excelente servicio en ServiTech.`,
          {
            nombreDestinatario: experto.nombre,
            apellidoDestinatario: experto.apellido,
          }
        );
      }

      if (cliente) {
        await Notificacion.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "email",
          asunto: "Asesoría completada",
          mensaje: `Tu asesoría "${asesoria.titulo}" ha sido marcada como completada.`,
          relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });

        await enviarCorreo(
          cliente.email,
          "Asesoría completada",
          `Tu asesoría "${asesoria.titulo}" con ${asesoria.experto.nombre} ${asesoria.experto.apellido} ha sido completada exitosamente.\n\nEl pago ha sido liberado al experto. ¡Esperamos que hayas tenido una excelente experiencia!\n\nTe invitamos a dejar una reseña y agendar nuevas asesorías cuando lo necesites.`,
          {
            nombreDestinatario: cliente.nombre,
            apellidoDestinatario: cliente.apellido,
          }
        );
      }
    } catch (e) {
      console.error("Error enviando notificaciones:", e);
    }

    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario.email,
      nombre: req.usuario.nombre,
      apellido: req.usuario.apellido,
      accion: "FINALIZAR_ASESORIA",
      detalle: `Asesoría finalizada: ${asesoria._id}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res.json({
      success: true,
      mensaje: "Asesoría finalizada y pago liberado al experto.",
      data: asesoria,
    });
  } catch (error) {
    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario?.email || null,
      accion: "ERROR_FINALIZAR_ASESORIA",
      detalle: error.message,
      resultado: "Error",
      tipo: "asesoria",
      persistirEnDB: true,
    });
    res.status(500).json({
      success: false,
      mensaje: "Error interno al finalizar asesoría.",
      error: error.message,
    });
  }
};

// Funciones existentes que se mantienen sin cambios
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

    const asesoriaExistente = await Asesoria.findOne({ pagoId: datos.pagoId });
    if (asesoriaExistente) {
      return res.status(400).json({
        mensaje: "El pagoId ya está asociado a otra asesoría.",
      });
    }

    const nuevaAsesoria = new Asesoria({
      ...datos,
      fechaFinalizacion: fechaFin,
      estado: "pendiente-pago",
    });
    await nuevaAsesoria.save();

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

        const fechaLocal = new Date(datos.fechaHoraInicio).toLocaleString(
          "es-CO"
        );
        await enviarCorreo(
          experto.email,
          "Nueva asesoría pendiente de aceptación",
          `Tienes una nueva solicitud de asesoría titulada "${datos.titulo}".\n\nCliente: ${datos.cliente.nombre} ${datos.cliente.apellido}\nFecha y hora: ${fechaLocal}\n\nIngresa a ServiTech para aceptarla o rechazarla.`,
          {
            nombreDestinatario: experto.nombre,
            apellidoDestinatario: experto.apellido,
          }
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

const listarAsesorias = async (req, res) => {
  try {
    const asesorias = await Asesoria.find().sort({ fechaCreacion: -1 });
    res.status(200).json(asesorias);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al listar asesorías." });
  }
};

const listarPorCliente = async (req, res) => {
  try {
    const email = req.params.email;
    const asesorias = await Asesoria.find({ "cliente.email": email }).sort({
      fechaCreacion: -1,
    });
    res.status(200).json(asesorias);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al listar asesorías por cliente." });
  }
};

const listarPorExperto = async (req, res) => {
  try {
    const email = req.params.email;
    const asesorias = await Asesoria.find({ "experto.email": email }).sort({
      fechaCreacion: -1,
    });
    res.status(200).json(asesorias);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al listar asesorías por experto." });
  }
};

const obtenerAsesoriaPorId = async (req, res) => {
  try {
    const id = req.params.id;
    const asesoria = await Asesoria.findById(id);
    if (!asesoria) {
      return res.status(404).json({ mensaje: "Asesoría no encontrada." });
    }
    res.status(200).json(asesoria);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener asesoría." });
  }
};

const eliminarAsesoria = async (req, res) => {
  try {
    const id = req.params.id;
    const asesoria = await Asesoria.findByIdAndDelete(id);
    if (!asesoria) {
      return res.status(404).json({ mensaje: "Asesoría no encontrada." });
    }
    res.status(200).json({ mensaje: "Asesoría eliminada." });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al eliminar asesoría." });
  }
};

module.exports = {
  crearAsesoria,
  obtenerMisAsesorias,
  aceptarAsesoria,
  rechazarAsesoria,
  cancelarAsesoriaPorCliente,
  cancelarAsesoriaPorExperto,
  finalizarAsesoria,
  listarAsesorias,
  listarPorCliente,
  listarPorExperto,
  obtenerAsesoriaPorId,
  eliminarAsesoria,
};
