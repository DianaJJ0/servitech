/**
 * SERVITECH SERVER.JS - versión optimizada y didáctica
 * Solo renderiza vistas, gestiona sesión y consulta datos al backend.
 * Mantiene proxy manual /api con CSRF y casos especiales.
 */

// Cargar variables de entorno desde .env (en desarrollo). En producción se usarán las vars del entorno (Render).
// Requiere instalar dotenv en el entorno de desarrollo: npm install dotenv --save-dev
require("dotenv").config();

const express = require("express");
const session = require("express-session");

// --- Configuración inicial ---
const path = require("path");
const crypto = require("crypto");

// Convertir de app a router para que pueda ser importado por el backend
const router = express.Router();
const PORT = parseInt(process.env.PORT, 10) || 5021;
const FRONTEND_URL = process.env.FRONTEND_URL || `http://localhost:${PORT}`;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5020";
// Nueva bandera explícita para modo proxy (frontend reenvía /api al backend)
// PROXY_MODE solo se activa si process.env.PROXY_MODE === "true"
const PROXY_MODE =
  String(process.env.PROXY_MODE || "false").toLowerCase() === "true";

// Usar fetch nativo (Node >=18). Si no existe, avisar para actualizar o instalar polyfill.
const fetch = typeof globalThis.fetch === "function" ? globalThis.fetch : null;
if (!fetch) {
  console.warn(
    "Aviso: global fetch no disponible. Actualiza Node a v18+ o instala un polyfill (p. ej. node-fetch) si necesitas compatibilidad."
  );
}

// Helper: comprobar conectividad con backend al arrancar (diagnóstico)
async function checkBackendConnectivity() {
  try {
    const url = `${BACKEND_URL.replace(/\/$/, "")}/health`; // intentar endpoint health si existe
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2500);
    let res;
    try {
      res = await fetch(url, { method: "GET", signal: controller.signal });
    } finally {
      clearTimeout(id);
    }
    if (!res || !res.ok) {
      console.warn(
        `Backend reachable pero respuesta no-OK desde ${url} (status=${
          res && res.status
        })`
      );
    } else {
      console.log(`Backend reachable en ${BACKEND_URL} (health OK)`);
    }
  } catch (err) {
    console.warn(
      `Advertencia: no se pudo conectar al BACKEND (${BACKEND_URL}):`,
      err && err.message ? err.message : err
    );
    // no lanzar, es solo diagnóstico
  }
}

// Ejecutar check en arranque (no bloqueante)
setImmediate(() => checkBackendConnectivity());

// Ruta de diagnóstico para comprobar backend desde el navegador
router.get("/backend-check", async (req, res) => {
  try {
    const target = `${BACKEND_URL.replace(/\/$/, "")}/api`; // endpoint base
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000);
    let r;
    try {
      r = await fetch(target, { method: "GET", signal: controller.signal });
    } finally {
      clearTimeout(id);
    }
    return res.status(200).json({ ok: true, backendStatus: r.status });
  } catch (err) {
    return res.status(502).json({
      ok: false,
      mensaje: "No se pudo contactar el backend",
      detalle: err && err.message ? err.message : String(err),
    });
  }
});

// Opcional Redis (si está configurado)
let RedisStore = null;
let redisClient = null;
if (process.env.USE_REDIS === "true" || process.env.REDIS_URL) {
  try {
    const redis = require("redis");
    const connectRedis = require("connect-redis");
    redisClient = redis.createClient({ url: process.env.REDIS_URL });
    redisClient.connect().catch((err) => {
      console.warn("Redis client connect error:", err && err.message);
    });
    RedisStore = connectRedis(session);
    console.log(
      "Redis packages cargados: Redis Store disponible para sesiones"
    );
  } catch (e) {
    console.warn(
      "Redis no disponible (falta instalar 'redis' y 'connect-redis' o hay error): usando memoria para sesiones.\n" +
        "Para habilitar Redis en producción: provisiona un Redis y exporta REDIS_URL, y añade USE_REDIS=true.\n" +
        "Instala dependencias en el frontend: npm i redis connect-redis"
    );
  }
}

// Registro SSE para notificaciones ligeras (dev)
const _sseClients = new Set();
function broadcastSseEvent(eventName, data) {
  const payload = typeof data === "string" ? data : JSON.stringify(data || {});
  for (const res of Array.from(_sseClients)) {
    try {
      res.write(`event: ${eventName}\n`);
      res.write(`data: ${payload}\n\n`);
    } catch (e) {
      try {
        _sseClients.delete(res);
      } catch (er) {}
    }
  }
}

// --- Middlewares globales ---
// Estos middlewares ya se aplican en el app.js principal del backend,
// por lo que podemos comentarlos o eliminarlos si causan duplicación.
// Por ahora los dejamos, pero ten en cuenta que `express.json()` y `express.urlencoded()`
// ya están en el backend.
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

if (PROXY_MODE) {
  console.log(
    "PROXY_MODE=true — proxy activado. No se habilita CORS global. /api será proxied al BACKEND_URL."
  );
  router.use((req, res, next) => {
    try {
      const origin = req.headers.origin;
      if (!origin || origin === FRONTEND_URL) return next();
      console.warn(`Request origin rechazado por proxy-mode policy: ${origin}`);
      return res
        .status(403)
        .json({ mensaje: "Origin not allowed (proxy mode)" });
    } catch (e) {
      return next(e);
    }
  });
} else {
  console.log(
    "PROXY_MODE=false — no se añade CORS global. Usar proxy o habilitar CORS en desarrollo si es necesario."
  );
  router.use((req, res, next) => next());
}

// Manejo amable de JSON inválido
router.use((err, req, res, next) => {
  if (err && err.status === 400 && /JSON/.test(err.message)) {
    console.warn("Invalid JSON received:", err && err.message);
    return res
      .status(400)
      .json({ mensaje: "JSON inválido en el cuerpo de la petición" });
  }
  next(err);
});

// La gestión de sesión se hará en el app.js principal del backend.
// Si se deja aquí, podría crear conflictos. Es mejor centralizarla.
/*
router.use(
  session({
    secret: process.env.SESSION_SECRET || "servitech-secret",
    resave: false,
    saveUninitialized: false,
    store: (function () {
      try {
        if (RedisStore && redisClient && redisClient.isOpen) {
          console.log("Using Redis session store");
          return new RedisStore({ client: redisClient, ttl: 60 * 60 * 24 });
        }
      } catch (e) {}
      console.log("Not using Redis session store; using default memory store");
      return undefined;
    })(),
    cookie: Object.assign(
      {
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
      process.env.SESSION_COOKIE_DOMAIN
        ? { domain: process.env.SESSION_COOKIE_DOMAIN }
        : {}
    ),
  })
);
*/

// CSRF por sesión
router.use((req, res, next) => {
  try {
    if (req.session) {
      if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(24).toString("hex");
      }
      res.locals.csrfToken = req.session.csrfToken;
    }
  } catch (e) {}
  next();
});

// Flag dev visible en vistas
router.use((req, res, next) => {
  try {
    const explicit = String(process.env.SHOW_DEV_ADMIN || "").toLowerCase();
    const isExplicitTrue = explicit === "true";
    const isExplicitFalse = explicit === "false";
    const isDevEnv =
      String(process.env.NODE_ENV || "").toLowerCase() === "development";
    res.locals.showDevAdmin = isExplicitTrue || (isDevEnv && !isExplicitFalse);
  } catch (e) {
    res.locals.showDevAdmin = false;
  }
  next();
});

// Endpoint simple para obtener CSRF
router.get("/csrf-token", (req, res) => {
  if (!req.session) return res.status(401).json({ mensaje: "No session" });
  const token = req.session.csrfToken
    ? String(req.session.csrfToken).trim()
    : "";
  return res.json({ csrfToken: token });
});

// --- Proxy manual para /api/* al backend ---
// Conserva tu lógica de CSRF y casos especiales.
router.use("/api", async (req, res) => {
  // ahora usamos directamente el fetch global declarado arriba

  try {
    // Cuando se ejecuta integrado, la API está en el mismo servidor, no necesitamos un URL completo.
    // Pero para mantener la flexibilidad, decidimos si usar el proxy externo o llamar internamente.
    // Para Render, el proxy a BACKEND_URL sigue siendo la mejor opción si se despliegan como servicios separados.
    // Si se despliegan juntos, BACKEND_URL apuntará a sí mismo.
    const targetUrl = `${BACKEND_URL}/api${req.url}`;
    console.log(`Proxy manual: ${req.method} ${req.url} -> ${targetUrl}`);

    // Enforce CSRF en métodos mutantes (salvo DISABLE_CSRF en dev)
    try {
      const mutating = ["POST", "PUT", "DELETE", "PATCH"].includes(req.method);
      const disableCSRF =
        process.env.DISABLE_CSRF === "true" &&
        process.env.NODE_ENV !== "production";
      if (mutating && !disableCSRF) {
        const sent = req.headers["x-csrf-token"] || req.headers["csrf-token"];
        const sess = req.session && req.session.csrfToken;
        if (!sess || !sent || String(sent) !== String(sess)) {
          console.warn(
            `CSRF token missing or invalid for ${req.method} ${req.originalUrl}`
          );
          return res.status(403).json({ mensaje: "CSRF token inválido" });
        }
      }
    } catch (e) {}

    // Encabezados a reenviar
    const outboundHeaders = Object.assign({}, req.headers);
    try {
      // x-api-key solo si la sesión es admin y hay API_KEY
      if (
        req.session &&
        req.session.user &&
        Array.isArray(req.session.user.roles) &&
        req.session.user.roles.includes("admin") &&
        process.env.API_KEY
      ) {
        outboundHeaders["x-api-key"] = process.env.API_KEY;
      }
      // Reenviar Authorization si hay token en sesión
      if (req.session && req.session.user && req.session.user.token) {
        outboundHeaders["authorization"] = `Bearer ${req.session.user.token}`;
        try {
          const t = String(req.session.user.token || "");
          console.log(
            `Proxy: sesión con token detectado (len=${
              t.length
            }) prefix=${t.slice(0, 10)}`
          );
        } catch (e) {}
      }
    } catch (e) {}

    // Caso especial: admin registrando usuario y actualizando perfil experto (compat)
    if (
      req.method === "POST" &&
      req.url &&
      req.url.startsWith("/usuarios/registro") &&
      req.session &&
      req.session.user &&
      Array.isArray(req.session.user.roles) &&
      req.session.user.roles.includes("admin")
    ) {
      // 1) Registrar usuario (sin infoExperto)
      const regPayload = Object.assign({}, req.body);
      if (regPayload.infoExperto) delete regPayload.infoExperto;
      const regRes = await fetch(targetUrl, {
        method: "POST",
        headers: outboundHeaders,
        body: JSON.stringify(regPayload),
      });
      const regText = await regRes.text();
      let regData = null;
      try {
        regData = regText ? JSON.parse(regText) : null;
      } catch (e) {
        regData = regText || null;
      }
      if (!regRes.ok) {
        return res.status(regRes.status).json(regData || { error: regText });
      }

      // 2) Si vino infoExperto, hacer PUT admin con x-api-key
      const body = req.body || {};
      const info = body.infoExperto || null;
      const hasMinimalExpertFields =
        info &&
        ((Array.isArray(info.categorias) && info.categorias.length > 0) ||
          info.descripcion ||
          typeof info.precioPorHora !== "undefined");

      if (info && hasMinimalExpertFields) {
        const email = encodeURIComponent(
          body.email ||
            (regData && regData.usuario && regData.usuario.email) ||
            ""
        );
        if (!email) return res.status(regRes.status).json(regData);
        const putUrl = `${BACKEND_URL}/api/usuarios/${email}`;
        const putHeaders = Object.assign({}, outboundHeaders);

        const putRes = await fetch(putUrl, {
          method: "PUT",
          headers: putHeaders,
          body: JSON.stringify({
            roles: ["experto"],
            infoExperto: info,
            nombre: body.nombre,
            apellido: body.apellido,
            estado: body.estado || "activo",
          }),
        });
        const putText = await putRes.text();
        let putData = null;
        try {
          putData = putText ? JSON.parse(putText) : null;
        } catch (e) {
          putData = putText || null;
        }
        if (!putRes.ok) {
          return res.status(putRes.status).json({
            registro: regData,
            actualizarInfoExpertoError: putData || putText,
          });
        }
        return res.status(putRes.status).json(putData);
      }
      return res.status(regRes.status).json(regData);
    }

    // Reenvío general: manejar multipart y JSON
    const reqContentType = (req.headers["content-type"] || "").toLowerCase();
    let fetchBody;
    if (
      req.method !== "GET" &&
      reqContentType &&
      reqContentType.includes("multipart")
    ) {
      fetchBody = req;
      if (outboundHeaders["content-length"])
        delete outboundHeaders["content-length"];
    } else if (req.method !== "GET") {
      try {
        fetchBody =
          req.body && Object.keys(req.body).length
            ? JSON.stringify(req.body)
            : undefined;
        outboundHeaders["content-type"] = "application/json";
      } catch (e) {
        fetchBody = undefined;
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: outboundHeaders,
      body: fetchBody,
    });

    // --- Cambiado: registrar status y parte del body para depuración ---
    const respText = await response.text();
    console.log(
      `[proxy] upstream ${targetUrl} -> status=${response.status} len=${
        respText ? respText.length : 0
      }`
    );
    if (!response.ok) {
      // mostrar una porción del body cuando hay error para ayudar a debug
      const snippet =
        typeof respText === "string"
          ? respText.slice(0, 1000)
          : String(respText);
      console.warn(
        `[proxy] upstream ERROR ${response.status} ${targetUrl} snippet: ${snippet}`
      );
    }

    let respData = null;
    try {
      respData = respText ? JSON.parse(respText) : null;
    } catch (e) {
      respData = respText || null;
    }

    if (respData !== null) {
      try {
        if (
          req.url &&
          req.url.startsWith("/usuarios") &&
          ["POST", "PUT", "DELETE", "PATCH"].includes(req.method)
        ) {
          broadcastSseEvent("usuarios:update", {
            url: req.url,
            method: req.method,
          });
        }
      } catch (e) {}
      return res.status(response.status).json(respData);
    } else {
      return res
        .status(response.status)
        .json({ error: `Backend error: ${response.status}` });
    }
  } catch (error) {
    // Mejor manejo: detectar conexión rechazada / timeout y devolver 502 para el cliente
    console.error(
      "Error en proxy manual hacia",
      BACKEND_URL,
      ":",
      error && error.message ? error.message : error
    );
    const isConnRefused =
      error &&
      (error.code === "ECONNREFUSED" || /ECONNREFUSED/i.test(String(error)));
    const isAbort = error && error.name === "AbortError";
    const statusCode = isConnRefused || isAbort ? 502 : 500;
    const mensaje = isConnRefused
      ? "No se pudo conectar al backend (ECONNREFUSED)"
      : isAbort
      ? "Tiempo de espera al conectar al backend"
      : "Error en proxy";
    return res.status(statusCode).json({
      error: mensaje,
      detalle: error && error.message ? error.message : String(error),
      target: BACKEND_URL,
    });
  }
});

// Proxy estático a uploads del backend (modo dev)
router.use("/uploads", (req, res, next) => {
  try {
    console.log("[frontend] /uploads request ->", req.method, req.originalUrl);
  } catch (e) {}
  next();
});
const backendUploads = path.join(__dirname, "..", "backend", "uploads");
try {
  const fs = require("fs");
  if (!fs.existsSync(backendUploads))
    fs.mkdirSync(backendUploads, { recursive: true });
} catch (e) {}
router.use("/uploads", express.static(backendUploads));

// Ruta de prueba
router.get("/test-proxy", (req, res) => {
  res.json({ message: "Proxy test route working" });
});

// --- ENDPOINT DEV: crear sesión admin rápida (no prod)
router.post("/dev/create-admin-session", async (req, res) => {
  try {
    if (
      process.env.NODE_ENV === "production" ||
      process.env.ALLOW_DEV_ROUTES !== "true"
    ) {
      return res.status(403).json({ mensaje: "Ruta dev deshabilitada." });
    }
    const backendRes = await fetch(`${BACKEND_URL}/api/dev/create-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
    });
    const body = await backendRes.json().catch(() => null);
    if (!backendRes.ok) {
      return res
        .status(backendRes.status)
        .json(body || { mensaje: "Error creando admin" });
    }
    req.session.user = {
      _id: body.usuario && body.usuario._id,
      email: body.usuario && body.usuario.email,
      nombre: body.usuario && body.usuario.nombre,
      apellido: body.usuario && body.usuario.apellido,
      roles: (body.usuario && body.usuario.roles) || ["admin"],
      token: body.token,
    };
    return res.json({ ok: true, usuario: req.session.user });
  } catch (err) {
    console.error("Error en dev/create-admin-session:", err);
    res.status(500).json({ mensaje: "Error interno creating admin session" });
  }
});

// SSE para cambios ligeros
router.get("/sse/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders && res.flushHeaders();
  res.write("event: connected\n");
  res.write("data: {}\n\n");
  _sseClients.add(res);
  req.on("close", () => {
    try {
      _sseClients.delete(res);
    } catch (e) {}
  });
});

// Estáticos y vistas (ya configurado en backend/app.js)
/*
router.use("/assets", express.static(path.join(__dirname, "assets")));
router.set("view engine", "ejs");
router.set("views", path.join(__dirname, "views"));
*/

// Middleware de rutas admin protegidas
function requireAdmin(req, res, next) {
  if (
    !req.session.user ||
    !Array.isArray(req.session.user.roles) ||
    !req.session.user.roles.includes("admin")
  ) {
    return res.redirect("/login.html");
  }
  next();
}

// --- Gestión de sesión ---
router.post("/set-session", (req, res) => {
  (async () => {
    try {
      if (req.body && req.body.usuario) {
        const usuario = req.body.usuario;
        if (usuario.email && usuario.password) {
          try {
            // antes: const fetch = (...args) => import("node-fetch")...
            const loginRes = await fetch(`${BACKEND_URL}/api/usuarios/login`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: usuario.email,
                password: usuario.password,
              }),
            });
            const loginBody = await loginRes.json().catch(() => null);
            if (loginRes.ok && loginBody && loginBody.token) {
              req.session.user = Object.assign({}, usuario, {
                _id:
                  (loginBody.usuario && loginBody.usuario._id) ||
                  usuario._id ||
                  null,
                nombre:
                  (loginBody.usuario && loginBody.usuario.nombre) ||
                  usuario.nombre ||
                  null,
                apellido:
                  (loginBody.usuario && loginBody.usuario.apellido) ||
                  usuario.apellido ||
                  null,
                roles:
                  (loginBody.usuario && loginBody.usuario.roles) ||
                  usuario.roles ||
                  [],
                token: loginBody.token,
              });
              return res.json({ ok: true, token: loginBody.token });
            }
          } catch (e) {
            // continua al fallback
          }
        }

        // Dev helper: crear/asegurar admin sin password
        if (
          usuario.email &&
          !usuario.password &&
          process.env.NODE_ENV !== "production"
        ) {
          try {
            const devRes = await fetch(`${BACKEND_URL}/api/dev/create-admin`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: usuario.email }),
            });
            if (devRes.ok) {
              const devBody = await devRes.json().catch(() => null);
              if (
                devBody &&
                (devBody.token || (devBody.usuario && devBody.usuario.token))
              ) {
                const token =
                  devBody.token ||
                  (devBody.usuario && devBody.usuario.token) ||
                  null;
                req.session.user = Object.assign({}, usuario, {
                  roles: usuario.roles ||
                    (devBody.usuario && devBody.usuario.roles) || ["admin"],
                  token,
                });
                console.log(
                  "set-session: created/ensured dev admin and saved token for",
                  usuario.email
                );
                return res.json({ ok: true, token, user: req.session.user });
              }
            } else {
              console.warn("dev.create-admin failed", devRes.status);
            }
          } catch (e) {
            console.warn("Error calling dev.create-admin:", e && e.message);
          }
        }

        // Fallback controlado (solo si helpers dev activos)
        const allowDevSet =
          (res &&
            typeof res.locals !== "undefined" &&
            res.locals.showDevAdmin) ||
          String(process.env.ALLOW_DEV_SET_SESSION || "").toLowerCase() ===
            "true";
        if (!allowDevSet) {
          console.warn(
            "Blocked attempt to set raw session.usuario - dev helpers disabled"
          );
          return res
            .status(403)
            .json({ ok: false, mensaje: "Operación no permitida" });
        }
        req.session.user = req.body.usuario;
        try {
          console.log("set-session: session established (fallback)", {
            email: req.session.user && req.session.user.email,
            roles: req.session.user && req.session.user.roles,
          });
        } catch (e) {}
        return res.json({ ok: true, user: req.session.user });
      }
      res.status(400).json({ ok: false, mensaje: "Usuario no recibido" });
    } catch (err) {
      console.error("Error en set-session:", err);
      res
        .status(500)
        .json({ ok: false, mensaje: "Error al establecer sesión" });
    }
  })();
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Error al cerrar sesión" });
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// --- Rutas públicas ---
router.get("/", (req, res) => {
  res.render("index", { user: req.session.user || null });
});
router.get("/registro.html", (req, res) => {
  res.render("registro", { user: req.session.user || null });
});
router.get("/login.html", (req, res) => {
  res.render("login", { user: null });
});
router.get("/recuperarPassword.html", (req, res) => {
  res.render("recuperarPassword", { user: null });
});
router.get("/contacto.html", (req, res) => {
  res.render("contacto", { user: req.session.user || null });
});

// --- Perfil usuario: consulta backend si hay token ---
router.get("/perfil", async (req, res) => {
  if (req.session && req.session.user && req.session.user.token) {
    try {
      const perfilRes = await fetch(`${BACKEND_URL}/api/usuarios/perfil`, {
        headers: { Authorization: `Bearer ${req.session.user.token}` },
      });
      if (perfilRes.ok) {
        const user = await perfilRes.json();
        try {
          if (
            user &&
            user.avatarUrl &&
            typeof user.avatarUrl === "string" &&
            user.avatarUrl.indexOf(`${FRONTEND_URL}/uploads`) === 0
          ) {
            user.avatarUrl = user.avatarUrl.replace(FRONTEND_URL, BACKEND_URL);
          }
        } catch (e) {}
        try {
          const existingToken =
            req.session && req.session.user && req.session.user.token;
          if (existingToken && user && typeof user === "object") {
            user.token = existingToken;
          }
        } catch (e) {}
        req.session.user = user;
        return res.render("perfil", { user });
      } else {
        req.session.user = null;
        return res.render("perfil", { user: null });
      }
    } catch {
      req.session.user = null;
      return res.render("perfil", { user: null });
    }
  } else {
    return res.render("perfil", { user: null });
  }
});

// --- Exploración de expertos ---
router.get("/expertos.html", async (req, res) => {
  let categorias = [],
    expertos = [];
  let page = 1,
    limit = 6,
    total = 0,
    totalPages = 1,
    baseQuery = "";

  try {
    // 1) Obtener categorías
    const catRes = await fetch(`${BACKEND_URL}/api/categorias`);
    categorias = catRes.ok ? await catRes.json() : [];
    console.log(`[expertos.html] categorias obtenidas: ${categorias.length}`);

    // 2) Obtener expertos
    page = parseInt(req.query.page, 10) || 1;
    limit = 6;
    const apiUrl = `${BACKEND_URL}/api/expertos?page=${page}&limit=${limit}`;
    console.log(`[expertos.html] fetching expertos desde: ${apiUrl}`);

    const expRes = await fetch(apiUrl);
    console.log(`[expertos.html] expertos response status: ${expRes.status}`);

    if (expRes && expRes.ok) {
      const tmp = await expRes.json().catch(() => null);
      console.log(`[expertos.html] tmp structure:`, {
        isArray: Array.isArray(tmp),
        keys: tmp && typeof tmp === "object" ? Object.keys(tmp) : "not object",
        tmpLength: Array.isArray(tmp) ? tmp.length : "not array",
        hasExpertos:
          tmp && tmp.expertos ? tmp.expertos.length : "no expertos key",
        hasData: tmp && tmp.data ? tmp.data.length : "no data key",
        sample:
          tmp &&
          (Array.isArray(tmp)
            ? tmp[0]
            : (tmp.expertos && tmp.expertos[0]) || (tmp.data && tmp.data[0])),
      });

      // Lógica corregida: detectar si es array directo, tiene wrapper con 'data' o 'expertos'
      expertos = Array.isArray(tmp)
        ? tmp
        : tmp && tmp.data
        ? tmp.data
        : tmp && tmp.expertos
        ? tmp.expertos
        : [];

      total = tmp && tmp.total ? Number(tmp.total) : expertos.length;

      console.log(
        `[expertos.html] expertos finales: ${expertos.length}, total: ${total}`
      );

      if (Array.isArray(expertos) && typeof limit === "number") {
        expertos = expertos.slice(0, limit);
      }
    } else {
      console.warn(`[expertos.html] expertos request failed: ${expRes.status}`);
      expertos = [];
    }

    totalPages = Math.max(1, Math.ceil((total || 0) / limit));
    const qp = Object.keys(req.query || {})
      .filter((k) => k !== "page" && k !== "limit")
      .map(
        (k) => `${encodeURIComponent(k)}=${encodeURIComponent(req.query[k])}`
      )
      .join("&");
    baseQuery = qp;
  } catch (e) {
    console.error(`[expertos.html] error en fetch:`, e && e.message);
    categorias = [];
    expertos = [];
  }

  console.log(
    `[expertos.html] rendering con ${expertos.length} expertos, ${categorias.length} categorias`
  );

  res.render("expertos", {
    user: req.session.user || null,
    categorias,
    expertos,
    page: Number(page),
    limit: Number(limit),
    total: Number(total || 0),
    totalPages: Number(totalPages),
    baseQuery: baseQuery || "",
  });
});

// --- Registro experto (protegido) ---
router.get("/registroExperto", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login.html?next=/registroExperto");
  }
  let categorias = [];
  try {
    const catRes = await fetch(`${BACKEND_URL}/api/categorias`);
    categorias = catRes.ok ? await catRes.json() : [];
  } catch (e) {
    console.warn(
      "registroExperto: fallo al obtener categorias:",
      e && e.message
    );
  }
  res.render("registroExperto", {
    user: req.session.user,
    email: req.session.user.email,
    categorias,
    error: null,
  });
});

router.get("/registroExperto", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login.html?next=/registroExperto.html");
  }
  let categorias = [];
  try {
    const catRes = await fetch(`${BACKEND_URL}/api/categorias`);
    categorias = catRes.ok ? await catRes.json() : [];
  } catch (e) {
    console.warn(
      "registroExperto.html: fallo al obtener categorias:",
      e && e.message
    );
  }
  res.render("registroExperto", {
    user: req.session.user,
    email: req.session.user.email,
    categorias,
    error: null,
  });
});

// --- Edición perfil de experto (protegido) ---
router.get("/editarExperto", async (req, res) => {
  if (!req.session?.user?.email)
    return res.redirect("/login.html?next=/editarExperto");
  let experto = null,
    categorias = [];
  try {
    if (req.session.user && req.session.user.token) {
      const perfilRes = await fetch(`${BACKEND_URL}/api/usuarios/perfil`, {
        headers: { Authorization: `Bearer ${req.session.user.token}` },
      });
      if (perfilRes.ok) experto = await perfilRes.json();
    }
    const catRes = await fetch(`${BACKEND_URL}/api/categorias`);
    categorias = catRes.ok ? await catRes.json() : [];
  } catch (e) {
    console.warn("editarExperto GET: error fetching:", e && e.message);
  }
  res.render("editarExpertos", {
    experto,
    categorias,
    error: null,
    success: null,
  });
});

// Actualizar perfil experto (protegido)
router.post("/editarExperto", async (req, res) => {
  try {
    if (!req.session?.user?.token) {
      return res.status(401).render("editarExpertos", {
        experto: null,
        categorias: [],
        error: "No autenticado. Inicia sesión para editar tu perfil.",
        success: null,
      });
    }
    const response = await fetch(`${BACKEND_URL}/api/usuarios/perfil`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${req.session.user.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    const errorText = !(response && response.ok)
      ? await response.text().catch(() => null)
      : null;
    if (!response.ok) {
      console.warn(
        "editarExperto PUT upstream error:",
        response.status,
        errorText && errorText.slice(0, 200)
      );
      throw new Error(errorText || "Error al actualizar perfil");
    }

    const perfilActualizado = await response.json();
    const catRes = await fetch(`${BACKEND_URL}/api/categorias`);
    const categorias = catRes.ok ? await catRes.json() : [];
    res.render("editarExpertos", {
      experto: perfilActualizado,
      categorias,
      error: null,
      success: "Perfil actualizado correctamente.",
    });
  } catch (err) {
    res.status(500).render("editarExpertos", {
      experto: null,
      categorias: [],
      error: err.message || "Error al actualizar perfil.",
      success: null,
    });
  }
});

// --- Panel de administración (rutas protegidas) ---
router.get("/admin/adminCategorias", requireAdmin, (req, res) => {
  res.render("admin/adminCategorias", { user: req.session.user || {} });
});
router.get("/admin/adminNotificaciones", requireAdmin, (req, res) => {
  res.render("admin/adminNotificaciones", { user: req.session.user || {} });
});
router.get("/admin/adminLogs", requireAdmin, (req, res) => {
  res.render("admin/adminLogs", { user: req.session.user || {} });
});
router.get("/admin/adminUsuarios", requireAdmin, (req, res) => {
  res.render("admin/adminUsuarios", { user: req.session.user || {} });
});

// --- Arranque del servidor ---
// Ya no es necesario, el backend/app.js se encarga de arrancar el servidor.
/*
app.listen(PORT, () => {
  console.log(
    `Servidor Servitech escuchando en ${FRONTEND_URL} -> backend: ${BACKEND_URL}`
  );
});
*/

// Exportar el router para que el backend pueda usarlo
module.exports = router;
// Exportar el router para que el backend pueda usarlo
module.exports = router;
