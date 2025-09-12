/**
 * CONTROLADOR DE CATEGORÍAS
 * Lógica de negocio para la gestión de las categorías de especialización.
 */
const Categoria = require("../models/categoria.model.js");
const generarLogs = require("../services/generarLogs");

/**
 * @openapi
 * tags:
 *   - name: Categorias
 *     description: Gestión de categorías
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
 * Crea una nueva categoría
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const crearCategoria = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre) {
      return res
        .status(400)
        .json({ mensaje: "El nombre de la categoría es obligatorio." });
    }
    const categoriaExistente = await Categoria.findOne({ nombre });
    if (categoriaExistente) {
      return res
        .status(409)
        .json({ mensaje: "Ya existe una categoría con ese nombre." });
    }
    const nuevaCategoria = new Categoria({ nombre, descripcion });
    await nuevaCategoria.save();

    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      nombre: (req.usuario && req.usuario.nombre) || null,
      apellido: (req.usuario && req.usuario.apellido) || null,
      accion: "CREAR_CATEGORIA",
      detalle: `Categoría creada id:${nuevaCategoria._id}`,
      resultado: "Exito",
      tipo: "categoria",
      persistirEnDB: true,
    });

    res.status(201).json({
      mensaje: "Categoría creada exitosamente.",
      categoria: nuevaCategoria,
    });
  } catch (error) {
    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      accion: "CREAR_CATEGORIA",
      detalle: "Error al crear categoría",
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "categoria",
      persistirEnDB: true,
    });
    res
      .status(500)
      .json({ mensaje: "Error interno del servidor al crear la categoría." });
  }
};

/**
 * @openapi
 * /api/categorias:
 *   get:
 *     tags: [Categorias]
 *     summary: Obtener categorías
 *     responses:
 *       200:
 *         description: Lista de categorías
 */

/**
 * Obtiene todas las categorías con filtro opcional por nombre
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const obtenerCategorias = async (req, res) => {
  try {
    const { nombre } = req.query;
    let filtro = {};
    if (nombre && typeof nombre === "string" && nombre.trim() !== "") {
      // Busca por nombre parcial, insensible a mayúsculas y minúsculas
      filtro.nombre = { $regex: nombre.trim(), $options: "i" };
    }
    const categorias = await Categoria.find(filtro).sort({ nombre: "asc" });
    res.status(200).json(categorias);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error interno del servidor al obtener las categorías.",
    });
  }
};

/**
 * Actualiza una categoría existente
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const actualizarCategoria = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    const categoriaId = req.params.id;
    const categoria = await Categoria.findByIdAndUpdate(
      categoriaId,
      { nombre, descripcion },
      { new: true, runValidators: true }
    );
    if (!categoria) {
      return res.status(404).json({ mensaje: "Categoría no encontrada." });
    }

    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      accion: "ACTUALIZAR_CATEGORIA",
      detalle: `Categoría actualizada id:${categoria._id}`,
      resultado: "Exito",
      tipo: "categoria",
      persistirEnDB: true,
    });

    res.status(200).json({
      mensaje: "Categoría actualizada exitosamente.",
      categoria,
    });
  } catch (error) {
    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      accion: "ACTUALIZAR_CATEGORIA",
      detalle: "Error al actualizar categoría",
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "categoria",
      persistirEnDB: true,
    });
    res.status(500).json({
      mensaje: "Error interno del servidor al actualizar la categoría.",
    });
  }
};

/**
 * Elimina una categoría por ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const eliminarCategoria = async (req, res) => {
  try {
    const categoriaId = req.params.id;
    const categoria = await Categoria.findByIdAndDelete(categoriaId);
    if (!categoria) {
      return res.status(404).json({ mensaje: "Categoría no encontrada." });
    }

    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      accion: "ELIMINAR_CATEGORIA",
      detalle: `Categoría eliminada id:${categoria._id}`,
      resultado: "Exito",
      tipo: "categoria",
      persistirEnDB: true,
    });

    res.status(200).json({ mensaje: "Categoría eliminada exitosamente." });
  } catch (error) {
    generarLogs.registrarEvento({
      usuarioEmail: (req.usuario && req.usuario.email) || null,
      accion: "ELIMINAR_CATEGORIA",
      detalle: "Error al eliminar categoría",
      resultado: "Error: " + (error.message || "desconocido"),
      tipo: "categoria",
      persistirEnDB: true,
    });
    res.status(500).json({
      mensaje: "Error interno del servidor al eliminar la categoría.",
    });
  }
};

module.exports = {
  crearCategoria,
  obtenerCategorias,
  actualizarCategoria,
  eliminarCategoria,
};
