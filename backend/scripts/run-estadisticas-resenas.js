// Ejecuta la agregación de reseñas y muestra total + agrupado por experto
const mongoose = require("mongoose");
const Asesoria = require("../models/asesoria.model");
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

    const pipeline = [
      { $match: { "reseña.calificacion": { $gte: 1 } } },
      {
        $group: {
          _id: "$experto.email",
          count: { $sum: 1 },
          avg: { $avg: "$reseña.calificacion" },
        },
      },
      { $sort: { count: -1 } },
    ];

    const porExperto = await Asesoria.aggregate(pipeline);
    const total = porExperto.reduce((acc, p) => acc + p.count, 0);

    console.log("Total reseñas encontradas:", total);
    if (porExperto.length === 0) {
      console.log("No se encontraron reseñas con calificacion >= 1.");
    } else {
      console.log("Por experto:");
      porExperto.forEach((p) => {
        console.log(
          `- ${p._id}: count=${p.count}, avg=${Math.round(p.avg * 10) / 10}`
        );
      });
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error("Error ejecutando agregación:", e);
    process.exit(1);
  }
})();
