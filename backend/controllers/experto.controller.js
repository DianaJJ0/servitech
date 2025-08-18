// Controlador para edición de perfil de experto
const Usuario = require("../models/usuario.model.js");

// Actualiza el perfil de experto (incluye días disponibles)
const actualizarPerfilExperto = async (req, res) => {
  try {
    const userId = req.session?.user?._id;
    if (!userId) return res.status(401).json({ mensaje: "No autenticado." });

    // Recoge los datos del formulario
    const {
      precio,
      descripcion,
      categorias,
      especialidad,
      skills,
      banco,
      tipoCuenta,
      numeroCuenta,
      titular,
      tipoDocumento,
      numeroDocumento,
      diasDisponibles, // <-- aquí llegan los días seleccionados
    } = req.body;

    // Actualiza los campos relevantes en infoExperto
    const update = {
      "infoExperto.precioPorHora": precio,
      "infoExperto.descripcion": descripcion,
      "infoExperto.categorias": categorias ? categorias.split(",") : [],
      "infoExperto.especialidad": especialidad,
      "infoExperto.skills": skills ? skills.split(",") : [],
      "infoExperto.horario": diasDisponibles ? diasDisponibles.split(",") : [],
      "infoExperto.banco": banco,
      "infoExperto.tipoCuenta": tipoCuenta,
      "infoExperto.numeroCuenta": numeroCuenta,
      "infoExperto.titular": titular,
      "infoExperto.tipoDocumento": tipoDocumento,
      "infoExperto.numeroDocumento": numeroDocumento,
    };

    await Usuario.findByIdAndUpdate(userId, { $set: update }, { new: true });
    res.json({ mensaje: "Perfil actualizado correctamente." });
  } catch (error) {
    console.error("Error al actualizar perfil de experto:", error);
    res.status(500).json({ mensaje: "Error al actualizar perfil." });
  }
};

module.exports = { actualizarPerfilExperto };
