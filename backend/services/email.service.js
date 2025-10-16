/**
 * ---------------------------------------------
 * Servicio para envío de correos electrónicos
 * ---------------------------------------------
 * Este módulo abstrae el envío de correos usando SendGrid (sgMail)
 * y utiliza las credenciales del entorno. Permite:
 * - Enviar correos personalizados a usuarios
 * - Personalizar saludo y cuerpo del mensaje
 * - Manejar errores de configuración y envío
 *
 * @module services/email.service
 * @author Equipo Servitech
 */

const sgMail = require("@sendgrid/mail");
// Permite que la app arranque aunque no haya credenciales de SendGrid
// Se valida al intentar enviar cada correo y se reportan errores sin bloquear el servidor
if (process.env.SENDGRID_API_KEY) {
  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  } catch (e) {
    // No detener el proceso aquí; el error real saldrá cuando se intente enviar
    console.warn(
      "Advertencia: no se pudo configurar SendGrid en startup:",
      e.message
    );
  }
} else {
  console.warn(
    "SENDGRID_API_KEY no definido: los correos no se enviarán hasta configurar la variable."
  );
}

/**
 * Envía un correo electrónico personalizado. Si no se da nombre/apellido, usa un saludo genérico.
 * @function enviarCorreo
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
    `<p style=\"color:#551a8b;font-size:1.1em;\">${saludo}</p>\n     <p style=\"color:#551a8b;\">${mensaje.replace(
      /\n/g,
      "<br>"
    )}</p>`;

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
    if (!process.env.SENDGRID_API_KEY || !process.env.EMAIL_USER) {
      throw new Error(
        "SendGrid no configurado (falta SENDGRID_API_KEY o EMAIL_USER)"
      );
    }
    const info = await sgMail.send(msg);
    // Log de la respuesta de SendGrid para debug (puede ser array)
    try {
      console.log("[email.service] SendGrid response:", JSON.stringify(info));
    } catch (e) {}
    return info;
  } catch (error) {
    // Intentar devolver un mensaje de error útil
    const errBody =
      error && error.response && error.response.body
        ? error.response.body
        : null;
    const errMsg = errBody
      ? JSON.stringify(errBody)
      : error.message || String(error);
    console.error("[email.service] Error enviando email:", errMsg);
    // Si existe body de respuesta, intentar loggear sus detalles
    if (errBody) {
      try {
        console.error(
          "[email.service] SendGrid error body:",
          JSON.stringify(errBody)
        );
      } catch (e) {}
    }
    throw new Error(`Error de email: ${errMsg}`);
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
