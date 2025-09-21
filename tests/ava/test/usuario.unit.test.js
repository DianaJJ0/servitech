// tests/ava/test/usuario.unit.test.js
// Prueba unitaria: matchPassword y virtual password del modelo Usuario

import test from "ava";
import bcrypt from "bcryptjs";

// Importamos el modelo desde el repo principal.
// Usamos import() dinámico para evitar problemas con ES Modules en AVA y CommonJS
// (backend/models/usuario.model.js es un ES Module, AVA corre en CommonJS)
const usuarioModule = await import("../../../backend/models/usuario.model.js");
const Usuario = usuarioModule.default || usuarioModule;

test("matchPassword: compara hash con contraseña en texto plano", async (t) => {
  const hashed = bcrypt.hashSync("secret123", 10);
  const u = new Usuario({
    email: "unit@gmail.com",
    nombre: "Unit",
    apellido: "Test",
    passwordHash: hashed,
  });

  const ok = await u.matchPassword("secret123");
  t.true(ok, "La contraseña debe coincidir con el hash");
});

test("virtual password setter crea passwordHash y matchPassword valida", async (t) => {
  const u = new Usuario({
    email: "unit2@gmail.com",
    nombre: "Unit2",
    apellido: "Test2",
  });

  // Setter virtual: asignar u.password genera u.passwordHash
  u.password = "miPass456";
  t.truthy(
    u.passwordHash,
    "passwordHash debe existir después de asignar password"
  );

  const ok = await u.matchPassword("miPass456");
  t.true(
    ok,
    "matchPassword debe validar la contraseña asignada por virtual setter"
  );
});

