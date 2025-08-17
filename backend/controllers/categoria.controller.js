/**
 * CONTROLADOR DE CATEGORÍAS
 * Lógica de negocio para la gestión de las categorías de especialización.
 */
const Categoria = require("../models/categoria.model.js");


// --- Definición de Funciones ---

// Función para crear una nueva categoría.
// Recibe los datos desde el cuerpo de la petición (req.body).
const crearCategoria = async (req, res) => {
  try {
    // Extrae 'nombre' y 'descripcion' del cuerpo de la petición.
    const { nombre, descripcion } = req.body;

    // Valida que el nombre de la categoría exista.
    if (!nombre) {
      return res
        .status(400)
        .json({ mensaje: "El nombre de la categoría es obligatorio." });
    }

    // Verifica si ya existe una categoría con el mismo nombre.
    const categoriaExistente = await Categoria.findOne({ nombre });
    if (categoriaExistente) {
      return res
        .status(409)
        .json({ mensaje: "Ya existe una categoría con ese nombre." });
    }

    // Crea una nueva instancia del modelo Categoria con los datos recibidos.
    const nuevaCategoria = new Categoria({ nombre, descripcion });

    // Guarda la nueva categoría en la base de datos.
    await nuevaCategoria.save();

    // Devuelve una respuesta exitosa con la categoría creada.
    res.status(201).json({
      mensaje: "Categoría creada exitosamente.",
      categoria: nuevaCategoria,
    });
  } catch (error) {
    // Maneja errores internos del servidor.
    res
      .status(500)
      .json({ mensaje: "Error interno del servidor al crear la categoría." });
  }
};

// Función para obtener todas las categorías.
// No recibe parámetros, simplemente consulta todas las categorías en la base de datos.
const obtenerCategorias = async (req, res) => {
  try {
    // Busca todas las categorías y las ordena alfabéticamente por nombre.
    const categorias = await Categoria.find().sort({ nombre: "asc" });

    // Devuelve la lista de categorías con un código de estado 200 (OK).
    res.status(200).json(categorias);
  } catch (error) {
    // Si ocurre un error, responde con un mensaje y código de estado 500 (Error interno).
    res.status(500).json({
      mensaje: "Error interno del servidor al obtener las categorías.",
    });
  }
};

// Función asíncrona para actualizar una categoría existente en la base de datos.
const actualizarCategoria = async (req, res) => {
  try {
    // Extrae 'nombre' y 'descripcion' del cuerpo de la petición (datos enviados por el cliente).
    const { nombre, descripcion } = req.body;

    // Obtiene el ID de la categoría a actualizar desde los parámetros de la URL.
    const categoriaId = req.params.id;

    // Busca la categoría por su ID y actualiza sus campos 'nombre' y 'descripcion'.
    // El parámetro 'new: true' indica que se debe devolver el documento actualizado.
    // 'runValidators: true' asegura que se apliquen las validaciones del modelo.
    const categoria = await Categoria.findByIdAndUpdate(
      categoriaId,
      { nombre, descripcion },
      { new: true, runValidators: true }
    );

    // Si no se encuentra la categoría, responde con un error 404 (no encontrada).
    if (!categoria) {
      return res.status(404).json({ mensaje: "Categoría no encontrada." });
    }

    // Si la actualización fue exitosa, responde con el objeto actualizado y un mensaje.
    res.status(200).json({
      mensaje: "Categoría actualizada exitosamente.",
      categoria,
    });
  } catch (error) {
    // Si ocurre un error inesperado, responde con un error 500 (interno del servidor).
    res.status(500).json({
      mensaje: "Error interno del servidor al actualizar la categoría.",
    });
  }
};

// Función asíncrona para eliminar una categoría existente.
// Recibe el ID de la categoría a eliminar desde los parámetros de la URL.
const eliminarCategoria = async (req, res) => {
  try {
    // Obtiene el ID de la categoría a eliminar desde los parámetros de la URL.
    const categoriaId = req.params.id;

    // Busca la categoría por su ID y la elimina de la base de datos.
    // Si la categoría no existe, 'categoria' será null.
    const categoria = await Categoria.findByIdAndDelete(categoriaId);

    // Si no se encuentra la categoría, responde con un error 404 (no encontrada).
    if (!categoria) {
      return res.status(404).json({ mensaje: "Categoría no encontrada." });
    }

    // Si la eliminación fue exitosa, responde con un mensaje de éxito.
    res.status(200).json({ mensaje: "Categoría eliminada exitosamente." });
  } catch (error) {
    // Si ocurre un error inesperado, responde con un error 500 (interno del servidor).
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
