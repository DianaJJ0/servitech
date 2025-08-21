/**
 * CONTROLADOR DE ESPECIALIDAD TECNOLÓGICA
 * Lógica para gestionar especialidades tecnológicas en el sistema SERVITECH.
 */
const Especialidad = require("../models/especialidad.model");

// Listar todas las especialidades (GET público)
const getAll = async (req, res) => {
  try {
    const especialidades = await Especialidad.find({});
    res.status(200).json(especialidades);
  } catch (err) {
    res.status(500).json({ mensaje: "Error al obtener especialidades." });
  }
};

// Registrar nueva especialidad (POST protegido)
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
    res
      .status(201)
      .json({
        mensaje: "Especialidad creada.",
        especialidad: nuevaEspecialidad,
      });
  } catch (err) {
    res.status(500).json({ mensaje: "Error al crear especialidad." });
  }
};

// Editar especialidad (PUT protegido)
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
    res
      .status(200)
      .json({ mensaje: "Especialidad actualizada.", especialidad });
  } catch (err) {
    res.status(500).json({ mensaje: "Error al actualizar especialidad." });
  }
};

// Eliminar especialidad (DELETE protegido)
const remove = async (req, res) => {
  try {
    const especialidad = await Especialidad.findByIdAndDelete(req.params.id);
    if (!especialidad) {
      return res.status(404).json({ mensaje: "Especialidad no encontrada." });
    }
    res.status(200).json({ mensaje: "Especialidad eliminada." });
  } catch (err) {
    res.status(500).json({ mensaje: "Error al eliminar especialidad." });
  }
};

module.exports = {
  getAll,
  create,
  update,
  remove,
};
