/**
 * CONTROLADOR DE EXPERTOS
 * ---------------------------------------------
 * Este archivo implementa la lógica de negocio para la gestión de expertos en la plataforma.
 * Incluye operaciones de listado, consulta, actualización, aprobación, rechazo y administración de perfiles de expertos.
 *
 * @module controllers/experto.controller
 * @requires models/usuario.model
 * @requires services/generarLogs
 *
 * Uso típico:
 *   const expertoController = require('./controllers/experto.controller');
 *   app.get('/api/expertos', expertoController.listarExpertos);
 *
 * Todas las funciones están documentadas con JSDoc y Swagger/OpenAPI para Deepwiki y generación automática de documentación.
 */

const mongoose = require("mongoose");
const Usuario = require("../models/usuario.model.js");
const generarLogs = require("../services/generarLogs");

/**
 * @openapi
 * tags:
 *   - name: Expertos
 *     description: Operaciones relacionadas con expertos
 *   - name: PerfilExperto
 *     description: Endpoints para obtener y actualizar el perfil del experto autenticado
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     PerfilExpertoInput:
 *       type: object
 *       properties:
 *         descripcion: { type: string }
 *         precioPorHora: { type: number }
 *         categorias:
 *           type: array
 *           items: { type: string, description: "ObjectId de Categoria" }
 *         banco: { type: string }
 *         tipoCuenta: { type: string }
 *         numeroCuenta: { type: string }
 *         titular: { type: string }
 *         tipoDocumento: { type: string }
 *         numeroDocumento: { type: string }
 *         telefonoContacto: { type: string }
 *         diasDisponibles:
 *           type: array
 *           items: { type: string, enum: ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"] }
 *       required: []
 *     UsuarioPublico:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         nombre: { type: string }
 *         apellido: { type: string }
 *         email: { type: string }
 *         avatar: { type: string }
 *         infoExperto:
 *           type: object
 *           properties:
 *             descripcion: { type: string }
 *             precioPorHora: { type: number }
 *             categorias:
 *               type: array
 *               items: { type: string }
 *             diasDisponibles:
 *               type: array
 *               items: { type: string }
 */

/**
 * Lista expertos con paginación y filtros
 * @openapi
 * /api/expertos:
 *   get:
 *     tags: [Expertos]
 *     summary: Listar expertos
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - in: query
 *         name: nombre
 *         schema: { type: string }
 *       - in: query
 *         name: categoria
 *         schema: { type: string, description: "ObjectId de Categoria" }
 *       - in: query
 *         name: estado
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de expertos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total: { type: integer }
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UsuarioPublico'
 *       500:
 *         description: Error interno
 */
const listarExpertos = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100
    );
    const { nombre, categoria, estado } = req.query;

    const filtro = {
      $or: [
        { roles: "experto" },
        { "infoExperto.descripcion": { $exists: true, $ne: "" } },
        { "infoExperto.categorias.0": { $exists: true } },
      ],
    };

    if (nombre) {
      filtro.$or = [
        { nombre: { $regex: nombre, $options: "i" } },
        { apellido: { $regex: nombre, $options: "i" } },
        { "infoExperto.descripcion": { $regex: nombre, $options: "i" } },
      ];
    }

    // Por defecto solo mostrar expertos activos en lista pública
    // Admin puede filtrar por estado específico o ver todos con "all"
    if (estado) {
      if (estado === "all") {
        // No aplicar filtro de estado - mostrar todos
      } else {
        filtro.estado = estado;
      }
    } else {
      // Si no se especifica estado, solo mostrar activos (para vista pública)
      filtro.estado = "activo";
    }

    if (categoria && mongoose.isValidObjectId(categoria)) {
      filtro["infoExperto.categorias"] = new mongoose.Types.ObjectId(categoria);
    }

    const [total, data] = await Promise.all([
      Usuario.countDocuments(filtro),
      Usuario.find(filtro)
        .populate("infoExperto.categorias", "nombre")
        .select("nombre apellido email avatarUrl infoExperto estado")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    const expertosTransformados = data.map((experto) => {
      if (experto.infoExperto && experto.infoExperto.categorias) {
        experto.infoExperto.categorias = experto.infoExperto.categorias.map(
          (cat) => (cat && cat.nombre ? cat.nombre : cat)
        );
      }
      return experto;
    });

    res.status(200).json({ total, page, limit, data: expertosTransformados });
  } catch (err) {
    console.error("listarExpertos error:", err);
    res.status(500).json({ error: "Error interno", message: err.message });
  }
};

/**
 * Activa o inactiva un experto por su ID (admin).
 *
 * @openapi
 * /api/expertos/{id}/activo:
 *   put:
 *     tags: [Expertos]
 *     summary: Activar/inactivar experto por ID
 *     description: Permite a un administrador activar o inactivar el perfil de un experto por su ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del experto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               activo:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Estado actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Estado actualizado"
 *                 experto:
 *                   $ref: '#/components/schemas/UsuarioPublico'
 *       400:
 *         description: ID de experto no válido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Experto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * @function setActivoPorId
 * @param {import('express').Request} req - Objeto de solicitud HTTP
 * @param {import('express').Response} res - Objeto de respuesta HTTP
 * @returns {Promise<void>}
 * @throws {Error} Error interno del servidor o conflicto de datos
 * @example
 *   // PUT /api/expertos/652e1b2f8c1a2b001f8e4a1b/activo
 *   {
 *     "activo": true
 *   }
 */
const setActivoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ mensaje: "ID de experto no válido" });
    }
    const experto = await Usuario.findById(id);
    if (!experto || !experto.roles || !experto.roles.includes("experto")) {
      return res.status(404).json({ mensaje: "Experto no encontrado" });
    }
    experto.infoExperto = experto.infoExperto || {};
    experto.infoExperto.activo = !!activo;
    experto.estado = activo ? "activo" : "inactivo";
    await experto.save();
    try {
      await generarLogs("experto", {
        action: activo ? "activar" : "inactivar",
        expertEmail: experto.email,
        adminEmail: req.usuario?.email,
        timestamp: new Date(),
      });
    } catch (logErr) {
      console.warn("Error al generar log (no crítico):", logErr.message);
    }
    return res.status(200).json({ mensaje: "Estado actualizado", experto });
  } catch (err) {
    console.error("setActivoPorId error:", err);
    return res
      .status(500)
      .json({ error: "Error interno", mensaje: err.message });
  }
};

/**
 * Obtiene el perfil del experto autenticado.
 * @openapi
 * /api/perfil-experto:
 *   get:
 *     tags: [PerfilExperto]
 *     summary: Obtener perfil del experto autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Perfil del experto
 *       401:
 *         description: No autenticado
 */
const obtenerPerfilExperto = async (req, res) => {
  try {
    const usuarioId = req.usuario && req.usuario._id;
    if (!usuarioId) return res.status(401).json({ error: "No autenticado" });

    const usuario = await Usuario.findById(usuarioId).select(
      "_id nombre apellido email avatar roles infoExperto estado"
    );
    if (!usuario)
      return res.status(404).json({ error: "Usuario no encontrado" });

    res.status(200).json(usuario);
  } catch (err) {
    console.error("obtenerPerfilExperto error:", err);
    res.status(500).json({ error: "Error interno", message: err.message });
  }
};

/**
 * Actualiza el perfil de experto autenticado (solo campos de experto).
 * No permite editar nombre ni apellido.
 * @openapi
 * /api/expertos/perfil:
 *   put:
 *     tags: [Expertos]
 *     summary: Actualizar perfil de experto autenticado
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PerfilExpertoInput'
 *     responses:
 *       200:
 *         description: Perfil de experto actualizado
 *       400:
 *         description: Datos obligatorios faltantes
 *       401:
 *         description: No autenticado
 */
const actualizarPerfilExperto = async (req, res) => {
  try {
    const usuarioId = req.usuario && req.usuario._id;
    if (!usuarioId) return res.status(401).json({ mensaje: "No autenticado" });

    const {
      descripcion,
      precioPorHora,
      categorias,
      banco,
      tipoCuenta,
      numeroCuenta,
      titular,
      tipoDocumento,
      numeroDocumento,
      telefonoContacto,
      diasDisponibles,
    } = req.body;

    // Validar campos obligatorios
    let missing = [];
    if (!descripcion) missing.push("descripcion");
    if (!precioPorHora) missing.push("precio");
    if (!categorias || !Array.isArray(categorias) || categorias.length === 0)
      missing.push("categorias");
    if (!banco) missing.push("banco");
    if (!tipoCuenta) missing.push("tipoCuenta");
    if (!numeroCuenta) missing.push("numeroCuenta");
    if (!titular) missing.push("titular");
    if (!tipoDocumento) missing.push("tipoDocumento");
    if (!numeroDocumento) missing.push("numeroDocumento");
    if (!telefonoContacto) missing.push("telefonoContacto");
    if (
      !diasDisponibles ||
      !Array.isArray(diasDisponibles) ||
      diasDisponibles.length === 0
    )
      missing.push("diasDisponibles");

    if (missing.length > 0) {
      return res.status(400).json({
        mensaje: "Faltan campos obligatorios para completar tu solicitud.",
        camposFaltantes: missing,
      });
    }

    const usuario = await Usuario.findById(usuarioId);
    if (!usuario)
      return res.status(404).json({ mensaje: "Usuario no encontrado." });

    usuario.infoExperto = {
      descripcion,
      precioPorHora,
      categorias,
      banco,
      tipoCuenta,
      numeroCuenta,
      titular,
      tipoDocumento,
      numeroDocumento,
      telefonoContacto,
      diasDisponibles,
    };

    if (!usuario.roles.includes("experto")) usuario.roles.push("experto");
    // Use the enum value defined in the Usuario model
    usuario.estado = "pendiente-verificacion";

    await usuario.save();

    res.status(200).json({
      mensaje:
        "Solicitud de perfil de experto enviada. Un administrador la revisará.",
      usuario,
    });
  } catch (err) {
    res
      .status(500)
      .json({ mensaje: "Error interno del servidor.", error: err.message });
  }
};

/**
 * @openapi
 * /api/expertos/aprobar/{email}:
 *   put:
 *     summary: Aprobar solicitud de experto (admin)
 *     tags: [Expertos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Experto aprobado exitosamente
 *       404:
 *         description: Experto no encontrado
 *       400:
 *         description: El experto ya está activo
 */
const aprobarExperto = async (req, res) => {
  try {
    const { email } = req.params;

    const experto = await Usuario.findOne({
      email,
      roles: "experto",
      estado: "pendiente-verificacion",
    });

    if (!experto) {
      return res.status(404).json({
        mensaje: "Experto no encontrado o ya está activo",
      });
    }

    await Usuario.findByIdAndUpdate(experto._id, {
      estado: "activo",
    });

    // Log de la acción (no bloqueante, si falla no debe afectar la respuesta)
    try {
      await generarLogs("experto", {
        action: "aprobar",
        expertEmail: email,
        adminEmail: req.usuario?.email,
        timestamp: new Date(),
      });
    } catch (logErr) {
      console.warn("Error al generar log (no crítico):", logErr.message);
    }

    return res.status(200).json({
      mensaje: "Experto aprobado exitosamente",
      experto: {
        email: experto.email,
        nombre: experto.nombre,
        apellido: experto.apellido,
        estado: "activo",
      },
    });
  } catch (err) {
    console.error("aprobarExperto error:", err);
    return res
      .status(500)
      .json({ error: "Error interno", mensaje: err.message });
  }
};

/**
 * @openapi
 * /api/expertos/rechazar/{email}:
 *   put:
 *     summary: Rechazar solicitud de experto (admin)
 *     tags: [Expertos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *                 description: Motivo del rechazo
 *     responses:
 *       200:
 *         description: Experto rechazado exitosamente
 *       404:
 *         description: Experto no encontrado
 */
const rechazarExperto = async (req, res) => {
  try {
    const { email } = req.params;
    const { motivo } = req.body;

    const experto = await Usuario.findOne({
      email,
      roles: "experto",
      estado: "pendiente-verificacion",
    });

    if (!experto) {
      return res.status(404).json({
        mensaje: "Experto no encontrado o ya fue procesado",
      });
    }

    // Quitar el rol de experto y mantener solo cliente
    const nuevosRoles = experto.roles.filter((rol) => rol !== "experto");

    await Usuario.findByIdAndUpdate(experto._id, {
      estado: "activo",
      roles: nuevosRoles,
      $unset: { infoExperto: 1 }, // Remover información de experto
    });

    // Log de la acción (no crítico, no debe bloquear la respuesta)
    try {
      await generarLogs("experto", {
        action: "rechazar",
        expertEmail: email,
        adminEmail: req.usuario?.email,
        motivo: motivo || "Sin motivo especificado",
        timestamp: new Date(),
      });
    } catch (logError) {
      console.warn(
        "Error al generar log de rechazo (no crítico):",
        logError.message
      );
    }

    return res.status(200).json({
      mensaje: "Solicitud de experto rechazada",
      experto: {
        email: experto.email,
        nombre: experto.nombre,
        apellido: experto.apellido,
        estado: "activo",
        roles: nuevosRoles,
      },
    });
  } catch (err) {
    console.error("rechazarExperto error:", err);
    res.status(500).json({ error: "Error interno", message: err.message });
  }
};

/**
 * Cambia el estado activo/inactivo del perfil de experto (admin)
 * PUT /api/expertos/:email/activo
 */
const setActivo = async (req, res) => {
  try {
    const { email } = req.params;
    const { activo } = req.body;

    if (typeof activo === "undefined") {
      return res.status(400).json({ mensaje: "Se requiere el campo 'activo'" });
    }

    try {
      console.log("[setActivo] request params:", {
        params: req.params,
        body: req.body,
      });
      console.log("[setActivo] headers x-api-key:", req.headers["x-api-key"]);
      console.log("[setActivo] cookie:", req.headers.cookie);
      console.log(
        "[setActivo] session user:",
        req.session && req.session.user ? req.session.user.email : null
      );
      console.log(
        "[setActivo] req.usuario:",
        req.usuario && req.usuario.email ? req.usuario.email : null
      );
    } catch (logErr) {
      console.warn(
        "[setActivo] error logging request metadata:",
        logErr && logErr.message
      );
    }

    // aceptar como parámetro email o user id (ObjectId)
    let experto;
    if (mongoose.isValidObjectId(email)) {
      experto = await Usuario.findById(email);
    } else {
      experto = await Usuario.findOne({ email });
    }
    if (experto && (!experto.roles || !experto.roles.includes("experto"))) {
      experto = null;
    }
    if (!experto) {
      return res.status(404).json({ mensaje: "Experto no encontrado" });
    }

    // Actualizar el campo infoExperto.activo si existe, y el campo estado general
    experto.infoExperto = experto.infoExperto || {};
    experto.infoExperto.activo = !!activo;
    experto.estado = activo ? "activo" : "inactivo";

    // DEBUG: log before save
    try {
      console.log("[setActivo] experto before save:", {
        _id: experto._id && experto._id.toString(),
        email: experto.email,
        estado: experto.estado,
        infoExperto_activo: experto.infoExperto.activo,
      });
    } catch (logErr) {
      console.warn(
        "[setActivo] error logging before save:",
        logErr && logErr.message
      );
    }

    const saved = await experto.save();

    // DEBUG: log after save
    try {
      console.log("[setActivo] experto saved:", {
        _id: saved._id && saved._id.toString(),
        email: saved.email,
        estado: saved.estado,
        infoExperto_activo: saved.infoExperto && saved.infoExperto.activo,
      });
    } catch (logErr) {
      console.warn(
        "[setActivo] error logging after save:",
        logErr && logErr.message
      );
    }

    try {
      await generarLogs("experto", {
        action: activo ? "activar" : "inactivar",
        expertEmail: email,
        adminEmail: req.usuario?.email,
        timestamp: new Date(),
      });
    } catch (logErr) {
      console.warn("Error al generar log (no crítico):", logErr.message);
    }

    return res
      .status(200)
      .json({ mensaje: "Estado actualizado", experto: saved });
  } catch (err) {
    console.error("setActivo error:", err);
    return res
      .status(500)
      .json({ error: "Error interno", mensaje: err.message });
  }
};

/**
 * Actualiza el perfil de un experto por el administrador.
 *
 * @openapi
 * /api/expertos/admin/{id}:
 *   put:
 *     tags: [Expertos]
 *     summary: Actualizar perfil de experto por admin
 *     description: Permite a un administrador actualizar el perfil de un experto por su ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del experto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PerfilExpertoInput'
 *     responses:
 *       200:
 *         description: Perfil de experto actualizado por el administrador
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Perfil de experto actualizado por el administrador."
 *                 usuario:
 *                   $ref: '#/components/schemas/UsuarioPublico'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * @function adminActualizarPerfilExperto
 * @param {import('express').Request} req - Objeto de solicitud HTTP
 * @param {import('express').Response} res - Objeto de respuesta HTTP
 * @returns {Promise<void>}
 * @throws {Error} Error interno del servidor o usuario no encontrado
 * @example
 *   // PUT /api/expertos/admin/652e1b2f8c1a2b001f8e4a1b
 *   {
 *     "descripcion": "Experto en Node.js",
 *     "precioPorHora": 50000,
 *     ...
 *   }
 */
const adminActualizarPerfilExperto = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ mensaje: "ID de experto no válido." });
    }

    const {
      nombre,
      apellido,
      email,
      descripcion,
      precioPorHora,
      categorias,
      banco,
      tipoCuenta,
      numeroCuenta,
      titular,
      tipoDocumento,
      numeroDocumento,
      telefonoContacto,
      diasDisponibles,
      estado,
    } = req.body;

    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    // Actualizar campos básicos del usuario si se proporcionan
    if (nombre) usuario.nombre = nombre;
    if (apellido) usuario.apellido = apellido;
    if (email) usuario.email = email;

    // Actualizar información de experto
    usuario.infoExperto = {
      ...(usuario.infoExperto || {}),
      descripcion,
      precioPorHora,
      categorias,
      banco,
      tipoCuenta,
      numeroCuenta,
      titular,
      tipoDocumento,
      numeroDocumento,
      telefonoContacto,
      diasDisponibles,
    };

    // El admin puede cambiar el estado directamente
    if (estado) {
      usuario.estado = estado;
    }

    // Asegurarse de que el rol 'experto' esté presente
    if (!usuario.roles.includes("experto")) {
      usuario.roles.push("experto");
    }

    await usuario.save();

    res.status(200).json({
      mensaje: "Perfil de experto actualizado por el administrador.",
      usuario,
    });
  } catch (err) {
    console.error("adminActualizarPerfilExperto error:", err);
    res.status(500).json({
      mensaje: "Error interno del servidor al actualizar.",
      error: err.message,
    });
  }
};

/**
 * Crea el perfil de experto para un usuario existente (administrador).
 *
 * @openapi
 * /api/expertos/admin:
 *   post:
 *     tags: [Expertos]
 *     summary: Crear perfil de experto para usuario existente (admin)
 *     description: Permite a un administrador crear el perfil de experto para un usuario existente.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PerfilExpertoInput'
 *     responses:
 *       201:
 *         description: Experto creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsuarioPublico'
 *       400:
 *         description: Email es requerido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: El usuario ya tiene el rol de experto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno al crear experto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * @function adminCrearExperto
 * @param {import('express').Request} req - Objeto de solicitud HTTP
 * @param {import('express').Response} res - Objeto de respuesta HTTP
 * @returns {Promise<void>}
 * @throws {Error} Error interno del servidor, usuario no encontrado o conflicto de datos
 * @example
 *   // POST /api/expertos/admin
 *   {
 *     "email": "nuevo@experto.com",
 *     "descripcion": "Experto en React",
 *     ...
 *   }
 */
const adminCrearExperto = async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      email,
      descripcion,
      precioPorHora,
      categorias,
      banco,
      tipoCuenta,
      numeroCuenta,
      titular,
      tipoDocumento,
      numeroDocumento,
      telefonoContacto,
      diasDisponibles,
      estado,
      avatar,
    } = req.body;

    // Validación previa para devolver errores claros cuando faltan campos obligatorios
    const requiredForExpert = {
      descripcion,
      precioPorHora,
      banco,
      tipoCuenta,
      numeroCuenta,
      titular,
      tipoDocumento,
      numeroDocumento,
    };
    const missingFields = Object.keys(requiredForExpert).filter((k) => {
      const v = requiredForExpert[k];
      return (
        v === undefined ||
        v === null ||
        (typeof v === "string" && v.trim() === "")
      );
    });
    if (missingFields.length > 0) {
      console.warn(
        "adminCrearExperto validation failed, missing:",
        missingFields
      );
      return res.status(400).json({
        mensaje: "Faltan campos obligatorios para crear experto.",
        camposFaltantes: missingFields,
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ mensaje: "Email es requerido." });
    }

    // Buscar usuario existente
    const usuario = await Usuario.findOne({
      email: String(email).trim().toLowerCase(),
    });
    if (!usuario) {
      return res
        .status(404)
        .json({ mensaje: "Usuario no encontrado. Crea primero el usuario." });
    }

    if (usuario.roles && usuario.roles.includes("experto")) {
      return res
        .status(409)
        .json({ mensaje: "El usuario ya tiene el rol de experto." });
    }

    // Actualizar campos básicos si se proporcionan
    if (nombre) usuario.nombre = nombre;
    if (apellido) usuario.apellido = apellido;
    if (avatar) usuario.avatar = avatar;

    // Construir infoExperto
    usuario.infoExperto = {
      descripcion: descripcion || usuario.infoExperto?.descripcion,
      precioPorHora: precioPorHora || usuario.infoExperto?.precioPorHora,
      categorias: categorias || usuario.infoExperto?.categorias || [],
      banco: banco || usuario.infoExperto?.banco,
      tipoCuenta: tipoCuenta || usuario.infoExperto?.tipoCuenta,
      numeroCuenta: numeroCuenta || usuario.infoExperto?.numeroCuenta,
      titular: titular || usuario.infoExperto?.titular,
      tipoDocumento: tipoDocumento || usuario.infoExperto?.tipoDocumento,
      numeroDocumento: numeroDocumento || usuario.infoExperto?.numeroDocumento,
      telefonoContacto:
        telefonoContacto || usuario.infoExperto?.telefonoContacto,
      diasDisponibles:
        diasDisponibles || usuario.infoExperto?.diasDisponibles || [],
      activo: true,
    };

    // Añadir rol experto
    usuario.roles = Array.isArray(usuario.roles) ? usuario.roles : [];
    if (!usuario.roles.includes("experto")) usuario.roles.push("experto");

    // Estado por defecto: activo
    usuario.estado = estado || "activo";

    await usuario.save();

    try {
      await generarLogs("experto", {
        action: "crear_por_admin",
        expertEmail: usuario.email,
        adminEmail: req.usuario?.email,
        timestamp: new Date(),
      });
    } catch (e) {
      console.warn("Error generando log (no crítico):", e && e.message);
    }

    // Return sanitized user
    const out = usuario.toObject ? usuario.toObject() : usuario;
    delete out.passwordHash;
    delete out.passwordResetToken;
    delete out.passwordResetExpires;

    return res.status(201).json(out);
  } catch (err) {
    console.error("adminCrearExperto error:", err);
    return res
      .status(500)
      .json({ mensaje: "Error interno al crear experto", error: err.message });
  }
};

module.exports = {
  listarExpertos,
  obtenerPerfilExperto,
  actualizarPerfilExperto,
  aprobarExperto,
  rechazarExperto,
  setActivo,
  adminActualizarPerfilExperto,
  adminCrearExperto,
  setActivoPorId,
};
