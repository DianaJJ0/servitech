const express = require("express");
const router = express.Router();

// ...otras rutas...

router.get("/editar-perfil-experto", (req, res) => {
  // Obtén el usuario desde la sesión, base de datos, etc.
  // Aquí se usa un objeto vacío si no existe, ajusta según tu lógica.
  const usuario = req.session?.usuario || {
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

// ...otras rutas...

module.exports = router;
