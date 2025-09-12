/**
 * RUTAS DE ASESORÍAS
 * CRUD y flujo de pago + finalización.
 */
const express = require("express");
const router = express.Router();
const asesoriaController = require("../controllers/asesoria.controller.js");
const authMiddleware = require("../middleware/auth.middleware");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

/**
 * @swagger
 * tags:
 *   - name: Asesorías
 *     description: Gestión de asesorías y flujo de pagos
 */

/**
 * @swagger
 * /api/asesorias:
 *   post:
 *     summary: Crear nueva asesoría
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - titulo
 *               - cliente
 *               - experto
 *               - categoria
 *               - fechaHoraInicio
 *               - duracionMinutos
 *               - pago
 *     responses:
 *       201:
 *         description: Asesoría creada exitosamente
 *       400:
 *         description: Datos faltantes o inválidos
 */
router.post("/", authMiddleware.autenticar, asesoriaController.crearAsesoria);

/**
 * @swagger
 * /api/asesorias/{id}/finalizar:
 *   put:
 *     summary: Finalizar asesoría y liberar pago
 *     tags: [Asesorías]
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
 *         description: Asesoría finalizada y pago liberado
 *       404:
 *         description: Asesoría no encontrada
 */
router.put(
  "/:id/finalizar",
  authMiddleware.autenticar,
  asesoriaController.finalizarAsesoria
);

/**
 * @swagger
 * /api/asesorias:
 *   get:
 *     summary: Listar todas las asesorías (admin)
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de asesorías
 */
router.get(
  "/",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  asesoriaController.listarAsesorias
);

/**
 * @swagger
 * /api/asesorias/cliente/{email}:
 *   get:
 *     summary: Listar asesorías por cliente (admin)
 *     tags: [Asesorías]
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
 *         description: Asesorías del cliente
 */
router.get(
  "/cliente/:email",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  asesoriaController.listarPorCliente
);

/**
 * @swagger
 * /api/asesorias/experto/{email}:
 *   get:
 *     summary: Listar asesorías por experto (admin)
 *     tags: [Asesorías]
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
 *         description: Asesorías del experto
 */
router.get(
  "/experto/:email",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  asesoriaController.listarPorExperto
);

/**
 * @swagger
 * /api/asesorias/{id}:
 *   get:
 *     summary: Obtener asesoría por ID (admin)
 *     tags: [Asesorías]
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
 *         description: Datos de la asesoría
 *       404:
 *         description: Asesoría no encontrada
 */
router.get(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  asesoriaController.obtenerAsesoriaPorId
);

/**
 * @swagger
 * /api/asesorias/estadisticas/resenas:
 *   get:
 *     summary: Estadísticas de reseñas (admin)
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas de reseñas por experto
 */
router.get(
  "/estadisticas/resenas",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  asesoriaController.estadisticasResenas
);

/**
 * @swagger
 * /api/asesorias/{id}:
 *   put:
 *     summary: Actualizar asesoría (admin)
 *     tags: [Asesorías]
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
 *         description: Asesoría actualizada
 *       404:
 *         description: Asesoría no encontrada
 */
router.put(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  asesoriaController.actualizarAsesoria
);

/**
 * @swagger
 * /api/asesorias/recalcular/{email}:
 *   post:
 *     summary: Recalcular promedio de calificaciones por experto (admin)
 *     tags: [Asesorías]
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
 *         description: Recálculo iniciado
 */
router.post(
  "/recalcular/:email",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  asesoriaController.recalcularPromedioEndpoint
);

/**
 * @swagger
 * /api/asesorias/{id}:
 *   delete:
 *     summary: Eliminar asesoría (admin)
 *     tags: [Asesorías]
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
 *         description: Asesoría eliminada
 *       404:
 *         description: Asesoría no encontrada
 */
router.delete(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  asesoriaController.eliminarAsesoria
);

/**
 * @openapi
 * tags:
 *   - name: Asesorias
 *     description: Gestión de asesorías
 */
/**
 * @openapi
 * /api/asesorias:
 *   post:
 *     tags: [Asesorias]
 *     summary: Crear asesoría (requiere auth)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Asesoria'
 *     responses:
 *       201:
 *         description: Asesoría creada
 *       401:
 *         description: No autenticado
 *   get:
 *     tags: [Asesorias]
 *     summary: Listar asesorías
 *     responses:
 *       200:
 *         description: Lista de asesorías
 * /api/asesorias/{id}:
 *   get:
 *     tags: [Asesorias]
 *     summary: Obtener asesoría por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Asesoría encontrada
 */
module.exports = router;
