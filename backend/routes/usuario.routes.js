/**
 * RUTAS DE USUARIO - Identificación por email
 */
const express = require("express");
const router = express.Router();

const usuarioController = require("../controllers/usuario.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

// Rutas públicas
router.post("/registro", usuarioController.registrarUsuario);
router.post("/login", usuarioController.iniciarSesion);
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
router.delete(
  "/perfil",
  authMiddleware.protect,
  usuarioController.eliminarUsuarioPropio
);

// Listar usuarios (admin - filtro por email, estado, roles)
router.get(
  "/",
  authMiddleware.protect,
  authMiddleware.esAdmin,
  usuarioController.obtenerUsuarios
);

// CRUD individual de usuario por email (admin + API Key)
router.get(
  "/:email",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  usuarioController.obtenerUsuarioPorEmailAdmin
);
router.put(
  "/:email",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  usuarioController.actualizarUsuarioPorEmailAdmin
);
router.delete(
  "/:email",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  usuarioController.eliminarUsuarioPorAdmin
);

module.exports = router;
