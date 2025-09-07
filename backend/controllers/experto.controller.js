/**
 * CONTROLADOR DE EXPERTOS
 * Lógica para gestión, consulta y edición de perfil de expertos.
 */
const Usuario = require("../models/usuario.model.js");
const Especialidad = require("../models/especialidad.model.js");
const mongoose = require("mongoose");

/**
 * Lista expertos con paginación y filtros avanzados
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const listarExpertos = async (req, res) => {
  try {
    // parsear y normalizar parámetros de paginación y filtros
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { nombre, categoria, especialidad, estado, minRating } = req.query;
    const filtro = { roles: "experto" };

    // Filtrar por nombre
    if (nombre) {
      filtro.$or = [
        { nombre: { $regex: nombre, $options: "i" } },
        { apellido: { $regex: nombre, $options: "i" } },
      ];
    }
    // Filtrar por especialidad
    if (especialidad) {
      filtro["infoExperto.especialidad"] = especialidad;
    }
    // Filtrar por estado del usuario (activo/inactivo/pendiente-verificacion...)
    if (estado) {
      filtro.estado = estado;
    }
    // Filtrar por categoría (solo si es un ObjectId válido)
    // Filtrar por categoría solo si es un ObjectId válido
    try {
      if (categoria && mongoose.isValidObjectId(categoria)) {
        filtro["infoExperto.categorias"] = mongoose.Types.ObjectId(categoria);
      }
    } catch (e) {
      console.warn("Categoria no válida recibida en query:", categoria);
    }

    // Si se solicita filtrar por calificación mínima y el campo existe en el modelo
    let aplicarFiltroEnDB = false;
    let min = null;
    if (typeof minRating !== "undefined" && !isNaN(Number(minRating))) {
      min = Number(minRating);
      // Detectar si el campo 'calificacion' está definido en el esquema de Usuario
      if (
        Usuario &&
        Usuario.schema &&
        Usuario.schema.path &&
        Usuario.schema.path("calificacion")
      ) {
        aplicarFiltroEnDB = true;
        filtro.calificacion = { $gte: min };
      }
    }

    // Realizar la consulta (si filtramos por calificación en DB ya está incluido en 'filtro')
    // Usar populate para devolver los nombres de las categorías en infoExperto.categorias
    let query = Usuario.find(filtro)
      .select("-passwordHash")
      .skip((page - 1) * limit)
      .limit(limit);
    // Intentar popular infoExperto.categorias si existe la referencia
    try {
      query = query.populate({
        path: "infoExperto.categorias",
        select: "nombre",
      });
    } catch (e) {
      // si populate falla por esquema diferente, continuar sin populate
      console.debug(
        "Populate infoExperto.categorias no se aplicó:",
        e && e.message
      );
    }
    let expertos = await query.exec();

    // Resolver especialidad cuando esté almacenada como ObjectId/24-hex
    try {
      // recopilar ids posibles
      const espIds = [];
      expertos.forEach((e) => {
        try {
          const ie = e && e.infoExperto && e.infoExperto.especialidad;
          if (ie && typeof ie === "string" && ie.match(/^[0-9a-fA-F]{24}$/)) {
            espIds.push(ie);
          }
        } catch (er) {}
      });
      if (espIds.length > 0) {
        const found = await Especialidad.find({ _id: { $in: espIds } }).select(
          "nombre"
        );
        const map = {};
        found.forEach((f) => (map[String(f._id)] = f.nombre));
        expertos = expertos.map((e) => {
          try {
            if (e && e.infoExperto && e.infoExperto.especialidad) {
              const val = e.infoExperto.especialidad;
              if (
                val &&
                typeof val === "string" &&
                val.match(/^[0-9a-fA-F]{24}$/)
              ) {
                e.infoExperto.especialidad = map[String(val)] || val;
              }
            }
          } catch (er) {}
          return e;
        });
      }
    } catch (er) {
      // no bloquear si algo falla al resolver especialidades
      console.debug(
        "No se pudieron resolver especialidades:",
        er && er.message
      );
    }

    let expertosFinal = expertos;

    // Si no aplicamos el filtro en DB pero se solicitó minRating, filtrar en memoria
    if (!aplicarFiltroEnDB && min !== null) {
      expertosFinal = expertos.filter((e) => {
        const cal = Number(e.calificacion) || 0;
        return cal >= min;
      });
    }

    let total = 0;
    try {
      total = await Usuario.countDocuments(filtro);
    } catch (e) {
      // Loguear más detalle para depuración
      console.error(
        "Error counting documents in listarExpertos:",
        e && e.stack
      );
      // En desarrollo devolver el mensaje de error para facilitar debugging
      if (process.env.NODE_ENV !== "production") {
        return res.status(500).json({
          mensaje: "Error al contar expertos.",
          detalle: e && e.message,
        });
      }
      return res.status(500).json({ mensaje: "Error al listar expertos." });
    }
    // retornar la página ya filtrada por minRating (si se aplicó)
    res.json({ expertos: expertosFinal || expertos, total });
  } catch (error) {
    console.error("Error al listar expertos:", error);
    res.status(500).json({ mensaje: "Error al listar expertos." });
  }
};

/**
 * Obtiene un experto individual por email (solo admin)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const obtenerExpertoPorEmail = async (req, res) => {
  try {
    const email = req.params.email;
    const experto = await Usuario.findOne({ email, roles: "experto" }).select(
      "-passwordHash"
    );
    if (!experto) {
      return res.status(404).json({ mensaje: "Experto no encontrado." });
    }
    res.json(experto);
  } catch (error) {
    console.error("Error al obtener experto por email:", error);
    res.status(500).json({ mensaje: "Error interno al obtener experto." });
  }
};

/**
 * Elimina un experto por email (solo admin)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const eliminarExpertoPorEmail = async (req, res) => {
  try {
    const email = req.params.email;
    const experto = await Usuario.findOne({ email, roles: "experto" });
    if (!experto) {
      return res.status(404).json({ mensaje: "Experto no encontrado." });
    }
    await experto.deleteOne();
    res.json({ mensaje: "Experto eliminado correctamente." });
  } catch (error) {
    console.error("Error al eliminar experto por email:", error);
    res.status(500).json({ mensaje: "Error al eliminar experto." });
  }
};

/**
 * Actualiza el perfil de experto autenticado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const actualizarPerfilExperto = async (req, res) => {
  try {
    // Verificar autenticación
    const userId = req.usuario._id;
    if (!userId) return res.status(401).json({ mensaje: "No autenticado." });

    // Recoger datos del body
    const {
      precioPorHora,
      descripcion,
      categorias,
      especialidad,
      skills,
      banco,
      tipoCuenta,
      numeroCuenta,
      titular,
      tipoDocumento,
      numeroDocumento,
      telefonoContacto,
      diasDisponibles,
    } = req.body;

    // Buscar usuario actual
    const usuario = await Usuario.findById(userId);
    if (!usuario)
      return res.status(404).json({ mensaje: "Usuario no encontrado." });

    // Asignar rol experto si no lo tiene
    if (!usuario.roles.includes("experto")) {
      usuario.roles.push("experto");
    }

    // Procesa categorías (array de ObjectId válidos)
    let categoriasArray = [];
    if (categorias) {
      if (Array.isArray(categorias)) {
        categoriasArray = categorias
          .map((id) =>
            typeof id === "string" && id.match(/^[0-9a-fA-F]{24}$/)
              ? new mongoose.Types.ObjectId(id)
              : null
          )
          .filter((id) => id !== null);
      } else if (typeof categorias === "string") {
        categoriasArray = categorias
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length === 24 && id.match(/^[0-9a-fA-F]{24}$/))
          .map((id) => new mongoose.Types.ObjectId(id));
      }
    }

    // Procesa skills (array de string)
    let skillsArray = [];
    if (skills) {
      if (Array.isArray(skills)) {
        skillsArray = skills.map((s) => String(s));
      } else if (typeof skills === "string") {
        skillsArray = skills.split(",").map((s) => s.trim());
      }
    }

    // Procesa diasDisponibles (array de string)
    let diasArray = [];
    if (diasDisponibles) {
      if (Array.isArray(diasDisponibles)) {
        diasArray = diasDisponibles.map((d) => String(d));
      } else if (typeof diasDisponibles === "string") {
        diasArray = diasDisponibles.split(",").map((d) => d.trim());
      }
    }

    // Actualiza infoExperto completo
    usuario.infoExperto = {
      precioPorHora,
      descripcion,
      categorias: categoriasArray,
      especialidad,
      skills: skillsArray,
      banco,
      tipoCuenta,
      numeroCuenta,
      titular,
      tipoDocumento,
      numeroDocumento,
      telefonoContacto,
      diasDisponibles: diasArray,
    };

    await usuario.save();
    res.json({
      mensaje: "Perfil de experto actualizado correctamente.",
      usuario,
    });
  } catch (error) {
    console.error("Error al actualizar perfil de experto:", error);
    res.status(500).json({ mensaje: "Error al actualizar perfil de experto." });
  }
};

module.exports = {
  listarExpertos,
  obtenerExpertoPorEmail,
  eliminarExpertoPorEmail,
  actualizarPerfilExperto,
};
