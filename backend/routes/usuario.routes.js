/**
 * @file Rutas de usuario (Identificación por email)
 * @module routes/usuario
 * @description Define los endpoints de la API para la gestión de usuarios en Servitech.
 */

const express = require("express");
const router = express.Router();

const usuarioController = require("../controllers/usuario.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

/**
 * @swagger
 * tags:
 *   - name: Usuarios
 *     description: Operaciones relacionadas con usuarios
 */

/**
 * @swagger
 * /api/usuarios/registro:
 *   post:
 *     summary: Registra un nuevo usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - apellido
 *               - email
 *               - password
 *             properties:
 *               nombre:
 *                 type: string
 *               apellido:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *       400:
 *         description: Error en la solicitud
 *       409:
 *         description: Usuario ya existe
 */
router.post("/registro", usuarioController.registrarUsuario);

/**
 * @swagger
 * /api/usuarios/login:
 *   post:
 *     summary: Inicia sesión de usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login exitoso
 *       400:
 *         description: Credenciales faltantes
 *       401:
 *         description: Credenciales incorrectas
 */
router.post("/login", usuarioController.iniciarSesion);

/**
 * @swagger
 * /api/usuarios/recuperar-password:
 *   post:
 *     summary: Solicita recuperación de contraseña
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Solicitud procesada
 */
router.post(
  "/recuperar-password",
  usuarioController.solicitarRecuperacionPassword
);

/**
 * @swagger
 * /api/usuarios/reset-password:
 *   post:
 *     summary: Restablece contraseña usando token
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 *       400:
 *         description: Token inválido o expirado
 */
router.post("/reset-password", usuarioController.resetearPassword);

// Rutas protegidas (requieren token)
/**
 * @swagger
 * /api/usuarios/perfil:
 *   get:
 *     summary: Obtiene el perfil del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: [] 
 *     responses:
 *       200:
 *         description: Perfil de usuario obtenido
 *       404:
 *         description: Usuario no encontrado
 */
router.get(
  "/perfil",
  authMiddleware.protect,
  usuarioController.obtenerPerfilUsuario
);

/**
 * @swagger
 * /api/usuarios/perfil:
 *   put:
 *     summary: Actualiza el perfil del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       404:
 *         description: Usuario no encontrado
 */
router.put(
  "/perfil",
  authMiddleware.protect,
  usuarioController.actualizarPerfilUsuario
);

/**
 * @swagger
 * /api/usuarios/perfil:
 *   delete:
 *     summary: Elimina/desactiva el usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cuenta desactivada
 *       404:
 *         description: Usuario no encontrado
 */
router.delete(
  "/perfil",
  authMiddleware.protect,
  usuarioController.eliminarUsuarioPropio
);

// Listar usuarios (admin - filtro por email, estado, roles)
/**
 * @swagger
 * /api/usuarios/:
 *   get:
 *     summary: Lista usuarios con filtros y paginación (admin)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filtro por email
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *         description: Filtro por estado
 *       - in: query
 *         name: roles
 *         schema:
 *           type: string
 *         description: Filtro por roles
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Límites por página
 *     responses:
 *       200:
 *         description: Usuarios listados
 */
router.get(
  "/",
  authMiddleware.protect,
  authMiddleware.esAdmin,
  usuarioController.obtenerUsuarios
);

// CRUD individual de usuario por email (admin + API Key)
/**
 * @swagger
 * /api/usuarios/{email}:
 *   get:
 *     summary: Obtiene usuario por email (admin + API Key)
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: Email del usuario
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *       404:
 *         description: Usuario no encontrado
 */
router.get(
  "/:email",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  usuarioController.obtenerUsuarioPorEmailAdmin
);

/**
 * @swagger
 * /api/usuarios/{email}:
 *   put:
 *     summary: Actualiza usuario por email (admin + API Key)
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: Email del usuario
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *       404:
 *         description: Usuario no encontrado
 */
router.put(
  "/:email",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  usuarioController.actualizarUsuarioPorEmailAdmin
);

/**
 * @swagger
 * /api/usuarios/{email}:
 *   delete:
 *     summary: Elimina/desactiva usuario por email (admin + API Key)
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: Email del usuario
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuario desactivado
 *       404:
 *         description: Usuario no encontrado
 */
router.delete(
  "/:email",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  usuarioController.eliminarUsuarioPorAdmin
);

module.exports = router;
