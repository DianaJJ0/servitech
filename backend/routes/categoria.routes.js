/**
 * RUTAS DE CATEGORÍAS
 * Define los endpoints de la API para la gestión de categorías.
 */
const express = require("express");
const router = express.Router();

const categoriaController = require("../controllers/categoria.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

// GET público (listar categorías)
router.get("/", categoriaController.obtenerCategorias);

// POST - crear categoría (admin, API Key)
router.post(
  "/",
  apiKeyMiddleware,
  authMiddleware.protegerRuta,
  authMiddleware.esAdmin,
  categoriaController.crearCategoria
);

// PUT - editar categoría (admin, API Key)
router.put(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.protegerRuta,
  authMiddleware.esAdmin,
  categoriaController.actualizarCategoria
);

// DELETE - eliminar categoría (admin, API Key)
router.delete(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.protegerRuta,
  authMiddleware.esAdmin,
  categoriaController.eliminarCategoria
);

module.exports = router;
