/**
 * RUTAS DE EXPERTOS
 * Endpoints para listar, filtrar y eliminar expertos por email.
 * Incluye edición de perfil de experto autenticado.
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
 * tags:
 *   - name: Expertos
 *     description: Gestión de expertos
 */

/**
 * @swagger
 * /api/expertos:
 *   get:
 *     summary: Listar expertos con filtros
 *     tags: [Expertos]
 *     security:
 *       - bearerAuth: []
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
 *         description: Filtro por categoría
 *       - in: query
 *     responses:
 *       200:
 *         description: Lista de expertos
 */
router.get("/", authMiddleware.autenticar, (req, res, next) =>
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
 * @swagger
 * /api/expertos/perfil:
 *   put:
 *     summary: Actualizar perfil de experto autenticado
 *     tags: [Expertos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               descripcion:
 *                 type: string
 *               precioPorHora:
 *                 type: number
 *               categorias:
 *                 type: array
 *               banco:
 *                 type: string
 *               tipoCuenta:
 *                 type: string
 *               numeroCuenta:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       400:
 *         description: Datos faltantes
 */
router.put("/perfil", authMiddleware.autenticar, (req, res, next) =>
  expertoController.actualizarPerfilExperto(req, res, next)
);

// Helper defensivo para asegurarnos de pasar funciones a router
function wrapMiddleware(mw, name) {
  // si es función, devolverla tal cual
  if (typeof mw === "function") return mw;
  // si recibimos undefined u otro tipo, devolver middleware que pasa error a next
  return function (req, res, next) {
    const err = new TypeError(
      `Middleware inválido${
        name ? " (" + name + ")" : ""
      } - se esperaba una función`
    );
    // opcional: logear para debug (no lanzar directamente)
    if (req && req.app && req.app.get) {
      // ...no-op, sólo para mantener posible integración con logger
    }
    next(err);
  };
}

// Rutas usando wrapper defensivo
router.get(
  "/",
  wrapMiddleware(authMiddleware.autenticar, "authMiddleware.autenticar"),
  (req, res, next) => expertoController.listarExpertos(req, res, next)
);

router.get(
  "/:email",
  wrapMiddleware(apiKeyMiddleware, "apiKeyMiddleware"),
  wrapMiddleware(authMiddleware.autenticar, "authMiddleware.autenticar"),
  wrapMiddleware(
    // asegurarRol suele ser una fábrica que devuelve middleware; llamarla sólo si existe
    typeof authMiddleware.asegurarRol === "function"
      ? authMiddleware.asegurarRol("admin")
      : undefined,
    'authMiddleware.asegurarRol("admin")'
  ),
  (req, res, next) => expertoController.obtenerExpertoPorEmail(req, res, next)
);

router.delete(
  "/:email",
  wrapMiddleware(apiKeyMiddleware, "apiKeyMiddleware"),
  wrapMiddleware(authMiddleware.autenticar, "authMiddleware.autenticar"),
  wrapMiddleware(
    typeof authMiddleware.asegurarRol === "function"
      ? authMiddleware.asegurarRol("admin")
      : undefined,
    'authMiddleware.asegurarRol("admin")'
  ),
  (req, res, next) => expertoController.eliminarExpertoPorEmail(req, res, next)
);

router.put(
  "/perfil",
  wrapMiddleware(authMiddleware.autenticar, "authMiddleware.autenticar"),
  (req, res, next) => expertoController.actualizarPerfilExperto(req, res, next)
);

module.exports = router;
