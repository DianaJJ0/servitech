/**
 * CONTROLADOR DE ESPECIALIDAD TECNOLÓGICA
 * Lógica para gestionar especialidades tecnológicas en el sistema SERVITECH.
 */
const Especialidad = require("../models/especialidad.model");
const generarLogs = require("../services/generarLogs");

/**
 * @openapi
 * tags:
 *   - name: Especialidades
 *     description: Gestión de especialidades
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
 *       required:
 *         - error
 *         - message
 */

/**
 * @openapi
 * tags:
 *   - name: Especialidades
 *     description: Gestión de especialidades
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
 *       required:
 *         - error
 *         - message
 */

/**
 * Lista todas las especialidades
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const getAll = async (req, res) => {
  try {
    const especialidades = await Especialidad.find({});
    res.status(200).json(especialidades);
  } catch (err) {
    res.status(500).json({ mensaje: "Error al obtener especialidades." });
  }
};

/**
 * @openapi
 * /api/especialidades:
 *   get:
 *     tags: [Especialidades]
 *     summary: Listar especialidades
 *     responses:
 *       200:
 *         description: Lista de especialidades
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Especialidad'
 *       500:
 *         description: Error interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * Crear especialidad.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @openapi
 * /api/especialidades:
 *   post:
 *     tags: [Especialidades]
 *     summary: Crear especialidad
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Especialidad'
 *     responses:
 *       201:
 *         description: Especialidad creada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Especialidad'
 *       400:
 *         description: Petición inválida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Recurso ya existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * Crea una nueva especialidad
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const create = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre || typeof nombre !== "string") {
      return res.status(400).json({ mensaje: "El nombre es obligatorio." });
    }
    // Evita duplicados por nombre
    const existe = await Especialidad.findOne({ nombre: nombre.trim() });
    if (existe) {
      return res
        .status(409)
        .json({ mensaje: "Ya existe una especialidad con ese nombre." });
    }
    const nuevaEspecialidad = new Especialidad({
      nombre: nombre.trim(),
      descripcion: descripcion ? descripcion.trim() : "",
    });
    await nuevaEspecialidad.save();

    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      nombre: (req.usuario && req.usuario.nombre) || null,
      apellido: (req.usuario && req.usuario.apellido) || null,
      accion: "CREAR_ESPECIALIDAD",
      detalle: `Especialidad creada id:${nuevaEspecialidad._id}`,
      resultado: "Exito",
      tipo: "especialidad",
      persistirEnDB: true,
    });

    res.status(201).json({
      mensaje: "Especialidad creada.",
      especialidad: nuevaEspecialidad,
    });
  } catch (err) {
    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      accion: "CREAR_ESPECIALIDAD",
      detalle: "Error al crear especialidad",
      resultado: "Error: " + (err.message || "desconocido"),
      tipo: "especialidad",
      persistirEnDB: true,
    });
    res.status(500).json({ mensaje: "Error al crear especialidad." });
  }
};

/**
 * Actualiza una especialidad existente
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const update = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    // Busca por ID y actualiza
    const especialidad = await Especialidad.findByIdAndUpdate(
      req.params.id,
      {
        nombre: nombre ? nombre.trim() : undefined,
        descripcion: descripcion ? descripcion.trim() : undefined,
      },
      { new: true, runValidators: true }
    );
    if (!especialidad) {
      return res.status(404).json({ mensaje: "Especialidad no encontrada." });
    }

    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      accion: "ACTUALIZAR_ESPECIALIDAD",
      detalle: `Especialidad actualizada id:${especialidad._id}`,
      resultado: "Exito",
      tipo: "especialidad",
      persistirEnDB: true,
    });

    res
      .status(200)
      .json({ mensaje: "Especialidad actualizada.", especialidad });
  } catch (err) {
    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      accion: "ACTUALIZAR_ESPECIALIDAD",
      detalle: "Error al actualizar especialidad",
      resultado: "Error: " + (err.message || "desconocido"),
      tipo: "especialidad",
      persistirEnDB: true,
    });
    res.status(500).json({ mensaje: "Error al actualizar especialidad." });
  }
};

/**
 * @openapi
 * /api/especialidades/{id}:
 *   put:
 *     tags: [Especialidades]
 *     summary: Actualizar especialidad
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
 *             $ref: '#/components/schemas/Especialidad'
 *     responses:
 *       200:
 *         description: Especialidad actualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Especialidad'
 *       400:
 *         description: Petición inválida
 *       404:
 *         description: Recurso no encontrado
 */

/**
 * Elimina una especialidad por ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const remove = async (req, res) => {
  try {
    const especialidad = await Especialidad.findByIdAndDelete(req.params.id);
    if (!especialidad) {
      return res.status(404).json({ mensaje: "Especialidad no encontrada." });
    }

    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      accion: "ELIMINAR_ESPECIALIDAD",
      detalle: `Especialidad eliminada id:${especialidad._id}`,
      resultado: "Exito",
      tipo: "especialidad",
      persistirEnDB: true,
    });

    res.status(200).json({ mensaje: "Especialidad eliminada." });
  } catch (err) {
    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      accion: "ELIMINAR_ESPECIALIDAD",
      detalle: "Error al eliminar especialidad",
      resultado: "Error: " + (err.message || "desconocido"),
      tipo: "especialidad",
      persistirEnDB: true,
    });
    res.status(500).json({ mensaje: "Error al eliminar especialidad." });
  }
};

module.exports = {
  getAll,
  create,
  update,
  remove,
};
