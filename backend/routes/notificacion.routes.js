/**
 * RUTAS DE NOTIFICACIÓN
 * Endpoints para registrar y consultar notificaciones.
 */
const express = require("express");
const router = express.Router();
const notificacionController = require("../controllers/notificacion.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");

// Registrar notificación
router.post(
  "/",
  authMiddleware.protect,
  notificacionController.crearNotificacion
);

// Listar notificaciones (admin)
router.get(
  "/",
  authMiddleware.protect,
  authMiddleware.esAdmin,
  notificacionController.obtenerNotificaciones
);

// Obtener notificación por ID (admin)
router.get(
  "/:id",
  authMiddleware.protect,
  authMiddleware.esAdmin,
  notificacionController.obtenerNotificacionPorId
);

module.exports = router;
