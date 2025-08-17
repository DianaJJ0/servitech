/**
 * RUTAS DE CATEGORÍAS
 * Define los endpoints de la API para la gestión de categorías.
 */

// Importa el módulo Express para crear rutas.
const express = require("express");

// Crea un nuevo router de Express para definir rutas específicas.
const router = express.Router();

// Importa el controlador de categorías, que contiene la lógica para cada endpoint.
const categoriaController = require("../controllers/categoria.controller.js");

// Importa el middleware de autenticación, que protege rutas y verifica roles.
const authMiddleware = require("../middleware/auth.middleware.js");

// Importa el middleware de API Key, que verifica la validez de la clave API en ciertas rutas.
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

// --- Definición de Rutas ---

// RUTA PÚBLICA (no requiere autenticación)
// Define la ruta GET "/" para obtener todas las categorías.
// Llama a la función obtenerCategorias del controlador cuando se accede a esta ruta.
router.get("/", categoriaController.obtenerCategorias);

// RUTAS PROTEGIDAS (requieren rol de administrador)
// Define la ruta POST "/" para crear una nueva categoría.
// Aplica los middlewares protegerRuta y esAdmin para asegurar que solo administradores autenticados puedan acceder.
// Finalmente, llama a la función crearCategoria del controlador.
router.post(
  "/",
  authMiddleware.protegerRuta, // Verifica que el usuario esté autenticado.
  authMiddleware.esAdmin,      // Verifica que el usuario tenga rol de administrador.
  categoriaController.crearCategoria // Ejecuta la lógica para crear una categoría.
);

// Define la ruta PUT "/:id" para actualizar una categoría existente por su ID.
// Aplica los mismos middlewares de autenticación y rol de administrador.
// Llama a la función actualizarCategoria del controlador.
router.put(
  "/:id",
  authMiddleware.protegerRuta, // Verifica autenticación.
  authMiddleware.esAdmin,      // Verifica rol de administrador.
  categoriaController.actualizarCategoria // Ejecuta la lógica de actualización.
);

// Define la ruta DELETE "/:id" para eliminar una categoría por su ID.
// Aplica el middleware de API Key para mayor seguridad.
// Aplica los middlewares de autenticación y rol de administrador.
// Llama a la función eliminarCategoria del controlador.
router.delete(
  "/:id",
  apiKeyMiddleware, // Verifica la validez de la API Key.
  authMiddleware.protegerRuta, // Verifica autenticación.
  authMiddleware.esAdmin,      // Verifica rol de administrador.
  categoriaController.eliminarCategoria // Ejecuta la lógica de eliminación.
);

// Exporta el router para que pueda ser usado en la configuración principal de la aplicación.
module.exports = router;
