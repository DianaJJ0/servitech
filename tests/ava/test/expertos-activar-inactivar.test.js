import test from "ava";
import fetchCookie from "fetch-cookie";
import fetch from "node-fetch";
import * as tough from "tough-cookie";

const BASE_URL = "http://localhost:5020";
const TEST_EMAIL = "1@gmail.com"; // Email real de Camilo Jimenez
const TEST_ID = "586d2b"; // ID real de Camilo Jimenez

const ADMIN_EMAIL = "servitech.app.correo@gmail.com";
const ADMIN_PASSWORD = "Admin2312";

const cookieJar = new tough.CookieJar();
const fetchWithCookies = fetchCookie(fetch, cookieJar);

async function loginAsAdmin() {
  const res = await fetchWithCookies(`${BASE_URL}/api/usuarios/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Login admin fallido: ${res.status} ${data.mensaje || data.error || ""}`
    );
  }
  return data;
}

// Utilidad para activar/inactivar
async function toggleExpert(emailOrId, activo, byId = false) {
  const url = byId
    ? `${BASE_URL}/api/expertos/id/${encodeURIComponent(emailOrId)}/activo`
    : `${BASE_URL}/api/expertos/${encodeURIComponent(emailOrId)}/activo`;
  const res = await fetchWithCookies(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activo }),
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

test.serial(
  "Iniciar sesión admin y luego inactivar y reactivar experto por email",
  async (t) => {
    await loginAsAdmin();
    // Inactivar
    let res = await toggleExpert(TEST_EMAIL, false);
    if (!res.ok) {
      console.error(
        "[EMAIL] Status:",
        res.status,
        "Mensaje:",
        res.data.mensaje || res.data.error,
        res.data
      );
    }
    t.true(res.ok, "Debe inactivar el experto por email");
    t.truthy(res.data.experto);
    t.is(res.data.experto.estado, "inactivo");

    // Reactivar
    res = await toggleExpert(TEST_EMAIL, true);
    if (!res.ok) {
      console.error(
        "[EMAIL] Status:",
        res.status,
        "Mensaje:",
        res.data.mensaje || res.data.error,
        res.data
      );
    }
    t.true(res.ok, "Debe activar el experto por email");
    t.truthy(res.data.experto);
    t.is(res.data.experto.estado, "activo");
  }
);

test.serial(
  "Iniciar sesión admin y luego inactivar y reactivar experto por ID si falla por email",
  async (t) => {
    await loginAsAdmin();
    // Forzar error con email incorrecto
    let res = await toggleExpert("noexiste@correo.com", false);
    if (res.ok) {
      console.warn("[ID] El correo falso fue aceptado, esto no debería pasar");
    }
    t.false(res.ok, "No debe encontrar el correo");
    // Ahora por ID
    res = await toggleExpert(TEST_ID, false, true);
    if (!res.ok) {
      console.error(
        "[ID] Status:",
        res.status,
        "Mensaje:",
        res.data.mensaje || res.data.error,
        res.data
      );
    }
    t.true(res.ok, "Debe inactivar el experto por ID");
    t.truthy(res.data.experto);
    t.is(res.data.experto.estado, "inactivo");

    // Reactivar por ID
    res = await toggleExpert(TEST_ID, true, true);
    if (!res.ok) {
      console.error(
        "[ID] Status:",
        res.status,
        "Mensaje:",
        res.data.mensaje || res.data.error,
        res.data
      );
    }
    t.true(res.ok, "Debe activar el experto por ID");
    t.truthy(res.data.experto);
    t.is(res.data.experto.estado, "activo");
  }
);
