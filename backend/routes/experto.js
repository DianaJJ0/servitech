// Importa el módulo Express, que facilita la creación de servidores y rutas en Node.js
const express = require("express");
// Crea un nuevo enrutador de Express para definir rutas específicas de este módulo
const router = express.Router();

// Define una ruta GET para "/editar-perfil-experto"
// Modelos necesarios
const Categoria = require("../models/categoria.model.js");
const Especialidad = require("../models/especialidad.model.js");
const Habilidad = require("../models/habilidad.model.js");
const Usuario = require("../models/usuario.model.js");

router.get("/editar-perfil-experto", async (req, res) => {
  try {
    // Obtén el usuario actual (ajusta según tu lógica de sesión)
    let usuario = req.session?.user;
    let experto = {};
    if (usuario && usuario._id) {
      const usuarioDB = await Usuario.findById(usuario._id).populate(
        "experto.categorias"
      );
      experto = usuarioDB?.experto || {};
    }
    // Consulta todas las categorías, especialidades y habilidades
    const categorias = await Categoria.find({});
    const especialidades = await Especialidad.find({});
    const habilidades = await Habilidad.find({});
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
