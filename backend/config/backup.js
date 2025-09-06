const cron = require("node-cron");
/* eslint-disable no-unused-vars */
const { exec } = require("child_process");
process.loadEnvFile("./.env");

exports.backupDatabase = async () => {
  const dbName = "servitech";
  const outputPath = "./backup";

  const command = `mongodump --uri "${process.env.MONGO_URI}" --out ${outputPath} --gzip`;

  await exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error en el respaldo: ${error.message}`);
      return;
    }
    console.log(`Respaldo completado con éxito ${stdout}`);
  });
};
// Programar el backup cada 3 dias a las 2:00 AM

// cron.schedule("0 2 */3 * *", async () => {
//   console.log("Realizando Backup de la Base de datos");
//   exports.backupDatabase();
// });

// COMENTAR ESTA LÍNEA PARA DETENER LOS BACKUPS CADA MINUTO
cron.schedule("* * * * *", async () => {
  console.log("[TESTING] Realizando backup básico de la base de datos...");
  exports.backupDatabase();
});

// MANTENER SOLO EL BACKUP PROGRAMADO CADA 3 DÍAS
cron.schedule("0 2 */3 * *", async () => {
  console.log("Ejecutando backup programado cada 3 días con envío por correo");
  await realizarBackupCompletoConCorreo();
});
