/**
 * RUTAS DE EXPERTOS
 * Endpoints para listar, filtrar y eliminar expertos por email.
 * Incluye edición de perfil de experto autenticado.
 */
const express = require("express");
const router = express.Router();

const expertoController = require("../controllers/experto.controller");
const authMiddleware = require("../middleware/auth.middleware");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

/**
 * @swagger
 * tags:
 *   - name: Expertos
 *     description: Gestión de perfiles de expertos
 */

/**
 * @openapi
 * tags:
 *   - name: Expertos
 *     description: Gestión de expertos
 */

/**
 * @swagger
 * /api/expertos:
 *   get:
 *     summary: Listar expertos con filtros
 *     tags: [Expertos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Elementos por página
 *       - in: query
 *         name: nombre
 *         schema:
 *           type: string
 *         description: Filtro por nombre
 *       - in: query
 *         name: categoria
 *         schema:
 *           type: string
 *         description: Filtro por categoría
 *       - in: query
 *         name: especialidad
 *         schema:
 *           type: string
 *         description: Filtro por especialidad
 *     responses:
 *       200:
 *         description: Lista de expertos
 */
router.get("/", authMiddleware.autenticar, expertoController.listarExpertos);

/**
 * @swagger
 * /api/expertos/{email}:
 *   get:
 *     summary: Obtener experto por email (admin)
 *     tags: [Expertos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Datos del experto
 *       404:
 *         description: Experto no encontrado
 */
router.get(
  "/:email",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  expertoController.obtenerExpertoPorEmail
);

/**
 * @swagger
 * /api/expertos/{email}:
 *   delete:
 *     summary: Eliminar experto por email (admin)
 *     tags: [Expertos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Experto eliminado
 *       404:
 *         description: Experto no encontrado
 */
router.delete(
  "/:email",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  expertoController.eliminarExpertoPorEmail
);

/**
 * @swagger
 * /api/expertos/perfil:
 *   put:
 *     summary: Actualizar perfil de experto autenticado
 *     tags: [Expertos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               descripcion:
 *                 type: string
 *               precioPorHora:
 *                 type: number
 *               categorias:
 *                 type: array
 *               especialidad:
 *                 type: string
 *               skills:
 *                 type: array
 *               banco:
 *                 type: string
 *               tipoCuenta:
 *                 type: string
 *               numeroCuenta:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       400:
 *         description: Datos faltantes
 */
router.put(
  "/perfil",
  authMiddleware.autenticar,
  expertoController.actualizarPerfilExperto
);

module.exports = router;
