/**
 * CONTROLADOR DE CATEGORÍAS
 * Lógica de negocio para la gestión de las categorías de especialización.
 */
const Categoria = require("../models/categoria.model.js");
const mongoose = require("mongoose");
const generarLogs = require("../services/generarLogs");

const parentCategoryMap = {
  development: "Desarrollo",
  design: "Diseño",
  data: "Datos",
  infrastructure: "Infraestructura",
};

// Normaliza una categoría a la forma pública que usa el frontend
function normalizeCategory(c) {
  if (!c) return null;
  // Manejar tanto documentos Mongoose como objetos plain
  const raw = c.toObject ? c.toObject() : c;
  const id = String(raw._id || raw.id || raw.value || "");
  const name = String(raw.nombre || raw.name || raw.label || "");
  const icon = String(raw.icon || raw.icono || "");
  const slug = String(raw.slug || "");
  const color = String(raw.color || "#3a8eff");
  let parentName = "-";
  let parentId = raw.parent || ""; // Asignar el valor de parent directamente. Esta es la declaración correcta.
  try {
    if (raw.parent) {
      if (typeof raw.parent === "object") {
        parentName =
          raw.parent.nombre ||
          raw.parent.name ||
          String(raw.parent._id || raw.parent.id || "-");
        parentId = String(raw.parent._id || raw.parent.id || "");
      } else {
        // Traducir el ID del padre a su nombre legible
        parentId = String(raw.parent);
        parentName = parentCategoryMap[parentId] || parentId;
      }
    }
  } catch (e) {
    parentName = "-";
  }
  // Asegurar que el estado sea siempre 'active' o 'inactive'
  const estado =
    String(raw.estado || "active").toLowerCase() === "active"
      ? "active"
      : "inactive";
  const publicacionesCount =
    Number(raw.publicacionesCount || raw.postsCount || 0) || 0;
  const expertosCount = Number(raw.expertosCount || raw.expertsCount || 0) || 0;
  const descripcion = String(raw.descripcion || raw.description || "");
  return {
    id,
    name,
    icon,
    slug,
    parent: parentName,
    parent_id: parentId,
    estado,
    publicacionesCount,
    expertosCount,
    descripcion,
    color,
  };
}

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
    const {
      nombre,
      nombreNormalized,
      slug,
      slugNormalized,
      parent,
      estado,
      descripcion,
      icon,
      color,
    } = req.body;

    if (!nombre) {
      return res
        .status(400)
        .json({ mensaje: "El nombre de la categoría es obligatorio." });
    }
    // Verificar si ya existe una categoría con el mismo nombre o slug
    const categoriaExistente = await Categoria.findOne({
      $or: [{ nombre: nombre }, { slug: slug }],
    });
    if (categoriaExistente) {
      return res
        .status(409)
        .json({ mensaje: "Ya existe una categoría con ese nombre o slug." });
    }

    const nuevaCategoria = new Categoria({
      nombre,
      nombreNormalized,
      slug,
      slugNormalized,
      parent,
      estado,
      descripcion,
      icon,
      color,
    });
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
      categoria: normalizeCategory(nuevaCategoria),
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
    const { nombre, all } = req.query;
    // Por defecto, devolver sólo categorías activas para consumo público.
    // Si se pasa ?all=true o si la petición incluye indicación de admin, devolver todas.
    let filtro = { estado: { $in: ["active", "activo"] } };
    // Si se solicita explícitamente todas las categorías (por ejemplo desde el panel admin)
    if (String(all || "").toLowerCase() === "true") {
      filtro = {}; // sin filtro por estado
    } else if (
      req.usuario &&
      Array.isArray(req.usuario.roles) &&
      req.usuario.roles.includes("admin")
    ) {
      // Petición autenticada como admin: devolver todas
      filtro = {};
    }
    if (nombre && typeof nombre === "string" && nombre.trim() !== "") {
      // Busca por nombre parcial, insensible a mayúsculas y minúsculas
      filtro.nombre = { $regex: nombre.trim(), $options: "i" };
    }
    // Usar sólo el modelo Mongoose para evitar inconsistencias entre instancias/conexiones
    if (!Categoria || typeof Categoria.find !== "function") {
      throw new Error("Modelo Categoria no disponible");
    }
    const categorias = await Categoria.find(filtro).sort({ nombre: "asc" });
    // devolver forma normalizada para el frontend
    const normalized = (categorias || []).map(normalizeCategory);
    res.status(200).json(normalized);
  } catch (error) {
    // Registrar error internamente si el servicio de logs está disponible
    try {
      generarLogs.registrarEvento({
        accion: "OBTENER_CATEGORIAS_ERROR",
        detalle: error && error.stack ? error.stack : String(error),
        resultado: "Error",
        tipo: "categoria",
        persistirEnDB: false,
      });
    } catch (logErr) {
      // Silenciar fallos en el logger para no ocultar el error original
    }
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
    const {
      nombre,
      nombreNormalized,
      slug,
      slugNormalized,
      parent,
      estado,
      descripcion,
      icon,
      color,
    } = req.body;
    const categoriaId = req.params.id;

    const updateFields = {
      nombre,
      nombreNormalized,
      slug,
      slugNormalized,
      parent,
      estado,
      descripcion,
      icon,
      color,
    };

    const categoria = await Categoria.findByIdAndUpdate(
      categoriaId,
      updateFields,
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
      categoria: normalizeCategory(categoria),
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
  normalizeCategory,
};
