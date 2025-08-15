/**
 * RUTAS DE PAGO
 * Endpoints para registrar y consultar pagos.
 */
const express = require("express");
const router = express.Router();
const pagoController = require("../controllers/pago.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");

// Registrar pago
router.post("/", authMiddleware.protect, pagoController.crearPago);

// Listar todos los pagos (admin)
router.get(
  "/",
  authMiddleware.protect,
  authMiddleware.esAdmin,
  pagoController.obtenerPagos
);

// Obtener pago por ID (admin)
router.get(
  "/:id",
  authMiddleware.protect,
  authMiddleware.esAdmin,
  pagoController.obtenerPagoPorId
);

// Actualizar estado de pago (admin)
router.put(
  "/:id/estado",
  authMiddleware.protect,
  authMiddleware.esAdmin,
  pagoController.actualizarEstadoPago
);

module.exports = router;
