const cron = require("node-cron");
const util = require("util");
const execP = util.promisify(require("child_process").exec);
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const generarLogs = require("../services/generarLogs");
process.loadEnvFile("./.env");

const BACKUP_DIR = path.join(".", "backup");
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

async function makeBackup() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(BACKUP_DIR, `backup_${ts}`);
  const cmd = `mongodump --uri "${process.env.MONGO_URI}" --out ${outDir} --gzip`;
  await execP(cmd);
  return outDir;
}

async function compress(outDir) {
  const zipPath = `${outDir}.zip`;
  try {
    await execP(`zip -r "${zipPath}" "${outDir}"`);
    return zipPath;
  } catch (e) {
    const tarPath = `${outDir}.tar.gz`;
    await execP(
      `tar -czf "${tarPath}" -C "${path.dirname(outDir)}" "${path.basename(
        outDir
      )}"`
    );
    return tarPath;
  }
}

async function sendEmail(filePath) {
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
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: "servitech.app.correo@gmail.com",
    subject: `Backup ServiTech - ${new Date().toISOString()}`,
    text: `Backup adjunto: ${path.basename(filePath)}`,
    attachments: [{ filename: path.basename(filePath), path: filePath }],
  });
  return info;
}

// Elimina todo en BACKUP_DIR excepto keepPath (ruta absoluta)
function cleanOldBackups(keepPath) {
  const items = fs.readdirSync(BACKUP_DIR);
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
    const outDir = await makeBackup();
    const archive = await compress(outDir);
    const info = await sendEmail(archive);

    // Si se envió correctamente, eliminar backups previos y el folder sin comprimir
    cleanOldBackups(archive);

    await generarLogs.registrarEvento({
      usuarioEmail: null,
      nombre: null,
      apellido: null,
      accion: "BACKUP",
      detalle: `Backup enviado: ${path.basename(archive)}`,
      resultado: "Exito",
      tipo: "general",
      meta: { archive, messageId: info && info.messageId },
      persistirEnDB: true,
    });
    return { archive, info };
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
