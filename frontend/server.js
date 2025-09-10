/**
 * SERVITECH SERVER.JS - versión optimizada y didáctica
 * Solo renderiza vistas, gestiona sesión y consulta datos al backend.
 * No incluye lógica de UI ni manipulación del DOM.
 */
require("dotenv").config();
const express = require("express");
const session = require("express-session");
let RedisStore = null;
let redisClient = null;
if (process.env.USE_REDIS === "true" || process.env.REDIS_URL) {
  try {
    const redis = require("redis");
    const connectRedis = require("connect-redis");
    redisClient = redis.createClient({ url: process.env.REDIS_URL });
    // Attempt to connect; we will check redisClient.isOpen before using store
    redisClient.connect().catch((err) => {
      console.warn("Redis client connect error:", err && err.message);
    });
    RedisStore = connectRedis(session);
  } catch (e) {
    console.warn("Redis packages not available, falling back to memory store");
  }
}
const path = require("path");
const crypto = require("crypto");
const { createProxyMiddleware } = require("http-proxy-middleware");
const app = express();
const PORT = process.env.PORT || 3001;

// Simple in-memory SSE client registry to notify browsers of changes (dev use)
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Graceful handler for invalid JSON body (body-parser SyntaxError)
app.use((err, req, res, next) => {
  if (err && err.status === 400 && /JSON/.test(err.message)) {
    console.warn("Invalid JSON received:", err && err.message);
    return res
      .status(400)
      .json({ mensaje: "JSON inválido en el cuerpo de la petición" });
  }
  next(err);
});
app.use(
  session({
    secret: process.env.SESSION_SECRET || "servitech-secret",
    resave: false,
    saveUninitialized: false,
    // Only attach Redis store if we have the package and the client is open.
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
      // allow optional cookie domain via env when needed
      process.env.SESSION_COOKIE_DOMAIN
        ? { domain: process.env.SESSION_COOKIE_DOMAIN }
        : {}
    ),
  })
);

// CSRF token: ensure each session has one and expose via endpoint
app.use((req, res, next) => {
  try {
    if (req.session) {
      if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(24).toString("hex");
      }
      // Make available to views if needed
      res.locals.csrfToken = req.session.csrfToken;
    }
  } catch (e) {
    // don't block on CSRF generation
  }
  next();
});

// Expose a flag to views that indicates whether to show dev-only admin helpers.
app.use((req, res, next) => {
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

// Simple endpoint to obtain CSRF token for fetch-based clients
app.get("/csrf-token", (req, res) => {
  if (!req.session) return res.status(401).json({ mensaje: "No session" });
  // Ensure token is a single-line string (trim whitespace/newlines) to
  // avoid tooling/shell extraction issues when clients/scripts read it.
  const token = req.session.csrfToken
    ? String(req.session.csrfToken).trim()
    : "";
  return res.json({ csrfToken: token });
});

// --- Proxy manual para /api/* al backend ---
app.use("/api", async (req, res) => {
  const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));

  try {
    const targetUrl = `http://localhost:3000/api${req.url}`;
    console.log(`Proxy manual: ${req.method} ${req.url} -> ${targetUrl}`);

    // Enforce CSRF for state-changing requests (POST/PUT/DELETE/PATCH)
    // Skip CSRF check if DISABLE_CSRF=true in development
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

    // Construir headers para la petición al backend.
    // Copiamos los encabezados recibidos. No forzamos content-type aquí porque
    // las peticiones multipart/form-data (uploads) necesitan conservar el
    // boundary que viene en el header original. Para solicitudes JSON se
    // serializa el body más abajo.
    const outboundHeaders = Object.assign({}, req.headers);
    try {
      if (
        req.session &&
        req.session.user &&
        Array.isArray(req.session.user.roles) &&
        req.session.user.roles.includes("admin") &&
        process.env.API_KEY
      ) {
        outboundHeaders["x-api-key"] = process.env.API_KEY;
      }

      // Si la sesión almacena un token JWT lo reenviamos en Authorization
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
    } catch (e) {
      // no debe bloquear la petición si algo falla al leer la sesión
    }

    // Special-case: admin creating a user via /api/usuarios/registro
    // If the session is admin we will perform the registration and, when
    // the payload includes a complete `infoExperto`, immediately call the
    // admin PUT endpoint to populate the expert profile using the server
    // side API key. This keeps the API key out of the browser.
    if (
      req.method === "POST" &&
      req.url &&
      req.url.startsWith("/usuarios/registro") &&
      req.session &&
      req.session.user &&
      Array.isArray(req.session.user.roles) &&
      req.session.user.roles.includes("admin")
    ) {
      // First: create the user (registration).
      // IMPORTANT: do not send infoExperto in the registration request because
      // the backend will validate a full expert profile during registration
      // and may reject partial data. Send a copy without infoExperto, then
      // perform the admin PUT below with the profile.
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

      // If registration failed, forward that error to the client
      if (!regRes.ok) {
        return res.status(regRes.status).json(regData || { error: regText });
      }

      // If the client included infoExperto in the request body, decide whether
      // to perform an admin PUT to populate the expert profile. Accept both
      // a full profile (with banking fields) and a minimal admin-provided
      // profile (especialidad, categorias, skills, descripcion). The backend
      // admin PUT handler supports partial merges, so performing the PUT with
      // partial data is safe and improves admin UX.
      const body = req.body || {};
      const info = body.infoExperto || null;
      const hasMinimalExpertFields =
        info &&
        (info.especialidad ||
          (Array.isArray(info.categorias) && info.categorias.length > 0) ||
          (Array.isArray(info.skills) && info.skills.length > 0) ||
          info.descripcion);

      const hasFullExpertFields =
        info &&
        info.descripcion &&
        info.precioPorHora &&
        info.especialidad &&
        info.categorias &&
        info.skills &&
        info.banco &&
        info.tipoCuenta &&
        info.numeroCuenta &&
        info.titular &&
        info.tipoDocumento &&
        info.numeroDocumento;

      if (info && (hasMinimalExpertFields || hasFullExpertFields)) {
        // Build PUT URL using the email used on registration
        const email = encodeURIComponent(
          body.email ||
            (regData && regData.usuario && regData.usuario.email) ||
            ""
        );
        if (!email) {
          // No email to target, return registration result
          return res.status(regRes.status).json(regData);
        }
        const putUrl = `http://localhost:3000/api/usuarios/${email}`;

        // Ensure outboundHeaders contains x-api-key (it should for admin sessions)
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

        // If PUT failed, return a combined response that includes both
        // registration success and the PUT error so the client can surface it.
        if (!putRes.ok) {
          return res.status(putRes.status).json({
            registro: regData,
            actualizarInfoExpertoError: putData || putText,
          });
        }

        // Success: return the PUT response to indicate final state
        return res.status(putRes.status).json(putData);
      }

      // No infoExperto provided — return registration response
      return res.status(regRes.status).json(regData);
    }

    // Default proxy behaviour for all other requests
    // Detectar si la petición es multipart (por ejemplo uploads desde el navegador)
    const reqContentType = (req.headers["content-type"] || "").toLowerCase();
    let fetchBody;
    if (
      req.method !== "GET" &&
      reqContentType &&
      reqContentType.includes("multipart")
    ) {
      // Forward the raw request stream so multer on the backend can parse it
      fetchBody = req;
      // Remove content-length if present because streaming may change it
      // (node-fetch can handle chunked bodies)
      if (outboundHeaders["content-length"])
        delete outboundHeaders["content-length"];
    } else if (req.method !== "GET") {
      // For JSON / urlencoded payloads, stringify the parsed body
      try {
        fetchBody =
          req.body && Object.keys(req.body).length
            ? JSON.stringify(req.body)
            : undefined;
        // Ensure correct content-type for JSON
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

    // Leer la respuesta del backend como texto e intentar parsear JSON.
    const respText = await response.text();
    let respData = null;
    try {
      respData = respText ? JSON.parse(respText) : null;
    } catch (e) {
      respData = respText || null;
    }

    // Reenviar exactamente lo que devolvió el backend, manteniendo el status.
    if (respData !== null) {
      // Notify SSE clients on user create/update/delete events proxied through frontend
      try {
        // detect simple user-related endpoints
        if (
          req.url &&
          req.url.startsWith("/usuarios") &&
          ["POST", "PUT", "DELETE", "PATCH"].includes(req.method)
        ) {
          // broadcast a generic 'usuarios:update' event with minimal info
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
    console.error("Error en proxy manual:", error);
    res.status(500).json({ error: "Error en proxy" });
  }
});

// Proxy para servir archivos de uploads desde el backend
// Esto permite que URLs como http://localhost:3001/uploads/... funcionen
// Debug logger for uploads requests (temporary)
app.use("/uploads", (req, res, next) => {
  try {
    console.log("[frontend] /uploads request ->", req.method, req.originalUrl);
  } catch (e) {}
  next();
});
// In development it's simpler and more reliable to serve the backend's
// uploads directory directly from the frontend server so URLs at
// http://localhost:3001/uploads/<file> work without depending on the
// proxy. This avoids subtle proxy/connectivity issues during local dev.
const backendUploads = path.join(__dirname, "..", "backend", "uploads");
try {
  const fs = require("fs");
  if (!fs.existsSync(backendUploads))
    fs.mkdirSync(backendUploads, { recursive: true });
} catch (e) {}
app.use("/uploads", express.static(backendUploads));

// Ruta de prueba para verificar que el proxy funcione
app.get("/test-proxy", (req, res) => {
  res.json({ message: "Proxy test route working" });
});

// --- ENDPOINT DEV: crear sesión admin rápida (solo entornos no productivos)
app.post("/dev/create-admin-session", async (req, res) => {
  try {
    if (
      process.env.NODE_ENV === "production" ||
      process.env.ALLOW_DEV_ROUTES !== "true"
    ) {
      return res.status(403).json({ mensaje: "Ruta dev deshabilitada." });
    }
    const fetch = (...args) =>
      import("node-fetch").then(({ default: fetch }) => fetch(...args));
    // Forward request body to backend dev route which creates admin and returns token
    const backendRes = await fetch(
      "http://localhost:3000/api/dev/create-admin",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body || {}),
      }
    );
    const body = await backendRes.json().catch(() => null);
    if (!backendRes.ok) {
      return res
        .status(backendRes.status)
        .json(body || { mensaje: "Error creando admin" });
    }
    // Store session.user with token so proxy will forward Authorization
    req.session.user = {
      _id: body.usuario && body.usuario._id,
      email: body.usuario && body.usuario.email,
      nombre: body.usuario && body.usuario.nombre,
      apellido: body.usuario && body.usuario.apellido,
      roles:
        body.usuario && body.usuario.roles ? body.usuario.roles : ["admin"],
      token: body.token,
    };
    return res.json({ ok: true, usuario: req.session.user });
  } catch (err) {
    console.error("Error en dev/create-admin-session:", err);
    res.status(500).json({ mensaje: "Error interno creating admin session" });
  }
});

// SSE stream endpoint for lightweight notifications (dev-friendly)
app.get("/sse/stream", (req, res) => {
  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders && res.flushHeaders();
  // send a ping
  res.write("event: connected\n");
  res.write("data: {}\n\n");
  _sseClients.add(res);
  // remove on close
  req.on("close", () => {
    try {
      _sseClients.delete(res);
    } catch (e) {}
  });
});

app.use("/assets", express.static(path.join(__dirname, "assets")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// --- Middleware de rutas protegidas (admin) ---
function requireAdmin(req, res, next) {
  // El usuario debe tener el array "roles" y debe incluir "admin"
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
app.post("/set-session", (req, res) => {
  (async () => {
    try {
      if (req.body && req.body.usuario) {
        // If the caller provided email+password, attempt backend login to
        // obtain a JWT and store it in session.user.token so the proxy can
        // forward Authorization on protected requests.
        const usuario = req.body.usuario;
        // Basic direct store if no credentials provided
        if (usuario.email && usuario.password) {
          const fetch = (...args) =>
            import("node-fetch").then(({ default: fetch }) => fetch(...args));
          try {
            const loginRes = await fetch(
              "http://localhost:3000/api/usuarios/login",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: usuario.email,
                  password: usuario.password,
                }),
              }
            );
            const loginBody = await loginRes.json().catch(() => null);
            if (loginRes.ok && loginBody && loginBody.token) {
              // Store minimal user info plus token
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
            // fallthrough to store raw usuario below
          }
        }

        // If we have an email but no password, and we're running in development,
        // try to create/ensure a dev admin via backend dev route and obtain a valid token.
        if (
          usuario.email &&
          !usuario.password &&
          process.env.NODE_ENV !== "production"
        ) {
          try {
            const fetch = (...args) =>
              import("node-fetch").then(({ default: fetch }) => fetch(...args));
            const devRes = await fetch(
              "http://localhost:3000/api/dev/create-admin",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: usuario.email }),
              }
            );
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

        // Fallback: store provided usuario object as-is (may include token)
        // ONLY allow storing a raw usuario object without credentials when
        // the server explicitly permits dev helpers (res.locals.showDevAdmin)
        // or when env ALLOW_DEV_SET_SESSION=true. Otherwise reject to avoid
        // allowing arbitrary session creation.
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
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Error al cerrar sesión" });
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// --- Rutas públicas ---
app.get("/", (req, res) => {
  res.render("index", { user: req.session.user || null });
});
app.get("/registro.html", (req, res) => {
  res.render("registro", { user: req.session.user || null });
});
app.get("/login.html", (req, res) => {
  res.render("login", { user: null });
});
app.get("/recuperarPassword.html", (req, res) => {
  res.render("recuperarPassword", { user: null });
});
app.get("/contacto.html", (req, res) => {
  res.render("contacto", { user: req.session.user || null });
});

// --- Perfil usuario: consulta backend si hay token ---
app.get("/perfil", async (req, res) => {
  if (req.session && req.session.user && req.session.user.token) {
    const fetch = (...args) =>
      import("node-fetch").then(({ default: fetch }) => fetch(...args));
    try {
      const perfilRes = await fetch(
        "http://localhost:3000/api/usuarios/perfil",
        {
          headers: { Authorization: `Bearer ${req.session.user.token}` },
        }
      );
      if (perfilRes.ok) {
        const user = await perfilRes.json();
        // Normalizar avatarUrl que pudiera apuntar al proxy (localhost:3001)
        try {
          if (
            user &&
            user.avatarUrl &&
            typeof user.avatarUrl === "string" &&
            user.avatarUrl.indexOf("http://localhost:3001/uploads") === 0
          ) {
            user.avatarUrl = user.avatarUrl.replace(
              "http://localhost:3001",
              "http://localhost:3000"
            );
          }
        } catch (e) {}
        // Preserve existing session token (if any) to avoid losing auth on page reloads
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
app.get("/expertos.html", async (req, res) => {
  const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
  let categorias = [],
    expertos = [];
  try {
    const catRes = await fetch("http://localhost:3000/api/categorias");
    categorias = catRes.ok ? await catRes.json() : [];
    // Pedimos la lista de expertos al endpoint correcto (/api/usuarios/expertos)
    // que devuelve { expertos: [...], total }.
    // Use the public experts endpoint (no auth required) so the public
    // page can render experts created by admins without needing a session.
    const expRes = await fetch("http://localhost:3000/api/expertos?limit=50");
    if (expRes && expRes.ok) {
      const tmp = await expRes.json().catch(() => null);
      expertos = Array.isArray(tmp)
        ? tmp
        : tmp && tmp.expertos
        ? tmp.expertos
        : [];
    } else {
      expertos = [];
    }
  } catch {
    categorias = [];
    expertos = [];
  }
  res.render("expertos", {
    user: req.session.user || null,
    categorias,
    expertos,
  });
});

// --- Registro experto (protegido) ---
app.get("/registroExperto", async (req, res) => {
  console.log("Sesión del usuario:", req.session.user);
  if (!req.session.user) {
    console.log("No hay sesión, redirigiendo a login");
    return res.redirect("/login.html?next=/registroExperto");
  }
  const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
  let categorias = [],
    especialidades = [],
    habilidades = [];
  try {
    const catRes = await fetch("http://localhost:3000/api/categorias");
    categorias = catRes.ok ? await catRes.json() : [];
    const espRes = await fetch("http://localhost:3000/api/especialidades");
    especialidades = espRes.ok ? await espRes.json() : [];
    const habRes = await fetch("http://localhost:3000/api/habilidades");
    habilidades = habRes.ok ? await habRes.json() : [];
  } catch {}
  res.render("registroExperto", {
    user: req.session.user,
    email: req.session.user.email,
    categorias,
    especialidades,
    habilidades,
    error: null,
  });
});

app.get("/registroExperto.html", async (req, res) => {
  console.log("Sesión del usuario (HTML):", req.session.user);
  if (!req.session.user) {
    console.log("No hay sesión, redirigiendo a login HTML");
    return res.redirect("/login.html?next=/registroExperto.html");
  }
  const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
  let categorias = [],
    especialidades = [],
    habilidades = [];
  try {
    const catRes = await fetch("http://localhost:3000/api/categorias");
    categorias = catRes.ok ? await catRes.json() : [];
    const espRes = await fetch("http://localhost:3000/api/especialidades");
    especialidades = espRes.ok ? await espRes.json() : [];
    const habRes = await fetch("http://localhost:3000/api/habilidades");
    habilidades = habRes.ok ? await habRes.json() : [];
  } catch {}
  res.render("registroExperto", {
    user: req.session.user,
    email: req.session.user.email,
    categorias,
    especialidades,
    habilidades,
    error: null,
  });
});

// --- Edición perfil de experto (protegido) ---
app.get("/editarExperto", async (req, res) => {
  if (!req.session?.user?.email)
    return res.redirect("/login.html?next=/editarExperto");
  const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
  let experto = null,
    categorias = [],
    especialidades = [],
    habilidades = [];
  try {
    if (req.session.user && req.session.user.token) {
      const perfilRes = await fetch(
        "http://localhost:3000/api/usuarios/perfil",
        {
          headers: { Authorization: `Bearer ${req.session.user.token}` },
        }
      );
      if (perfilRes.ok) experto = await perfilRes.json();
    }
    const catRes = await fetch("http://localhost:3000/api/categorias");
    categorias = catRes.ok ? await catRes.json() : [];
    const espRes = await fetch("http://localhost:3000/api/especialidades");
    especialidades = espRes.ok ? await espRes.json() : [];
    const habRes = await fetch("http://localhost:3000/api/habilidades");
    habilidades = habRes.ok ? await habRes.json() : [];
  } catch {}
  res.render("editarExpertos", {
    experto,
    categorias,
    especialidades,
    habilidades,
    error: null,
    success: null,
  });
});

// --- Actualizar perfil experto (protegido, POST) ---
app.post("/editarExperto", async (req, res) => {
  try {
    if (!req.session?.user?.token) {
      return res.status(401).render("editarExpertos", {
        experto: null,
        categorias: [],
        especialidades: [],
        habilidades: [],
        error: "No autenticado. Inicia sesión para editar tu perfil.",
        success: null,
      });
    }
    const fetch = (...args) =>
      import("node-fetch").then(({ default: fetch }) => fetch(...args));
    const response = await fetch("http://localhost:3000/api/usuarios/perfil", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${req.session.user.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Error al actualizar perfil");
    }
    const perfilActualizado = await response.json();
    // Obtener nuevas opciones
    const catRes = await fetch("http://localhost:3000/api/categorias");
    const categorias = catRes.ok ? await catRes.json() : [];
    const espRes = await fetch("http://localhost:3000/api/especialidades");
    const especialidades = espRes.ok ? await espRes.json() : [];
    const habRes = await fetch("http://localhost:3000/api/habilidades");
    const habilidades = habRes.ok ? await habRes.json() : [];
    res.render("editarExpertos", {
      experto: perfilActualizado,
      categorias,
      especialidades,
      habilidades,
      error: null,
      success: "Perfil actualizado correctamente.",
    });
  } catch (err) {
    res.status(500).render("editarExpertos", {
      experto: null,
      categorias: [],
      especialidades: [],
      habilidades: [],
      error: err.message || "Error al actualizar perfil.",
      success: null,
    });
  }
});

// --- Panel de administración (rutas protegidas, archivos reales) ---
// Atajos: permitir acceder a /admin o /admin/ redirigiendo a la vista principal
app.get(["/admin", "/admin/"], (req, res) => {
  return res.redirect("/admin/admin");
});

app.get("/admin/admin", requireAdmin, (req, res) => {
  res.render("admin/admin", { user: req.session.user || {} });
});
app.get("/admin/adminClientes", requireAdmin, (req, res) => {
  res.render("admin/adminClientes", { user: req.session.user || {} });
});
app.get("/admin/adminExpertos", requireAdmin, async (req, res) => {
  const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
  let habilidades = [];
  let initialExpertos = [];
  try {
    const habRes = await fetch("http://localhost:3000/api/habilidades");
    habilidades = habRes.ok ? await habRes.json() : [];
  } catch (e) {
    habilidades = [];
  }
  // Obtener categorías para filtros
  let categorias = [];
  try {
    const catRes = await fetch("http://localhost:3000/api/categorias");
    categorias = catRes.ok ? await catRes.json() : [];
  } catch (e) {
    habilidades = [];
  }
  // Intentar obtener listado inicial de expertos poblados (solo en entorno dev si está permitido)
  try {
    if (
      process.env.ALLOW_DEV_ROUTES &&
      process.env.ALLOW_DEV_ROUTES !== "false"
    ) {
      const devRes = await fetch(
        "http://localhost:3000/api/dev/expertos-populados?limit=50"
      );
      if (devRes && devRes.ok) {
        const devJson = await devRes.json();
        initialExpertos = Array.isArray(devJson.expertos)
          ? devJson.expertos
          : devJson.data || [];
      }
    }
  } catch (e) {
    initialExpertos = [];
  }
  // Dev fallback: si no pudimos obtener expertos desde el backend dev route,
  // ejecutar el script backend/scripts/list-expertos-populated.js como proceso
  // hijo para obtener los expertos. Esto evita problemas de buffering de
  // mongoose en el proceso del frontend y reutiliza la lógica ya probada.
  if (
    (!initialExpertos || initialExpertos.length === 0) &&
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_DEV_ROUTES &&
    process.env.ALLOW_DEV_ROUTES !== "false"
  ) {
    try {
      const { execFileSync } = require("child_process");
      const fs = require("fs");
      const scriptPath = require("path").join(
        __dirname,
        "../backend/scripts/list-expertos-populated.js"
      );
      // Prepara entorno para el script: asegurar que MONGO_URI esté presente
      const env = Object.assign({}, process.env);
      if (!env.MONGO_URI) {
        try {
          const envFile = require("path").join(__dirname, "../backend/.env");
          if (fs.existsSync(envFile)) {
            const envText = fs.readFileSync(envFile, "utf8");
            const m = envText
              .split(/\r?\n/)
              .find((l) => l && l.startsWith("MONGO_URI="));
            if (m) env.MONGO_URI = m.split("=").slice(1).join("=");
          }
        } catch (e) {
          // ignore
        }
      }
      const out = execFileSync(process.execPath, [scriptPath, "50"], {
        env,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      });
      try {
        const parsed = JSON.parse(out || "{}");
        if (
          parsed &&
          Array.isArray(parsed.expertos) &&
          parsed.expertos.length > 0
        ) {
          initialExpertos = parsed.expertos;
          console.log(
            "adminExpertos: initialExpertos populated via backend script fallback, count=",
            initialExpertos.length
          );
        }
      } catch (e) {
        console.warn(
          "Dev adminExpertos: failed to parse script output:",
          e && e.message
        );
      }
    } catch (err) {
      console.warn(
        "Dev adminExpertos script fallback failed:",
        err && err.message
      );
    }
  }
  // Fallback: si no obtuvimos expertos desde el endpoint dev, intentar
  // obtenerlos a través del proxy '/api/usuarios/expertos' (requiere sesión admin)
  try {
    if (
      (!initialExpertos || initialExpertos.length === 0) &&
      req.session &&
      req.session.user &&
      Array.isArray(req.session.user.roles) &&
      req.session.user.roles.includes("admin")
    ) {
      const proxyRes = await fetch(
        "http://localhost:3001/api/usuarios/expertos?limit=50",
        {
          headers: { Cookie: req.headers.cookie || "" },
        }
      );
      if (proxyRes && proxyRes.ok) {
        const proxyJson = await proxyRes.json().catch(() => null);
        // proxy devuelve { expertos: [...], total }
        if (
          proxyJson &&
          Array.isArray(proxyJson.expertos) &&
          proxyJson.expertos.length > 0
        ) {
          initialExpertos = proxyJson.expertos;
          console.log(
            "adminExpertos: initialExpertos populated via proxy fallback, count=",
            initialExpertos.length
          );
        }
      }
    }
  } catch (e) {
    // no bloquear render si falla
  }
  res.render("admin/adminExpertos", {
    user: req.session.user || {},
    habilidades,
    initialExpertos,
    categorias,
  });
});

// Dev-only: ruta que permite renderizar la página de adminExpertos sin sesión
// útil para pruebas locales cuando no se quiere pasar por el login. Solo
// se habilita en desarrollo y si ALLOW_DEV_ROUTES=true.
app.get("/dev/admin/adminExpertos", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).send("Dev route disabled in production");
  }
  if (
    !process.env.ALLOW_DEV_ROUTES ||
    process.env.ALLOW_DEV_ROUTES === "false"
  ) {
    return res.status(403).send("Dev routes not enabled");
  }

  const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
  let habilidades = [];
  let initialExpertos = [];
  try {
    const habRes = await fetch("http://localhost:3000/api/habilidades");
    habilidades = habRes.ok ? await habRes.json() : [];
  } catch (e) {
    habilidades = [];
  }

  try {
    const devRes = await fetch(
      "http://localhost:3000/api/dev/expertos-populados?limit=50"
    );
    if (devRes && devRes.ok) {
      const devJson = await devRes.json();
      initialExpertos = Array.isArray(devJson.expertos)
        ? devJson.expertos
        : devJson.data || [];
    }
  } catch (e) {
    initialExpertos = [];
  }

  // Fallback directo a la BBDD en modo dev: ejecutar el script del backend
  // que lista expertos poblados y devuelve JSON. Evita problemas de buffering
  // en el proceso del frontend y reutiliza la lógica ya probada.
  if (
    (!initialExpertos || initialExpertos.length === 0) &&
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_DEV_ROUTES &&
    process.env.ALLOW_DEV_ROUTES !== "false"
  ) {
    try {
      const { execFileSync } = require("child_process");
      const fs = require("fs");
      const scriptPath = require("path").join(
        __dirname,
        "../backend/scripts/list-expertos-populated.js"
      );
      const env = Object.assign({}, process.env);
      if (!env.MONGO_URI) {
        try {
          const envFile = require("path").join(__dirname, "../backend/.env");
          if (fs.existsSync(envFile)) {
            const envText = fs.readFileSync(envFile, "utf8");
            const m = envText
              .split(/\r?\n/)
              .find((l) => l && l.startsWith("MONGO_URI="));
            if (m) env.MONGO_URI = m.split("=").slice(1).join("=");
          }
        } catch (e) {
          // ignore
        }
      }
      const out = execFileSync(process.execPath, [scriptPath, "50"], {
        env,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      });
      try {
        const parsed = JSON.parse(out || "{}");
        if (
          parsed &&
          Array.isArray(parsed.expertos) &&
          parsed.expertos.length > 0
        ) {
          initialExpertos = parsed.expertos;
          console.log(
            "adminExpertos: initialExpertos populated via backend script fallback, count=",
            initialExpertos.length
          );
        }
      } catch (e) {
        console.warn(
          "Dev adminExpertos: failed to parse script output:",
          e && e.message
        );
      }
    } catch (err) {
      console.warn(
        "Dev adminExpertos script fallback failed:",
        err && err.message
      );
    }
  }

  return res.render("admin/adminExpertos", {
    user: {},
    habilidades,
    initialExpertos,
  });
});
app.get("/admin/adminCategorias", requireAdmin, (req, res) => {
  res.render("admin/adminCategorias", { user: req.session.user || {} });
});
app.get("/admin/adminNotificaciones", requireAdmin, (req, res) => {
  res.render("admin/adminNotificaciones", { user: req.session.user || {} });
});
app.get("/admin/adminLogs", requireAdmin, (req, res) => {
  res.render("admin/adminLogs", { user: req.session.user || {} });
});
app.get("/admin/adminUsuarios", requireAdmin, (req, res) => {
  res.render("admin/adminUsuarios", { user: req.session.user || {} });
});

// --- Arranque del servidor ---
app.listen(PORT, () => {
  console.log(`Servidor Servitech escuchando en http://localhost:${PORT}`);
});
