/**
 * CONTROLADOR DE CATEGORÍAS
 * Lógica de negocio para la gestión de las categorías de especialización.
 */
const Categoria = require("../models/categoria.model.js");

// Crear una nueva categoría
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
    // Crear una nueva categoría
    const nuevaCategoria = new Categoria({ nombre, descripcion });
    await nuevaCategoria.save();
    res.status(201).json({
      mensaje: "Categoría creada exitosamente.",
      categoria: nuevaCategoria,
    });
  } catch (error) {
    res
      .status(500)
      .json({ mensaje: "Error interno del servidor al crear la categoría." });
  }
};

// Obtener todas las categorías o filtrar por nombre
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

// Actualizar una categoría existente
const actualizarCategoria = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    const categoriaId = req.params.id;
    const categoria = await Categoria.findByIdAndUpdate(
      categoriaId,
      { nombre, descripcion },
      { new: true, runValidators: true }
    );
    // asegurar que la categoría existe
    if (!categoria) {
      return res.status(404).json({ mensaje: "Categoría no encontrada." });
    }
    res.status(200).json({
      mensaje: "Categoría actualizada exitosamente.",
      categoria,
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "Error interno del servidor al actualizar la categoría.",
    });
  }
};

// Eliminar una categoría existente
const eliminarCategoria = async (req, res) => {
  try {
    // Validar que se proporciona un ID de categoría
    const categoriaId = req.params.id;
    const categoria = await Categoria.findByIdAndDelete(categoriaId);
    if (!categoria) {
      return res.status(404).json({ mensaje: "Categoría no encontrada." });
    }
    res.status(200).json({ mensaje: "Categoría eliminada exitosamente." });
  } catch (error) {
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
