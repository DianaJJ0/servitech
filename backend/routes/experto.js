// Importa el módulo Express, que facilita la creación de servidores y rutas en Node.js
const express = require("express");
// Crea un nuevo enrutador de Express para definir rutas específicas de este módulo
const router = express.Router();

// Define una ruta GET para "/editar-perfil-experto"
router.get("/editar-perfil-experto", (req, res) => {
  // Obtiene el usuario de la sesión actual. Si no existe, crea un objeto usuario con valores por defecto.
  // Se recomienda unificar el uso de la variable de sesión usando siempre req.session.user
  const usuario = req.session?.user || {
    email: "", // Correo electrónico del usuario
    nombre: "", // Nombre del usuario
    experto: { // Información específica si el usuario es experto
      descripcion: "", // Descripción del experto
      especialidad: "", // Especialidad del experto
      precio: "", // Precio por servicio del experto
      skills: [], // Lista de habilidades del experto
      horario: { // Horario de disponibilidad del experto
        dias_disponibles: [], // Días en los que está disponible
        hora_inicio: "", // Hora de inicio de disponibilidad
        hora_fin: "", // Hora de fin de disponibilidad
      },
      datosBancarios: { // Información bancaria del experto
        banco: "", // Nombre del banco
        tipoCuenta: "", // Tipo de cuenta bancaria
        numeroCuenta: "", // Número de cuenta bancaria
        titular: "", // Titular de la cuenta
      },
    },
  };
  // Renderiza la vista "editarExpertos" y le pasa el objeto usuario para mostrar los datos en el formulario
  res.render("editarExpertos", { usuario });
});

// Exporta el enrutador para que pueda ser utilizado en otros archivos del proyecto
module.exports = router;
