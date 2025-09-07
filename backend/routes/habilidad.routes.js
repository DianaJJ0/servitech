/**
 * Rutas de Habilidad Tecnológica
 * Endpoints para gestión de habilidades tecnológicas.
 */
const express = require("express");
const router = express.Router();

const habilidadController = require("../controllers/habilidad.controller");
const authMiddleware = require("../middleware/auth.middleware.js");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

/**
 * @swagger
 * tags:
 *   - name: Habilidades
 *     description: Gestión de habilidades tecnológicas
 */

/**
 * @swagger
 * /api/habilidades:
 *   get:
 *     summary: Listar habilidades
 *     tags: [Habilidades]
 *     responses:
 *       200:
 *         description: Lista de habilidades
 */
router.get("/", habilidadController.getAll);

/**
 * @swagger
 * /api/habilidades:
 *   post:
 *     summary: Crear habilidad (admin)
 *     tags: [Habilidades]
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
 *         description: Habilidad creada
 *       409:
 *         description: Habilidad ya existe
 */
router.post(
  "/",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  habilidadController.create
);

/**
 * @swagger
 * /api/habilidades/{id}:
 *   put:
 *     summary: Actualizar habilidad (admin)
 *     tags: [Habilidades]
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
 *         description: Habilidad actualizada
 *       404:
 *         description: Habilidad no encontrada
 */
router.put(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  habilidadController.update
);

/**
 * @swagger
 * /api/habilidades/{id}:
 *   delete:
 *     summary: Eliminar habilidad (admin)
 *     tags: [Habilidades]
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
 *         description: Habilidad eliminada
 *       404:
 *         description: Habilidad no encontrada
 */
router.delete(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.protect,
  authMiddleware.esAdmin,
  habilidadController.remove
);

module.exports = router;
