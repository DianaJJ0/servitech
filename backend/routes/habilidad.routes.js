/**
 * Rutas de Habilidad Tecnológica
 * Endpoints para gestión de habilidades tecnológicas.
 */
const express = require("express");
const router = express.Router();

const habilidadController = require("../controllers/habilidad.controller");
const authMiddleware = require("../middleware/auth.middleware.js");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

// GET público (listar habilidades)
router.get("/", habilidadController.getAll);

// POST - crear habilidad (admin, API Key)
router.post(
  "/",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  habilidadController.create
);

// PUT - editar habilidad (admin, API Key)
router.put(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  habilidadController.update
);

// DELETE - eliminar habilidad (admin, API Key)
router.delete(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  habilidadController.remove
);

module.exports = router;
