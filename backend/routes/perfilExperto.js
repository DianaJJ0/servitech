const express = require("express");
const router = express.Router();

// Controlador de edición de perfil
const {
  actualizarPerfilExperto,
  getProfile,
  updateProfile,
} = require("../controllers/experto.controller.js");
const authMiddleware = require("../middleware/auth.middleware");
if (!authMiddleware.protect && authMiddleware.autenticar)
  authMiddleware.protect = authMiddleware.autenticar;
if (!authMiddleware.esAdmin && authMiddleware.asegurarRol)
  authMiddleware.esAdmin = authMiddleware.asegurarRol("admin");

/**
 * @swagger
 * tags:
 *   - name: Perfil Experto
 *     description: Gestión de perfil de experto y vistas
 */

/**
 * @swagger
 * /api/perfil-experto/perfil:
 *   post:
 *     summary: Actualizar perfil de experto
 *     tags: [Perfil Experto]
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
 *               especialidad:
 *                 type: string
 *               skills:
 *                 type: array
 *               banco:
 *                 type: string
 *               tipoCuenta:
 *                 type: string
 *               numeroCuenta:
 *                 type: string
 *               titular:
 *                 type: string
 *               tipoDocumento:
 *                 type: string
 *               numeroDocumento:
 *                 type: string
 *               telefonoContacto:
 *                 type: string
 *               diasDisponibles:
 *                 type: array
 *     responses:
 *       200:
 *         description: Perfil actualizado correctamente
 *       400:
 *         description: Datos faltantes o inválidos
 *       401:
 *         description: No autenticado
 */
router.post("/perfil", authMiddleware.protect, actualizarPerfilExperto);

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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       401:
 *         description: No autenticado
 */
router.get("/", authMiddleware.autenticar, getProfile);

/**
 * @openapi
 * /api/perfil-experto:
 *   put:
 *     tags: [PerfilExperto]
 *     summary: Actualizar perfil del experto autenticado
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Usuario'
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       401:
 *         description: No autenticado
 */
router.put("/", authMiddleware.autenticar, updateProfile);

// Define una ruta GET para "/editarExperto"
// Modelos necesarios
const Categoria = require("../models/categoria.model.js");
const Especialidad = require("../models/especialidad.model.js");
const Habilidad = require("../models/habilidad.model.js");
const Usuario = require("../models/usuario.model.js");

/**
 * @swagger
 * /api/perfil-experto/editarExperto:
 *   get:
 *     summary: Cargar vista de edición de perfil de experto
 *     tags: [Perfil Experto]
 *     description: Endpoint para cargar la vista con datos necesarios para editar perfil de experto
 *     responses:
 *       200:
 *         description: Vista renderizada con datos de categorías, especialidades y habilidades
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       500:
 *         description: Error al cargar los datos
 */
router.get("/editarExperto", async (req, res) => {
  try {
    // Obtén el usuario actual (ajusta según tu lógica de sesión)
    let usuario = req.session?.user;
    let experto = {};
    if (usuario && usuario._id) {
      const usuarioDB = await Usuario.findById(usuario._id);
      experto = usuarioDB?.infoExperto || {};
    }
    // Consulta todas las categorías, especialidades y habilidades
    const categorias = await Categoria.find({});
    // Extraer especialidades y habilidades de todas las categorías
    const especialidades = categorias.flatMap((cat) =>
      cat.especialidades.map((e) => ({ nombre: e.nombre }))
    );
    const habilidades = categorias.flatMap((cat) =>
      cat.especialidades.flatMap((e) =>
        e.habilidades.map((h) => ({ nombre: h.nombre }))
      )
    );
    // Envía los datos con los nombres esperados por la vista
    res.render("editarExpertos", {
      experto,
      categorias,
      especialidades,
      habilidades,
      error: undefined,
      success: undefined,
    });
  } catch (err) {
    res.render("editarExpertos", {
      experto: {},
      categorias: [],
      especialidades: [],
      habilidades: [],
      error: "Error al cargar los datos",
      success: undefined,
    });
  }
});

// Exporta el enrutador para que pueda ser utilizado en otros archivos del proyecto
module.exports = router;
