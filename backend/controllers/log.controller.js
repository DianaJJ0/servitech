/**
 * CONTROLADOR DE LOGS
 * Lógica para registrar y consultar logs del sistema.
 */
const Log = require("../models/log.model.js"); // Importa el modelo de Log desde la carpeta models

// Función para crear un nuevo log en la base de datos
const crearLog = async (req, res) => { // Define la función asincrónica crearLog que recibe la petición y respuesta
  try { // Intenta ejecutar el bloque de código
    const datos = req.body; // Obtiene los datos enviados en el cuerpo de la petición
    const log = new Log(datos); // Crea una nueva instancia del modelo Log con los datos recibidos
    await log.save(); // Guarda el nuevo log en la base de datos
    res.status(201).json({ mensaje: "Log registrado.", log }); // Devuelve una respuesta exitosa con el log creado
  } catch (error) { // Si ocurre un error en el bloque try
    res.status(500).json({ mensaje: "Error al registrar log." }); // Devuelve una respuesta de error al cliente
  }
};

// Función para obtener todos los logs registrados
const obtenerLogs = async (req, res) => { // Define la función asincrónica obtenerLogs que recibe la petición y respuesta
  try { // Intenta ejecutar el bloque de código
    const logs = await Log.find().sort({ createdAt: -1 }); // Busca todos los logs y los ordena por fecha de creación descendente
    res.status(200).json(logs); // Devuelve una respuesta exitosa con la lista de logs
  } catch (error) { // Si ocurre un error en el bloque try
    res.status(500).json({ mensaje: "Error al listar logs." }); // Devuelve una respuesta de error al cliente
  }
};

// Función para obtener un log específico por su ID
const obtenerLogPorId = async (req, res) => { // Define la función asincrónica obtenerLogPorId que recibe la petición y respuesta
  try { // Intenta ejecutar el bloque de código
    const log = await Log.findById(req.params.id); // Busca el log por el ID recibido en los parámetros de la petición
    if (!log) return res.status(404).json({ mensaje: "Log no encontrado." }); // Si no existe el log, responde con error 404
    res.status(200).json(log); // Devuelve una respuesta exitosa con el log encontrado
  } catch (error) { // Si ocurre un error en el bloque try
    res.status(500).json({ mensaje: "Error al buscar log." }); // Devuelve una respuesta de error al cliente
  }
};

// Exporta las funciones del controlador para ser usadas en las rutas
module.exports = {
  crearLog, // Exporta la función crearLog
  obtenerLogs, // Exporta la función obtenerLogs
  obtenerLogPorId, // Exporta la función obtenerLogPorId
};
