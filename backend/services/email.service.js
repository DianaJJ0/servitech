/**
 * SERVICIO PARA ENVÍO DE CORREOS
 * Abstrae la lógica de Nodemailer y utiliza las credenciales del entorno.
 */
const nodemailer = require("nodemailer");

// Función para validar configuración de email
const validarConfiguracionEmail = () => {
  const requiredVars = ["EMAIL_HOST", "EMAIL_PORT", "EMAIL_USER", "EMAIL_PASS"];
  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno de email: ${missing.join(", ")}`
    );
  }

  // Validar formato de App Password (16 caracteres sin espacios)
  const password = process.env.EMAIL_PASS;
  console.log(
    `🔍 Validando EMAIL_PASS: longitud=${
      password.length
    }, contiene espacios=${password.includes(" ")}`
  );

  if (password.includes(" ")) {
    throw new Error(
      "EMAIL_PASS no debe contener espacios. Usa una App Password de Gmail."
    );
  }

  if (password.length !== 16) {
    console.warn(
      `⚠️ App Password tiene ${password.length} caracteres, debería tener 16. Verifica que sea correcta.`
    );
  }

  // Verificar que solo contenga caracteres alfanuméricos (las App Passwords de Gmail son así)
  const isValid = /^[a-zA-Z0-9]{16}$/.test(password);
  if (!isValid) {
    throw new Error(
      "EMAIL_PASS debe ser una App Password válida (16 caracteres alfanuméricos)"
    );
  }

  console.log(`✅ EMAIL_USER: ${process.env.EMAIL_USER}`);
  console.log(
    `✅ EMAIL_PASS: ${password.substring(0, 4)}...${password.substring(12)} (${
      password.length
    } chars)`
  );
  console.log("✅ Configuración de email validada");
};

// Validar al cargar el módulo
try {
  validarConfiguracionEmail();
} catch (error) {
  console.error("❌ Error de configuración de email:", error.message);
}

// --- Configuración del Transporter ---
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: true, // Se usa SSL, requerido por Gmail en el puerto 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS.trim(), // Eliminar espacios por si acaso
  },
});
/**
 * Envía un correo electrónico usando la configuración centralizada.
 * @param {string} destinatario - Correo del destinatario.
 * @param {string} asunto - Asunto del correo.
 * @param {string} mensaje - Cuerpo del correo en texto plano.
 * @param {string} [html] - Cuerpo del correo en formato HTML (opcional).
 * @returns {Promise<object>} - Información del envío si es exitoso.
 * @throws {Error} - Lanza un error si el envío falla, para ser capturado por el controlador.
 */
const enviarCorreo = async (destinatario, asunto, mensaje, html) => {
  // Validar parámetros
  if (!destinatario || !asunto || !mensaje) {
    throw new Error(
      "Faltan parámetros requeridos: destinatario, asunto, mensaje"
    );
  }

  // Se definen las opciones del correo.
  const mailOptions = {
    from: `"ServiTech" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: asunto,
    text: mensaje,
    html: html || `<p>${mensaje}</p>`, // Usa el HTML proporcionado o crea uno simple.
  };

  try {
    console.log(`📧 Enviando correo a: ${destinatario}`);
    console.log(`📋 Asunto: ${asunto}`);

    // Se intenta enviar el correo y se espera la respuesta.
    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Correo enviado exitosamente");
    console.log(`📨 Message ID: ${info.messageId}`);

    return info;
  } catch (error) {
    // Se relanza el error para que la función que llamó a 'enviarCorreo' (el controlador)
    // sepa que algo falló y pueda manejarlo adecuadamente (ej: no enviar respuesta 200 OK).
    throw new Error(`Error de email: ${error.message}`);
  }
};

module.exports = {
  enviarCorreo,
};
