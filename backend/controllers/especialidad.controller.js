/**
 * Controlador de Especialidad Tecnológica
 * Gestiona la consulta y administración de especialidades tecnológicas.
 * Usado por la página de registro de expertos para llenar el select de especialidad.
 */
const Especialidad = require("../models/especialidad.model");

// Obtener todas las especialidades
exports.getAll = async (req, res) => {
  try {
    const especialidades = await Especialidad.find({});
    res.json(especialidades);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener especialidades" });
  }
};
