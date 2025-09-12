/**
 * Rutas de Habilidad Tecnológica
 * Endpoints para gestión de habilidades tecnológicas.
 */
const express = require("express");
const router = express.Router();

const habilidadController = require("../controllers/habilidad.controller");
const authMiddleware = require("../middleware/auth.middleware");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

/**
 * @openapi
 * tags:
 *   - name: Habilidades
 *     description: Gestión de habilidades tecnológicas
 */

/**
 * @openapi
 * /api/habilidades:
 *   get:
 *     summary: Listar habilidades
 *     tags: [Habilidades]
 *     responses:
 *       200:
 *         description: Lista de habilidades
 *   post:
 *     tags: [Habilidades]
 *     summary: Crear habilidad (requiere rol admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Habilidad'
 *     responses:
 *       201:
 *         description: Habilidad creada
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Requiere rol admin
 */

/**
 * @openapi
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
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  habilidadController.create
);

/**
 * @openapi
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
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  habilidadController.update
);

/**
 * @openapi
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
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  habilidadController.remove
);

module.exports = router;
