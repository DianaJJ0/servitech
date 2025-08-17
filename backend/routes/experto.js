const express = require("express");
const router = express.Router();

router.get("/editar-perfil-experto", (req, res) => {
  // Unificar variable de sesión: usar siempre req.session.user
  const usuario = req.session?.user || {
    email: "",
    nombre: "",
    experto: {
      descripcion: "",
      especialidad: "",
      precio: "",
      skills: [],
      horario: {
        dias_disponibles: [],
        hora_inicio: "",
        hora_fin: "",
      },
      datosBancarios: {
        banco: "",
        tipoCuenta: "",
        numeroCuenta: "",
        titular: "",
      },
    },
  };
  res.render("editarExpertos", { usuario });
});

module.exports = router;
