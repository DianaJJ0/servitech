/**
 * Rutas de Especialidad Tecnológica
 * Endpoints para gestión de especialidades tecnológicas.
 */
const express = require("express");
const router = express.Router();

const especialidadController = require("../controllers/especialidad.controller");
const authMiddleware = require("../middleware/auth.middleware");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

/**
 * @openapi
 * tags:
 *   - name: Especialidades
 *     description: Gestión de especialidades
 */

/**
 * @openapi
 * /api/especialidades:
 *   get:
 *     tags: [Especialidades]
 *     summary: Obtener especialidades
 *     responses:
 *       200:
 *         description: Lista de especialidades
 *   post:
 *     tags: [Especialidades]
 *     summary: Crear especialidad (requiere rol admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Especialidad'
 *     responses:
 *       201:
 *         description: Especialidad creada
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Requiere rol admin
 */
router.get("/", especialidadController.getAll);

/**
 * @swagger
 * /api/especialidades:
 *   post:
 *     summary: Crear especialidad (admin)
 *     tags: [Especialidades]
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
 *         description: Especialidad creada
 *       409:
 *         description: Especialidad ya existe
 */
router.post(
  "/",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  especialidadController.create
);

/**
 * @swagger
 * /api/especialidades/{id}:
 *   put:
 *     summary: Actualizar especialidad (admin)
 *     tags: [Especialidades]
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
 *         description: Especialidad actualizada
 *       404:
 *         description: Especialidad no encontrada
 */
router.put(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  especialidadController.update
);

/**
 * @swagger
 * /api/especialidades/{id}:
 *   delete:
 *     summary: Eliminar especialidad (admin)
 *     tags: [Especialidades]
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
 *         description: Especialidad eliminada
 *       404:
 *         description: Especialidad no encontrada
 */
router.delete(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  especialidadController.remove
);

module.exports = router;
