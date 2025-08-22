/**
 * CONTROLADOR DE EXPERTOS
 * Lógica para gestión, consulta y edición de perfil de expertos.
 */
const Usuario = require("../models/usuario.model.js");
const mongoose = require("mongoose");

// Listar expertos con paginación y filtros
const listarExpertos = async (req, res) => {
  try {
    const { page = 1, limit = 10, nombre, categoria, especialidad } = req.query;
    const filtro = { roles: "experto" };

    // Filtrar por nombre
    if (nombre) {
      filtro.$or = [
        { nombre: { $regex: nombre, $options: "i" } },
        { apellido: { $regex: nombre, $options: "i" } },
      ];
    }
    // Filtrar por especialidad
    if (especialidad) {
      filtro["infoExperto.especialidad"] = especialidad;
    }
    // Filtrar por categoría (solo si es un ObjectId válido)
    if (
      categoria &&
      categoria.length === 24 &&
      categoria.match(/^[0-9a-fA-F]{24}$/)
    ) {
      filtro["infoExperto.categorias"] = mongoose.Types.ObjectId(categoria);
    }

    const expertos = await Usuario.find(filtro)
      .select("-passwordHash")
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Usuario.countDocuments(filtro);
    res.json({ expertos, total });
  } catch (error) {
    console.error("Error al listar expertos:", error);
    res.status(500).json({ mensaje: "Error al listar expertos." });
  }
};

// Obtener experto individual por email (solo para admin)
const obtenerExpertoPorEmail = async (req, res) => {
  try {
    const email = req.params.email;
    const experto = await Usuario.findOne({ email, roles: "experto" }).select(
      "-passwordHash"
    );
    if (!experto) {
      return res.status(404).json({ mensaje: "Experto no encontrado." });
    }
    res.json(experto);
  } catch (error) {
    console.error("Error al obtener experto por email:", error);
    res.status(500).json({ mensaje: "Error interno al obtener experto." });
  }
};

// Eliminar experto por email (solo para admin)
const eliminarExpertoPorEmail = async (req, res) => {
  try {
    const email = req.params.email;
    const experto = await Usuario.findOne({ email, roles: "experto" });
    if (!experto) {
      return res.status(404).json({ mensaje: "Experto no encontrado." });
    }
    await experto.deleteOne();
    res.json({ mensaje: "Experto eliminado correctamente." });
  } catch (error) {
    console.error("Error al eliminar experto por email:", error);
    res.status(500).json({ mensaje: "Error al eliminar experto." });
  }
};

// Editar perfil de experto autenticado
const actualizarPerfilExperto = async (req, res) => {
  try {
    // Verificar autenticación
    const userId = req.usuario._id;
    if (!userId) return res.status(401).json({ mensaje: "No autenticado." });

    // Recoger datos del body
    const {
      precioPorHora,
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
      telefonoContacto,
      diasDisponibles,
    } = req.body;

    // Buscar usuario actual
    const usuario = await Usuario.findById(userId);
    if (!usuario)
      return res.status(404).json({ mensaje: "Usuario no encontrado." });

    // Asignar rol experto si no lo tiene
    if (!usuario.roles.includes("experto")) {
      usuario.roles.push("experto");
    }

    // Procesa categorías (array de ObjectId válidos)
    let categoriasArray = [];
    if (categorias) {
      if (Array.isArray(categorias)) {
        categoriasArray = categorias
          .map((id) =>
            typeof id === "string" && id.match(/^[0-9a-fA-F]{24}$/)
              ? new mongoose.Types.ObjectId(id)
              : null
          )
          .filter((id) => id !== null);
      } else if (typeof categorias === "string") {
        categoriasArray = categorias
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length === 24 && id.match(/^[0-9a-fA-F]{24}$/))
          .map((id) => new mongoose.Types.ObjectId(id));
      }
    }

    // Procesa skills (array de string)
    let skillsArray = [];
    if (skills) {
      if (Array.isArray(skills)) {
        skillsArray = skills.map((s) => String(s));
      } else if (typeof skills === "string") {
        skillsArray = skills.split(",").map((s) => s.trim());
      }
    }

    // Procesa diasDisponibles (array de string)
    let diasArray = [];
    if (diasDisponibles) {
      if (Array.isArray(diasDisponibles)) {
        diasArray = diasDisponibles.map((d) => String(d));
      } else if (typeof diasDisponibles === "string") {
        diasArray = diasDisponibles.split(",").map((d) => d.trim());
      }
    }

    // Actualiza infoExperto completo
    usuario.infoExperto = {
      precioPorHora,
      descripcion,
      categorias: categoriasArray,
      especialidad,
      skills: skillsArray,
      banco,
      tipoCuenta,
      numeroCuenta,
      titular,
      tipoDocumento,
      numeroDocumento,
      telefonoContacto,
      diasDisponibles: diasArray,
    };

    await usuario.save();
    res.json({
      mensaje: "Perfil de experto actualizado correctamente.",
      usuario,
    });
  } catch (error) {
    console.error("Error al actualizar perfil de experto:", error);
    res.status(500).json({ mensaje: "Error al actualizar perfil de experto." });
  }
};

module.exports = {
  listarExpertos,
  obtenerExpertoPorEmail,
  eliminarExpertoPorEmail,
  actualizarPerfilExperto,
};
