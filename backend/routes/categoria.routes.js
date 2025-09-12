/**
 * RUTAS DE CATEGORÍAS
 * Define los endpoints de la API para la gestión de categorías.
 */
const express = require("express");
const router = express.Router();

const categoriaController = require("../controllers/categoria.controller.js");
const authMiddleware = require("../middleware/auth.middleware");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

/**
 * @swagger
 * tags:
 *   - name: Categorías
 *     description: Gestión de categorías de especialización
 */

/**
 * @swagger
 * /api/categorias:
 *   get:
 *     summary: Listar categorías
 *     tags: [Categorías]
 *     parameters:
 *       - in: query
 *         name: nombre
 *         schema:
 *           type: string
 *         description: Filtro por nombre
 *     responses:
 *       200:
 *         description: Lista de categorías
 */
router.get("/", categoriaController.obtenerCategorias);

/**
 * @swagger
 * /api/categorias:
 *   post:
 *     summary: Crear categoría (admin)
 *     tags: [Categorías]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *             properties:
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *     responses:
 *       201:
 *         description: Categoría creada
 *       409:
 *         description: Categoría ya existe
 */
router.post(
  "/",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  categoriaController.crearCategoria
);

/**
 * @swagger
 * /api/categorias/{id}:
 *   put:
 *     summary: Actualizar categoría (admin)
 *     tags: [Categorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Categoría actualizada
 *       404:
 *         description: Categoría no encontrada
 */
router.put(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  categoriaController.actualizarCategoria
);

/**
 * @swagger
 * /api/categorias/{id}:
 *   delete:
 *     summary: Eliminar categoría (admin)
 *     tags: [Categorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Categoría eliminada
 *       404:
 *         description: Categoría no encontrada
 */
router.delete(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  categoriaController.eliminarCategoria
);

/**
 * @openapi
 * tags:
 *   - name: Categorias
 *     description: Gestión de categorías
 */

/**
 * @openapi
 * /api/categorias:
 *   get:
 *     tags: [Categorias]
 *     summary: Obtener categorias
 *     responses:
 *       200:
 *         description: Lista de categorias
 *   post:
 *     tags: [Categorias]
 *     summary: Crear categoría (requiere rol admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Categoria'
 *     responses:
 *       201:
 *         description: Categoría creada
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Requiere rol admin
 */
module.exports = router;
