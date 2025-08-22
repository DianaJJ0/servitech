/**
 * CONTROLADOR DE ASESORÍAS
 * CRUD para gestión de asesorías por email de cliente y experto.
 */
const Asesoria = require("../models/asesoria.model.js");

// Crear una nueva asesoría
const crearAsesoria = async (req, res) => {
  try {
    const datos = req.body;
    if (
      !datos.titulo ||
      !datos.cliente ||
      !datos.cliente.email ||
      !datos.experto ||
      !datos.experto.email ||
      !datos.categoria ||
      !datos.fechaHoraInicio ||
      !datos.duracionMinutos
    ) {
      return res
        .status(400)
        .json({ mensaje: "Faltan datos obligatorios para la asesoría." });
    }
    const asesoria = new Asesoria(datos);
    await asesoria.save();
    res
      .status(201)
      .json({ mensaje: "Asesoría creada correctamente.", asesoria });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al crear asesoría." });
  }
};

// Listar todas las asesorías (solo admin)
const listarAsesorias = async (req, res) => {
  try {
    const asesorias = await Asesoria.find();
    res.status(200).json(asesorias);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al listar asesorías." });
  }
};

// Listar asesorías por email de cliente
const listarPorCliente = async (req, res) => {
  try {
    const email = req.params.email;
    const asesorias = await Asesoria.find({ "cliente.email": email });
    res.status(200).json(asesorias);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al listar asesorías por cliente." });
  }
};

// Listar asesorías por email de experto
const listarPorExperto = async (req, res) => {
  try {
    const email = req.params.email;
    const asesorias = await Asesoria.find({ "experto.email": email });
    res.status(200).json(asesorias);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al listar asesorías por experto." });
  }
};

// Obtener asesoría por ID
const obtenerAsesoriaPorId = async (req, res) => {
  try {
    const id = req.params.id;
    const asesoria = await Asesoria.findById(id);
    if (!asesoria)
      return res.status(404).json({ mensaje: "Asesoría no encontrada." });
    res.status(200).json(asesoria);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener asesoría." });
  }
};

// Actualizar asesoría por ID (admin)
const actualizarAsesoria = async (req, res) => {
  try {
    const id = req.params.id;
    const actualizaciones = req.body;
    const asesoria = await Asesoria.findByIdAndUpdate(id, actualizaciones, {
      new: true,
      runValidators: true,
    });
    if (!asesoria)
      return res.status(404).json({ mensaje: "Asesoría no encontrada." });
    res.status(200).json({ mensaje: "Asesoría actualizada.", asesoria });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al actualizar asesoría." });
  }
};

// Eliminar asesoría por ID (admin)
const eliminarAsesoria = async (req, res) => {
  try {
    const id = req.params.id;
    const asesoria = await Asesoria.findByIdAndDelete(id);
    if (!asesoria)
      return res.status(404).json({ mensaje: "Asesoría no encontrada." });
    res.status(200).json({ mensaje: "Asesoría eliminada." });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al eliminar asesoría." });
  }
};

module.exports = {
  crearAsesoria,
  listarAsesorias,
  listarPorCliente,
  listarPorExperto,
  obtenerAsesoriaPorId,
  actualizarAsesoria,
  eliminarAsesoria,
};
