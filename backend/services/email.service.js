/**
 * SERVICIO PARA ENVÍO DE CORREOS
 * Abstrae la lógica de Nodemailer y utiliza las credenciales del entorno.
 */

const sgMail = require("@sendgrid/mail");
if (!process.env.SENDGRID_API_KEY || !process.env.EMAIL_USER) {
  throw new Error(
    "Faltan SENDGRID_API_KEY o EMAIL_USER en las variables de entorno."
  );
}
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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

  const msg = {
    to: destinatario,
    from: {
      email: process.env.EMAIL_USER,
      name: "Servitech",
    },
    subject: asunto,
    text: mensajeTexto,
    html: mensajeHtml,
  };

  try {
    const info = await sgMail.send(msg);
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





