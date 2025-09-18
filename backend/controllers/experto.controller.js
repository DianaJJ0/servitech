/**
 * CONTROLADOR DE EXPERTOS - SERVITECH (rama develop)
 * - Listado público de expertos con filtros y paginación.
 * - Obtención y actualización del perfil del experto autenticado.
 * - Gestión y consulta del perfil de expertos usando categorías, precio, disponibilidad y datos bancarios.
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
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *         message:
 *           type: string
 *       required: [error]
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
 *       description: Datos públicos de un experto
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
 * - Filtros: nombre, categoria (ObjectId), estado
 * - Orden default: fecha creación descendente
 *
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const listarExpertos = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100
    );
    const { nombre, categoria, estado } = req.query;

    const filtro = { roles: "experto" };

    if (nombre) {
      filtro.$or = [
        { nombre: { $regex: nombre, $options: "i" } },
        { apellido: { $regex: nombre, $options: "i" } },
        { "infoExperto.descripcion": { $regex: nombre, $options: "i" } },
      ];
    }

    if (estado) filtro.estado = estado;

    if (categoria && mongoose.isValidObjectId(categoria)) {
      filtro["infoExperto.categorias"] = new mongoose.Types.ObjectId(categoria);
    }

    const [total, data] = await Promise.all([
      Usuario.countDocuments(filtro),
      Usuario.find(filtro)
        .populate("infoExperto.categorias", "nombre") // populate para obtener nombres de categorías
        .select("nombre apellido email infoExperto calificacionPromedio estado")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    // Transformar los datos para que las categorías muestren nombres en lugar de IDs
    const expertosTransformados = data.map((experto) => {
      if (experto.infoExperto && experto.infoExperto.categorias) {
        // Convertir array de objetos {_id, nombre} a array de strings con nombres
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
 * Obtiene el perfil del experto autenticado
 *
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
const getProfile = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: "No autenticado" });

    const user = await Usuario.findById(userId).select(
      "_id nombre apellido email avatar roles infoExperto estado"
    );
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    res.status(200).json(user);
  } catch (err) {
    console.error("getProfile error:", err);
    res.status(500).json({ error: "Error interno", message: err.message });
  }
};

/**
 * Actualiza el perfil del experto autenticado (PUT)
 *
 * @openapi
 * /api/perfil-experto:
 *   put:
 *     tags: [PerfilExperto]
 *     summary: Actualizar perfil del experto autenticado
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PerfilExpertoInput'
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: "No autenticado" });

    const {
      descripcion,
      precioPorHora,
      precio, // alias compatible
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

    const set = {};
    if (!set["infoExperto"]) set["infoExperto"] = {};

    if (typeof descripcion === "string")
      set["infoExperto.descripcion"] = descripcion;
    const precioNum =
      typeof precioPorHora !== "undefined"
        ? Number(precioPorHora)
        : typeof precio !== "undefined"
        ? Number(precio)
        : undefined;
    if (!Number.isNaN(precioNum) && typeof precioNum === "number")
      set["infoExperto.precioPorHora"] = precioNum;

    if (Array.isArray(categorias))
      set["infoExperto.categorias"] = categorias.filter(Boolean);

    if (Array.isArray(diasDisponibles))
      set["infoExperto.diasDisponibles"] = diasDisponibles.filter(Boolean);

    if (typeof banco === "string") set["infoExperto.banco"] = banco;
    if (typeof tipoCuenta === "string")
      set["infoExperto.tipoCuenta"] = tipoCuenta;
    if (typeof numeroCuenta === "string")
      set["infoExperto.numeroCuenta"] = numeroCuenta;
    if (typeof titular === "string") set["infoExperto.titular"] = titular;
    if (typeof tipoDocumento === "string")
      set["infoExperto.tipoDocumento"] = tipoDocumento;
    if (typeof numeroDocumento === "string")
      set["infoExperto.numeroDocumento"] = numeroDocumento;
    if (typeof telefonoContacto === "string")
      set["infoExperto.telefonoContacto"] = telefonoContacto;

    const updated = await Usuario.findByIdAndUpdate(
      userId,
      { $set: set },
      { new: true, runValidators: true, lean: false }
    ).select("_id nombre apellido email avatar roles infoExperto estado");

    try {
      await generarLogs("perfil_experto_update", { userId, set });
    } catch (e) {
      console.warn("generarLogs fallo:", e && e.message);
    }

    res.status(200).json(updated);
  } catch (err) {
    console.error("updateProfile error:", err);
    res.status(500).json({ error: "Error interno", message: err.message });
  }
};

/**
 * Crea/actualiza perfil vía POST en /perfil (compat)
 *
 * @openapi
 * /api/perfil-experto/perfil:
 *   post:
 *     tags: [PerfilExperto]
 *     summary: Actualizar/crear perfil del experto (compatibilidad)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PerfilExpertoInput'
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       401:
 *         description: No autenticado
 */
const actualizarPerfilExperto = async (req, res) => {
  // Reutiliza la lógica de updateProfile para mantener una sola fuente
  return updateProfile(req, res);
};

module.exports = {
  listarExpertos,
  getProfile,
  updateProfile,
  actualizarPerfilExperto,
};
