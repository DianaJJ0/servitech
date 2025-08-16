/**
 * Controlador de Habilidad Tecnológica
 * Gestiona la consulta y administración de habilidades tecnológicas.
 * Usado por la página de registro de expertos para llenar el select de habilidades.
 */
const Habilidad = require("../models/habilidad.model");

// Obtener todas las habilidades
exports.getAll = async (req, res) => {
  try {
    const habilidades = await Habilidad.find({});
    res.json(habilidades);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener habilidades" });
  }
};
