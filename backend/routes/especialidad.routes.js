/**
 * Rutas de Especialidad Tecnológica
 * Endpoints para gestión de especialidades tecnológicas.
 */
const express = require("express");
const router = express.Router();

const especialidadController = require("../controllers/especialidad.controller");
const authMiddleware = require("../middleware/auth.middleware.js");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

// GET público (listar especialidades)
router.get("/", especialidadController.getAll);

// POST - crear especialidad (admin, API Key)
router.post(
  "/",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  especialidadController.create
);

// PUT - editar especialidad (admin, API Key)
router.put(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  especialidadController.update
);

// DELETE - eliminar especialidad (admin, API Key)
router.delete(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  especialidadController.remove
);

module.exports = router;
