import test from "ava";
import { createRequire } from "module";
import { MongoMemoryServer } from "mongodb-memory-server";
const require = createRequire(import.meta.url);
// Use the backend's mongoose installation so the models (which are required
// from the backend folder) and the test share the exact same mongoose
// instance. If we require the local tests' mongoose, the backend models
// may resolve to a different mongoose copy (backend/node_modules) and cause
// buffering / timeout errors when saving documents.
const mongoose = require("../../../backend/node_modules/mongoose");
const bcrypt = require("bcryptjs");

let mongoServer;
let expertoController;
let Usuario;
let Categoria;

function mockRes() {
  const res = {};
  res.status = function (code) {
    res._status = code;
    return res;
  };
  // Mimic Express's res.json which serializes objects. This ensures Mongoose
  // Documents become plain POJOs when tests inspect the payload.
  res.json = function (payload) {
    try {
      res._json = JSON.parse(JSON.stringify(payload));
    } catch (e) {
      // Fallback if something isn't serializable
      res._json = payload;
    }
    return res;
  };
  res.send = function (payload) {
    res._json = payload;
    return res;
  };
  return res;
}

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Esperar hasta que mongoose indique que está conectado
  const waitForConnected = async (timeout = 5000) => {
    const start = Date.now();
    while (mongoose.connection.readyState !== 1) {
      if (Date.now() - start > timeout) {
        throw new Error("mongoose did not connect in time");
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  };
  await waitForConnected(5000);

  // Require models and controller after mongoose.connect so they share the same mongoose instance
  Usuario = require("../../../backend/models/usuario.model.js");
  Categoria = require("../../../backend/models/categoria.model.js");
  expertoController = require("../../../backend/controllers/experto.controller.js");
});

test.after.always(async () => {
  try {
    await mongoose.disconnect();
  } catch (e) {}
  if (mongoServer) await mongoServer.stop();
});

test.serial(
  "actualizarPerfilExperto devuelve 401 si no está autenticado",
  async (t) => {
    const req = { body: {} };
    const res = mockRes();

    await expertoController.actualizarPerfilExperto(req, res);

    t.is(res._status, 401);
    t.truthy(res._json && (res._json.mensaje || res._json.error));
  }
);

test.serial(
  "actualizarPerfilExperto devuelve 400 cuando faltan campos",
  async (t) => {
    // Crear usuario mínimo
    const u = new Usuario({
      email: "u1@unit.co",
      nombre: "U",
      apellido: "One",
      passwordHash: bcrypt.hashSync("pw", 8),
    });
    await u.save();

    const req = { usuario: { _id: u._id }, body: {} };
    const res = mockRes();

    await expertoController.actualizarPerfilExperto(req, res);

    t.is(res._status, 400);
    t.truthy(Array.isArray(res._json.camposFaltantes));
    t.true(res._json.camposFaltantes.length > 0);
  }
);

test.serial(
  "actualizarPerfilExperto actualiza correctamente y marca como experto",
  async (t) => {
    const cat = new Categoria({
      nombre: "Hardware",
      nombreNormalized: "hardware",
      slug: "hardware",
      slugNormalized: "hardware",
    });
    await cat.save();

    const u = new Usuario({
      email: "u2@unit.co",
      nombre: "U2",
      apellido: "Two",
      passwordHash: bcrypt.hashSync("pw2", 8),
    });
    await u.save();

    const body = {
      descripcion: "Soy experto",
      precioPorHora: 50000,
      categorias: [String(cat._id)],
      banco: "BancoTest",
      tipoCuenta: "Ahorros",
      numeroCuenta: "1234567890",
      titular: "Titular Test",
      tipoDocumento: "CC",
      numeroDocumento: "987654321",
      telefonoContacto: "3001112222",
      diasDisponibles: ["Lunes"],
    };

    const req = { usuario: { _id: u._id }, body };
    const res = mockRes();

    await expertoController.actualizarPerfilExperto(req, res);
    if (res._status !== 200)
      console.error("DEBUG actualizarPerfilExperto:", res._status, res._json);
    t.is(res._status, 200);
    t.truthy(res._json && res._json.usuario);
    const updated = await Usuario.findById(u._id).lean();
    t.truthy(updated.infoExperto);
    t.is(updated.estado, "pendiente-verificacion");
    t.true(Array.isArray(updated.roles));
    t.true(updated.roles.includes("experto"));
  }
);

test.serial(
  "listarExpertos devuelve expertos con categorias pobladas como nombres",
  async (t) => {
    const cat = new Categoria({
      nombre: "Software",
      nombreNormalized: "software",
      slug: "software",
      slugNormalized: "software",
    });
    await cat.save();

    const u = new Usuario({
      email: "exp@list.co",
      nombre: "Exp",
      apellido: "List",
      passwordHash: bcrypt.hashSync("pw3", 8),
      infoExperto: {
        descripcion: "desc",
        categorias: [cat._id],
        precioPorHora: 100,
        banco: "B",
        tipoCuenta: "Ahorros",
        numeroCuenta: "1",
        titular: "T",
        tipoDocumento: "CC",
        numeroDocumento: "1",
        telefonoContacto: "300",
        diasDisponibles: ["Lunes"],
      },
    });
    // Ensure the user has the experto role so infoExperto is not cleared by pre-save
    u.roles = ["experto"];
    await u.save();

    const req = { query: {} };
    const res = mockRes();

    await expertoController.listarExpertos(req, res);
    if (res._status !== 200)
      console.error("DEBUG listarExpertos:", res._status, res._json);
    t.is(res._status, 200);
    t.truthy(res._json && Array.isArray(res._json.data));
    t.true(res._json.data.length >= 1);
    // Find the user we just created in the returned data (don't assume ordering)
    const found = res._json.data.find(
      (x) => String(x._id) === String(u._id) || x.email === u.email
    );
    t.truthy(found, "No se encontró el usuario creado en listarExpertos");
    t.truthy(found.infoExperto);
    t.true(Array.isArray(found.infoExperto.categorias));
    const firstCat = found.infoExperto.categorias[0];
    if (typeof firstCat === "string") {
      t.is(firstCat, "Software");
    } else {
      t.is(firstCat && firstCat.nombre, "Software");
    }
  }
);

test.serial(
  "obtenerPerfilExperto devuelve 200 y el usuario cuando está autenticado",
  async (t) => {
    const u = new Usuario({
      email: "exp2@perfil.co",
      nombre: "Perfil",
      apellido: "Test",
      passwordHash: bcrypt.hashSync("pw4", 8),
    });
    await u.save();

    const req = { usuario: { _id: u._id } };
    const res = mockRes();

    await expertoController.obtenerPerfilExperto(req, res);

    t.is(res._status, 200);
    t.truthy(res._json && res._json._id);
    t.is(String(res._json._id), String(u._id));
  }
);
