import test from "ava";
import { normalizeCategory } from "../../../backend/controllers/categoria.controller.js";

// Caso: objeto legacy con campos en español
test("normalizeCategory - legacy spanish fields", (t) => {
  const input = {
    _id: "abc123",
    nombre: "Hardware",
    descripcion: "desc",
    publicacionesCount: 5,
    expertosCount: 2,
  };
  const out = normalizeCategory(input);
  t.is(out.id, "abc123");
  t.is(out.name, "Hardware");
  t.is(out.descripcion, "desc");
  t.is(out.publicacionesCount, 5);
  t.is(out.expertosCount, 2);
});

// Caso: objeto ya normalizado
test("normalizeCategory - already normalized", (t) => {
  const input = {
    id: "x1",
    name: "Software",
    icon: "fa-code",
    slug: "software",
    parent: "IT",
    estado: "active",
    publicacionesCount: 0,
    expertosCount: 1,
    descripcion: "soft",
  };
  const out = normalizeCategory(input);
  t.is(out.id, "x1");
  t.is(out.name, "Software");
  t.is(out.icon, "fa-code");
  t.is(out.slug, "software");
  t.is(out.parent, "IT");
  t.is(out.estado, "active");
  t.is(out.publicacionesCount, 0);
  t.is(out.expertosCount, 1);
});

// Caso: objeto con parent como objeto
test("normalizeCategory - parent object", (t) => {
  const input = { _id: "p1", nombre: "Redes", parent: { nombre: "IT" } };
  const out = normalizeCategory(input);
  t.is(out.parent, "IT");
});

// Caso: entradas nulas o indefinidas
test("normalizeCategory - null or empty", (t) => {
  const out = normalizeCategory(null);
  t.falsy(out);
});
