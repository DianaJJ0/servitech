// Controlador para edición de perfil de experto
const Usuario = require("../models/usuario.model.js");

// Actualiza el perfil de experto (incluye días disponibles)
const actualizarPerfilExperto = async (req, res) => {
  try {
    // El middleware protect añade el usuario autenticado en req.usuario
    const userId = req.usuario.id;
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
      diasDisponibles,
    } = req.body;

    // Buscar usuario actual
    const usuario = await Usuario.findById(userId);
    if (!usuario)
      return res.status(404).json({ mensaje: "Usuario no encontrado." });

    // Si no tiene el rol experto, asignarlo
    if (!usuario.roles.includes("experto")) {
      usuario.roles.push("experto");
    }

    // Actualizar infoExperto
    const mongoose = require("mongoose");
    usuario.infoExperto = {
      precioPorHora: precio,
      descripcion,
      categorias: categorias
        ? categorias.split(",").map((id) => new mongoose.Types.ObjectId(id))
        : [],
      especialidad,
      skills: skills ? skills.split(",") : [],
      horario: diasDisponibles ? diasDisponibles.split(",") : [],
      banco,
      tipoCuenta,
      numeroCuenta,
      titular,
      tipoDocumento,
      numeroDocumento,
      telefonoContacto: req.body.telefonoContacto || "",
      diasDisponibles: diasDisponibles ? diasDisponibles.split(",") : [],
    };
    await usuario.save();
    res.json({ mensaje: "Perfil de experto actualizado correctamente." });
  } catch (error) {
    console.error("Error al actualizar perfil de experto:", error);
    res.status(500).json({ mensaje: "Error al actualizar perfil." });
  }
};

module.exports = { actualizarPerfilExperto };
