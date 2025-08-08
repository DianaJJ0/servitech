const { enviarCorreo } = require("./email.service");

enviarCorreo(
  "dianajimenez10152312@gmail.com",
  "Prueba directa Servitech",
  "Este es un correo de prueba enviado directamente desde test-email.js"
)
  .then(() => console.log("✅ Prueba de correo completada"))
  .catch((err) => console.error("❌ Error en la prueba:", err));
