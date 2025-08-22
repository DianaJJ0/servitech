/**
 * RUTAS DE PAGO
 * Endpoints para registrar y consultar pagos.
 */
const express = require("express");
const router = express.Router();
const pagoController = require("../controllers/pago.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

// Registrar pago (solo usuario autenticado)
router.post("/", authMiddleware.protect, pagoController.crearPago);

// Listar todos los pagos (admin + API Key)
router.get(
  "/",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  pagoController.obtenerPagos
);

// Obtener pago por ID (admin + API Key)
router.get(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  pagoController.obtenerPagoPorId
);

// Actualizar estado de pago (admin + API Key)
router.put(
  "/:id/estado",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  pagoController.actualizarEstadoPago
);

module.exports = router;
