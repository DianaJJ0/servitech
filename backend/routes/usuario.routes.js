/**
 * RUTAS DE USUARIO
 * Define los endpoints para las operaciones relacionadas con usuarios.
 */
const express = require("express");
const router = express.Router();

// Importamos el controlador completo
const usuarioController = require("../controllers/usuario.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");

// --- Definición de Rutas ---

// Rutas públicas (no requieren token)
router.post("/registro", usuarioController.registrarUsuario);
router.post("/login", usuarioController.iniciarSesion);

// Recuperación de contraseña
router.post(
  "/recuperar-password",
  usuarioController.solicitarRecuperacionPassword
);
router.post("/reset-password", usuarioController.resetearPassword);

// Rutas protegidas (requieren token)
router.get(
  "/perfil",
  authMiddleware.protect,
  usuarioController.obtenerPerfilUsuario
);
router.put(
  "/perfil",
  authMiddleware.protect,
  usuarioController.actualizarPerfilUsuario
);
router.get("/", authMiddleware.protect, usuarioController.obtenerUsuarios);

module.exports = router;
