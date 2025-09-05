// Smoke test: crea una asesoria con reseña, corre recalculo y verifica usuario
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
    console.log("Conectado a MongoDB");

    // Crear usuario experto de prueba
    const email = `test-expert-${Date.now()}@example.com`;
    const experto = new Usuario({
      email,
      nombre: "Test",
      apellido: "Expert",
      passwordHash: "hash",
      roles: ["experto"],
      infoExperto: {
        especialidad: "test",
        descripcion: "desc",
        categorias: [],
        precioPorHora: 0,
        banco: "b",
        tipoCuenta: "t",
        numeroCuenta: "n",
        titular: "t",
        tipoDocumento: "doc",
        numeroDocumento: "123",
      },
    });
    await experto.save();

    // Crear asesorías con reseñas
    const a1 = new Asesoria({
      titulo: "a1",
      cliente: { email: "c1@example.com", nombre: "C", apellido: "1" },
      experto: { email, nombre: "Test", apellido: "Expert" },
      categoria: "x",
      fechaHoraInicio: new Date(),
      duracionMinutos: 60,
      pago: {},
      reseña: { calificacion: 4, comentario: "ok", fecha: new Date() },
      estado: "completada",
    });
    const a2 = new Asesoria({
      titulo: "a2",
      cliente: { email: "c2@example.com", nombre: "C", apellido: "2" },
      experto: { email, nombre: "Test", apellido: "Expert" },
      categoria: "x",
      fechaHoraInicio: new Date(),
      duracionMinutos: 60,
      pago: {},
      reseña: { calificacion: 5, comentario: "great", fecha: new Date() },
      estado: "completada",
    });

    await a1.save();
    await a2.save();

    // Ejecutar migración local (misma lógica que el helper)
    const asesoriasConResena = await Asesoria.find({
      "experto.email": email,
      "reseña.calificacion": { $gte: 1 },
    }).select("reseña.calificacion");
    const suma = asesoriasConResena.reduce(
      (acc, a) => acc + (a.reseña?.calificacion || 0),
      0
    );
    const count = asesoriasConResena.length;
    const promedio = Math.round((suma / count) * 10) / 10;
    await Usuario.findOneAndUpdate(
      { email },
      { calificacion: promedio, calificacionesCount: count }
    );

    const updated = await Usuario.findOne({ email });
    console.log(
      "Usuario actualizado:",
      updated.email,
      updated.calificacion,
      updated.calificacionesCount
    );

    // Limpieza
    await Asesoria.deleteMany({ "experto.email": email });
    await Usuario.deleteOne({ email });

    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error("Error en smoke test:", e);
    process.exit(1);
  }
})();
