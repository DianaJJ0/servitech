/**
 * RUTAS DE LOGS
 * Endpoints para registrar y consultar logs del sistema.
 */
const express = require("express");
const router = express.Router();
const logController = require("../controllers/log.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

// Registrar log (solo usuario autenticado, no requiere apikey)
router.post("/", authMiddleware.protect, logController.crearLog);

// Listar todos los logs (admin + API Key)
router.get(
  "/",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  logController.obtenerLogs
);

// Obtener log por ID (admin + API Key)
router.get(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  logController.obtenerLogPorId
);

module.exports = router;
