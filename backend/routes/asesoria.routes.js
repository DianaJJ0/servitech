/**
 * RUTAS DE ASESORÍAS
 * CRUD y consultas por email de cliente y experto.
 */
const express = require("express");
const router = express.Router();
const asesoriaController = require("../controllers/asesoria.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");

// Crear asesoría (protegido, cualquier usuario autenticado)
router.post("/", authMiddleware.protect, asesoriaController.crearAsesoria);

// Listar todas (admin)
router.get(
  "/",
  authMiddleware.protect,
  authMiddleware.esAdmin,
  asesoriaController.listarAsesorias
);

// Listar por cliente
router.get(
  "/cliente/:email",
  authMiddleware.protect,
  asesoriaController.listarPorCliente
);

// Listar por experto
router.get(
  "/experto/:email",
  authMiddleware.protect,
  asesoriaController.listarPorExperto
);

// Obtener por ID
router.get(
  "/:id",
  authMiddleware.protect,
  asesoriaController.obtenerAsesoriaPorId
);

// Actualizar por ID (admin)
router.put(
  "/:id",
  authMiddleware.protect,
  authMiddleware.esAdmin,
  asesoriaController.actualizarAsesoria
);

// Eliminar por ID (admin)
router.delete(
  "/:id",
  authMiddleware.protect,
  authMiddleware.esAdmin,
  asesoriaController.eliminarAsesoria
);

module.exports = router;
