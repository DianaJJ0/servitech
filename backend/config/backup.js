/**
 * ---------------------------------------------
 * Configuración de backups automáticos de la base de datos
 * ---------------------------------------------
 * Este módulo permite:
 * - Crear respaldos de la base de datos MongoDB usando mongodump
 * - Comprimir los respaldos (zip/tar.gz)
 * - Enviar el respaldo por correo electrónico
 * - Limpiar respaldos antiguos
 * - Programar backups automáticos con node-cron
 *
 * @module config/backup
 * @author Equipo Servitech
 */

const cron = require("node-cron");
const util = require("util");
const execP = util.promisify(require("child_process").exec);
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const generarLogs = require("../services/generarLogs");
process.loadEnvFile("./.env");

// Carpeta donde se almacenan los respaldos
const CARPETA_RESPALDOS = path.join(".", "backup");
if (!fs.existsSync(CARPETA_RESPALDOS))
  fs.mkdirSync(CARPETA_RESPALDOS, { recursive: true });

/**
 * Crea un respaldo de la base de datos MongoDB usando mongodump.
 * @returns {Promise<string>} Ruta del directorio de salida del respaldo
 */
async function crearRespaldo() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const dirSalida = path.join(CARPETA_RESPALDOS, `backup_${ts}`);
  const cmd = `mongodump --uri "${process.env.MONGO_URI}" --out ${dirSalida} --gzip`;
  await execP(cmd);
  return dirSalida;
}

/**
 * Comprime el respaldo en formato zip o tar.gz (fallback).
 * @param {string} dirSalida - Ruta del respaldo a comprimir
 * @returns {Promise<string>} Ruta del archivo comprimido
 */
async function comprimir(dirSalida) {
  const zipPath = `${dirSalida}.zip`;
  try {
    await execP(`zip -r "${zipPath}" "${dirSalida}"`);
    return zipPath;
  } catch (e) {
    const tarPath = `${dirSalida}.tar.gz`;
    await execP(
      `tar -czf "${tarPath}" -C "${path.dirname(dirSalida)}" "${path.basename(
        dirSalida
      )}"`
    );
    return tarPath;
  }
}

/**
 * Envía el archivo de respaldo comprimido por correo electrónico.
 * @param {string} filePath - Ruta del archivo comprimido
 * @returns {Promise<object>} Información del envío
 */
async function enviarCorreo(filePath) {
  const transportCfg = process.env.SMTP_HOST
    ? {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      }
    : {
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      };
  const transporter = nodemailer.createTransport(transportCfg);
  const infoEnvio = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: "servitech.app.correo@gmail.com",
    subject: `Backup ServiTech - ${new Date().toISOString()}`,
    text: `Backup adjunto: ${path.basename(filePath)}`,
    attachments: [{ filename: path.basename(filePath), path: filePath }],
  });
  return infoEnvio;
}

/**
 * Elimina todos los respaldos antiguos excepto el especificado.
 * @param {string} keepPath - Ruta absoluta del respaldo a conservar
 */
function limpiarRespaldosAntiguos(keepPath) {
  const items = fs.readdirSync(CARPETA_RESPALDOS);
  for (const item of items) {
    const full = path.join(CARPETA_RESPALDOS, item);
    try {
      if (path.resolve(full) === path.resolve(keepPath)) continue;
      // eliminar archivo o carpeta recursivamente
      fs.rmSync(full, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Realiza el proceso completo de backup: crea, comprime, envía por correo y limpia antiguos.
 * Registra logs de éxito o error.
 * @returns {Promise<{archivoComprimido: string, infoEnvio: object}>}
 */
exports.realizarBackupCompletoConCorreo = async () => {
  try {
    const dirSalida = await crearRespaldo();
    const archivoComprimido = await comprimir(dirSalida);
    const infoEnvio = await enviarCorreo(archivoComprimido);

    // Si se envió correctamente, eliminar respaldos previos y el folder sin comprimir
    limpiarRespaldosAntiguos(archivoComprimido);

    await generarLogs.registrarEvento({
      usuarioEmail: null,
      nombre: null,
      apellido: null,
      accion: "BACKUP",
      detalle: `Backup enviado: ${path.basename(archivoComprimido)}`,
      resultado: "Exito",
      tipo: "general",
      meta: { archivoComprimido, messageId: infoEnvio && infoEnvio.messageId },
      persistirEnDB: true,
    });
    return { archivoComprimido, infoEnvio };
  } catch (err) {
    await generarLogs.registrarEvento({
      usuarioEmail: null,
      nombre: null,
      apellido: null,
      accion: "BACKUP",
      detalle: "Error en backup: " + (err && err.message),
      resultado: "Error",
      tipo: "general",
      meta: { error: err && err.message },
      persistirEnDB: true,
    });
    throw err;
  }
};

// Programa el backup automático cada 3 días a las 2:00 AM
cron.schedule("0 2 */3 * *", async () => {
  try {
    await exports.realizarBackupCompletoConCorreo();
  } catch (e) {
    console.error("Cron backup error", e);
  }
});
