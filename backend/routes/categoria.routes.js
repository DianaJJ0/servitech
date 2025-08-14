/**
 * RUTAS DE CATEGORÍAS
 * Define los endpoints de la API para la gestión de categorías.
 */
const express = require("express");
const router = express.Router();

// Se importa el objeto completo del controlador.
const categoriaController = require("../controllers/categoria.controller.js");

// Se importa el objeto completo del middleware.
const authMiddleware = require("../middleware/auth.middleware.js");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

// --- Definición de Rutas ---

// RUTA PÚBLICA (no requiere autenticación)
router.get("/", categoriaController.obtenerCategorias);

// RUTAS PROTEGIDAS (requieren rol de administrador)
// Se accede a las funciones a través de los objetos importados.
router.post(
  "/",
  authMiddleware.protegerRuta,
  authMiddleware.esAdmin,
  categoriaController.crearCategoria
);

router.put(
  "/:id",
  authMiddleware.protegerRuta,
  authMiddleware.esAdmin,
  categoriaController.actualizarCategoria
);

router.delete(
  "/:id",
  apiKeyMiddleware, // Protege con API Key
  authMiddleware.protegerRuta,
  authMiddleware.esAdmin,
  categoriaController.eliminarCategoria
);

module.exports = router;
