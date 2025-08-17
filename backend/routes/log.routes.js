/**
 * RUTAS DE LOGS
 * Endpoints para registrar y consultar logs del sistema.
 */

// Importa el módulo Express para crear rutas
const express = require("express");

// Crea un nuevo router de Express para definir las rutas de logs
const router = express.Router();

// Importa el controlador de logs, donde está la lógica de negocio
const logController = require("../controllers/log.controller.js");

// Importa el middleware de autenticación para proteger las rutas
const authMiddleware = require("../middleware/auth.middleware.js");

// Ruta para registrar un nuevo log en el sistema
// Método POST: recibe datos y los guarda como un log
// Solo usuarios autenticados pueden acceder (authMiddleware.protect)
router.post("/", authMiddleware.protect, logController.crearLog);

// Ruta para listar todos los logs del sistema (solo para administradores)
// Método GET: devuelve todos los logs registrados
// Requiere autenticación y permisos de administrador (protect + esAdmin)
router.get(
  "/",
  authMiddleware.protect,      // Verifica que el usuario esté autenticado
  authMiddleware.esAdmin,      // Verifica que el usuario sea administrador
  logController.obtenerLogs    // Llama al controlador para obtener los logs
);

// Ruta para obtener un log específico por su ID (solo para administradores)
// Método GET: devuelve el log correspondiente al ID proporcionado
// Requiere autenticación y permisos de administrador
router.get(
  "/:id",                      // Parámetro dinámico :id para identificar el log
  authMiddleware.protect,      // Verifica autenticación
  authMiddleware.esAdmin,      // Verifica permisos de administrador
  logController.obtenerLogPorId// Llama al controlador para obtener el log por ID
);

// Exporta el router para que pueda ser usado en la configuración principal del servidor
module.exports = router;
