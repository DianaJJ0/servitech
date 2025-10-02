import test from "ava";
import { createRequire } from "module";
import { MongoMemoryServer } from "mongodb-memory-server";
// Ensure JWT_SECRET is present for token generation in controllers during tests
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key";
const require = createRequire(import.meta.url);
// Use backend's mongoose installation to share models
const mongoose = require("../../../backend/node_modules/mongoose");
const bcrypt = require("bcryptjs");

let mongoServer;
let Usuario;
let Categoria;
let usuarioController;

function mockRes() {
  const res = {};
  res.status = function (code) {
    res._status = code;
    return res;
  };
  res.json = function (payload) {
    try {
      res._json = JSON.parse(JSON.stringify(payload));
    } catch (e) {
      res._json = payload;
    }
    return res;
  };
  return res;
}

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  const waitForConnected = async (timeout = 5000) => {
    const start = Date.now();
    while (mongoose.connection.readyState !== 1) {
      if (Date.now() - start > timeout)
        throw new Error("mongoose did not connect in time");
      await new Promise((r) => setTimeout(r, 50));
    }
  };
  await waitForConnected(5000);

  Usuario = require("../../../backend/models/usuario.model.js");
  Categoria = require("../../../backend/models/categoria.model.js");
  usuarioController = require("../../../backend/controllers/usuario.controller.js");
});

test.after.always(async () => {
  try {
    await mongoose.disconnect();
  } catch (e) {}
  if (mongoServer) await mongoServer.stop();
});

test.serial(
  "registrarUsuario crea usuario simple y devuelve token",
  async (t) => {
    const req = {
      body: {
        nombre: "Test",
        apellido: "User",
        email: "testuser1@example.com",
        password: "Password123",
      },
    };
    const res = mockRes();

    await usuarioController.registrarUsuario(req, res);

    t.is(res._status, 201);
    t.truthy(res._json && res._json.token);
    // Usuario en DB
    const u = await Usuario.findOne({ email: "testuser1@example.com" }).lean();
    t.truthy(u);
    t.true(Array.isArray(u.roles) && u.roles.includes("cliente"));
  }
);

test.serial(
  "registrarUsuario con infoExperto devuelve 201 y estado pendiente",
  async (t) => {
    // Crear categoria
    const cat = new Categoria({
      nombre: "Prueba",
      nombreNormalized: "prueba",
      slug: "prueba",
      slugNormalized: "prueba",
    });
    await cat.save();

    const req = {
      body: {
        nombre: "Exp",
        apellido: "Tester",
        email: "expert1@example.com",
        password: "ComplexPwd1",
        infoExperto: {
          descripcion: "Soy experto",
          precioPorHora: 100,
          categorias: [String(cat._id)],
          banco: "Banco",
          tipoCuenta: "Ahorros",
          numeroCuenta: "123",
          titular: "Titular",
          tipoDocumento: "CC",
          numeroDocumento: "999",
          telefonoContacto: "300",
          diasDisponibles: ["Lunes"],
        },
      },
    };
    const res = mockRes();

    await usuarioController.registrarUsuario(req, res);

    t.is(res._status, 201);
    t.truthy(res._json && res._json.token);
    // El backend ahora marca a los expertos como 'pendiente-verificacion'
    t.is(res._json.estado, "pendiente-verificacion");

    const u = await Usuario.findOne({ email: "expert1@example.com" }).lean();
    t.truthy(u);
    t.truthy(u.infoExperto);
  }
);

test.serial(
  "registrarUsuario retorna 400 cuando faltan campos de experto",
  async (t) => {
    const req = {
      body: {
        nombre: "Exp2",
        apellido: "Tester",
        email: "expert2@example.com",
        password: "Pwd1",
        infoExperto: {
          descripcion: "x",
          // faltan muchos campos
        },
      },
    };
    const res = mockRes();

    await usuarioController.registrarUsuario(req, res);

    t.is(res._status, 400);
    t.truthy(res._json && Array.isArray(res._json.camposFaltantes));
  }
);

test.serial(
  "iniciarSesion devuelve 200 con token y usuario al usar credenciales válidas",
  async (t) => {
    // crear usuario manualmente
    const u = new Usuario({
      nombre: "Login",
      apellido: "User",
      email: "login1@example.com",
      passwordHash: bcrypt.hashSync("mysecret", 8),
    });
    await u.save();

    const req = {
      body: { email: "login1@example.com", password: "mysecret" },
      session: {},
    };
    const res = mockRes();

    await usuarioController.iniciarSesion(req, res);

    t.is(res._status, 200);
    t.truthy(res._json && res._json.token);
    t.truthy(req.session && req.session.user && req.session.user.token);
  }
);

test.serial(
  "obtenerPerfilUsuario devuelve usuario con categorias mapeadas cuando tiene infoExperto",
  async (t) => {
    const cat = new Categoria({
      nombre: "CatMap",
      nombreNormalized: "catmap",
      slug: "catmap",
      slugNormalized: "catmap",
    });
    await cat.save();

    const u = new Usuario({
      nombre: "Perfil",
      apellido: "Test",
      email: "perfil1@example.com",
      passwordHash: bcrypt.hashSync("pw", 8),
      roles: ["experto"],
      infoExperto: {
        descripcion: "desc",
        categorias: [cat._id],
        precioPorHora: 50,
        banco: "B",
        tipoCuenta: "Ahorros",
        numeroCuenta: "1",
        titular: "T",
        tipoDocumento: "CC",
        numeroDocumento: "1",
        telefonoContacto: "300",
      },
    });
    await u.save();

    const req = { usuario: { _id: u._id } };
    const res = mockRes();

    await usuarioController.obtenerPerfilUsuario(req, res);

    t.is(res._status, undefined); // controller uses res.json so status is default 200
    t.truthy(res._json && res._json.infoExperto);
    t.true(Array.isArray(res._json.infoExperto.categorias));
    t.is(res._json.infoExperto.categorias[0], "CatMap");
  }
);
