/**
 * RUTAS DE ASESORÍAS
 * CRUD y flujo de pago + finalización.
 */
const express = require("express");
const router = express.Router();
const asesoriaController = require("../controllers/asesoria.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");
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
router.post("/", authMiddleware.protect, asesoriaController.crearAsesoria);

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
  authMiddleware.protect,
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
  authMiddleware.protect,
  authMiddleware.esAdmin,
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
  authMiddleware.protect,
  authMiddleware.esAdmin,
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
  authMiddleware.protect,
  authMiddleware.esAdmin,
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
  authMiddleware.protect,
  authMiddleware.esAdmin,
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
  authMiddleware.protect,
  authMiddleware.esAdmin,
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
  authMiddleware.protect,
  authMiddleware.esAdmin,
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
  authMiddleware.protect,
  authMiddleware.esAdmin,
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
  authMiddleware.protect,
  authMiddleware.esAdmin,
  asesoriaController.eliminarAsesoria
);

module.exports = router;
