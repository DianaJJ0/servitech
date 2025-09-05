const express = require("express");
const router = express.Router();
const Usuario = require("../models/usuario.model.js");
const jwt = require("jsonwebtoken");

// Ruta de desarrollo para crear un admin de prueba y devolver un JWT.
// SOLO se habilita cuando NODE_ENV !== 'production'.
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

// Endpoint de desarrollo: devolver expertos con categorias pobladas
// Sólo disponible si ALLOW_DEV_ROUTES=true y no en production.
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
