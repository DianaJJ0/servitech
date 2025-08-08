/**
 * CONTROLADOR DE CATEGORÍAS
 * Lógica de negocio para la gestión de las categorías de especialización.
 */
const Categoria = require("../models/categoria.model.js");

// --- Definición de Funciones ---

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

const obtenerCategorias = async (req, res) => {
  try {
    const categorias = await Categoria.find().sort({ nombre: "asc" });
    res.status(200).json(categorias);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error interno del servidor al obtener las categorías.",
    });
  }
};

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

const eliminarCategoria = async (req, res) => {
  try {
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

// Se exportan todas las funciones en un único objeto para máxima compatibilidad.
module.exports = {
  crearCategoria,
  obtenerCategorias,
  actualizarCategoria,
  eliminarCategoria,
};
