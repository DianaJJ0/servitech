/**
 * @file Rutas de Perfil de Experto
 * @module routes/perfilExperto
 * @description Endpoints para obtener y actualizar el perfil del experto autenticado.
 */

const express = require("express");
const router = express.Router();

const {
  listarExpertos,
  obtenerPerfilExperto,
  actualizarPerfilExperto,
  actualizarPerfilExpertoPost,
} = require("../controllers/experto.controller.js");

const authMiddleware = require("../middleware/auth.middleware");

/**
 * @openapi
 * tags:
 *   - name: PerfilExperto
 *     description: Endpoints para obtener y actualizar el perfil de un experto
 */

/**
 * @openapi
 * /api/perfil-experto:
 *   get:
 *     tags: [PerfilExperto]
 *     summary: Obtener perfil del experto autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del experto
 *       401:
 *         description: No autenticado
 */
/**
 * Obtiene el perfil del experto autenticado
 * @route GET /api/perfil-experto
 * @access Private (requiere token JWT)
 */
router.get("/", authMiddleware.autenticar, obtenerPerfilExperto);

/**
 * @openapi
 * /api/perfil-experto:
 *   put:
 *     tags: [PerfilExperto]
 *     summary: Actualizar perfil del experto autenticado
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PerfilExpertoInput'
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       401:
 *         description: No autenticado
 */
/**
 * Actualiza el perfil del experto autenticado
 * @route PUT /api/perfil-experto
 * @access Private (requiere token JWT)
 */
router.put("/", authMiddleware.autenticar, actualizarPerfilExperto);

/**
 * @openapi
 * /api/perfil-experto/perfil:
 *   post:
 *     tags: [PerfilExperto]
 *     summary: Actualizar/crear perfil del experto (compatibilidad)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PerfilExpertoInput'
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       401:
 *         description: No autenticado
 */
/**
 * Crea o actualiza el perfil del experto autenticado (compatibilidad POST)
 * @route POST /api/perfil-experto/perfil
 * @access Private (requiere token JWT)
 */
router.post("/perfil", authMiddleware.autenticar, actualizarPerfilExpertoPost);

module.exports = router;
