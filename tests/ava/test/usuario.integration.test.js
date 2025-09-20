// tests/ava/test/usuario.categoria.integration.test.js
// Prueba de integración: Categoria + Usuario con mongodb-memory-server

import test from "ava";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import bcrypt from "bcryptjs";

let mongoServer;

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

test.after.always(async () => {
  try {
    await mongoose.disconnect();
  } catch (e) {}
  if (mongoServer) await mongoServer.stop();
});

test("crear categoria y usuario con referencia a categoria (integracion)", async (t) => {
  const { Schema } = mongoose;

  // Esquema Categoria (mínimo)
  const categoriaSchema = new Schema(
    {
      nombre: { type: String, required: true, trim: true },
    },
    { collection: "categorias_test" }
  );

  // Esquema Usuario (mínimo, con infoExperto.categorias como array de ObjectId)
  const usuarioSchema = new Schema(
    {
      email: { type: String, required: true, lowercase: true, trim: true },
      nombre: { type: String, required: true },
      apellido: { type: String, required: true },
      passwordHash: { type: String },
      infoExperto: {
        descripcion: { type: String, default: null },
        categorias: [
          { type: mongoose.Schema.Types.ObjectId, ref: "CategoriaTest" },
        ],
      },
    },
    { collection: "usuarios_test" }
  );

  // Virtual para password
  usuarioSchema.virtual("password").set(function (password) {
    const salt = bcrypt.genSaltSync(10);
    this.passwordHash = bcrypt.hashSync(password, salt);
  });

  usuarioSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.passwordHash);
  };

  const Categoria =
    mongoose.models.CategoriaTest ||
    mongoose.model("CategoriaTest", categoriaSchema);
  const Usuario =
    mongoose.models.UsuarioTest || mongoose.model("UsuarioTest", usuarioSchema);

  // Crear y guardar categoría
  const categoria = new Categoria({ nombre: "Hardware" });
  await categoria.save();

  // Crear usuario experto que referencia la categoria
  const user = new Usuario({
    email: "experto@integ.test",
    nombre: "Experto",
    apellido: "Test",
    infoExperto: {
      descripcion: "Especialista en hardware",
      categorias: [categoria._id],
    },
  });
  user.password = "ExpertPass1";
  await user.save();

  // Recuperar y popular
  const found = await Usuario.findOne({ email: "experto@integ.test" })
    .populate("infoExperto.categorias")
    .lean();
  t.truthy(found, "Usuario creado y recuperado");
  t.truthy(found.infoExperto, "infoExperto debe existir");
  t.is(
    found.infoExperto.categorias[0].nombre,
    "Hardware",
    "La categoria poblada debe llamarse Hardware"
  );

  // Verificar matchPassword
  const inst = await Usuario.findOne({ email: "experto@integ.test" });
  t.true(
    await inst.matchPassword("ExpertPass1"),
    "matchPassword debe validar la contraseña correcta"
  );
});
