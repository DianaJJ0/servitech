/**
 * @file Rutas de Asesoria
 * @module routes/asesoria
 * @description Endpoints para la gestion de asesorias y su flujo de aceptacion, rechazo y finalizacion.
 */

const express = require("express");
const router = express.Router();
const asesoriaController = require("../controllers/asesoria.controller.js");
const authMiddleware = require("../middleware/auth.middleware");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");

// IMPORTAR EL MODELO DE ASESORIA - ESTO ES LO QUE FALTABA
const Asesoria = require("../models/asesoria.model.js");

/**
 * @openapi
 * tags:
 *   - name: Asesorias
 *     description: Gestion de asesorias y flujo de pagos
 */

/**
 * @openapi
 * /api/asesorias:
 *   post:
 *     summary: Crear nueva asesoria (cliente autenticado)
 *     tags: [Asesorias]
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
 *         description: Asesoria creada y pendiente de aceptacion del experto
 */
router.post("/", authMiddleware.autenticar, asesoriaController.crearAsesoria);



/**
 * @openapi
 * /api/asesorias/{id}/aceptar:
 *   put:
 *     summary: Aceptar asesoria (experto autenticado)
 *     tags: [Asesorias]
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
 *         description: Asesoria aceptada y pago retenido
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
 *     summary: Rechazar asesoria (experto autenticado)
 *     tags: [Asesorias]
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
 *         description: Asesoria rechazada y pago reembolsado
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
 *     summary: Cancelar asesoria por el cliente
 *     tags: [Asesorias]
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
 *         description: Asesoria cancelada
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
 *     summary: Cancelar asesoria por el experto
 *     tags: [Asesorias]
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
 *         description: Asesoria cancelada
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
 *     summary: Finalizar asesoria y liberar pago (cliente o admin)
 *     tags: [Asesorias]
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
 *         description: Asesoria finalizada y pago liberado
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
 *     summary: Listar todas las asesorias (solo admin)
 *     tags: [Asesorias]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de asesorias
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
 *     summary: Listar asesorias por cliente (solo admin)
 *     tags: [Asesorias]
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
 *         description: Lista de asesorias del cliente
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
 *     summary: Listar asesorías por experto (público para calendario)
 *     tags: [Asesorías]
 *     parameters:
 *       - name: email
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Email del experto
 *     responses:
 *       200:
 *         description: Lista de asesorías del experto
 *       404:
 *         description: Experto no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/experto/:email", asesoriaController.listarPorExperto);

/**
 * @openapi
 * /api/asesorias/{id}:
 *   get:
 *     summary: Obtener asesoria por ID (solo admin)
 *     tags: [Asesorias]
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
 *         description: Asesoria encontrada
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
 *     summary: Actualizar asesoria por ID (admin)
 *     tags: [Asesorias]
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
 *         description: Asesoria actualizada
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
 *     summary: Eliminar asesoria por ID (admin)
 *     tags: [Asesorias]
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
 *         description: Asesoria eliminada
 */
router.delete(
  "/:id",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  asesoriaController.eliminarAsesoria
);

module.exports = router;
