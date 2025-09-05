// Busca en las colecciones documentos que contengan campos con 'reseña' o 'calificacion'
const mongoose = require("mongoose");
const fs = require("fs");
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
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const results = [];

    for (const c of collections) {
      const name = c.name;
      const col = db.collection(name);
      // Buscar documentos que tengan campos reseña o calificacion a cualquier nivel
      const docs = await col
        .find({
          $or: [
            { reseña: { $exists: true } },
            { "reseña.calificacion": { $exists: true } },
            { calificacion: { $exists: true } },
          ],
        })
        .limit(5)
        .toArray();
      if (docs.length > 0) {
        results.push({ collection: name, count: docs.length, samples: docs });
      }
    }

    console.log("Resultados de búsqueda:");
    console.dir(results, { depth: 4 });
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error("Error buscando:", e);
    process.exit(1);
  }
})();
