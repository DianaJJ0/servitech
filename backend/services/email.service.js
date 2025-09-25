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

  if (password.includes(" ")) {
    throw new Error(
      "EMAIL_PASS no debe contener espacios. Usa una App Password de Gmail."
    );
  }

  if (password.length !== 16) {
    console.warn(
      `App Password tiene ${password.length} caracteres, debería tener 16. Verifica que sea correcta.`
    );
  }

  // Verificar que solo contenga caracteres alfanuméricos
  const isValid = /^[a-zA-Z0-9]{16}$/.test(password);
  if (!isValid) {
    throw new Error(
      "EMAIL_PASS debe ser una App Password válida (16 caracteres alfanuméricos)"
    );
  }
};

// Validar al cargar el módulo
try {
  validarConfiguracionEmail();
} catch (error) {
  console.error("Error de configuración de email:", error.message);
}

// --- Configuración del Transporter ---
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: true, // Se usa SSL, requerido por Gmail en el puerto 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS.trim(),
  },
});

/**
 * Envía un correo electrónico personalizado.
 * @param {string} destinatario - Correo del destinatario.
 * @param {string} asunto - Asunto del correo.
 * @param {string} mensaje - Cuerpo principal del mensaje (sin nombre).
 * @param {string} nombreDestinatario - Nombre del destinatario.
 * @param {string} apellidoDestinatario - Apellido del destinatario.
 * @param {string} [html] - Cuerpo HTML adicional (opcional).
 * @returns {Promise<object>} - Información del envío si es exitoso.
 * @throws {Error} - Si falta algún dato o falla el envío.
 */
const enviarCorreo = async (
  destinatario,
  asunto,
  mensaje,
  nombreDestinatario,
  apellidoDestinatario,
  html
) => {
  // Validar parámetros
  if (!destinatario || !asunto || !mensaje) {
    throw new Error(
      "Faltan parámetros requeridos: destinatario, asunto, mensaje"
    );
  }
  if (!nombreDestinatario || !apellidoDestinatario) {
    throw new Error(
      "Faltan parámetros requeridos: nombreDestinatario y apellidoDestinatario"
    );
  }

  // Personaliza el mensaje de texto y HTML
  const saludo = `Hola ${nombreDestinatario} ${apellidoDestinatario},`;
  const mensajeTexto = `${saludo}\n\n${mensaje}`;
  const mensajeHtml =
    html ||
    `<p>${saludo}</p>
     <p>${mensaje}</p>`;

  const mailOptions = {
    from: `"ServiTech" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: asunto,
    text: mensajeTexto,
    html: mensajeHtml,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    throw new Error(`Error de email: ${error.message}`);
  }
};

module.exports = {
  enviarCorreo,
};
