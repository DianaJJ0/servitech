/**
 * Controlador de Habilidad Tecnológica
 * Gestiona la consulta y administración de habilidades tecnológicas.
 * Usado por la página de registro de expertos para llenar el select de habilidades.
 */
const Habilidad = require("../models/habilidad.model"); // Importa el modelo de Habilidad desde la carpeta de modelos

// Obtener todas las habilidades
exports.getAll = async (req, res) => { // Exporta la función getAll para manejar la petición de obtener todas las habilidades
  try { // Intenta ejecutar el bloque de código siguiente
    const habilidades = await Habilidad.find({}); // Busca todas las habilidades en la base de datos usando el modelo Habilidad
    res.json(habilidades); // Envía la lista de habilidades como respuesta en formato JSON
  } catch (err) { // Si ocurre un error durante la consulta
    res.status(500).json({ error: "Error al obtener habilidades" }); // Envía un mensaje de error con el código de estado 500 (error interno del servidor)
  }
};
