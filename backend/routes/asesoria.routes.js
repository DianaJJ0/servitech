/**
 * @file Rutas de Asesoría
 * @module routes/asesoria
 * @description Endpoints para la gestión de asesorías y su flujo de aceptación, rechazo y finalización.
 */

const express = require("express");
const router = express.Router();
const asesoriaController = require("../controllers/asesoria.controller.js");
const authMiddleware = require("../middleware/auth.middleware");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

/**
 * @openapi
 * tags:
 *   - name: Asesorías
 *     description: Gestión de asesorías y flujo de pagos
 */

/**
 * @openapi
 * /api/asesorias:
 *   post:
 *     summary: Crear nueva asesoría (cliente autenticado)
 *     tags: [Asesorías]
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
 *         description: Asesoría creada y pendiente de aceptación del experto
 */
router.post("/", authMiddleware.autenticar, asesoriaController.crearAsesoria);

/**
 * @openapi
 * /api/asesorias/mias:
 *   get:
 *     summary: Obtener asesorías del usuario autenticado
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de asesorías del usuario
 */
router.get(
  "/mias",
  authMiddleware.autenticar,
  asesoriaController.obtenerMisAsesorias
);

/**
 * @openapi
 * /api/asesorias/{id}/aceptar:
 *   put:
 *     summary: Aceptar asesoría (experto autenticado)
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Asesoría aceptada y pago retenido
 */
router.put(
  "/:id/aceptar",
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("experto"),
  asesoriaController.aceptarAsesoria
);

/**
 * @openapi
 * /api/asesorias/{id}/rechazar:
 *   put:
 *     summary: Rechazar asesoría (experto autenticado)
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Asesoría rechazada y pago reembolsado
 */
router.put(
  "/:id/rechazar",
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("experto"),
  asesoriaController.rechazarAsesoria
);

/**
 * @openapi
 * /api/asesorias/{id}/cancelar-cliente:
 *   put:
 *     summary: Cancelar asesoría por el cliente
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
 *         description: Asesoría cancelada
 */
router.put(
  "/:id/cancelar-cliente",
  authMiddleware.autenticar,
  asesoriaController.cancelarAsesoriaPorCliente
);

/**
 * @openapi
 * /api/asesorias/{id}/cancelar-experto:
 *   put:
 *     summary: Cancelar asesoría por el experto
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
 *         description: Asesoría cancelada
 */
router.put(
  "/:id/cancelar-experto",
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("experto"),
  asesoriaController.cancelarAsesoriaPorExperto
);

/**
 * @openapi
 * /api/asesorias/{id}/finalizar:
 *   put:
 *     summary: Finalizar asesoría y liberar pago (cliente o admin)
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Asesoría finalizada y pago liberado
 */
router.put(
  "/:id/finalizar",
  authMiddleware.autenticar,
  asesoriaController.finalizarAsesoria
);

/**
 * @openapi
 * /api/asesorias:
 *   get:
 *     summary: Listar todas las asesorías (solo admin)
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
 * @openapi
 * /api/asesorias/cliente/{email}:
 *   get:
 *     summary: Listar asesorías por cliente (solo admin)
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: email
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de asesorías del cliente
 */
router.get(
  "/cliente/:email",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  asesoriaController.listarPorCliente
);

/**
 * @openapi
 * /api/asesorias/experto/{email}:
 *   get:
 *     summary: Listar asesorías por experto (solo admin)
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: email
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de asesorías del experto
 */
// Obtener asesorías de un experto por email
router.get("/experto/:email", async (req, res) => {
  try {
    const expertoEmail = req.params.email;

    const asesorias = await Asesoria.find({
      "experto.email": expertoEmail,
      estado: { $in: ["pendiente-aceptacion", "confirmada"] }
    }).sort({ fechaHoraInicio: 1 });

    res.json(asesorias);
  } catch (error) {
    console.error("Error obteniendo asesorías del experto:", error);
    res.status(500).json({
      mensaje: "Error al obtener asesorías",
      error: error.message
    });
  }
});
/**
 * @openapi
 * /api/asesorias/{id}:
 *   get:
 *     summary: Obtener asesoría por ID (solo admin)
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Asesoría encontrada
 */
router.get(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  asesoriaController.obtenerAsesoriaPorId
);

/**
 * @openapi
 * /api/asesorias/{id}:
 *   put:
 *     summary: Actualizar asesoría por ID (admin)
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Asesoria'
 *     responses:
 *       200:
 *         description: Asesoría actualizada
 */
router.put(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  asesoriaController.aceptarAsesoria
);

/**
 * @openapi
 * /api/asesorias/{id}:
 *   delete:
 *     summary: Eliminar asesoría por ID (admin)
 *     tags: [Asesorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Asesoría eliminada
 */
router.delete(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  asesoriaController.eliminarAsesoria
);

module.exports = router;
