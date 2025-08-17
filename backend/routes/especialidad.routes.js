/**
 * Rutas de Especialidad Tecnológica
 * Expone el endpoint /api/especialidades para el frontend (registro de expertos).
 */

// Importa el módulo Express, que permite crear aplicaciones web y APIs en Node.js
const express = require("express");

// Crea un nuevo enrutador de Express para definir rutas específicas de este módulo
const router = express.Router();

// Importa el controlador de especialidad, donde está la lógica para manejar las solicitudes relacionadas
const especialidadController = require("../controllers/especialidad.controller");

// Define la ruta GET en la raíz ("/") de este enrutador.
// Cuando se recibe una solicitud GET en /api/especialidades, se ejecuta especialidadController.getAll
router.get("/", especialidadController.getAll);

// Exporta el enrutador para que pueda ser usado en la configuración principal de la aplicación (app.js)
module.exports = router;
