/**
 * RUTAS DE ASESORÍAS
 * CRUD y flujo de pago + finalización.
 */
const express = require("express");
const router = express.Router();
const asesoriaController = require("../controllers/asesoria.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

// Crear asesoría (protegido, solo usuario autenticado)
router.post("/", authMiddleware.protect, asesoriaController.crearAsesoria);

// Finalizar asesoría y liberar pago (cliente autenticado)
router.put(
  "/:id/finalizar",
  authMiddleware.protect,
  asesoriaController.finalizarAsesoria
);

// Listar todas (admin + API Key)
router.get(
  "/",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  asesoriaController.listarAsesorias
);

// Listar por cliente (admin + API Key)
router.get(
  "/cliente/:email",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  asesoriaController.listarPorCliente
);

// Listar por experto (admin + API Key)
router.get(
  "/experto/:email",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  asesoriaController.listarPorExperto
);

// Obtener por ID (admin + API Key)
router.get(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  asesoriaController.obtenerAsesoriaPorId
);

// Estadísticas de reseñas (admin + API Key)
router.get(
  "/estadisticas/resenas",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  asesoriaController.estadisticasResenas
);

// Actualizar por ID (admin + API Key)
router.put(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  asesoriaController.actualizarAsesoria
);

// Recalcular promedio para un experto por email (admin + API Key)
router.post(
  "/recalcular/:email",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  asesoriaController.recalcularPromedioEndpoint
);

// Eliminar por ID (admin + API Key)
router.delete(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  asesoriaController.eliminarAsesoria
);

module.exports = router;
