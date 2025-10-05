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
  const isValid = /^[a-zA-Z0-9]{16}$/.test(password);
  if (!isValid) {
    throw new Error(
      "EMAIL_PASS debe ser una App Password válida (16 caracteres alfanuméricos)"
    );
  }
};

try {
  validarConfiguracionEmail();
} catch (error) {
  console.error("Error de configuración de email:", error.message);
}
// Sólo crear transporter si la configuración de email es válida
let transporter;
let _emailConfigured = true;
try {
  validarConfiguracionEmail();
} catch (error) {
  _emailConfigured = false;
  console.error("Error de configuración de email:", error.message);
}

if (_emailConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS.trim(),
    },
  });
} else {
  // Fallback: transporter que informa que el servicio no está configurado
  transporter = {
    sendMail: async () => {
      throw new Error(
        "Email service not configured. Set EMAIL_HOST/EMAIL_PORT/EMAIL_USER/EMAIL_PASS in backend/.env"
      );
    },
  };
}

/**
 * Envía un correo electrónico personalizado. Si no se da nombre/apellido, usa un saludo genérico.
 * @param {string} destinatario - Correo del destinatario.
 * @param {string} asunto - Asunto del correo.
 * @param {string} mensaje - Cuerpo principal del mensaje (sin saludo).
 * @param {object} [opciones] - Opcional: {nombreDestinatario, apellidoDestinatario, html}
 * @returns {Promise<object>} - Información del envío si es exitoso.
 * @throws {Error} - Si falta algún dato o falla el envío.
 */
const enviarCorreo = async (destinatario, asunto, mensaje, opciones = {}) => {
  if (!destinatario || !asunto || !mensaje) {
    throw new Error(
      "Faltan parámetros requeridos: destinatario, asunto, mensaje"
    );
  }

  let saludo = "Hola,";
  if (opciones.nombreDestinatario && opciones.apellidoDestinatario) {
    saludo = `Hola ${opciones.nombreDestinatario} ${opciones.apellidoDestinatario},`;
  } else if (opciones.nombreDestinatario) {
    saludo = `Hola ${opciones.nombreDestinatario},`;
  }

  const mensajeTexto = `${saludo}\n\n${mensaje}`;
  const mensajeHtml =
    opciones.html ||
    `<p style="color:#551a8b;font-size:1.1em;">${saludo}</p>
     <p style="color:#551a8b;">${mensaje.replace(/\n/g, "<br>")}</p>`;

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

/**
 * Genera el cuerpo del email de recuperación de contraseña según el formato de la imagen.
 * @param {string} nombreDestinatario
 * @param {string} apellidoDestinatario
 * @param {string} enlaceRecuperacion
 * @returns {{mensaje: string, html: string}}
 */
function generarCuerpoRecuperacion(
  nombreDestinatario,
  apellidoDestinatario,
  enlaceRecuperacion
) {
  const saludo =
    nombreDestinatario && apellidoDestinatario
      ? `Hola ${nombreDestinatario} ${apellidoDestinatario},`
      : "Hola,";

  const mensaje = `Recibimos una solicitud para recuperar tu contraseña.

Haz clic en el siguiente enlace para crear una nueva contraseña:

${enlaceRecuperacion}

Si no solicitaste esto, deberías ir al aplicativo y cambiar tu contraseña inmediatamente por seguridad.

Saludos,
Equipo ServiTech`;

  const html = `
<p style="color:#551a8b;font-size:1.08em;font-weight:500;">${saludo}</p>
<p style="color:#551a8b;">Recibimos una solicitud para recuperar tu contraseña.</p>
<p style="color:#551a8b;">Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
<p>
  <a href="${enlaceRecuperacion}" style="color:#551a8b;text-decoration:underline;font-weight:500;">
    ${enlaceRecuperacion}
  </a>
</p>
<p style="color:#551a8b;">
  Si no solicitaste esto, deberías ir al aplicativo y cambiar tu contraseña inmediatamente por seguridad.
</p>
<br>
<p style="color:#551a8b;">Saludos,<br>Equipo ServiTech</p>
  `;
  return { mensaje, html };
}

module.exports = {
  enviarCorreo,
  generarCuerpoRecuperacion,
};
