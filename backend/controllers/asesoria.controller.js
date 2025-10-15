/**
 * CONTROLADOR DE ASESORÍAS
 * ---------------------------------------------
 * Este archivo implementa la lógica de negocio para la gestión de asesorías en la plataforma.
 * Incluye operaciones de creación, aceptación, rechazo, inicio, finalización, cancelación, consulta,
 * manejo de pagos, notificaciones automáticas y registro de logs para auditoría.
 *
 * @module controllers/asesoria.controller
 * @requires models/asesoria.model
 * @requires models/pago.model
 * @requires models/usuario.model
 * @requires models/notificacion.model
 * @requires services/generarLogs
 * @requires services/email.service
 *
 * Uso típico:
 *   const asesoriaController = require('./controllers/asesoria.controller');
 *   app.get('/api/asesorias/mis-asesorias', asesoriaController.obtenerMisAsesorias);
 *
 * Todas las funciones están documentadas con JSDoc y Swagger/OpenAPI para Deepwiki y generación automática de documentación.
 */

const Asesoria = require("../models/asesoria.model.js");
const Pago = require("../models/pago.model.js");
const Usuario = require("../models/usuario.model.js");
const Notificacion = require("../models/notificacion.model.js");
const generarLogs = require("../services/generarLogs");
const { enviarCorreo } = require("../services/email.service.js");

/**
 * Obtiene todas las asesorías donde el usuario autenticado es cliente o experto.
 * Permite filtrar por estado, rol y paginar los resultados.
 *
 * @function obtenerMisAsesorias
 * @param {import('express').Request} req - Request de Express con usuario autenticado y filtros opcionales.
 * @param {import('express').Response} res - Response de Express.
 * @returns {Promise<void>} Responde con la lista de asesorías y paginación.
 *
 * @openapi
 * /api/asesorias/mis-asesorias:
 *   get:
 *     summary: Obtener mis asesorías
 *     description: Obtiene todas las asesorías donde el usuario autenticado es cliente o experto.
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [pendiente-aceptacion, confirmada, en-progreso, completada, cancelada, rechazada]
 *         description: Filtrar por estado específico
 *         example: pendiente-aceptacion
 *       - in: query
 *         name: rol
 *         schema:
 *           type: string
 *           enum: [cliente, experto]
 *         description: Filtrar por rol (cliente o experto)
 *         example: experto
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Número de página
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Elementos por página
 *         example: 20
 *     responses:
 *       200:
 *         description: Lista de asesorías obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 asesorias:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Asesoria'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 150
 *                     pages:
 *                       type: integer
 *                       example: 8
 *                 usuarioActual:
 *                   type: object
 *                   description: Información del usuario actual para determinar rol
 *                   properties:
 *                     email:
 *                       type: string
 *                     nombre:
 *                       type: string
 *                     apellido:
 *                       type: string
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
const obtenerMisAsesorias = async (req, res) => {
  try {
    const usuarioEmail = req.usuario.email;
    const { estado, rol, page = 1, limit = 20 } = req.query;

    console.log("=== OBTENER MIS ASESORÍAS ===");
    console.log("Usuario:", usuarioEmail);
    console.log("Roles del usuario:", req.usuario.roles);
    console.log("Filtros:", { estado, rol, page, limit });

    // Construir filtros
    let filtros = {
      $or: [
        { "cliente.email": usuarioEmail },
        { "experto.email": usuarioEmail },
      ],
    };

    // Filtro por estado
    if (estado) {
      filtros.estado = estado;
    }

    // Filtro por rol específico
    if (rol === "cliente") {
      filtros = { "cliente.email": usuarioEmail };
      if (estado) filtros.estado = estado;
    } else if (rol === "experto") {
      filtros = { "experto.email": usuarioEmail };
      if (estado) filtros.estado = estado;
    }

    console.log("Filtros aplicados:", JSON.stringify(filtros, null, 2));

    // Paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Obtener asesorías
    const asesorias = await Asesoria.find(filtros)
      .sort({ fechaCreacion: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("pagoId", "monto estado metodo");

    const total = await Asesoria.countDocuments(filtros);

    console.log(
      `Encontradas ${asesorias.length} asesorías de ${total} totales`
    );

    // Agregar información del usuario actual para el frontend
    const usuarioInfo = {
      email: req.usuario.email,
      nombre: req.usuario.nombre,
      apellido: req.usuario.apellido,
      roles: req.usuario.roles || [],
    };

    res.json({
      asesorias,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
      usuarioActual: usuarioInfo, // IMPORTANTE: enviar info del usuario
    });
  } catch (error) {
    console.error("Error obteniendo asesorías:", error);
    res.status(500).json({
      mensaje: "Error interno obteniendo asesorías",
      error: error.message,
    });
  }
};

/**
 * Aceptar asesoría (solo expertos)
 * @function aceptarAsesoria
 * @description Permite al experto aceptar una asesoría pendiente
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Resultado de la aceptación
 *
 * @openapi
 * /api/asesorias/{id}/aceptar:
 *   post:
 *     summary: Aceptar asesoría
 *     description: Permite al experto aceptar una asesoría pendiente de aceptación
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la asesoría
 *     responses:
 *       200:
 *         description: Asesoría aceptada exitosamente
 *       400:
 *         description: La asesoría no puede ser aceptada
 *       403:
 *         description: Solo el experto puede aceptar la asesoría
 *       404:
 *         description: Asesoría no encontrada
 */
const aceptarAsesoria = async (req, res) => {
  try {
    const asesoriaId = req.params.id;
    const usuarioEmail = req.usuario.email;

    console.log("=== ACEPTAR ASESORÍA ===");
    console.log("AsesoriaId:", asesoriaId, "Usuario:", usuarioEmail);

    const asesoria = await Asesoria.findById(asesoriaId);
    if (!asesoria) {
      return res.status(404).json({ mensaje: "Asesoría no encontrada" });
    }

    // Verificar que el usuario es el experto
    if (asesoria.experto.email !== usuarioEmail) {
      return res.status(403).json({
        mensaje: "Solo el experto asignado puede aceptar esta asesoría",
      });
    }

    // Verificar que está en estado pendiente
    if (asesoria.estado !== "pendiente-aceptacion") {
      return res.status(400).json({
        mensaje: `La asesoría no puede ser aceptada. Estado actual: ${asesoria.estado}`,
      });
    }

    // Verificar disponibilidad del experto (por si hay conflictos nuevos)
    const ahora = new Date();
    if (asesoria.fechaHoraInicio <= ahora) {
      return res.status(400).json({
        mensaje: "No se puede aceptar una asesoría con fecha pasada",
      });
    }

    const asesoriaConflicto = await Asesoria.findOne({
      _id: { $ne: asesoriaId },
      "experto.email": usuarioEmail,
      estado: { $in: ["confirmada", "en-progreso"] },
      $or: [
        {
          fechaHoraInicio: { $lte: asesoria.fechaHoraInicio },
          fechaHoraFin: { $gt: asesoria.fechaHoraInicio },
        },
        {
          fechaHoraInicio: { $lt: asesoria.fechaHoraFin },
          fechaHoraFin: { $gte: asesoria.fechaHoraFin },
        },
        {
          fechaHoraInicio: { $gte: asesoria.fechaHoraInicio },
          fechaHoraFin: { $lte: asesoria.fechaHoraFin },
        },
      ],
    });

    if (asesoriaConflicto) {
      return res.status(400).json({
        mensaje: "Ya tienes otra asesoría confirmada en ese horario",
        conflicto: {
          titulo: asesoriaConflicto.titulo,
          fecha: asesoriaConflicto.fechaHoraInicio,
        },
      });
    }

    // Actualizar estado a confirmada
    await Asesoria.findByIdAndUpdate(asesoriaId, {
      estado: "confirmada",
      fechaAceptacion: new Date(),
    });

    console.log("Asesoría aceptada exitosamente");

    // Enviar notificaciones
    await enviarNotificacionesAceptacion(asesoria);

    // Registrar evento
    await generarLogs.registrarEvento({
      usuarioEmail: usuarioEmail,
      nombre: req.usuario.nombre,
      apellido: req.usuario.apellido,
      accion: "ACEPTAR_ASESORIA",
      detalle: `Asesoría aceptada: ${asesoria.titulo}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res.json({
      mensaje: "Asesoría aceptada exitosamente",
      asesoriaId: asesoriaId,
      estado: "confirmada",
    });
  } catch (error) {
    console.error("Error aceptando asesoría:", error);
    res.status(500).json({
      mensaje: "Error interno aceptando asesoría",
      error: error.message,
    });
  }
};

/**
 * Rechazar asesoría (solo expertos)
 * @function rechazarAsesoria
 * @description Permite al experto rechazar una asesoría pendiente
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Resultado del rechazo
 *
 * @openapi
 * /api/asesorias/{id}/rechazar:
 *   post:
 *     summary: Rechazar asesoría
 *     description: Permite al experto rechazar una asesoría pendiente y procesar reembolso
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la asesoría
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *                 description: Motivo del rechazo
 *                 example: "No puedo atender en ese horario"
 *     responses:
 *       200:
 *         description: Asesoría rechazada y reembolso procesado
 *       400:
 *         description: La asesoría no puede ser rechazada
 *       403:
 *         description: Solo el experto puede rechazar la asesoría
 *       404:
 *         description: Asesoría no encontrada
 */
const rechazarAsesoria = async (req, res) => {
  try {
    const asesoriaId = req.params.id;
    const usuarioEmail = req.usuario.email;
    const { motivo = "Rechazada por el experto" } = req.body;

    console.log("=== RECHAZAR ASESORÍA ===");
    console.log(
      "AsesoriaId:",
      asesoriaId,
      "Usuario:",
      usuarioEmail,
      "Motivo:",
      motivo
    );

    const asesoria = await Asesoria.findById(asesoriaId);
    if (!asesoria) {
      return res.status(404).json({ mensaje: "Asesoría no encontrada" });
    }

    // Verificar que el usuario es el experto
    if (asesoria.experto.email !== usuarioEmail) {
      return res.status(403).json({
        mensaje: "Solo el experto asignado puede rechazar esta asesoría",
      });
    }

    // Verificar que está en estado pendiente
    if (asesoria.estado !== "pendiente-aceptacion") {
      return res.status(400).json({
        mensaje: `La asesoría no puede ser rechazada. Estado actual: ${asesoria.estado}`,
      });
    }

    // Actualizar estado a rechazada
    await Asesoria.findByIdAndUpdate(asesoriaId, {
      estado: "rechazada",
      fechaRechazo: new Date(),
      motivoRechazo: motivo,
    });

    // Procesar reembolso automático si hay pago asociado
    if (asesoria.pagoId) {
      try {
        await Pago.findByIdAndUpdate(asesoria.pagoId, {
          estado: "reembolsado",
          fechaReembolso: new Date(),
          metadatos: {
            motivoReembolso: "Asesoría rechazada por el experto",
            procesadoPor: usuarioEmail,
            fechaReembolso: new Date(),
          },
        });
        console.log("Reembolso automático procesado");
      } catch (pagoError) {
        console.error("Error procesando reembolso automático:", pagoError);
      }
    }

    console.log("Asesoría rechazada exitosamente");

    // Enviar notificaciones
    await enviarNotificacionesRechazo(asesoria, motivo);

    // Registrar evento
    await generarLogs.registrarEvento({
      usuarioEmail: usuarioEmail,
      nombre: req.usuario.nombre,
      apellido: req.usuario.apellido,
      accion: "RECHAZAR_ASESORIA",
      detalle: `Asesoría rechazada: ${asesoria.titulo}, motivo: ${motivo}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res.json({
      mensaje: "Asesoría rechazada y reembolso procesado",
      asesoriaId: asesoriaId,
      estado: "rechazada",
      reembolsoProcesado: !!asesoria.pagoId,
    });
  } catch (error) {
    console.error("Error rechazando asesoría:", error);
    res.status(500).json({
      mensaje: "Error interno rechazando asesoría",
      error: error.message,
    });
  }
};

/**
 * Iniciar asesoría
 * @function iniciarAsesoria
 * @description Marca una asesoría como iniciada
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Resultado del inicio
 *
 * @openapi
 * /api/asesorias/{id}/iniciar:
 *   post:
 *     summary: Iniciar asesoría
 *     description: Marca una asesoría confirmada como iniciada
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la asesoría
 *     responses:
 *       200:
 *         description: Asesoría iniciada exitosamente
 *       400:
 *         description: La asesoría no puede ser iniciada
 *       403:
 *         description: Sin permisos para iniciar la asesoría
 *       404:
 *         description: Asesoría no encontrada
 */
const iniciarAsesoria = async (req, res) => {
  try {
    const asesoriaId = req.params.id;
    const usuarioEmail = req.usuario.email;

    console.log("=== INICIAR ASESORÍA ===");
    console.log("AsesoriaId:", asesoriaId, "Usuario:", usuarioEmail);

    const asesoria = await Asesoria.findById(asesoriaId);
    if (!asesoria) {
      return res.status(404).json({ mensaje: "Asesoría no encontrada" });
    }

    // Verificar que el usuario es cliente o experto
    const esCliente = asesoria.cliente.email === usuarioEmail;
    const esExperto = asesoria.experto.email === usuarioEmail;

    if (!esCliente && !esExperto) {
      return res.status(403).json({
        mensaje: "Solo el cliente o experto pueden iniciar la asesoría",
      });
    }

    // Verificar que está confirmada
    if (asesoria.estado !== "confirmada") {
      return res.status(400).json({
        mensaje: `La asesoría no puede ser iniciada. Estado actual: ${asesoria.estado}`,
      });
    }

    // Actualizar estado a en-progreso
    await Asesoria.findByIdAndUpdate(asesoriaId, {
      estado: "en-progreso",
      fechaInicio: new Date(),
    });

    console.log("Asesoría iniciada exitosamente");

    // Registrar evento
    await generarLogs.registrarEvento({
      usuarioEmail: usuarioEmail,
      nombre: req.usuario.nombre,
      apellido: req.usuario.apellido,
      accion: "INICIAR_ASESORIA",
      detalle: `Asesoría iniciada: ${asesoria.titulo}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res.json({
      mensaje: "Asesoría iniciada exitosamente",
      asesoriaId: asesoriaId,
      estado: "en-progreso",
    });
  } catch (error) {
    console.error("Error iniciando asesoría:", error);
    res.status(500).json({
      mensaje: "Error interno iniciando asesoría",
      error: error.message,
    });
  }
};

/**
 * Finalizar asesoría
 * @function finalizarAsesoria
 * @description Finaliza una asesoría y libera el pago
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Resultado de la finalización
 *
 * @openapi
 * /api/asesorias/{id}/finalizar:
 *   post:
 *     summary: Finalizar asesoría
 *     description: Finaliza una asesoría en progreso y libera el pago al experto
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la asesoría
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comentarios:
 *                 type: string
 *                 description: Comentarios adicionales sobre la asesoría
 *               calificacion:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Calificación de la asesoría (1-5)
 *     responses:
 *       200:
 *         description: Asesoría finalizada y pago liberado
 *       400:
 *         description: La asesoría no puede ser finalizada
 *       403:
 *         description: Sin permisos para finalizar la asesoría
 *       404:
 *         description: Asesoría no encontrada
 */
const finalizarAsesoria = async (req, res) => {
  try {
    const asesoriaId = req.params.id;
    const usuarioEmail = req.usuario.email;
    const { comentarios, calificacion } = req.body;

    console.log("=== FINALIZAR ASESORÍA ===");
    console.log("AsesoriaId:", asesoriaId, "Usuario:", usuarioEmail);

    const asesoria = await Asesoria.findById(asesoriaId);
    if (!asesoria) {
      return res.status(404).json({ mensaje: "Asesoría no encontrada" });
    }

    // Verificar que el usuario es cliente o experto
    const esCliente = asesoria.cliente.email === usuarioEmail;
    const esExperto = asesoria.experto.email === usuarioEmail;

    if (!esCliente && !esExperto) {
      return res.status(403).json({
        mensaje: "Solo el cliente o experto pueden finalizar la asesoría",
      });
    }

    // Verificar que está en progreso o confirmada
    if (!["en-progreso", "confirmada"].includes(asesoria.estado)) {
      return res.status(400).json({
        mensaje: `La asesoría no puede ser finalizada. Estado actual: ${asesoria.estado}`,
      });
    }

    // Actualizar datos de finalización
    const datosActualizacion = {
      estado: "completada",
      fechaFinalizacion: new Date(),
      finalizadaPor: usuarioEmail,
    };

    if (comentarios) {
      datosActualizacion.comentarios = comentarios;
    }

    if (calificacion && calificacion >= 1 && calificacion <= 5) {
      datosActualizacion.calificacion = calificacion;
    }

    await Asesoria.findByIdAndUpdate(asesoriaId, datosActualizacion);

    // Liberar pago automáticamente si existe
    let pagoLiberado = false;
    if (asesoria.pagoId) {
      try {
        const pago = await Pago.findById(asesoria.pagoId);
        if (pago && pago.estado === "retenido") {
          await Pago.findByIdAndUpdate(asesoria.pagoId, {
            estado: "liberado",
            fechaLiberacion: new Date(),
            metadatos: {
              ...pago.metadatos,
              liberadoPor: usuarioEmail,
              liberadoAutomaticamente: true,
              fechaLiberacion: new Date(),
            },
          });
          pagoLiberado = true;
          console.log("Pago liberado automáticamente");
        }
      } catch (pagoError) {
        console.error("Error liberando pago automático:", pagoError);
      }
    }

    console.log("Asesoría finalizada exitosamente");

    // Enviar notificaciones
    await enviarNotificacionesFinalizacion(asesoria, pagoLiberado);

    // Registrar evento
    await generarLogs.registrarEvento({
      usuarioEmail: usuarioEmail,
      nombre: req.usuario.nombre,
      apellido: req.usuario.apellido,
      accion: "FINALIZAR_ASESORIA",
      detalle: `Asesoría finalizada: ${asesoria.titulo}${
        pagoLiberado ? " - Pago liberado" : ""
      }`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res.json({
      mensaje: "Asesoría finalizada exitosamente",
      asesoriaId: asesoriaId,
      estado: "completada",
      pagoLiberado: pagoLiberado,
    });
  } catch (error) {
    console.error("Error finalizando asesoría:", error);
    res.status(500).json({
      mensaje: "Error interno finalizando asesoría",
      error: error.message,
    });
  }
};

/**
 * Cancelar asesoría
 * @function cancelarAsesoria
 * @description Cancela una asesoría y procesa reembolso
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Resultado de la cancelación
 *
 * @openapi
 * /api/asesorias/{id}/cancelar:
 *   post:
 *     summary: Cancelar asesoría
 *     description: Cancela una asesoría y procesa el reembolso correspondiente
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la asesoría
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *                 description: Motivo de la cancelación
 *                 example: "Emergencia personal"
 *     responses:
 *       200:
 *         description: Asesoría cancelada y reembolso procesado
 *       400:
 *         description: La asesoría no puede ser cancelada
 *       403:
 *         description: Sin permisos para cancelar la asesoría
 *       404:
 *         description: Asesoría no encontrada
 */

/**
 * Cancelar asesoría con lógica de descuentos
 * @function cancelarAsesoria
 * @description Cancela una asesoría y procesa reembolso con descuentos según quien cancele
 */
const cancelarAsesoria = async (req, res) => {
  try {
    const asesoriaId = req.params.id;
    const usuarioEmail = req.usuario.email;
    const { motivo = "Cancelada por el usuario" } = req.body;

    console.log("=== CANCELAR ASESORÍA ===");
    console.log(
      "AsesoriaId:",
      asesoriaId,
      "Usuario:",
      usuarioEmail,
      "Motivo:",
      motivo
    );

    const asesoria = await Asesoria.findById(asesoriaId);
    if (!asesoria) {
      return res.status(404).json({ mensaje: "Asesoría no encontrada" });
    }

    // Verificar que el usuario es cliente o experto
    const esCliente = asesoria.cliente.email === usuarioEmail;
    const esExperto = asesoria.experto.email === usuarioEmail;

    if (!esCliente && !esExperto) {
      return res.status(403).json({
        mensaje: "Solo el cliente o experto pueden cancelar la asesoría",
      });
    }

    // Verificar que puede ser cancelada
    if (!["pendiente-aceptacion", "confirmada"].includes(asesoria.estado)) {
      return res.status(400).json({
        mensaje: `La asesoría no puede ser cancelada. Estado actual: ${asesoria.estado}`,
      });
    }

    // Actualizar estado a cancelada
    await Asesoria.findByIdAndUpdate(asesoriaId, {
      estado: "cancelada",
      fechaCancelacion: new Date(),
      motivoCancelacion: motivo,
      canceladaPor: usuarioEmail,
    });

    // Procesar reembolso con lógica de descuentos
    let reembolsoProcesado = false;
    let montoReembolso = 0;
    let detallesReembolso = {};

    if (asesoria.pagoId) {
      try {
        const pago = await Pago.findById(asesoria.pagoId);
        if (pago && ["retenido", "liberado"].includes(pago.estado)) {
          // Lógica de descuentos según estado y quien cancela
          if (asesoria.estado === "confirmada") {
            // Asesoría ya confirmada
            if (esCliente) {
              // Cliente cancela: se le devuelve 85%, experto recibe 10%, ServiTech 5%
              montoReembolso = Math.round(pago.monto * 0.85);
              const montoExperto = Math.round(pago.monto * 0.1);
              const montoServitech = Math.round(pago.monto * 0.05);

              detallesReembolso = {
                tipo: "cancelacion_cliente_confirmada",
                montoOriginal: pago.monto,
                montoReembolso: montoReembolso,
                montoExperto: montoExperto,
                montoServitech: montoServitech,
                porcentajeReembolso: 85,
                motivo: `Cliente canceló asesoría confirmada: ${motivo}`,
              };
            } else if (esExperto) {
              // Experto cancela: cliente recibe 100%
              montoReembolso = pago.monto;

              detallesReembolso = {
                tipo: "cancelacion_experto_confirmada",
                montoOriginal: pago.monto,
                montoReembolso: montoReembolso,
                porcentajeReembolso: 100,
                motivo: `Experto canceló asesoría confirmada: ${motivo}`,
              };
            }
          } else {
            // Asesoría pendiente: reembolso completo
            montoReembolso = pago.monto;

            detallesReembolso = {
              tipo: "cancelacion_pendiente",
              montoOriginal: pago.monto,
              montoReembolso: montoReembolso,
              porcentajeReembolso: 100,
              motivo: `Cancelación en estado pendiente: ${motivo}`,
            };
          }

          // Actualizar pago
          await Pago.findByIdAndUpdate(asesoria.pagoId, {
            estado: "reembolsado",
            fechaReembolso: new Date(),
            metadatos: {
              ...pago.metadatos,
              motivoReembolso: motivo,
              montoReembolsado: montoReembolso,
              detallesReembolso: detallesReembolso,
              procesadoPor: usuarioEmail,
              fechaReembolso: new Date(),
            },
          });

          reembolsoProcesado = true;
          console.log("Reembolso procesado:", detallesReembolso);
        }
      } catch (pagoError) {
        console.error("Error procesando reembolso automático:", pagoError);
      }
    }

    console.log("Asesoría cancelada exitosamente");

    // Enviar notificaciones con detalles del reembolso
    await enviarNotificacionesCancelacion(
      asesoria,
      motivo,
      usuarioEmail,
      reembolsoProcesado,
      detallesReembolso
    );

    // Registrar evento
    await generarLogs.registrarEvento({
      usuarioEmail: usuarioEmail,
      nombre: req.usuario.nombre,
      apellido: req.usuario.apellido,
      accion: "CANCELAR_ASESORIA",
      detalle: `Asesoría cancelada: ${asesoria.titulo}, motivo: ${motivo}, reembolso: ${montoReembolso}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res.json({
      mensaje: "Asesoría cancelada exitosamente",
      asesoriaId: asesoriaId,
      estado: "cancelada",
      reembolsoProcesado: reembolsoProcesado,
      detallesReembolso: detallesReembolso,
    });
  } catch (error) {
    console.error("Error cancelando asesoría:", error);
    res.status(500).json({
      mensaje: "Error interno cancelando asesoría",
      error: error.message,
    });
  }
};

/**
 * Obtener asesoría por ID
 * @function obtenerAsesoriaPorId
 * @description Obtiene información detallada de una asesoría específica
 */
const obtenerAsesoriaPorId = async (req, res) => {
  try {
    const asesoriaId = req.params.id;
    const usuarioEmail = req.usuario.email;

    const asesoria = await Asesoria.findById(asesoriaId).populate("pagoId");

    if (!asesoria) {
      return res.status(404).json({ mensaje: "Asesoría no encontrada" });
    }

    // Verificar permisos
    const esCliente = asesoria.cliente.email === usuarioEmail;
    const esExperto = asesoria.experto.email === usuarioEmail;
    const esAdmin = req.usuario.roles && req.usuario.roles.includes("admin");

    if (!esCliente && !esExperto && !esAdmin) {
      return res.status(403).json({
        mensaje: "No tienes permisos para ver esta asesoría",
      });
    }

    res.json(asesoria);
  } catch (error) {
    console.error("Error obteniendo asesoría:", error);
    res.status(500).json({
      mensaje: "Error interno obteniendo asesoría",
      error: error.message,
    });
  }
};

// Funciones auxiliares para notificaciones

/**
 * Envía notificaciones cuando se acepta una asesoría
 * @function enviarNotificacionesAceptacion
 * @private
 */
async function enviarNotificacionesAceptacion(asesoria) {
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

    // Notificación al cliente
    await enviarCorreo(
      asesoria.cliente.email,
      "Asesoría aceptada - Confirmación",
      `¡Excelente noticia! ${asesoria.experto.nombre} ${asesoria.experto.apellido} ha aceptado tu solicitud de asesoría "${asesoria.titulo}".

Detalles de la asesoría:
- Fecha y hora: ${fechaLocal}
- Duración: ${duracionTexto}
- Experto: ${asesoria.experto.nombre} ${asesoria.experto.apellido}

Tu asesoría está confirmada. Pronto recibirás los detalles de conexión para la videollamada.

¡Nos vemos en la asesoría!`,
      {
        nombreDestinatario: asesoria.cliente.nombre,
        apellidoDestinatario: asesoria.cliente.apellido,
      }
    );

    console.log("Notificaciones de aceptación enviadas exitosamente");
  } catch (error) {
    console.error("Error enviando notificaciones de aceptación:", error);
  }
}

/**
 * Envía notificaciones cuando se rechaza una asesoría
 * @function enviarNotificacionesRechazo
 * @private
 */
async function enviarNotificacionesRechazo(asesoria, motivo) {
  try {
    // Notificación al cliente
    await enviarCorreo(
      asesoria.cliente.email,
      "Asesoría rechazada - Reembolso procesado",
      `Lamentamos informarte que ${asesoria.experto.nombre} ${asesoria.experto.apellido} no puede atender tu solicitud de asesoría "${asesoria.titulo}".

Motivo: ${motivo}

Tu dinero ha sido reembolsado automáticamente, recibirías el reembolso en tu método de pago original.

Te invitamos a buscar otro experto disponible para tu asesoría.`,
      {
        nombreDestinatario: asesoria.cliente.nombre,
        apellidoDestinatario: asesoria.cliente.apellido,
      }
    );

    console.log("Notificaciones de rechazo enviadas exitosamente");
  } catch (error) {
    console.error("Error enviando notificaciones de rechazo:", error);
  }
}

/**
 * Envía notificaciones cuando se finaliza una asesoría
 * @function enviarNotificacionesFinalizacion
 * @private
 */
async function enviarNotificacionesFinalizacion(asesoria, pagoLiberado) {
  try {
    // Notificación al cliente
    await Notificacion.create({
      usuarioId: asesoria.cliente._id,
      email: asesoria.cliente.email,
      tipo: "email",
      asunto: "Asesoría completada - ¡Gracias! ",
      mensaje: `Tu asesoría "${asesoria.titulo}" ha sido completada exitosamente.`,
      relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
      estado: "enviado",
      fechaEnvio: new Date(),
    });

    await enviarCorreo(
      asesoria.cliente.email,
      "Asesoría completada - ¡Gracias! ",
      `Tu asesoría "${asesoria.titulo}" con ${asesoria.experto.nombre} ${
        asesoria.experto.apellido
      } ha sido completada exitosamente.

${pagoLiberado ? "El pago ha sido liberado al experto." : ""}

Esperamos que hayas tenido una excelente experiencia. ¡Gracias por usar ServiTech!

¿Te gustaría calificar tu experiencia o programar otra asesoría?`,
      {
        nombreDestinatario: asesoria.cliente.nombre,
        apellidoDestinatario: asesoria.cliente.apellido,
      }
    );

    // Notificación al experto
    await Notificacion.create({
      usuarioId: asesoria.experto._id,
      email: asesoria.experto.email,
      tipo: "email",
      asunto: "Asesoría completada - Pago liberado",
      mensaje: `Tu asesoría "${asesoria.titulo}" ha sido completada y el pago liberado.`,
      relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
      estado: "enviado",
      fechaEnvio: new Date(),
    });

    const pagoInfo = asesoria.pagoId
      ? await Pago.findById(asesoria.pagoId)
      : null;

    const montoTexto = pagoInfo
      ? `$${pagoInfo.monto.toLocaleString("es-CO")} COP`
      : "el monto correspondiente";

    await enviarCorreo(
      asesoria.experto.email,
      "Asesoría completada - Pago liberado",
      `Tu asesoría "${asesoria.titulo}" con ${asesoria.cliente.nombre} ${
        asesoria.cliente.apellido
      } ha sido completada exitosamente.

${pagoLiberado ? `El pago de ${montoTexto} ha sido liberado exitosamente.` : ""}

¡Felicitaciones por completar otra asesoría exitosa!

En un ambiente real, el dinero sería transferido a tu cuenta registrada.`,
      {
        nombreDestinatario: asesoria.experto.nombre,
        apellidoDestinatario: asesoria.experto.apellido,
      }
    );

    console.log("Notificaciones de finalización enviadas exitosamente");
  } catch (error) {
    console.error("Error enviando notificaciones de finalización:", error);
  }
}

/**
 * Envía notificaciones cuando se cancela una asesoría
 * @function enviarNotificacionesCancelacion
 * @private
 */
async function enviarNotificacionesCancelacion(
  asesoria,
  motivo,
  canceladaPor,
  reembolsoProcesado,
  detallesReembolso
) {
  try {
    const esCliente = asesoria.cliente.email === canceladaPor;
    const esExperto = asesoria.experto.email === canceladaPor;
    const canceladoPorTexto = esCliente
      ? "el cliente"
      : esExperto
      ? "el experto"
      : "el usuario";
    const otroUsuario = esCliente ? asesoria.experto : asesoria.cliente;

    // Preparar mensajes específicos según el tipo de cancelación
    let mensajeReembolso = "";
    if (reembolsoProcesado && detallesReembolso) {
      if (detallesReembolso.tipo === "cancelacion_cliente_confirmada") {
        mensajeReembolso = `Se procesó un reembolso del ${
          detallesReembolso.porcentajeReembolso
        }% ($${detallesReembolso.montoReembolso.toLocaleString(
          "es-CO"
        )} COP). El 10% se destinó al experto por la confirmación previa y el 5% a ServiTech por gastos administrativos.`;
      } else if (detallesReembolso.tipo === "cancelacion_experto_confirmada") {
        mensajeReembolso = `Se procesó un reembolso completo de $${detallesReembolso.montoReembolso.toLocaleString(
          "es-CO"
        )} COP.`;
      } else {
        mensajeReembolso = `Se procesó un reembolso completo de $${detallesReembolso.montoReembolso.toLocaleString(
          "es-CO"
        )} COP.`;
      }
    }

    // Notificación al otro usuario
    await Notificacion.create({
      usuarioId: otroUsuario._id,
      email: otroUsuario.email,
      tipo: "email",
      asunto: "Asesoría cancelada",
      mensaje: `La asesoría "${asesoria.titulo}" ha sido cancelada por ${canceladoPorTexto}.`,
      relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
      estado: "enviado",
      fechaEnvio: new Date(),
    });

    await enviarCorreo(
      otroUsuario.email,
      "Asesoría cancelada",
      `La asesoría "${asesoria.titulo}" ha sido cancelada por ${canceladoPorTexto}.

Motivo: ${motivo}

${mensajeReembolso}

Lamentamos cualquier inconveniente. Te invitamos a buscar otras oportunidades en ServiTech.`,
      {
        nombreDestinatario: otroUsuario.nombre,
        apellidoDestinatario: otroUsuario.apellido,
      }
    );

    // Notificación al usuario que canceló (confirmación)
    const usuarioActual = esCliente ? asesoria.cliente : asesoria.experto;

    await Notificacion.create({
      usuarioId: usuarioActual._id,
      email: usuarioActual.email,
      tipo: "email",
      asunto: "Confirmación de cancelación",
      mensaje: `Tu asesoría "${asesoria.titulo}" ha sido cancelada exitosamente.`,
      relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
      estado: "enviado",
      fechaEnvio: new Date(),
    });

    await enviarCorreo(
      usuarioActual.email,
      "Confirmación de cancelación ",
      `Tu asesoría "${asesoria.titulo}" ha sido cancelada exitosamente.

Motivo: ${motivo}

${mensajeReembolso}

Puedes programar una nueva asesoría cuando desees a través de ServiTech.`,
      {
        nombreDestinatario: usuarioActual.nombre,
        apellidoDestinatario: usuarioActual.apellido,
      }
    );

    console.log("Notificaciones de cancelación enviadas exitosamente");
  } catch (error) {
    console.error("Error enviando notificaciones de cancelación:", error);
  }
}

/**
 * Obtener asesorías de un experto específico (para calendario)
 * @function obtenerAsesoriasPorExperto
 * @description Obtiene las asesorías confirmadas de un experto para mostrar disponibilidad
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Lista de asesorías del experto
 */
const obtenerAsesoriasPorExperto = async (req, res) => {
  try {
    const expertoEmail = decodeURIComponent(req.params.expertoEmail);
    const { mes, año } = req.query;

    console.log("=== OBTENER ASESORÍAS POR EXPERTO ===");
    console.log("Experto email:", expertoEmail);
    console.log("Filtros:", { mes, año });

    // Construir filtros de fecha si se proporcionan
    let filtroFecha = {};
    if (mes && año) {
      const inicioMes = new Date(parseInt(año), parseInt(mes) - 1, 1);
      const finMes = new Date(parseInt(año), parseInt(mes), 0, 23, 59, 59);
      filtroFecha = {
        fechaHoraInicio: {
          $gte: inicioMes,
          $lte: finMes,
        },
      };
    }

    // Filtros para asesorías
    const filtros = {
      "experto.email": expertoEmail,
      estado: { $in: ["confirmada", "en-progreso"] }, // Solo asesorías confirmadas
      ...filtroFecha,
    };

    // Obtener asesorías
    const asesorias = await Asesoria.find(filtros)
      .select(
        "fechaHoraInicio fechaHoraFin duracionMinutos titulo estado cliente"
      )
      .sort({ fechaHoraInicio: 1 });

    console.log(
      `Encontradas ${asesorias.length} asesorías para ${expertoEmail}`
    );

    res.json({
      expertoEmail: expertoEmail,
      asesorias: asesorias,
      total: asesorias.length,
    });
  } catch (error) {
    console.error("Error obteniendo asesorías por experto:", error);
    res.status(500).json({
      mensaje: "Error interno obteniendo asesorías del experto",
      error: error.message,
    });
  }
};

module.exports = {
  obtenerMisAsesorias,
  aceptarAsesoria,
  rechazarAsesoria,
  iniciarAsesoria,
  finalizarAsesoria,
  cancelarAsesoria,
  obtenerAsesoriaPorId,
  obtenerAsesoriasPorExperto,
  enviarNotificacionesAceptacion,
  enviarNotificacionesRechazo,
  enviarNotificacionesFinalizacion,
  enviarNotificacionesCancelacion,
};
