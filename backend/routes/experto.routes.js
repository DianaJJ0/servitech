/**
 * RUTAS DE EXPERTOS
 * Endpoints para listar, filtrar y eliminar expertos por email.
 * Incluye edición de perfil de experto autenticado.
 */
const express = require("express");
const router = express.Router();

const expertoController = require("../controllers/experto.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

// Listar todos los expertos (requiere autenticación)
router.get("/", authMiddleware.protect, expertoController.listarExpertos);

// Obtener experto individual por email (admin)
router.get(
  "/:email",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  expertoController.obtenerExpertoPorEmail
);

// Eliminar experto por email (admin)
router.delete(
  "/:email",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  expertoController.eliminarExpertoPorEmail
);

// Editar perfil de experto autenticado (PUT)
router.put(
  "/perfil",
  authMiddleware.protect,
  expertoController.actualizarPerfilExperto
);

module.exports = router;
