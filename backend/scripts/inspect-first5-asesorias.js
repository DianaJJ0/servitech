// Muestra las primeras 5 asesorías para inspección
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
    const docs = await Asesoria.find().limit(5).lean();
    console.log("Primeras 5 asesorías:");
    docs.forEach((d, i) => {
      console.log("---", i + 1, "---");
      console.dir(d, { depth: 3, colors: true });
    });
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error("Error inspeccionando asesorías:", e);
    process.exit(1);
  }
})();
