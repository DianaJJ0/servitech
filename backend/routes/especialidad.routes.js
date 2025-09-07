/**
 * Rutas de Especialidad Tecnológica
 * Endpoints para gestión de especialidades tecnológicas.
 */
const express = require("express");
const router = express.Router();

const especialidadController = require("../controllers/especialidad.controller");
const authMiddleware = require("../middleware/auth.middleware.js");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

/**
 * @swagger
 * tags:
 *   - name: Especialidades
 *     description: Gestión de especialidades tecnológicas
 */

/**
 * @swagger
 * /api/especialidades:
 *   get:
 *     summary: Listar especialidades
 *     tags: [Especialidades]
 *     responses:
 *       200:
 *         description: Lista de especialidades
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
  authMiddleware.protect,
  authMiddleware.esAdmin,
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
  authMiddleware.protect,
  authMiddleware.esAdmin,
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
  authMiddleware.protect,
  authMiddleware.esAdmin,
  especialidadController.remove
);

module.exports = router;
