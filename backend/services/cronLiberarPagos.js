/**
 * Servicio de cron para liberar pagos automáticamente después de 24h si el cliente no finaliza la asesoría.
 * Usa node-cron para revisar cada hora.
 */
const cron = require("node-cron");
const Asesoria = require("../models/asesoria.model");
const Pago = require("../models/pago.model");
const generarLogs = require("./generarLogs");

// Tarea: busca asesorías confirmadas cuya hora de fin + 24h < ahora y las finaliza
cron.schedule("0 * * * *", async () => {
  try {
    const ahora = new Date();
    // Buscar asesorías confirmadas y pasadas más de 24h de su hora de fin
    const asesorias = await Asesoria.find({
      estado: "confirmada",
      fechaHoraInicio: { $lte: new Date(ahora.getTime() - 60 * 60 * 1000) }, // mínimo 1h pasada
    });

    for (const asesoria of asesorias) {
      const fin = new Date(
        asesoria.fechaHoraInicio.getTime() + asesoria.duracionMinutos * 60000
      );
      if (ahora > new Date(fin.getTime() + 24 * 60 * 60000)) {
        // Liberar pago
        asesoria.estado = "completada";
        asesoria.fechaFinalizacion = ahora;
        await asesoria.save();

        if (asesoria.pagoId) {
          await Pago.findByIdAndUpdate(asesoria.pagoId, {
            estado: "liberado",
            fechaLiberacion: ahora,
          });
        }

        // Log
        await generarLogs.registrarEvento({
          usuarioEmail: null,
          accion: "CRON_LIBERAR_PAGO",
          detalle: `Asesoría ${asesoria._id} liberada automáticamente por cron`,
          resultado: "Exito",
          tipo: "cron",
          persistirEnDB: true,
        });
      }
    }
  } catch (err) {
    console.error("Error en cronLiberarPagos:", err);
  }
});

console.log(
  "cronLiberarPagos: cron de liberación automática de pagos iniciado."
);
