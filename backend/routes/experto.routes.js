/**
 * @file Rutas de expertos
 * @module routes/experto
 * @description Endpoints públicos y protegidos para gestión y edición de perfil experto en Servitech.
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
 * /api/expertos:
 *   get:
 *     summary: Listar expertos con filtros y paginación
 *     tags: [Expertos]
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
 *         description: Filtro por categoría (ObjectId)
 *     responses:
 *       200:
 *         description: Lista de expertos
 *       500:
 *         description: Error interno
 */
// Ruta pública: listar expertos
router.get("/", (req, res, next) =>
  expertoController.listarExpertos(req, res, next)
);

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
  (req, res, next) => expertoController.obtenerExpertoPorEmail(req, res, next)
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
  (req, res, next) => expertoController.eliminarExpertoPorEmail(req, res, next)
);

/**
 * @openapi
 * /api/expertos/perfil:
 *   put:
 *     summary: Actualizar solo los datos de experto del usuario autenticado (no nombre ni apellido)
 *     tags: [Expertos]
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
 *         description: Perfil de experto actualizado
 *       400:
 *         description: Datos obligatorios faltantes
 *       401:
 *         description: No autenticado
 */
router.put(
  "/perfil",
  authMiddleware.autenticar,
  expertoController.actualizarPerfilExperto
);

/**
 * @openapi
 * /api/expertos/perfil:
 *   get:
 *     summary: Obtener perfil del experto autenticado
 *     tags: [Expertos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del experto
 *       401:
 *         description: No autenticado
 */
router.get(
  "/perfil",
  authMiddleware.autenticar,
  expertoController.obtenerPerfilExperto
);

/**
 * @swagger
 * /api/expertos/aprobar/{email}:
 *   put:
 *     summary: Aprobar solicitud de experto (admin)
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
 *         description: Experto aprobado exitosamente
 *       404:
 *         description: Experto no encontrado
 */
router.put(
  "/aprobar/:email",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  (req, res, next) => expertoController.aprobarExperto(req, res, next)
);

/**
 * @swagger
 * /api/expertos/rechazar/{email}:
 *   put:
 *     summary: Rechazar solicitud de experto (admin)
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
 *         description: Experto rechazado exitosamente
 *       404:
 *         description: Experto no encontrado
 */
router.put(
  "/rechazar/:email",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  (req, res, next) => expertoController.rechazarExperto(req, res, next)
);

module.exports = router;
