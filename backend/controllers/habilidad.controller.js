/**
 * CONTROLADOR DE HABILIDAD TECNOLÓGICA
 * Lógica para gestionar habilidades tecnológicas en el sistema SERVITECH.
 */
const Habilidad = require("../models/habilidad.model");
const generarLogs = require("../services/generarLogs");

/**
 * @openapi
 * tags:
 *   - name: Habilidades
 *     description: Gestión de habilidades
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
 * Lista todas las habilidades
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 * @openapi
 * /api/habilidades:
 *   get:
 *     tags: [Habilidades]
 *     summary: Obtener habilidades
 *     parameters:
 *       - in: query
 *         name: especialidadId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de habilidades
 *       500:
 *         description: Error interno del servidor
 */
const getAll = async (req, res) => {
  try {
    const { especialidadId } = req.query;
    const query = especialidadId ? { especialidad: especialidadId } : {};
    const habilidades = await Habilidad.find(query);
    res.status(200).json(habilidades);
  } catch (err) {
    res.status(500).json({ mensaje: "Error al obtener habilidades." });
  }
};

/**
 * Crea una nueva habilidad
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 * @openapi
 * /api/habilidades:
 *   post:
 *     tags: [Habilidades]
 *     summary: Crear habilidad
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Habilidad'
 *     responses:
 *       201:
 *         description: Habilidad creada
 *       400:
 *         description: Petición inválida
 *       409:
 *         description: Recurso ya existe
 */
const create = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre || typeof nombre !== "string") {
      return res.status(400).json({ mensaje: "El nombre es obligatorio." });
    }
    // Evita duplicados por nombre
    const existe = await Habilidad.findOne({ nombre: nombre.trim() });
    if (existe) {
      return res
        .status(409)
        .json({ mensaje: "Ya existe una habilidad con ese nombre." });
    }
    const nuevaHabilidad = new Habilidad({
      nombre: nombre.trim(),
      descripcion: descripcion ? descripcion.trim() : "",
    });
    await nuevaHabilidad.save();

    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      nombre: (req.usuario && req.usuario.nombre) || null,
      apellido: (req.usuario && req.usuario.apellido) || null,
      accion: "CREAR_HABILIDAD",
      detalle: `Habilidad creada id:${nuevaHabilidad._id}`,
      resultado: "Exito",
      tipo: "habilidad",
      persistirEnDB: true,
    });

    res
      .status(201)
      .json({ mensaje: "Habilidad creada.", habilidad: nuevaHabilidad });
  } catch (err) {
    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      accion: "CREAR_HABILIDAD",
      detalle: "Error al crear habilidad",
      resultado: "Error: " + (err.message || "desconocido"),
      tipo: "habilidad",
      persistirEnDB: true,
    });
    res.status(500).json({ mensaje: "Error al crear habilidad." });
  }
};

/**
 * Actualiza una habilidad existente
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const update = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    // Busca por ID y actualiza
    const habilidad = await Habilidad.findByIdAndUpdate(
      req.params.id,
      {
        nombre: nombre ? nombre.trim() : undefined,
        descripcion: descripcion ? descripcion.trim() : undefined,
      },
      { new: true, runValidators: true }
    );
    if (!habilidad) {
      return res.status(404).json({ mensaje: "Habilidad no encontrada." });
    }

    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      accion: "ACTUALIZAR_HABILIDAD",
      detalle: `Habilidad actualizada id:${habilidad._id}`,
      resultado: "Exito",
      tipo: "habilidad",
      persistirEnDB: true,
    });

    res.status(200).json({ mensaje: "Habilidad actualizada.", habilidad });
  } catch (err) {
    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      accion: "ACTUALIZAR_HABILIDAD",
      detalle: "Error al actualizar habilidad",
      resultado: "Error: " + (err.message || "desconocido"),
      tipo: "habilidad",
      persistirEnDB: true,
    });
    res.status(500).json({ mensaje: "Error al actualizar habilidad." });
  }
};

/**
 * Elimina una habilidad por ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const remove = async (req, res) => {
  try {
    const habilidad = await Habilidad.findByIdAndDelete(req.params.id);
    if (!habilidad) {
      return res.status(404).json({ mensaje: "Habilidad no encontrada." });
    }

    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      accion: "ELIMINAR_HABILIDAD",
      detalle: `Habilidad eliminada id:${habilidad._id}`,
      resultado: "Exito",
      tipo: "habilidad",
      persistirEnDB: true,
    });

    res.status(200).json({ mensaje: "Habilidad eliminada." });
  } catch (err) {
    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      accion: "ELIMINAR_HABILIDAD",
      detalle: "Error al eliminar habilidad",
      resultado: "Error: " + (err.message || "desconocido"),
      tipo: "habilidad",
      persistirEnDB: true,
    });
    res.status(500).json({ mensaje: "Error al eliminar habilidad." });
  }
};

module.exports = {
  getAll,
  create,
  update,
  remove,
};
