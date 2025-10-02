import test from "ava";
import { validatePrice } from "./helpers/priceValidator.js";

test("price: acepta valor válido dentro del rango y múltiplo 100", (t) => {
  const r = validatePrice("50000");
  t.true(r.valid);
  t.is(r.value, 50000);
});

test("price: rechaza vacío", (t) => {
  const r = validatePrice("");
  t.false(r.valid);
  t.is(r.error, "Precio requerido.");
});

test("price: rechaza menor al mínimo", (t) => {
  const r = validatePrice("9000");
  t.false(r.valid);
  t.is(r.error, "El mínimo es $10.000 COP.");
});

test("price: rechaza mayor al máximo", (t) => {
  const r = validatePrice("320000");
  t.false(r.valid);
  t.is(r.error, "El máximo es $100.000 COP.");
});

test("price: rechaza no múltiplo de 100", (t) => {
  const r = validatePrice("10050");
  t.false(r.valid);
  t.is(r.error, "Debe ser múltiplo de 100.");
});

// Pegado con caracteres (debe limpiar y validar)
test("price: limpia caracteres no numéricos al validar", (t) => {
  const r = validatePrice("50.000 COP");
  t.true(r.valid);
  t.is(r.value, 50000);
});

// Longitud excesiva
test("price: rechaza valores demasiado largos", (t) => {
  const r = validatePrice("1234567");
  t.false(r.valid);
  t.is(r.error, "Valor demasiado largo.");
});
