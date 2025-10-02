import test from "ava";
import validators from "../../../backend/validators/expertValidators.js";
const { validateNumeroCuentaByBank, validateTitularName } = validators;

test("cuenta nacional válida (dígitos 6)", (t) => {
  const r = validateNumeroCuentaByBank("Bancolombia", "123456");
  t.true(r.valid);
});

test("cuenta nacional muy corta (2 dígitos) inválida", (t) => {
  const r = validateNumeroCuentaByBank("Banco X", "12");
  t.false(r.valid);
});

test("cuenta internacional IBAN válida ejemplo", (t) => {
  // ejemplo IBAN Netherlands (NL91ABNA0417164300)
  const r = validateNumeroCuentaByBank("Some Bank", "NL91ABNA0417164300");
  t.true(r.valid);
});

test("IBAN inválido detectado", (t) => {
  const r = validateNumeroCuentaByBank("Some Bank", "NL00INVALID00000000");
  t.false(r.valid);
});

test("titular válido", (t) => {
  const r = validateTitularName("Juan Pérez");
  t.true(r.valid);
});

test("titular con punto inválido", (t) => {
  const r = validateTitularName("J. Perez");
  t.false(r.valid);
});
