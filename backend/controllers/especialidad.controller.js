/**
 * Controlador de Especialidad Tecnológica
 * Gestiona la consulta y administración de especialidades tecnológicas.
 * Usado por la página de registro de expertos para llenar el select de especialidad.
 */

// Importa el modelo de Especialidad desde la carpeta de modelos
const Especialidad = require("../models/especialidad.model");

// Define una función para obtener todas las especialidades tecnológicas
exports.getAll = async (req, res) => {
  try {
    // Busca todas las especialidades en la base de datos usando el modelo
    const especialidades = await Especialidad.find({});
    // Envía la lista de especialidades como respuesta en formato JSON
    res.json(especialidades);
  } catch (err) {
    // Si ocurre un error, responde con un estado 500 y un mensaje de error
    res.status(500).json({ error: "Error al obtener especialidades" });
  }
};
