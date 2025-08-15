/**
 * RUTAS DE LOGS
 * Endpoints para registrar y consultar logs del sistema.
 */
const express = require("express");
const router = express.Router();
const logController = require("../controllers/log.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");

// Registrar log
router.post("/", authMiddleware.protect, logController.crearLog);

// Listar logs (admin)
router.get(
  "/",
  authMiddleware.protect,
  authMiddleware.esAdmin,
  logController.obtenerLogs
);

// Obtener log por ID (admin)
router.get(
  "/:id",
  authMiddleware.protect,
  authMiddleware.esAdmin,
  logController.obtenerLogPorId
);

module.exports = router;
