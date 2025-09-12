const cron = require("node-cron");
const util = require("util");
const execP = util.promisify(require("child_process").exec);
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const generarLogs = require("../services/generarLogs");
process.loadEnvFile("./.env");

const CARPETA_RESPALDOS = path.join(".", "backup");
if (!fs.existsSync(CARPETA_RESPALDOS))
  fs.mkdirSync(CARPETA_RESPALDOS, { recursive: true });

async function crearRespaldo() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const dirSalida = path.join(CARPETA_RESPALDOS, `backup_${ts}`);
  const cmd = `mongodump --uri "${process.env.MONGO_URI}" --out ${dirSalida} --gzip`;
  await execP(cmd);
  return dirSalida;
}

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

async function enviarCorreo(rutaArchivo) {
  const transportCfg = process.env.SMTP_HOST
    ? {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
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

// Elimina todo en CARPETA_RESPALDOS excepto keepPath (ruta absoluta)
function limpiarRespaldosAntiguos(keepPath) {
  const items = fs.readdirSync(CARPETA_RESPALDOS);
  for (const item of items) {
    const full = path.join(BACKUP_DIR, item);
    try {
      if (path.resolve(full) === path.resolve(keepPath)) continue;
      // eliminar archivo o carpeta recursivamente
      fs.rmSync(full, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  }
}

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

cron.schedule("0 2 */3 * *", async () => {
  try {
    await exports.realizarBackupCompletoConCorreo();
  } catch (e) {
    console.error("Cron backup error", e);
  }
});
