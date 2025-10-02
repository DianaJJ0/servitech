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
 * Crea una nueva asesoría con validación de conflictos de horarios continuos.
 * Notifica al experto por email para aceptar/rechazar.
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
 *             type: object
 *             required:
 *               - titulo
 *               - descripcion
 *               - experto
 *               - fechaHoraInicio
 *               - duracionMinutos
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
 *     responses:
 *       201:
 *         description: Asesoría creada y pendiente de aceptación
 *       400:
 *         description: Error de validación
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
    } = req.body;

    // Validaciones básicas
    if (
      !titulo ||
      !descripcion ||
      !experto ||
      !fechaHoraInicio ||
      !duracionMinutos
    ) {
      return res.status(400).json({
        mensaje: "Faltan datos obligatorios para la asesoría.",
      });
    }

    // Verificar que el usuario autenticado es diferente del experto
    if (req.usuario.email === experto.email) {
      return res.status(400).json({
        mensaje: "No puedes crear una asesoría contigo mismo.",
      });
    }

    // Obtener datos completos del cliente autenticado
    const clienteUsuario = await Usuario.findOne({ email: req.usuario.email });
    if (!clienteUsuario) {
      return res.status(404).json({
        mensaje: "Usuario cliente no encontrado.",
      });
    }

    // Verificar que el experto existe y está activo
    const expertoUsuario = await Usuario.findOne({
      email: experto.email,
      roles: "experto",
      estado: "activo",
    });
    if (!expertoUsuario) {
      return res.status(404).json({
        mensaje: "Experto no encontrado o no está activo.",
      });
    }

    // Validar fecha y hora
    const fechaInicio = new Date(fechaHoraInicio);
    const fechaFin = new Date(fechaInicio.getTime() + duracionMinutos * 60000);
    const ahora = new Date();

    if (fechaInicio <= ahora) {
      return res.status(400).json({
        mensaje: "La fecha de la asesoría debe ser futura.",
      });
    }

    // Validar horario de trabajo (8:00 - 18:00)
    const horaInicio = fechaInicio.getHours() + fechaInicio.getMinutes() / 60;
    const horaFin = fechaFin.getHours() + fechaFin.getMinutes() / 60;

    if (horaInicio < 8 || horaFin > 18) {
      return res.status(400).json({
        mensaje:
          "Las asesorías solo se pueden agendar entre 8:00 AM y 6:00 PM, y deben completarse antes de las 6:00 PM.",
      });
    }

    // Validar que la duración es permitida
    if (![60, 90, 120, 180].includes(duracionMinutos)) {
      return res.status(400).json({
        mensaje: "La duración debe ser 60, 90, 120 o 180 minutos.",
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
        // Nueva asesoría termina durante una existente
        {
          fechaHoraInicio: { $lte: fechaFin },
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
        // Nueva asesoría contiene completamente una existente
        {
          fechaHoraInicio: { $gte: fechaInicio, $lte: fechaFin },
        },
        // Asesoría existente contiene completamente la nueva
        {
          fechaHoraInicio: { $lte: fechaInicio },
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
      ],
    });

    if (conflictos.length > 0) {
      const conflictosInfo = conflictos.map((c) => {
        const inicioConflicto = new Date(c.fechaHoraInicio);
        const finConflicto = new Date(
          inicioConflicto.getTime() + c.duracionMinutos * 60000
        );
        return {
          titulo: c.titulo,
          inicio: inicioConflicto.toLocaleString("es-CO"),
          fin: finConflicto.toLocaleString("es-CO"),
          duracion: c.duracionMinutos,
        };
      });

      return res.status(409).json({
        mensaje: "El experto ya tiene una asesoría agendada en ese horario.",
        conflictos: conflictosInfo,
      });
    }

    // Verificar que el cliente no tenga una asesoría pendiente con el mismo experto
    const asesoriaClientePendiente = await Asesoria.findOne({
      "cliente.email": clienteUsuario.email,
      "experto.email": experto.email,
      estado: "pendiente-aceptacion",
    });

    if (asesoriaClientePendiente) {
      return res.status(409).json({
        mensaje:
          "Ya tienes una asesoría pendiente con este experto. Espera a que sea aceptada o rechazada antes de crear otra.",
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
        avatarUrl: clienteUsuario.avatarUrl || null,
      },
      experto: {
        email: expertoUsuario.email,
        nombre: expertoUsuario.nombre,
        apellido: expertoUsuario.apellido,
        avatarUrl: expertoUsuario.avatarUrl || null,
      },
      categoria,
      fechaHoraInicio: fechaInicio,
      duracionMinutos,
      estado: "pendiente-aceptacion",
    });

    await nuevaAsesoria.save();

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
      const horasTexto =
        duracionMinutos === 60
          ? "1 hora"
          : duracionMinutos === 90
          ? "1.5 horas"
          : duracionMinutos === 120
          ? "2 horas"
          : "3 horas";

      await enviarCorreo(
        expertoUsuario.email,
        "Nueva asesoría pendiente de aceptación",
        `Tienes una nueva solicitud de asesoría titulada "${titulo}".\n\nCliente: ${clienteUsuario.nombre} ${clienteUsuario.apellido}\nFecha y hora: ${fechaLocal}\nDuración: ${horasTexto}\n\nIngresa a ServiTech para aceptarla o rechazarla.`,
        {
          nombreDestinatario: expertoUsuario.nombre,
          apellidoDestinatario: expertoUsuario.apellido,
        }
      );
    } catch (emailError) {
      console.warn("Error enviando notificación:", emailError);
    }

    await generarLogs.registrarEvento({
      usuarioEmail: clienteUsuario.email,
      nombre: clienteUsuario.nombre,
      apellido: clienteUsuario.apellido,
      accion: "CREAR_ASESORIA",
      detalle: `Asesoría registrada id:${nuevaAsesoria._id}, duración: ${duracionMinutos}min`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res.status(201).json({
      mensaje: "Asesoría creada y pendiente de aceptación del experto.",
      asesoria: nuevaAsesoria,
    });
  } catch (error) {
    console.error("Error creando asesoría:", error);

    await generarLogs.registrarEvento({
      usuarioEmail: req.usuario?.email || null,
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
 * Obtener asesorías del usuario autenticado (como cliente o experto)
 * @openapi
 * /api/asesorias/mias:
 *   get:
 *     summary: Obtener mis asesorías
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de asesorías del usuario
 */
const obtenerMisAsesorias = async (req, res) => {
  try {
    const userEmail = req.usuario.email;

    const asesorias = await Asesoria.find({
      $or: [{ "cliente.email": userEmail }, { "experto.email": userEmail }],
    }).sort({ fechaHoraInicio: -1 });

    // Para asesorías confirmadas donde el usuario es cliente, incluir teléfono del experto
    const asesoriasConContacto = await Promise.all(
      asesorias.map(async (asesoria) => {
        const asesoriaObj = asesoria.toObject();

        // Si el usuario es cliente y la asesoría está confirmada, agregar teléfono del experto
        if (
          asesoria.cliente.email === userEmail &&
          asesoria.estado === "confirmada"
        ) {
          const expertoCompleto = await Usuario.findOne({
            email: asesoria.experto.email,
          });
          if (
            expertoCompleto &&
            expertoCompleto.infoExperto &&
            expertoCompleto.infoExperto.telefonoContacto
          ) {
            asesoriaObj.experto.telefonoContacto =
              expertoCompleto.infoExperto.telefonoContacto;
          }
        }

        return asesoriaObj;
      })
    );

    res.json(asesoriasConContacto);
  } catch (error) {
    console.error("Error obteniendo asesorías:", error);
    res.status(500).json({ mensaje: "Error al obtener asesorías." });
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
 * Rechazar asesoría. Notifica solo al cliente.
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
 *         description: Asesoría rechazada
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
    if (asesoria.estado !== "pendiente-aceptacion") {
      return res
        .status(400)
        .json({ mensaje: "Solo asesorías pendientes pueden rechazarse." });
    }
    asesoria.estado = "rechazada";
    await asesoria.save();

    // Notificación y correo solo al cliente
    try {
      const cliente = await Usuario.findOne({ email: asesoria.cliente.email });
      if (cliente) {
        await Notificacion.create({
          usuarioId: cliente._id,
          email: cliente.email,
          tipo: "email",
          asunto: "Asesoría rechazada",
          mensaje: `Tu asesoría "${asesoria.titulo}" fue rechazada por el experto.`,
          relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });

        await enviarCorreo(
          cliente.email,
          "Tu asesoría fue rechazada",
          `Tu asesoría titulada "${asesoria.titulo}" fue rechazada por el experto. Por favor agenda una nueva asesoría en una fecha diferente.`,
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
      accion: "RECHAZAR_ASESORIA",
      detalle: `Asesoría rechazada id:${asesoria._id}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res.json({ mensaje: "Asesoría rechazada.", asesoria });
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
 * Finalizar asesoría y liberar pago
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
 *         description: Asesoría finalizada
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

    // Liberar pago al experto (si existe pagoId)
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
          asunto: "Asesoría completada",
          mensaje: `La asesoría "${asesoria.titulo}" ha sido finalizada.`,
          relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });

        await enviarCorreo(
          experto.email,
          "Asesoría completada",
          `La asesoría titulada "${asesoria.titulo}" ha sido finalizada.`,
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
          asunto: "Asesoría finalizada",
          mensaje: `Tu asesoría "${asesoria.titulo}" ha sido finalizada.`,
          relacionadoCon: { tipo: "Asesoria", referenciaId: asesoria._id },
          estado: "enviado",
          fechaEnvio: new Date(),
        });

        await enviarCorreo(
          cliente.email,
          "Asesoría finalizada",
          `Tu asesoría titulada "${asesoria.titulo}" ha sido finalizada.`,
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
      usuarioEmail: asesoria.cliente?.email || null,
      accion: "FINALIZAR_ASESORIA",
      detalle: `Asesoría finalizada id:${asesoria._id}`,
      resultado: "Exito",
      tipo: "asesoria",
      persistirEnDB: true,
    });

    res.json({ mensaje: "Asesoría finalizada.", asesoria });
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
