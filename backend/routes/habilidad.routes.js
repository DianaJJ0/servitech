/**
 * Rutas de Habilidad Tecnológica
 * Expone el endpoint /api/habilidades para el frontend (registro de expertos).
 */
const express = require("express");
const router = express.Router();
const habilidadController = require("../controllers/habilidad.controller");

// GET /api/habilidades
router.get("/", habilidadController.getAll);

module.exports = router;
