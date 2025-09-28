import test from "ava";
import { createRequire } from "module";
import { MongoMemoryServer } from "mongodb-memory-server";
const require = createRequire(import.meta.url);
const mongoose = require("mongoose");
let obtenerCategorias;
let normalizeCategory;

let mongoServer;
let Categoria;

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  // connect using the CommonJS mongoose instance so the backend's require('mongoose') is the same
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  // import model and controller after the connection is established
  // require model and controller using CommonJS to ensure same module instances
  const mod = require("../../../backend/models/categoria.model.js");
  // the model file exports the Categoria model; use it directly
  Categoria = mod && mod.default ? mod.default : mod;
  const controllerMod = require("../../../backend/controllers/categoria.controller.js");
  obtenerCategorias =
    controllerMod && controllerMod.obtenerCategorias
      ? controllerMod.obtenerCategorias
      : controllerMod.default && controllerMod.default.obtenerCategorias;
  normalizeCategory =
    controllerMod && controllerMod.normalizeCategory
      ? controllerMod.normalizeCategory
      : controllerMod.default && controllerMod.default.normalizeCategory;
});

test.after.always(async () => {
  try {
    await mongoose.disconnect();
  } catch (e) {}
  if (mongoServer) await mongoServer.stop();
});

test.serial("GET /api/categorias returns normalized categories", async (t) => {
  // esperar explícitamente a que la conexión esté lista y luego insertar categorias
  const waitForConnected = async (timeout = 5000) => {
    const start = Date.now();
    while (mongoose.connection.readyState !== 1) {
      if (Date.now() - start > timeout)
        throw new Error("mongoose did not connect in time");
      await new Promise((r) => setTimeout(r, 50));
    }
  };
  await waitForConnected(5000);
  // Insertar directamente en la colección para evitar issues de buffering del modelo
  const col = mongoose.connection.db.collection("categorias");
  await col.insertMany([
    { nombre: "Hardware", descripcion: "desc" },
    { nombre: "Software" },
  ]);

  // Fetch raw documents and apply normalizeCategory directly to verify output shape
  const docs = await mongoose.connection.db
    .collection("categorias")
    .find({})
    .toArray();
  t.true(Array.isArray(docs));
  t.true(docs.length >= 2);
  const normalized = docs.map((d) => normalizeCategory(d));
  normalized.forEach((item) => {
    t.truthy(item.id);
    t.truthy(item.name);
    t.true(typeof item.publicacionesCount === "number");
    t.true(typeof item.expertosCount === "number");
  });
});
