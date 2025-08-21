/**
 * RUTAS DE EXPERTOS
 * Endpoints para listar, filtrar y eliminar expertos en la plataforma.
 * No incluye edición de perfil, solo gestión general y administración.
 */
const express = require("express");
const router = express.Router();

const Usuario = require("../models/usuario.model.js");
const authMiddleware = require("../middleware/auth.middleware.js");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

// --- GET /api/expertos ---
// Listar todos los expertos (requiere autenticación)
router.get("/", authMiddleware.protect, async (req, res) => {
  try {
    // Permite paginación y filtro por nombre, categoría, especialidad desde query params
    const { page = 1, limit = 10, nombre, categoria, especialidad } = req.query;
    const filtro = { roles: "experto" };

    // Filtro por nombre
    if (nombre) {
      filtro.$or = [
        { nombre: { $regex: nombre, $options: "i" } },
        { apellido: { $regex: nombre, $options: "i" } },
      ];
    }

    // Filtro por especialidad
    if (especialidad) {
      filtro["infoExperto.especialidad"] = especialidad;
    }

    // Filtro por categoría (como ObjectId en el array)
    if (categoria) {
      filtro["infoExperto.categorias"] = categoria;
    }

    const expertos = await Usuario.find(filtro)
      .select("-passwordHash")
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Usuario.countDocuments(filtro);

    res.json({ expertos, total });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al listar expertos." });
  }
});

// --- DELETE /api/expertos/:id ---
// Eliminar experto por ID (solo admin, requiere API Key)
router.delete(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  async (req, res) => {
    try {
      const experto = await Usuario.findById(req.params.id);
      if (!experto || !experto.roles.includes("experto")) {
        return res.status(404).json({ mensaje: "Experto no encontrado." });
      }
      await experto.deleteOne();
      res.json({ mensaje: "Experto eliminado correctamente." });
    } catch (error) {
      res.status(500).json({ mensaje: "Error al eliminar experto." });
    }
  }
);

module.exports = router;
