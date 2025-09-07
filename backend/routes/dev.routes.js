/**
 * @file Rutas de desarrollo
 * @module routes/dev
 * @description Endpoints para desarrollo y testing (solo en modo desarrollo)
 */
const express = require("express");
const router = express.Router();
const Usuario = require("../models/usuario.model.js");
const jwt = require("jsonwebtoken");

/**
 * @swagger
 * tags:
 *   - name: Desarrollo
 *     description: Endpoints para desarrollo y testing (solo en modo desarrollo)
 */

/**
 * @swagger
 * /api/dev/create-admin:
 *   post:
 *     summary: Crear usuario admin de prueba (solo desarrollo)
 *     tags: [Desarrollo]
 *     description: Crea un usuario admin para testing. Solo disponible cuando NODE_ENV !== 'production'
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 default: admin@test.com
 *               password:
 *                 type: string
 *                 default: Password123!
 *               nombre:
 *                 type: string
 *                 default: Admin
 *               apellido:
 *                 type: string
 *                 default: Local
 *     responses:
 *       200:
 *         description: Admin creado o encontrado, token JWT devuelto
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 usuario:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: string
 *       403:
 *         description: Ruta deshabilitada en producción
 *       500:
 *         description: Error interno
 */
router.post("/create-admin", async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res
        .status(403)
        .json({ mensaje: "Ruta de desarrollo deshabilitada en production." });
    }

    const {
      email = "admin@test.com",
      password = "Password123!",
      nombre = "Admin",
      apellido = "Local",
    } = req.body || {};

    let usuario = await Usuario.findOne({ email });
    if (!usuario) {
      usuario = new Usuario({ email, nombre, apellido });
      usuario.password = password; // virtual setter
      usuario.roles = ["admin"];
      await usuario.save();
    } else {
      // asegurar rol admin
      if (!usuario.roles.includes("admin")) {
        usuario.roles.push("admin");
        await usuario.save();
      }
    }

    const token = jwt.sign(
      { id: usuario._id },
      process.env.JWT_SECRET || "testsecret",
      {
        expiresIn: "7d",
      }
    );

    return res.json({
      token,
      usuario: { _id: usuario._id, email: usuario.email, roles: usuario.roles },
    });
  } catch (err) {
    console.error("Error creating admin test user:", err);
    if (process.env.NODE_ENV !== "production") {
      return res.status(500).json({
        mensaje: "Error interno",
        error: err.message,
        stack: err.stack,
      });
    }
    return res.status(500).json({ mensaje: "Error interno" });
  }
});

/**
 * @swagger
 * /api/dev/expertos-populados:
 *   get:
 *     summary: Listar expertos con categorías pobladas (solo desarrollo)
 *     tags: [Desarrollo]
 *     description: Endpoint de desarrollo para obtener expertos con referencias pobladas. Requiere ALLOW_DEV_ROUTES=true
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Elementos por página
 *     responses:
 *       200:
 *         description: Lista de expertos con categorías pobladas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 expertos:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *       403:
 *         description: Ruta deshabilitada en producción o rutas de desarrollo no habilitadas
 *       500:
 *         description: Error interno
 */
router.get("/expertos-populados", async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res
        .status(403)
        .json({ mensaje: "Ruta deshabilitada en production." });
    }
    if (
      !process.env.ALLOW_DEV_ROUTES ||
      process.env.ALLOW_DEV_ROUTES === "false"
    ) {
      return res
        .status(403)
        .json({ mensaje: "Rutas de desarrollo no habilitadas." });
    }
    const Usuario = require("../models/usuario.model.js");
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const filtro = { roles: "experto" };
    const expertos = await Usuario.find(filtro)
      .select("-passwordHash")
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: "infoExperto.categorias", select: "nombre" })
      .exec();
    const total = await Usuario.countDocuments(filtro);
    return res.json({ expertos, total });
  } catch (err) {
    console.error("dev: error expertos-populados", err);
    return res.status(500).json({ mensaje: "Error interno dev" });
  }
});

module.exports = router;
