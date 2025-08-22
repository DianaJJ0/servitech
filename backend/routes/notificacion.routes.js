/**
 * RUTAS DE NOTIFICACIÓN
 * Endpoints para registrar y consultar notificaciones.
 */
const express = require("express");
const router = express.Router();
const notificacionController = require("../controllers/notificacion.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

// Registrar notificación (solo usuario autenticado, no requiere apikey)
router.post(
  "/",
  authMiddleware.protect,
  notificacionController.crearNotificacion
);

// Listar notificaciones (admin + API Key)
router.get(
  "/",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  notificacionController.obtenerNotificaciones
);

// Obtener notificación por ID (admin + API Key)
router.get(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  notificacionController.obtenerNotificacionPorId
);

module.exports = router;
