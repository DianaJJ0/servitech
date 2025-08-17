/**
 * Rutas de Habilidad Tecnológica
 * Expone el endpoint /api/habilidades para el frontend (registro de expertos).
 */

// Importa el módulo Express, que permite crear servidores y manejar rutas HTTP
const express = require("express");

// Crea un nuevo router de Express para definir rutas específicas de habilidades
const router = express.Router();

// Importa el controlador de habilidades, donde está la lógica para manejar las peticiones
const habilidadController = require("../controllers/habilidad.controller");

// Define la ruta GET en la raíz ("/") de /api/habilidades
// Cuando se recibe una petición GET, se ejecuta la función getAll del controlador
router.get("/", habilidadController.getAll);

// Exporta el router para que pueda ser usado en la configuración principal del servidor
module.exports = router;
