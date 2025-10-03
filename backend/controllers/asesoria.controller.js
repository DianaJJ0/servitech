/**
 * Controlador de Asesorías - ServiTech
 * @module controllers/asesoria
 * @description Lógica para crear, aceptar, rechazar, finalizar, listar y eliminar asesorías tecnológicas.
 * Incluye validación de conflictos de horarios continuos y notificaciones clave por email.
 */

const Asesoria = require("../models/asesoria.model.js");
const Pago = require("../models/pago.model.js");
const Usuario = require("../models/usuario.model.js");
const Notificacion = require("../models/notificacion.model.js");
const generarLogs = require("../services/generarLogs");
const { enviarCorreo } = require("../services/email.service.js");

/**
 * Crea una nueva asesoría SOLO cuando hay un pago exitoso asociado.
 * @openapi
 * /api/asesorias:
 *   post:
 *     summary: Crear asesoría con pago previo validado
 *     tags: [Asesorías]
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
 *               - experto
 *               - fechaHoraInicio
 *               - duracionMinutos
 *               - pagoId
 *             properties:
 *               titulo:
 *                 type: string
 *                 maxLength: 300
 *               descripcion:
 *                 type: string
 *                 maxLength: 2000
 *               experto:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: string
 *                   nombre:
 *                     type: string
 *                   apellido:
 *                     type: string
 *                   avatarUrl:
 *                     type: string
 *               fechaHoraInicio:
 *                 type: string
 *                 format: date-time
 *               duracionMinutos:
 *                 type: number
 *                 enum: [60, 90, 120, 180]
 *               categoria:
 *                 type: string
 *                 default: "Tecnologia"
 *               pagoId:
 *                 type: string
 *                 description: ID del pago procesado por MercadoPago
 *     responses:
 *       201:
 *         description: Asesoría creada y experto notificado
 *       400:
 *         description: Error de validación o pago no válido
 *       409:
 *         description: Conflicto de horarios
 */
const crearAsesoria = async (req, res) => {
  try {
    const {
      titulo,
      descripcion,
      experto,
      fechaHoraInicio,
      duracionMinutos,
      categoria = "Tecnologia",
      pagoId // NUEVO: Requerido
    } = req.body;

    // Validaciones básicas
    if (!titulo || !descripcion || !experto || !fechaHoraInicio || !duracionMinutos || !pagoId) {
      return res.status(400).json({
        mensaje: "Faltan datos obligatorios para la asesoría, incluyendo el pagoId."
      });
    }

    // VALIDAR EL PAGO PRIMERO
    const pago = await Pago.findById(pagoId);
    if (!pago) {
      return res.status(400).json({
        mensaje: "Pago no encontrado."
      });
    }

    // Verificar que el pago esté en estado correcto
    if (pago.estado !== "procesando" && pago.estado !== "retenido") {
      return res.status(400).json({
        mensaje: "El pago no está en un estado válido para crear la asesoría."
      });
    }

    // Verificar que el pago corresponde al usuario autenticado
    if (pago.clienteId !== req.usuario.email) {
      return res.status(403).json({
        mensaje: "El pago no corresponde al usuario autenticado."
      });
    }

    // Verificar que el pago corresponde al experto
    if (pago.expertoId !== experto.email) {
      return res.status(400).json({
        mensaje: "El pago no corresponde al experto seleccionado."
      });
    }

    // Verificar que el usuario autenticado es diferente del experto
    if (req.usuario.email === experto.email) {
      return res.status(400).json({
        mensaje: "No puedes crear una asesoría contigo mismo."
      });
    }

    // Obtener datos completos del cliente autenticado
    const clienteUsuario = await Usuario.findOne({ email: req.usuario.email });
    if (!clienteUsuario) {
      return res.status(404).json({
        mensaje: "Usuario cliente no encontrado."
      });
    }

    // Verificar que el experto existe y está activo
    const expertoUsuario = await Usuario.findOne({
      email: experto.email,
      roles: "experto",
      estado: "activo"
    });
    if (!expertoUsuario) {
      return res.status(404).json({
        mensaje: "Experto no encontrado o no está activo."
      });
    }

    // Validar fecha y hora
    const fechaInicio = new Date(fechaHoraInicio);
    const fechaFin = new Date(fechaInicio.getTime() + duracionMinutos * 60000);
    const ahora = new Date();

    if (fechaInicio <= ahora) {
      return res.status(400).json({
        mensaje: "La fecha de la asesoría debe ser futura."
      });
    }

    // Validar horario de trabajo (8:00 - 18:00)
    const horaInicio = fechaInicio.getHours() + fechaInicio.getMinutes() / 60;
    const horaFin = fechaFin.getHours() + fechaFin.getMinutes() / 60;

    if (horaInicio < 8 || horaFin > 18) {
      return res.status(400).json({
        mensaje: "Las asesorías solo se pueden agendar entre 8:00 AM y 6:00 PM, y deben completarse antes de las 6:00 PM."
      });
    }

    // Validar que la duración es permitida
    if (![60, 90, 120, 180].includes(duracionMinutos)) {
      return res.status(400).json({
        mensaje: "La duración debe ser 60, 90, 120 o 180 minutos."
      });
    }

    // Verificar conflictos de horario para el experto (asesorías confirmadas y pendientes)
    const conflictos = await Asesoria.find({
      "experto.email": experto.email,
      estado: { $in: ["pendiente-aceptacion", "confirmada"] },
      $or: [
        // Nueva asesoría inicia durante una existente
        {
          fechaHoraInicio: { $lte: fechaInicio },
          $expr: {
            $gte: [
              { $add: ["$fechaHoraInicio", { $multiply: ["$duracionMinutos", 60000] }] },
              fechaInicio
            ]
          }
        },
        // Nueva asesoría termina durante una existente
        {
          fechaHoraInicio: { $lte: fechaFin },
          $expr: {
            $gte: [
              { $add: ["$fechaHoraInicio", { $multiply: ["$duracionMinutos", 60000] }] },
              fechaFin
            ]
          }
        },
        // Nueva asesoría contiene completamente una existente
        {
          fechaHoraInicio: { $gte: fechaInicio, $lte: fechaFin }
        },
        // Asesoría existente contiene completamente la nueva
        {
          fechaHoraInicio: { $lte: fechaInicio },
          $expr: {
            $gte: [
              { $add: ["$fechaHoraInicio", { $multiply: ["$duracionMinutos", 60000] }] },
              fechaFin
            ]
          }
        }
      ]
    });

    if (conflictos.length > 0) {
      // Si hay conflictos, reembolsar el pago
      await Pago.findByIdAndUpdate(pagoId, {
        estado: "reembolsado",
        fechaReembolso: new Date()
      });

      const conflictosInfo = conflictos.map(c => {
        const inicioConflicto = new Date(c.fechaHoraInicio);
        const finConflicto = new Date(inicioConflicto.getTime() + c.duracionMinutos * 60000);
        return {
          titulo: c.titulo,
          inicio: inicioConflicto.toLocaleString('es-CO'),
          fin: finConflicto.toLocaleString('es-CO'),
          duracion: c.duracionMinutos
        };
      });

      return res.status(409).json({
        mensaje: "El experto ya tiene una asesoría agendada en ese horario. Tu pago ha sido reembolsado.",
        conflictos: conflictosInfo
      });
    }

    // Verificar que el cliente no tenga una asesoría pendiente con el mismo experto
    const asesoriaClientePendiente = await Asesoria.findOne({
      "cliente.email": clienteUsuario.email,
      "experto.email": experto.email,
      estado: "pendiente-aceptacion"
    });

    if (asesoriaClientePendiente) {
      return res.status(409).json({
        mensaje: "Ya tienes una asesoría pendiente con este experto. Espera a que sea aceptada o rechazada antes de crear otra."
      });
    }

    // Crear la asesoría
    const nuevaAsesoria = new Asesoria({
      titulo,
      descripcion,
      cliente: {
        email: clienteUsuario.email,
        nombre: clienteUsuario.nombre,
        apellido: clienteUsuario.apellido,
        avatarUrl: clienteUsuario.avatarUrl || null
      },
      experto: {
        email: expertoUsuario.email,
        nombre: expertoUsuario.nombre,
        apellido: expertoUsuario.apellido,
        avatarUrl: expertoUsuario.avatarUrl || null
      },
      categoria,
      fechaHoraInicio: fechaInicio,
      duracionMinutos,
      estado: "pendiente-aceptacion",
      pagoId: pagoId // Asociar el pago
    });

    await nuevaAsesoria.save();

    // Actualizar el estado del pago
    await Pago.findByIdAndUpdate(pagoId, {
      estado: "retenido",
      asesoriaId: nuevaAsesoria._id
    });

    // Notificación y correo al experto
    try {
      await Notificacion.create({
        usuarioId: expertoUsuario._id,
        email: expertoUsuario.email,
        tipo: "email",
        asunto: "Nueva asesoría pendiente",
        mensaje: `Tienes una nueva solicitud de asesoría "${titulo}". Ingresa a ServiTech para aceptarla o rechazarla.`,
        relacionadoCon: { tipo: "Asesoria", referenciaId: nuevaAsesoria._id },
        estado: "enviado",
        fechaEnvio: new Date(),
      });

      const fechaLocal = fechaInicio.toLocaleString("es-CO");
      const horasTexto = duracionMinutos === 60 ? "1 hora" :
                        duracionMinutos === 90 ? "1.5 horas" :
                        duracionMinutos === 120 ? "2 horas" : "3 horas";

      await enviarCorreo(
        expertoUsuario.email,
        "Nueva asesoría pendiente de aceptación",
        `Tienes una nueva solicitud de asesoría titulada "${titulo}".\n\nCliente: ${clienteUsuario.nombre} ${clienteUsuario.apellido}\nFecha y hora: ${fechaLocal}\nDuración: ${horasTexto}\n\nEl pago ya está procesado y será retenido hasta que aceptes o rechaces la solicitud.\n\nIngresa a ServiTech para aceptarla o rechazarla.`,
        { nombreDestinatario: expertoUsuario.nombre, apellidoDestinatario: expertoUsuario.apellido }
      );
    } catch (emailError) {
      console.warn("Error enviando notificación:", emailError);
    }

    await generarLogs.registrarEvento({
      usuarioEmail: clienteUsuario.email,
      nombre: clienteUsuario.nombre,
      apellido: clienteUsuario.apellido,
      accion: "CREAR_ASESORIA_CON_PAGO",
      detalle: `Asesoría registrada id:${nuevaAsesoria._id}, pagoId:${pagoId}, duración: ${duracionMinutos}min`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res.status(201).json({
      mensaje: "Asesoría creada exitosamente con pago procesado. El experto será notificado.",
      asesoria: nuevaAsesoria,
    });

  } catch (error) {
    console.error("Error creando asesoría:", error);

    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario?.email || null,
      accion: "ERROR_CREAR_ASESORIA_CON_PAGO",
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
 * Obtener asesorias del usuario autenticado
 * @function obtenerMisAsesorias
 * @description Obtiene todas las asesorias donde el usuario participa como cliente o experto
 * @param {Object} req - Request object
 * @param {Object} req.usuario - Usuario autenticado
 * @param {Object} req.query - Query parameters
 * @param {number} [req.query.page=1] - Número de página
 * @param {number} [req.query.limit=20] - Límite de resultados
 * @param {string} [req.query.estado] - Filtrar por estado específico
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Lista de asesorias con paginación
 * @throws {400} Parámetros inválidos
 * @throws {401} Usuario no autenticado
 * @throws {500} Error interno del servidor
 */
const obtenerMisAsesorias = async (req, res) => {
  try {
    // Validaciones de parámetros de consulta
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    if (page < 1) {
      return res.status(400).json({
        mensaje: "El número de página debe ser mayor a 0"
      });
    }

    if (limit < 1) {
      return res.status(400).json({
        mensaje: "El límite debe ser mayor a 0"
      });
    }

    // Validar usuario autenticado
    if (!req.usuario || !req.usuario.email) {
      return res.status(401).json({
        mensaje: "Usuario no autenticado correctamente"
      });
    }

    // Construir filtros
    const filtros = {
      $or: [
        { "cliente.email": req.usuario.email },
        { "experto.email": req.usuario.email }
      ]
    };

    // Filtro por estado si se proporciona
    if (req.query.estado) {
      const estadosValidos = [
        "pendiente-aceptacion",
        "confirmada",
        "completada",
        "cancelada-cliente",
        "cancelada-experto",
        "rechazada"
      ];

      if (!estadosValidos.includes(req.query.estado)) {
        return res.status(400).json({
          mensaje: "Estado inválido",
          estadosValidos
        });
      }

      filtros.estado = req.query.estado;
    }

    console.log(`Buscando asesorías para usuario: ${req.usuario.email}`);

    // Obtener asesorías con paginación
    const asesoriasRaw = await Asesoria.find(filtros)
      .sort({ fechaCreacion: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Contar total para paginación
    const total = await Asesoria.countDocuments(filtros);

    console.log(`Encontradas ${asesoriasRaw.length} asesorías de ${total} total`);

    // Enriquecer asesorías con información de pago
    const asesorias = await Promise.all(
      asesoriasRaw.map(async (asesoria) => {
        try {
          if (asesoria.pagoId) {
            const pago = await Pago.findById(asesoria.pagoId).lean();
            if (pago) {
              asesoria.datoPago = {
                _id: pago._id,
                estado: pago.estado,
                monto: pago.monto,
                metodo: pago.metodo,
                fechaCreacion: pago.fechaCreacion,
                fechaActualizacion: pago.fechaActualizacion
              };
            }
          }
          return asesoria;
        } catch (pagoError) {
          console.warn(`Error cargando pago ${asesoria.pagoId}:`, pagoError);
          return asesoria;
        }
      })
    );

    // Calcular información de paginación
    const pagination = {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };

    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario.email,
      nombre: req.usuario.nombre,
      apellido: req.usuario.apellido,
      accion: "OBTENER_MIS_ASESORIAS",
      detalle: `Consultadas ${asesorias.length} asesorías, página ${page}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: false
    });

    res.json({
      asesorias,
      pagination,
      usuario: {
        email: req.usuario.email,
        rol: req.usuario.roles.includes("experto") ? "experto" : "cliente"
      }
    });

  } catch (error) {
    console.error("Error obteniendo asesorías del usuario:", error);

    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario?.email || null,
      accion: "ERROR_OBTENER_MIS_ASESORIAS",
      detalle: error.message,
      resultado: "Error",
      tipo: "asesoria",
      persistirEnDB: true
    });

    res.status(500).json({
      mensaje: "Error interno obteniendo asesorías",
      error: process.env.NODE_ENV === "development" ? error.message : "Error interno"
    });
  }
};

/**
 * Cancelar asesoría por el cliente
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
 *     responses:
 *       200:
 *         description: Asesoría cancelada
 */
const cancelarAsesoriaPorCliente = async (req, res) => {
  try {
    const id = req.params.id;
    const asesoria = await Asesoria.findById(id);

    if (!asesoria) {
      return res.status(404).json({ mensaje: "Asesoría no encontrada." });
    }

    if (req.usuario.email !== asesoria.cliente.email) {
      return res.status(403).json({
        mensaje: "Solo el cliente puede cancelar su asesoría.",
      });
    }

    if (!["pendiente-aceptacion", "confirmada"].includes(asesoria.estado)) {
      return res.status(400).json({
        mensaje: "Solo se pueden cancelar asesorías pendientes o confirmadas.",
      });
    }

    asesoria.estado = "cancelada-cliente";
    asesoria.fechaCancelacion = new Date();
    asesoria.motivoCancelacion = "Cancelada por el cliente";
    await asesoria.save();

    // Notificar al experto
    try {
      const experto = await Usuario.findOne({ email: asesoria.experto.email });
      if (experto) {
        await Notificacion.create({
          usuarioId: experto._id,
          email: experto.email,
          tipo: "email",
          asunto: "Asesoría cancelada",
          mensaje: `La asesoría "${asesoria.titulo}" fue cancelada por el cliente.`,
          relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });

        await enviarCorreo(
          experto.email,
          "Asesoría cancelada",
          `La asesoría titulada "${asesoria.titulo}" fue cancelada por el cliente.`,
          {
            nombreDestinatario: experto.nombre,
            apellidoDestinatario: experto.apellido,
          }
        );
      }
    } catch (emailError) {
      console.warn("Error enviando notificación:", emailError);
    }

    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario.email,
      nombre: req.usuario.nombre,
      apellido: req.usuario.apellido,
      accion: "CANCELAR_ASESORIA_CLIENTE",
      detalle: `Asesoría cancelada por cliente id:${asesoria._id}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res.json({ mensaje: "Asesoría cancelada.", asesoria });
  } catch (error) {
    console.error("Error cancelando asesoría:", error);
    res.status(500).json({ mensaje: "Error al cancelar asesoría." });
  }
};

/**
 * Cancelar asesoría por el experto
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
 *     responses:
 *       200:
 *         description: Asesoría cancelada
 */
const cancelarAsesoriaPorExperto = async (req, res) => {
  try {
    const id = req.params.id;
    const asesoria = await Asesoria.findById(id);

    if (!asesoria) {
      return res.status(404).json({ mensaje: "Asesoría no encontrada." });
    }

    if (
      !req.usuario.roles.includes("experto") ||
      req.usuario.email !== asesoria.experto.email
    ) {
      return res.status(403).json({
        mensaje: "Solo el experto asignado puede cancelar la asesoría.",
      });
    }

    if (asesoria.estado !== "confirmada") {
      return res.status(400).json({
        mensaje: "Solo se pueden cancelar asesorías confirmadas.",
      });
    }

    asesoria.estado = "cancelada-experto";
    asesoria.fechaCancelacion = new Date();
    asesoria.motivoCancelacion = "Cancelada por el experto";
    await asesoria.save();

    // Notificar al cliente
    try {
      const cliente = await Usuario.findOne({ email: asesoria.cliente.email });
      if (cliente) {
        await Notificacion.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "email",
          asunto: "Asesoría cancelada",
          mensaje: `La asesoría "${asesoria.titulo}" fue cancelada por el experto.`,
          relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });

        await enviarCorreo(
          cliente.email,
          "Asesoría cancelada",
          `La asesoría titulada "${asesoria.titulo}" fue cancelada por el experto.`,
          {
            nombreDestinatario: cliente.nombre,
            apellidoDestinatario: cliente.apellido,
          }
        );
      }
    } catch (emailError) {
      console.warn("Error enviando notificación:", emailError);
    }

    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario.email,
      nombre: req.usuario.nombre,
      apellido: req.usuario.apellido,
      accion: "CANCELAR_ASESORIA_EXPERTO",
      detalle: `Asesoría cancelada por experto id:${asesoria._id}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res.json({ mensaje: "Asesoría cancelada.", asesoria });
  } catch (error) {
    console.error("Error cancelando asesoría:", error);
    res.status(500).json({ mensaje: "Error al cancelar asesoría." });
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
 *         description: Asesoría aceptada
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
    if (asesoria.estado !== "pendiente-aceptacion") {
      return res
        .status(400)
        .json({ mensaje: "Solo asesorías pendientes pueden aceptarse." });
    }
    asesoria.estado = "confirmada";
    await asesoria.save();

    // Notificación y correo al cliente con datos del experto incluyendo teléfono
    try {
      const cliente = await Usuario.findOne({ email: asesoria.cliente.email });
      const experto = await Usuario.findOne({ email: asesoria.experto.email });
      if (cliente && experto) {
        await Notificacion.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "email",
          asunto: "Asesoría confirmada",
          mensaje: `Tu asesoría "${asesoria.titulo}" fue aceptada por el experto.`,
          relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });

        const fechaLocal = new Date(asesoria.fechaHoraInicio).toLocaleString(
          "es-CO"
        );
        const horasTexto =
          asesoria.duracionMinutos === 60
            ? "1 hora"
            : asesoria.duracionMinutos === 90
            ? "1.5 horas"
            : asesoria.duracionMinutos === 120
            ? "2 horas"
            : "3 horas";

        const telefonoContacto =
          experto.infoExperto?.telefonoContacto || "No especificado";

        await enviarCorreo(
          cliente.email,
          "Tu asesoría fue aceptada",
          `Tu asesoría titulada "${asesoria.titulo}" fue aceptada por el experto.\n\nFecha y hora: ${fechaLocal}\nDuración: ${horasTexto}\n\nEl número de contacto del experto es: ${telefonoContacto}\n\nLa asesoría será por videollamada virtual.`,
          {
            nombreDestinatario: cliente.nombre,
            apellidoDestinatario: cliente.apellido,
          }
        );
      }
    } catch (emailError) {
      console.warn("Error enviando notificación:", emailError);
    }

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

    res.json({ mensaje: "Asesoría aceptada.", asesoria });
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
 * Rechazar asesoría y procesar reembolso automático
 * @function rechazarAsesoria
 * @description Permite al experto rechazar una asesoría pendiente y procesa automáticamente el reembolso al cliente
 * @param {Object} req - Request object
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.id - ID de la asesoría a rechazar
 * @param {Object} req.body - Cuerpo de la petición
 * @param {string} [req.body.motivo="Rechazada por el experto"] - Motivo del rechazo
 * @param {Object} req.usuario - Usuario autenticado (experto)
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Respuesta con la asesoría rechazada y estado del reembolso
 * @throws {404} Asesoría no encontrada
 * @throws {403} Usuario no autorizado
 * @throws {400} Estado de asesoría no válido para rechazo
 * @throws {500} Error interno del servidor
 * @example
 * // Rechazar asesoría con motivo personalizado
 * PUT /api/asesorias/507f1f77bcf86cd799439011/rechazar
 * {
 *   "motivo": "No disponible en el horario solicitado"
 * }
 *
 * @openapi
 * /api/asesorias/{id}/rechazar:
 *   put:
 *     summary: Rechazar asesoría y procesar reembolso automático
 *     description: |
 *       Permite al experto rechazar una asesoría pendiente de aceptación.
 *       Automáticamente procesa el reembolso del pago asociado y notifica al cliente.
 *       El reembolso se intenta procesar a través de MercadoPago si hay una transacción válida,
 *       de lo contrario se marca como reembolso local para procesamiento manual.
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: ID único de la asesoría (ObjectId de MongoDB)
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       description: Datos opcionales para el rechazo
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *                 maxLength: 500
 *                 description: Motivo específico del rechazo
 *                 example: "No disponible en el horario solicitado"
 *                 default: "Rechazada por el experto"
 *           examples:
 *             rechazo_basico:
 *               summary: Rechazo sin motivo específico
 *               value: {}
 *             rechazo_con_motivo:
 *               summary: Rechazo con motivo específico
 *               value:
 *                 motivo: "Conflicto de horarios con otra asesoría"
 *     responses:
 *       200:
 *         description: Asesoría rechazada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   description: Mensaje de confirmación
 *                   example: "Asesoría rechazada y reembolso procesado automáticamente."
 *                 asesoria:
 *                   $ref: '#/components/schemas/Asesoria'
 *                 reembolsoExitoso:
 *                   type: boolean
 *                   description: Indica si el reembolso fue procesado exitosamente
 *                   example: true
 *                 detalleReembolso:
 *                   type: string
 *                   description: Detalles del procesamiento del reembolso
 *                   example: "Reembolso procesado en MercadoPago: 12345678"
 *             examples:
 *               reembolso_exitoso:
 *                 summary: Rechazo con reembolso exitoso
 *                 value:
 *                   mensaje: "Asesoría rechazada y reembolso procesado automáticamente."
 *                   reembolsoExitoso: true
 *                   detalleReembolso: "Reembolso procesado en MercadoPago: 12345678"
 *               reembolso_manual:
 *                 summary: Rechazo que requiere reembolso manual
 *                 value:
 *                   mensaje: "Asesoría rechazada. El reembolso será procesado manualmente."
 *                   reembolsoExitoso: false
 *                   detalleReembolso: "Reembolso procesado localmente"
 *       400:
 *         description: Error de validación o estado no válido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *               examples:
 *                 estado_invalido:
 *                   value:
 *                     mensaje: "Solo asesorías pendientes pueden rechazarse."
 *       403:
 *         description: Usuario no autorizado para rechazar la asesoría
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Solo el experto asignado puede rechazar la asesoría."
 *       404:
 *         description: Asesoría no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Asesoría no encontrada."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Error al rechazar asesoría."
 */
const rechazarAsesoria = async (req, res) => {
  try {
    const id = req.params.id;
    const { motivo = "Rechazada por el experto" } = req.body;

    const asesoria = await Asesoria.findById(id);
    if (!asesoria) {
      return res.status(404).json({ mensaje: "Asesoría no encontrada." });
    }

    if (
      !req.usuario ||
      !req.usuario.roles.includes("experto") ||
      req.usuario.email !== asesoria.experto.email
    ) {
      return res.status(403).json({
        mensaje: "Solo el experto asignado puede rechazar la asesoría.",
      });
    }

    if (asesoria.estado !== "pendiente-aceptacion") {
      return res.status(400).json({
        mensaje: "Solo asesorías pendientes pueden rechazarse."
      });
    }

    // Actualizar estado de la asesoría
    asesoria.estado = "rechazada";
    asesoria.motivoCancelacion = motivo;
    asesoria.fechaCancelacion = new Date();
    await asesoria.save();

    // Procesar reembolso automático
    let reembolsoExitoso = false;
    let detalleReembolso = "";

    if (asesoria.pagoId) {
      try {
        const pago = await Pago.findById(asesoria.pagoId);

        if (pago && pago.estado === "retenido") {
          // Procesar reembolso en MercadoPago si hay transactionId válido
          if (pago.transaccionId && pago.transaccionId !== pago.metadatos?.preferenceId) {
            try {
              const { Refund } = require("mercadopago");
              const refund = new Refund(client);

              const refundResponse = await refund.create({
                body: {
                  payment_id: parseInt(pago.transaccionId),
                  amount: pago.monto
                }
              });

              if (refundResponse && refundResponse.id) {
                detalleReembolso = `Reembolso procesado en MercadoPago: ${refundResponse.id}`;
                reembolsoExitoso = true;
              }
            } catch (mpError) {
              console.warn("Error procesando reembolso en MercadoPago:", mpError);
              detalleReembolso = "Reembolso procesado localmente (error en MP)";
            }
          } else {
            detalleReembolso = "Reembolso procesado localmente";
          }

          // Actualizar estado del pago a reembolsado
          await Pago.findByIdAndUpdate(asesoria.pagoId, {
            estado: "reembolsado",
            fechaReembolso: new Date(),
            metadatos: {
              ...pago.metadatos,
              motivoReembolso: `Asesoría rechazada: ${motivo}`,
              reembolsoAutomatico: true,
              procesadoPor: req.usuario.email,
              detalleReembolso: detalleReembolso
            }
          });

          reembolsoExitoso = true;
        }
      } catch (reembolsoError) {
        console.error("Error procesando reembolso automático:", reembolsoError);
        detalleReembolso = "Error procesando reembolso automático";
      }
    }

    // Notificación y correo al cliente
    try {
      const cliente = await Usuario.findOne({ email: asesoria.cliente.email });
      if (cliente) {
        const asuntoEmail = reembolsoExitoso
          ? "Asesoría rechazada - Reembolso procesado"
          : "Asesoría rechazada";

        const mensajeEmail = reembolsoExitoso
          ? `Tu asesoría "${asesoria.titulo}" fue rechazada por el experto.\n\nMotivo: ${motivo}\n\nTu reembolso de $${asesoria.pagoId ? (await Pago.findById(asesoria.pagoId))?.monto?.toLocaleString('es-CO') || 'N/A' : 'N/A'} COP está siendo procesado y será devuelto a tu método de pago original en los próximos días hábiles.\n\nPuedes buscar otros expertos disponibles en ServiTech.`
          : `Tu asesoría "${asesoria.titulo}" fue rechazada por el experto.\n\nMotivo: ${motivo}\n\nPor favor contacta a soporte para gestionar tu reembolso.`;

        await Notificacion.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "email",
          asunto: asuntoEmail,
          mensaje: `Tu asesoría "${asesoria.titulo}" fue rechazada por el experto.`,
          relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });

        await enviarCorreo(
          cliente.email,
          asuntoEmail,
          mensajeEmail,
          {
            nombreDestinatario: cliente.nombre,
            apellidoDestinatario: cliente.apellido,
          }
        );
      }
    } catch (emailError) {
      console.warn("Error enviando notificación:", emailError);
    }

    await generarLogs.registrarEvento({
      usuarioEmail: asesoria.experto.email,
      nombre: asesoria.experto.nombre,
      apellido: asesoria.experto.apellido,
      accion: "RECHAZAR_ASESORIA_CON_REEMBOLSO",
      detalle: `Asesoría rechazada id:${asesoria._id}, reembolso: ${reembolsoExitoso ? 'exitoso' : 'fallido'}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res.json({
      mensaje: reembolsoExitoso
        ? "Asesoría rechazada y reembolso procesado automáticamente."
        : "Asesoría rechazada. El reembolso será procesado manualmente.",
      asesoria,
      reembolsoExitoso,
      detalleReembolso
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
    res.status(500).json({ mensaje: "Error al rechazar asesoría." });
  }
};

/**
 * Finalizar asesoría y liberar pago automáticamente al experto
 * @function finalizarAsesoria
 * @description Permite al cliente finalizar una asesoría confirmada y libera automáticamente el pago retenido al experto
 * @param {Object} req - Request object
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.id - ID de la asesoría a finalizar
 * @param {Object} req.body - Cuerpo de la petición
 * @param {string} [req.body.comentarios] - Comentarios opcionales sobre la asesoría
 * @param {number} [req.body.calificacion] - Calificación del 1 al 5 (opcional)
 * @param {Object} req.usuario - Usuario autenticado (cliente o admin)
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Respuesta con la asesoría finalizada y estado de liberación del pago
 * @throws {404} Asesoría no encontrada
 * @throws {403} Usuario no autorizado
 * @throws {400} Estado de asesoría no válido para finalización
 * @throws {500} Error interno del servidor
 * @example
 * // Finalizar asesoría con comentarios
 * PUT /api/asesorias/507f1f77bcf86cd799439011/finalizar
 * {
 *   "comentarios": "Excelente asesoría, muy útil",
 *   "calificacion": 5
 * }
 *
 * @openapi
 * /api/asesorias/{id}/finalizar:
 *   put:
 *     summary: Finalizar asesoría y liberar pago al experto
 *     description: |
 *       Permite al cliente finalizar una asesoría confirmada, marcándola como completada.
 *       Automáticamente libera el pago retenido al experto y envía notificaciones a ambas partes.
 *       Solo el cliente que solicitó la asesoría o un administrador pueden finalizarla.
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: ID único de la asesoría (ObjectId de MongoDB)
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       description: Datos opcionales para la finalización
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comentarios:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Comentarios del cliente sobre la asesoría
 *                 example: "Excelente asesoría, muy clara y útil"
 *               calificacion:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Calificación del 1 al 5 estrellas
 *                 example: 5
 *           examples:
 *             finalizacion_completa:
 *               summary: Finalización con comentarios y calificación
 *               value:
 *                 comentarios: "Excelente asesoría, resolvió todas mis dudas"
 *                 calificacion: 5
 *             finalizacion_basica:
 *               summary: Finalización sin datos adicionales
 *               value: {}
 *     responses:
 *       200:
 *         description: Asesoría finalizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   description: Mensaje de confirmación
 *                   example: "Asesoría finalizada exitosamente. Pago liberado al experto."
 *                 asesoria:
 *                   $ref: '#/components/schemas/Asesoria'
 *                 pagoLiberado:
 *                   type: boolean
 *                   description: Indica si el pago fue liberado exitosamente
 *                   example: true
 *                 montoPago:
 *                   type: number
 *                   description: Monto del pago liberado
 *                   example: 50000
 *             examples:
 *               finalizacion_exitosa:
 *                 summary: Finalización exitosa con pago liberado
 *                 value:
 *                   mensaje: "Asesoría finalizada exitosamente. Pago liberado al experto."
 *                   pagoLiberado: true
 *                   montoPago: 50000
 *       400:
 *         description: Error de validación o estado no válido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *               examples:
 *                 estado_invalido:
 *                   value:
 *                     mensaje: "Solo asesorías confirmadas pueden finalizarse."
 *       403:
 *         description: Usuario no autorizado para finalizar la asesoría
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Solo el cliente puede finalizar la asesoría."
 *       404:
 *         description: Asesoría no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Asesoría no encontrada."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Error al finalizar asesoría."
 */
const finalizarAsesoria = async (req, res) => {
  try {
    const id = req.params.id;
    const { comentarios = "", calificacion = null } = req.body;

    const asesoria = await Asesoria.findById(id);
    if (!asesoria) {
      return res.status(404).json({ mensaje: "Asesoría no encontrada." });
    }

    // Verificar permisos: solo el cliente o admin pueden finalizar
    const esCliente = req.usuario.email === asesoria.cliente.email;
    const esAdmin = req.usuario.roles && req.usuario.roles.includes("admin");

    if (!esCliente && !esAdmin) {
      return res.status(403).json({
        mensaje: "Solo el cliente puede finalizar la asesoría.",
      });
    }

    if (asesoria.estado !== "confirmada") {
      return res.status(400).json({
        mensaje: "Solo asesorías confirmadas pueden finalizarse.",
      });
    }

    // Actualizar estado de la asesoría
    asesoria.estado = "completada";
    asesoria.fechaFinalizacion = new Date();

    // Agregar comentarios y calificación si se proporcionaron
    if (comentarios) {
      asesoria.metadatos = {
        ...asesoria.metadatos,
        comentariosCliente: comentarios
      };
    }

    if (calificacion && calificacion >= 1 && calificacion <= 5) {
      asesoria.metadatos = {
        ...asesoria.metadatos,
        calificacionCliente: calificacion
      };
    }

    await asesoria.save();

    // Liberar pago automáticamente al experto
    let pagoLiberado = false;
    let montoPago = 0;
    let detalleLiberacion = "";

    if (asesoria.pagoId) {
      try {
        const pago = await Pago.findById(asesoria.pagoId);

        if (pago && pago.estado === "retenido") {
          // Actualizar estado del pago a liberado
          await Pago.findByIdAndUpdate(asesoria.pagoId, {
            estado: "liberado",
            fechaLiberacion: new Date(),
            metadatos: {
              ...pago.metadatos,
              motivoLiberacion: "Asesoría completada exitosamente",
              liberadoPor: req.usuario.email,
              fechaFinalizacionAsesoria: new Date(),
              comentariosCliente: comentarios || null,
              calificacionCliente: calificacion || null
            }
          });

          pagoLiberado = true;
          montoPago = pago.monto;
          detalleLiberacion = `Pago de $${pago.monto.toLocaleString('es-CO')} COP liberado al experto`;

          console.log(`Pago liberado: ${pago._id}, monto: $${pago.monto} COP`);
        } else {
          console.warn(`Pago no está en estado retenido: ${pago?.estado || 'pago no encontrado'}`);
          detalleLiberacion = "Pago no estaba en estado retenido";
        }
      } catch (pagoError) {
        console.error("Error liberando pago:", pagoError);
        detalleLiberacion = "Error liberando pago automáticamente";
      }
    } else {
      console.warn("Asesoría sin pagoId asociado");
      detalleLiberacion = "Asesoría sin pago asociado";
    }

    // Notificaciones a cliente y experto
    try {
      const cliente = await Usuario.findOne({ email: asesoria.cliente.email });
      const experto = await Usuario.findOne({ email: asesoria.experto.email });

      // Notificar al experto sobre finalización y liberación de pago
      if (experto) {
        const asuntoExperto = pagoLiberado
          ? "Asesoría completada - Pago liberado"
          : "Asesoría completada";

        const mensajeExperto = pagoLiberado
          ? `La asesoría "${asesoria.titulo}" ha sido finalizada por el cliente.\n\nTu pago de $${montoPago.toLocaleString('es-CO')} COP ha sido liberado y estará disponible en tu cuenta de MercadoPago.\n\n${comentarios ? `Comentarios del cliente: "${comentarios}"` : ''}${calificacion ? `\nCalificación recibida: ${calificacion}/5 estrellas` : ''}\n\nGracias por brindar un excelente servicio en ServiTech.`
          : `La asesoría "${asesoria.titulo}" ha sido finalizada por el cliente.\n\n${comentarios ? `Comentarios del cliente: "${comentarios}"` : ''}${calificacion ? `\nCalificación recibida: ${calificacion}/5 estrellas` : ''}`;

        await Notificacion.create({
          usuarioId: experto._id,
          email: experto.email,
          tipo: "email",
          asunto: asuntoExperto,
          mensaje: `La asesoría "${asesoria.titulo}" ha sido finalizada.`,
          relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });

        await enviarCorreo(
          experto.email,
          asuntoExperto,
          mensajeExperto,
          {
            nombreDestinatario: experto.nombre,
            apellidoDestinatario: experto.apellido,
          }
        );
      }

      // Notificar al cliente sobre finalización exitosa
      if (cliente) {
        const mensajeCliente = `Tu asesoría "${asesoria.titulo}" ha sido finalizada exitosamente.\n\n${pagoLiberado ? `El pago de $${montoPago.toLocaleString('es-CO')} COP ha sido liberado al experto.` : ''}\n\nGracias por usar ServiTech. Esperamos que la asesoría haya sido de gran utilidad.\n\n¿Te gustaría agendar otra asesoría? Visita nuestro catálogo de expertos disponibles.`;

        await Notificacion.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "email",
          asunto: "Asesoría finalizada exitosamente",
          mensaje: `Tu asesoría "${asesoria.titulo}" ha sido finalizada.`,
          relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });

        await enviarCorreo(
          cliente.email,
          "Asesoría finalizada exitosamente",
          mensajeCliente,
          {
            nombreDestinatario: cliente.nombre,
            apellidoDestinatario: cliente.apellido,
          }
        );
      }
    } catch (emailError) {
      console.warn("Error enviando notificaciones:", emailError);
    }

    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario.email,
      nombre: req.usuario.nombre,
      apellido: req.usuario.apellido,
      accion: "FINALIZAR_ASESORIA_CON_LIBERACION",
      detalle: `Asesoría finalizada id:${asesoria._id}, pago liberado: ${pagoLiberado ? 'sí' : 'no'}, monto: $${montoPago}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    const mensajeRespuesta = pagoLiberado
      ? "Asesoría finalizada exitosamente. Pago liberado al experto."
      : "Asesoría finalizada exitosamente.";

    res.json({
      mensaje: mensajeRespuesta,
      asesoria,
      pagoLiberado,
      montoPago,
      detalleLiberacion
    });
  } catch (error) {
    console.error("Error finalizando asesoría:", error);

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

// Funciones administrativas (sin cambios)
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

/**
 * Obtener asesorías de un experto por email
 * @function listarPorExperto
 * @description Obtiene las asesorías de un experto específico por su email
 * @param {Object} req - Request object
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.email - Email del experto
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Lista de asesorías del experto
 * @throws {400} Email inválido
 * @throws {404} Experto no encontrado
 * @throws {500} Error interno del servidor
 * @example
 * // Obtener asesorías de un experto
 * GET /api/asesorias/experto/experto@ejemplo.com
 *
 * @openapi
 * /api/asesorias/experto/{email}:
 *   get:
 *     summary: Obtener asesorías de un experto por email
 *     description: |
 *       Obtiene todas las asesorías (pendientes y confirmadas) de un experto específico.
 *       Esta ruta es pública para permitir que los clientes vean la disponibilidad del experto.
 *     tags: [Asesorías]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email del experto
 *         example: "experto@ejemplo.com"
 *     responses:
 *       200:
 *         description: Lista de asesorías del experto obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Asesoria'
 *             example:
 *               - _id: "507f1f77bcf86cd799439011"
 *                 titulo: "Configuración de servidor"
 *                 estado: "confirmada"
 *                 fechaHoraInicio: "2024-12-15T14:00:00.000Z"
 *                 duracionMinutos: 60
 *       400:
 *         description: Email inválido o faltante
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Email del experto es requerido"
 *       404:
 *         description: Experto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Experto no encontrado"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   error:
 *                     type: string
 *               example:
 *                 mensaje: "Error al obtener asesorías"
 *                 error: "Database connection error"
 */
const listarPorExperto = async (req, res) => {
  try {
    const expertoEmail = req.params.email;

    // Validar que se proporcione el email
    if (!expertoEmail || !expertoEmail.trim()) {
      return res.status(400).json({
        mensaje: "Email del experto es requerido"
      });
    }

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(expertoEmail)) {
      return res.status(400).json({
        mensaje: "Formato de email inválido"
      });
    }

    console.log("Obteniendo asesorías para experto:", expertoEmail);

    // Verificar que el experto existe (opcional, para mejor UX)
    const experto = await Usuario.findOne({
      email: expertoEmail,
      roles: "experto"
    });

    if (!experto) {
      return res.status(404).json({
        mensaje: "Experto no encontrado"
      });
    }

    // Obtener asesorías del experto (solo las relevantes para mostrar disponibilidad)
    const asesorias = await Asesoria.find({
      "experto.email": expertoEmail,
      estado: { $in: ["pendiente-aceptacion", "confirmada"] }
    })
    .sort({ fechaHoraInicio: 1 })
    .select('titulo estado fechaHoraInicio duracionMinutos categoria') // Solo campos necesarios
    .lean(); // Optimización de rendimiento

    console.log(`Encontradas ${asesorias.length} asesorías para ${expertoEmail}`);

    await generarLogs.registrarEvento({
      usuarioEmail: null, // Es una consulta pública
      accion: "OBTENER_ASESORIAS_EXPERTO",
      detalle: `Consultadas asesorías del experto: ${expertoEmail}, encontradas: ${asesorias.length}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: false // No persistir para evitar spam de logs
    });

    res.json(asesorias);

  } catch (error) {
    console.error("Error obteniendo asesorías del experto:", error);

    await generarLogs.registrarEvento({
      usuarioEmail: null,
      accion: "ERROR_OBTENER_ASESORIAS_EXPERTO",
      detalle: `Error consultando asesorías del experto: ${req.params.email}, error: ${error.message}`,
      resultado: "Error",
      tipo: "asesoria",
      persistirEnDB: true
    });

    res.status(500).json({
      mensaje: "Error al obtener asesorías",
      error: process.env.NODE_ENV === "development" ? error.message : "Error interno"
    });
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
  obtenerMisAsesorias,
  cancelarAsesoriaPorCliente,
  cancelarAsesoriaPorExperto,
  aceptarAsesoria,
  rechazarAsesoria,
  finalizarAsesoria,
  listarAsesorias,
  listarPorCliente,
  listarPorExperto,
  obtenerAsesoriaPorId,
  eliminarAsesoria,
};
