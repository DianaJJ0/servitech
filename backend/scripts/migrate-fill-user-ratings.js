// Script de migración: calcula promedio de reseñas por experto y actualiza usuarios
const mongoose = require("mongoose");
const Asesoria = require("../models/asesoria.model");
const Usuario = require("../models/usuario.model");
require("dotenv").config();

const MONGO =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/servitech";

(async () => {
  try {
    await mongoose.connect(MONGO, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Conectado a MongoDB", MONGO);

    // Agrupar asesorías por experto y calcular promedio
    const pipeline = [
      { $match: { "reseña.calificacion": { $gte: 1 } } },
      {
        $group: {
          _id: "$experto.email",
          avg: { $avg: "$reseña.calificacion" },
          count: { $sum: 1 },
        },
      },
    ];

    const results = await Asesoria.aggregate(pipeline);
    console.log("Resultados a procesar:", results.length);

    for (const r of results) {
      const promedio = Math.round(r.avg * 10) / 10;
      await Usuario.findOneAndUpdate(
        { email: r._id },
        { calificacion: promedio, calificacionesCount: r.count }
      );
      console.log(
        `Actualizado ${r._id}: promedio=${promedio}, count=${r.count}`
      );
    }

    // Usuarios sin reseñas -> poner 0
    await Usuario.updateMany(
      { calificacionesCount: { $exists: false } },
      { calificacion: 0, calificacionesCount: 0 }
    );
    console.log("Usuarios sin reseñas actualizados a 0");

    await mongoose.disconnect();
    console.log("Migración completada.");
    process.exit(0);
  } catch (e) {
    console.error("Error en migración:", e);
    process.exit(1);
  }
})();
