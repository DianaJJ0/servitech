/**
 * SERVICIO PARA ENVÍO DE CORREOS
 * Abstrae la lógica de Nodemailer y utiliza las credenciales del entorno.
 */
const nodemailer = require("nodemailer");

// --- Configuración del Transporter ---

// de forma segura desde las variables de entorno (archivo .env).
// Esto evita tener contraseñas escritas directamente en el código.
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, 
  port: process.env.EMAIL_PORT, // 465 (para SSL)
  secure: true, // Se usa SSL, requerido por Gmail en el puerto 465
  auth: {
    user: process.env.EMAIL_USER, // tu_correo@gmail.com
    pass: process.env.EMAIL_PASS, // tu_contraseña_de_aplicacion
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
  // Se definen las opciones del correo.
  const mailOptions = {
    from: `"ServiTech" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: asunto,
    text: mensaje,
    html: html || `<p>${mensaje}</p>`, // Usa el HTML proporcionado o crea uno simple.
  };

  try {
    // Se intenta enviar el correo y se espera la respuesta.
    const info = await transporter.sendMail(mailOptions);
    console.log("Correo enviado exitosamente. ID del mensaje:", info.messageId);
    return info;
  } catch (error) {
    // Si hay un error, se loguea en la consola del servidor para diagnóstico.
    console.error("Error detallado al enviar correo:", error);
    // Se relanza el error para que la función que llamó a 'enviarCorreo' (el controlador)
    // sepa que algo falló y pueda manejarlo adecuadamente (ej: no enviar respuesta 200 OK).
    throw new Error("El servicio de correo no pudo enviar el mensaje.");
  }
};

module.exports = {
  enviarCorreo,
};
