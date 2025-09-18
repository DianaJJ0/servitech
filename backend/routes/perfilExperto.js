/**
 * RUTAS: Perfil de Experto 
 * Expone endpoints para leer/actualizar el perfil del experto autenticado.
 */

const express = require("express");
const router = express.Router();

const {
  actualizarPerfilExperto,
  getProfile,
  updateProfile,
} = require("../controllers/experto.controller.js");

const auth = require("../middleware/auth.middleware");
const protect = auth.autenticar || auth.protect;
const esAdmin = auth.asegurarRol
  ? auth.asegurarRol("admin")
  : (req, res, next) => next();

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
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Perfil del experto
 *       401:
 *         description: No autenticado
 */
router.get("/", protect, getProfile);

/**
 * @openapi
 * /api/perfil-experto:
 *   put:
 *     tags: [PerfilExperto]
 *     summary: Actualizar perfil del experto autenticado
 *     security: [{ bearerAuth: [] }]
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
router.put("/", protect, updateProfile);

/**
 * @openapi
 * /api/perfil-experto/perfil:
 *   post:
 *     tags: [PerfilExperto]
 *     summary: Actualizar/crear perfil del experto (compatibilidad)
 *     security: [{ bearerAuth: [] }]
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
router.post("/perfil", protect, actualizarPerfilExperto);

module.exports = router;
