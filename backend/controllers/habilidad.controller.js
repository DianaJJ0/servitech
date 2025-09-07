/**
 * CONTROLADOR DE HABILIDAD TECNOLÓGICA
 * Lógica para gestionar habilidades tecnológicas en el sistema SERVITECH.
 */
const Habilidad = require("../models/habilidad.model");

/**
 * Lista todas las habilidades
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const getAll = async (req, res) => {
  try {
    const habilidades = await Habilidad.find({});
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
    res
      .status(201)
      .json({ mensaje: "Habilidad creada.", habilidad: nuevaHabilidad });
  } catch (err) {
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
    res.status(200).json({ mensaje: "Habilidad actualizada.", habilidad });
  } catch (err) {
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
    res.status(200).json({ mensaje: "Habilidad eliminada." });
  } catch (err) {
    res.status(500).json({ mensaje: "Error al eliminar habilidad." });
  }
};

module.exports = {
  getAll,
  create,
  update,
  remove,
};
