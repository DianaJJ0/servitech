/**
 * @file Controlador de expertos
 * @module controllers/experto
 * @description Listado, consulta y actualización de perfil de expertos en Servitech.
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
        .select("nombre apellido email infoExperto calificacionPromedio estado")
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
      estado: "pendiente-verificacion"
    });
    
    if (!experto) {
      return res.status(404).json({ 
        mensaje: "Experto no encontrado o ya está activo" 
      });
    }
    
    await Usuario.findByIdAndUpdate(experto._id, { 
      estado: "activo" 
    });
    
    // Log de la acción
    await generarLogs("experto", {
      action: "aprobar",
      expertEmail: email,
      adminEmail: req.usuario?.email,
      timestamp: new Date()
    });
    
    res.status(200).json({ 
      mensaje: "Experto aprobado exitosamente",
      experto: {
        email: experto.email,
        nombre: experto.nombre,
        apellido: experto.apellido,
        estado: "activo"
      }
    });
  } catch (err) {
    console.error("aprobarExperto error:", err);
    res.status(500).json({ error: "Error interno", message: err.message });
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
      estado: "pendiente-verificacion"
    });
    
    if (!experto) {
      return res.status(404).json({ 
        mensaje: "Experto no encontrado o ya fue procesado" 
      });
    }
    
    // Quitar el rol de experto y mantener solo cliente
    const nuevosRoles = experto.roles.filter(rol => rol !== "experto");
    
    await Usuario.findByIdAndUpdate(experto._id, { 
      estado: "activo",
      roles: nuevosRoles,
      $unset: { infoExperto: 1 } // Remover información de experto
    });
    
    // Log de la acción
    await generarLogs("experto", {
      action: "rechazar",
      expertEmail: email,
      adminEmail: req.usuario?.email,
      motivo: motivo || "Sin motivo especificado",
      timestamp: new Date()
    });
    
    res.status(200).json({ 
      mensaje: "Solicitud de experto rechazada",
      experto: {
        email: experto.email,
        nombre: experto.nombre,
        apellido: experto.apellido,
        estado: "activo",
        roles: nuevosRoles
      }
    });
  } catch (err) {
    console.error("rechazarExperto error:", err);
    res.status(500).json({ error: "Error interno", message: err.message });
  }
};

module.exports = {
  listarExpertos,
  obtenerPerfilExperto,
  actualizarPerfilExperto,
  aprobarExperto,
  rechazarExperto,
};
