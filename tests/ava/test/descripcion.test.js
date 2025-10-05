import test from "ava";
import {
  sanitizeDescription,
  validateDescription,
} from "./helpers/descripcionValidator.js";

test("descripcion: acepta texto válido y devuelve versión saneada", (t) => {
  const input =
    "Tengo 8 años de experiencia desarrollando APIs en Node.js y liderando equipos.";
  const r = validateDescription(input);
  t.true(r.valid);
  t.true(r.value.includes("experiencia"));
});

test("descripcion: rechaza vacío", (t) => {
  const r = validateDescription("");
  t.false(r.valid);
  t.is(r.error, "Descripción requerida.");
});

test("descripcion: rechaza texto demasiado corto", (t) => {
  const r = validateDescription("Desarrollador senior");
  t.false(r.valid);
  t.truthy(r.error);
});

test("descripcion: rechaza cuando contiene URL", (t) => {
  const r = validateDescription("Mira mi portafolio en https://mi-sitio.com");
  t.false(r.valid);
  t.is(r.error, "No incluyas enlaces o direcciones web en la descripción.");
});

test("descripcion: rechaza secuencias repetidas largas", (t) => {
  const r = validateDescription("aaaaaaabbbbbbbcccccccddddddeeeeeeeffffff");
  t.false(r.valid);
  t.is(r.error, "Evita secuencias repetidas de caracteres.");
});
