/**
 * Rutas de Especialidad Tecnológica
 * Expone el endpoint /api/especialidades para el frontend (registro de expertos).
 */
const express = require("express");
const router = express.Router();
const especialidadController = require("../controllers/especialidad.controller");

// GET /api/especialidades
router.get("/", especialidadController.getAll);

module.exports = router;
