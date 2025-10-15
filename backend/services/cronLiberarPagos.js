/**
 * ---------------------------------------------
 * Servicio de cron para liberar pagos automáticamente
 * ---------------------------------------------
 * Este módulo:
 * - Revisa cada hora si hay asesorías confirmadas que no han sido finalizadas por el cliente
 * - Si han pasado más de 24h desde la hora de fin, finaliza la asesoría y libera el pago al experto
 * - Registra logs de cada acción automática
 *
 * @module services/cronLiberarPagos
 * @author Equipo Servitech
 */

const cron = require("node-cron");
const Asesoria = require("../models/asesoria.model");
const Pago = require("../models/pago.model");
const generarLogs = require("./generarLogs");

// Programa la tarea cada hora para revisar asesorías pendientes de liberar
cron.schedule("0 * * * *", async () => {
  try {
    const ahora = new Date();
    // Buscar asesorías confirmadas y pasadas más de 1h de su hora de inicio
    const asesorias = await Asesoria.find({
      estado: "confirmada",
      fechaHoraInicio: { $lte: new Date(ahora.getTime() - 60 * 60 * 1000) }, // mínimo 1h pasada
    });

    for (const asesoria of asesorias) {
      // Calcula la hora de fin real
      const fin = new Date(
        asesoria.fechaHoraInicio.getTime() + asesoria.duracionMinutos * 60000
      );
      // Si han pasado más de 24h desde la hora de fin, se libera el pago
      if (ahora > new Date(fin.getTime() + 24 * 60 * 60000)) {
        asesoria.estado = "completada";
        asesoria.fechaFinalizacion = ahora;
        await asesoria.save();

        if (asesoria.pagoId) {
          await Pago.findByIdAndUpdate(asesoria.pagoId, {
            estado: "liberado",
            fechaLiberacion: ahora,
          });
        }

        // Registrar log de la acción automática
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
