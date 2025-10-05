/**
 * SERVITECH SERVER.JS - FRONTEND
 * Renderiza vistas, gestiona sesión y consulta datos al backend.
 * Mantiene proxy manual /api con CSRF y casos especiales.
 */

require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");
const crypto = require("crypto");
const _sseClients = new Set();

const router = express.Router();
const PORT = parseInt(process.env.PORT, 10) || 5021;
const FRONTEND_URL = process.env.FRONTEND_URL || `http://localhost:${PORT}`;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5020";
const PROXY_MODE =
  String(process.env.PROXY_MODE || "false").toLowerCase() === "true";

// Usar fetch nativo (Node >=18). Si no existe, avisar para actualizar
const fetch = typeof globalThis.fetch === "function" ? globalThis.fetch : null;
if (!fetch) {
  console.warn("Aviso: global fetch no disponible. Actualiza Node a v18+.");
}

// Diagnóstico backend al iniciar
async function checkBackendConnectivity() {
  try {
    const url = `${BACKEND_URL.replace(/\/$/, "")}/health`;
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
        `Backend reachable pero NO-OK desde ${url} (status=${
          res && res.status
        })`
      );
    } else {
      console.log(`Backend en ${BACKEND_URL} (health OK)`);
    }
  } catch (err) {
    console.warn(
      `No se pudo conectar al BACKEND (${BACKEND_URL}):`,
      err && err.message ? err.message : err
    );
  }
}
setImmediate(() => checkBackendConnectivity());

// Diagnóstico manual
router.get("/backend-check", async (req, res) => {
  try {
    const target = `${BACKEND_URL.replace(/\/$/, "")}/api`;
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

// Redis (opcional)
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
    console.log("Redis Store disponible para sesiones");
  } catch (e) {
    console.warn(
      "Redis no disponible. Usando memoria para sesiones. Instala dependencias si lo requieres."
    );
  }
}

// Middlewares parsing solo modo standalone que es cuando se ejecuta directamente
if (require.main === module) {
  router.use(express.json());
  router.use(express.urlencoded({ extended: true }));
  console.log("Middlewares de parsing aplicados (servidor independiente)");
}

// Proxy mode: protección de CORS si aplica
if (PROXY_MODE) {
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
  router.use((req, res, next) => next());
}

// Manejo de JSON inválido
router.use((err, req, res, next) => {
  if (err && err.status === 400 && /JSON/.test(err.message)) {
    console.warn("Invalid JSON received:", err && err.message);
    return res
      .status(400)
      .json({ mensaje: "JSON inválido en el cuerpo de la petición" });
  }
  next(err);
});

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

// Endpoint CSRF simple
router.get("/csrf-token", (req, res) => {
  if (!req.session) return res.status(401).json({ mensaje: "No session" });
  const token = req.session.csrfToken
    ? String(req.session.csrfToken).trim()
    : "";
  return res.json({ csrfToken: token });
});

// Proxy manual /api
router.use("/api", async (req, res) => {
  try {
    const targetUrl = `${BACKEND_URL}/api${req.url}`;
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
      if (req.session && req.session.user && req.session.user.token) {
        outboundHeaders["authorization"] = `Bearer ${req.session.user.token}`;
      }
    } catch (e) {}

    // Log diagnóstico: indicar si inyectamos cabeceras sin imprimir valores sensibles
    try {
      console.log(
        `[frontend-proxy] ${req.method} ${
          req.originalUrl
        } - injectXApiKey=${!!outboundHeaders[
          "x-api-key"
        ]} hasAuth=${!!outboundHeaders["authorization"]}`
      );
    } catch (e) {}

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

    const respText = await response.text();
    let respData = null;
    try {
      respData = respText ? JSON.parse(respText) : null;
    } catch (e) {
      respData = respText || null;
    }

    if (respData !== null) {
      return res.status(response.status).json(respData);
    } else {
      return res
        .status(response.status)
        .json({ error: `Backend error: ${response.status}` });
    }
  } catch (error) {
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

// SSE (opcional, solo si usas eventos)
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
// Solo permite setear sesión si el usuario viene con token (verificado por backend)
router.post("/set-session", async (req, res) => {
  try {
    if (req.body && req.body.usuario && req.body.usuario.token) {
      req.session.user = req.body.usuario;
      return res.json({ ok: true, user: req.session.user });
    }
    res.status(400).json({ ok: false, mensaje: "Usuario no recibido" });
  } catch (err) {
    console.error("Error en set-session:", err);
    res.status(500).json({ ok: false, mensaje: "Error al establecer sesión" });
  }
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
  res.render("registro", {
    user: req.session.user || null,
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY,
  });
});
router.get("/login.html", (req, res) => {
  res.render("login", {
    user: null,
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY,
  });
});
router.get("/recuperarPassword.html", (req, res) => {
  res.render("recuperarPassword", { user: null });
});
router.get("/contacto.html", (req, res) => {
  res.render("contacto", { user: req.session.user || null });
});

// Páginas legales: Términos y Privacidad
router.get("/terminos.html", (req, res) => {
  try {
    return res.render("terminos", { user: req.session.user || null });
  } catch (e) {
    console.warn(
      "Error renderizando terminos:",
      e && e.message ? e.message : e
    );
    return res.status(500).send("No se pudo cargar Términos y Condiciones");
  }
});

router.get("/privacidad.html", (req, res) => {
  try {
    return res.render("privacidad", { user: req.session.user || null });
  } catch (e) {
    console.warn(
      "Error renderizando privacidad:",
      e && e.message ? e.message : e
    );
    return res.status(500).send("No se pudo cargar la Política de Privacidad");
  }
});

router.get("/cookies.html", (req, res) => {
  try {
    return res.render("cookies", { user: req.session.user || null });
  } catch (e) {
    console.warn("Error renderizando cookies:", e && e.message ? e.message : e);
    return res.status(500).send("No se pudo cargar la política de cookies");
  }
});

// --- Perfil usuario: consulta backend si hay token ---
router.get("/perfil", async (req, res) => {
  console.log(
    "[frontend] GET /perfil - session present?",
    !!req.session,
    "session.user?",
    !!(req.session && req.session.user)
  );
  if (req.session && req.session.user && req.session.user.token) {
    console.log(
      "[frontend] /perfil - session.user.token present? ",
      !!req.session.user.token
    );
    try {
      const perfilRes = await fetch(`${BACKEND_URL}/api/usuarios/perfil`, {
        headers: { Authorization: `Bearer ${req.session.user.token}` },
      });
      console.log(
        "[frontend] /perfil - backend /api/usuarios/perfil status=",
        perfilRes && perfilRes.status
      );
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

    // Debug: Log de categorías recibidas
    console.log(
      "Categorías recibidas del backend:",
      JSON.stringify(categorias, null, 2)
    );

    // 2) Construir parámetros de consulta para expertos
    page = parseInt(req.query.page, 10) || 1;
    limit = 6;

    // Construir URL con filtros
    const apiParams = new URLSearchParams();
    apiParams.set("page", page);
    apiParams.set("limit", limit);

    // Añadir filtro de categoría si existe
    if (req.query.categoria && req.query.categoria.trim()) {
      apiParams.set("categoria", req.query.categoria.trim());
    }

    const apiUrl = `${BACKEND_URL}/api/expertos?${apiParams.toString()}`;
    const expRes = await fetch(apiUrl);

    if (expRes && expRes.ok) {
      const tmp = await expRes.json().catch(() => null);
      expertos = Array.isArray(tmp)
        ? tmp
        : tmp && tmp.data
        ? tmp.data
        : tmp && tmp.expertos
        ? tmp.expertos
        : [];

      total = tmp && tmp.total ? Number(tmp.total) : expertos.length;

      if (Array.isArray(expertos) && typeof limit === "number") {
        expertos = expertos.slice(0, limit);
      }
    } else {
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
    console.error("Error en /expertos.html:", e);
    categorias = [];
    expertos = [];
  }

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
  if (!req.session.user || !req.session.user.token) {
    return res.redirect("/login.html?next=/registroExperto");
  }
  let categorias = [];
  try {
    const catRes = await fetch(`${BACKEND_URL}/api/categorias`);
    categorias = catRes.ok ? await catRes.json() : [];
  } catch (e) {}
  res.render("registroExperto", {
    user: req.session.user,
    email: req.session.user.email,
    categorias,
    error: null,
  });
});
router.get("/registroExperto.html", async (req, res) => {
  res.redirect("/registroExperto");
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
    // Normalizar categorías seleccionadas del experto a IDs si en el perfil vienen como nombres
    if (
      experto &&
      experto.infoExperto &&
      Array.isArray(experto.infoExperto.categorias) &&
      categorias.length
    ) {
      const nombreToId = {};
      categorias.forEach((c) => {
        if (c && c.nombre)
          nombreToId[c.nombre.toLowerCase()] = String(
            c._id || c.id || c.value || c.nombre
          );
      });
      experto.infoExperto.categorias = experto.infoExperto.categorias.map(
        (c) => {
          if (!c) return c;
          const clave = String(c).toLowerCase();
          // Si coincide con un nombre, reemplazar por el ID correspondiente para que el <option selected> funcione
          return nombreToId[clave] || String(c);
        }
      );
    }
  } catch (e) {}
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

// Ruta: calendario de un experto (por email)
router.get("/expertos/:email/calendario", async (req, res) => {
  try {
    const expertoEmail = req.params.email;

    // Buscar experto por email
    const expertoRes = await fetch(
      `${BACKEND_URL}/api/usuarios/buscar?email=${encodeURIComponent(
        expertoEmail
      )}`
    );
    if (!expertoRes.ok) {
      return res.status(404).render("404", {
        mensaje: "Experto no encontrado",
        user: req.session.user || null,
      });
    }

    const experto = await expertoRes.json();
    if (
      !experto ||
      !Array.isArray(experto.roles) ||
      !experto.roles.includes("experto")
    ) {
      return res.status(404).render("404", {
        mensaje: "Experto no encontrado",
        user: req.session.user || null,
      });
    }

    // Obtener asesorías existentes del experto
    let asesoriasExistentes = [];
    try {
      const asesoriaRes = await fetch(
        `${BACKEND_URL}/api/asesorias/experto/${encodeURIComponent(
          expertoEmail
        )}`
      );
      if (asesoriaRes.ok) {
        asesoriasExistentes = await asesoriaRes.json();
        // Filtrar solo las asesorías relevantes para mostrar ocupación
        asesoriasExistentes = asesoriasExistentes.filter((a) =>
          ["pendiente-aceptacion", "confirmada"].includes(a.estado)
        );
      }
    } catch (e) {
      console.error("Error obteniendo asesorías:", e);
    }

    // Usuario autenticado (puede ser null si no ha iniciado sesión)
    const user = req.session.user || null;

    return res.render("calendario", {
      experto,
      user, // CAMBIO: usar 'user' en lugar de 'usuario'
      usuario: user, // Mantener compatibilidad con código JS
      asesoriasExistentes,
    });
  } catch (err) {
    console.error("Error en calendario:", err);
    res.status(500).render("404", {
      mensaje: "Error interno al cargar el calendario",
      user: req.session.user || null,
    });
  }
});

// Ruta: confirmación de asesoría 
router.get("/confirmacion-asesoria", (req, res) => {
  const status = req.query.status || "unknown";
  const pagoId = req.query.pagoId || null;
  const paymentId = req.query.paymentId || null;
  const preferenceId = req.query.preferenceId || null;
  const asesoriaId = req.query.asesoriaId || null;

  // Validaciones básicas
  if (!status) {
    console.warn("Acceso a confirmación sin estado definido");
  }

  if (status === "success" && !pagoId && !paymentId) {
    console.warn("Estado exitoso pero sin IDs de pago");
  }

  res.render("confirmacionAsesoria", {
    user: req.session.user || null,
    usuario: req.session.user || null,
    status,
    pagoId,
    paymentId,
    preferenceId,
    asesoriaId,
  });
});

// Ruta: pasarela de pagos
router.get("/pasarela-pagos", (req, res) => {
  console.log("GET /pasarela-pagos - Query params:", req.query);

  // Validar que el usuario esté autenticado
  if (!req.session.user || !req.session.user.token) {
    console.log("Usuario no autenticado, redirigiendo a login");
    return res.redirect("/login.html?next=" + encodeURIComponent("/pasarela-pagos?" + new URLSearchParams(req.query).toString()));
  }

  let expertoSeleccionado = null;
  let monto = null;
  let duracion = null;

  // Procesar experto seleccionado de forma segura
  if (req.query.experto) {
    try {
      expertoSeleccionado = JSON.parse(req.query.experto);
      console.log("Experto seleccionado parseado:", expertoSeleccionado);
    } catch (e) {
      console.warn("Error parseando experto seleccionado:", e);
      expertoSeleccionado = null;
    }
  }

  // Procesar monto de forma segura
  if (req.query.monto) {
    const montoTemp = parseInt(req.query.monto);
    if (!isNaN(montoTemp) && montoTemp >= 1000) {
      monto = montoTemp;
    } else {
      console.warn("Monto inválido en pasarela de pagos:", req.query.monto);
      monto = 20000; // valor por defecto
    }
  } else {
    monto = 20000; // valor por defecto
  }

  // Procesar duración de forma segura
  if (req.query.duracion) {
    const duracionTemp = parseFloat(req.query.duracion);
    if (!isNaN(duracionTemp) && [1, 1.5, 2, 3].includes(duracionTemp)) {
      duracion = duracionTemp;
    } else {
      console.warn("Duración inválida en pasarela de pagos:", req.query.duracion);
      duracion = 1; // valor por defecto
    }
  } else {
    duracion = 1; // valor por defecto
  }

  console.log("Datos procesados para pasarela:", { expertoSeleccionado, monto, duracion });

  res.render("pasarelaPagos", {
    user: req.session.user,
    expertoSeleccionado,
    monto,
    duracion,
  });
});

// Ruta: API proxy para verificación de pagos (MEJORADA)
router.get("/api/verificar-pago/:pagoId", async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.token) {
      return res.status(401).json({
        mensaje: "No autenticado",
        codigo: "NO_AUTH",
      });
    }

    const pagoId = req.params.pagoId;

    // Validar formato del pagoId
    if (!pagoId || pagoId.length !== 24) {
      return res.status(400).json({
        mensaje: "ID de pago inválido",
        codigo: "INVALID_PAGO_ID",
      });
    }

    const token = req.session.user.token;

    const response = await fetch(`${BACKEND_URL}/api/pagos/${pagoId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        mensaje: errorData.mensaje || "Error verificando pago",
        codigo: errorData.codigo || "BACKEND_ERROR",
      });
    }

    const pago = await response.json();

    // Sanitizar datos sensibles antes de enviar al frontend
    const pagoSanitizado = {
      _id: pago._id,
      estado: pago.estado,
      monto: pago.monto,
      fechaCreacion: pago.fechaCreacion,
      fechaActualizacion: pago.fechaActualizacion,
      metodo: pago.metodo,
      descripcion: pago.descripcion,
    };

    res.json(pagoSanitizado);
  } catch (error) {
    console.error("Error verificando pago:", error);
    res.status(500).json({
      mensaje: "Error interno verificando pago",
      codigo: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

// Ruta: manejar errores de MercadoPago (NUEVA)
router.get("/pago-error", (req, res) => {
  const errorCode = req.query.error || "unknown";
  const errorMessage = req.query.message || "Error desconocido en el pago";

  console.error("Error de MercadoPago:", { errorCode, errorMessage });

  res.render("confirmacionAsesoria", {
    user: req.session.user || null,
    usuario: req.session.user || null,
    status: "error",
    pagoId: null,
    paymentId: null,
    preferenceId: null,
    asesoriaId: null,
    errorDetails: {
      code: errorCode,
      message: errorMessage,
    },
  });
});

// Ruta: mis asesorías (protegida)
router.get("/misAsesorias.html", (req, res) => {
  if (!req.session.user || !req.session.user.token) {
    return res.redirect("/login.html?next=/misAsesorias.html");
  }

  const esExperto =
    req.session.user.roles && req.session.user.roles.includes("experto");

  res.render("misAsesorias", {
    user: req.session.user,
    usuario: req.session.user,
    usuarioId: req.session.user._id,
    rolUsuario: esExperto ? "experto" : "cliente",
  });
});

// Ruta: mis asesorías (protegida)
router.get("/misAsesorias.html", (req, res) => {
  if (!req.session.user || !req.session.user.token) {
    return res.redirect("/login.html?next=/misAsesorias.html");
  }

  const esExperto =
    req.session.user.roles && req.session.user.roles.includes("experto");

  res.render("misAsesorias", {
    user: req.session.user,
    usuario: req.session.user,
    usuarioId: req.session.user._id,
    rolUsuario: esExperto ? "experto" : "cliente",
  });
});

// --- Panel de administración (rutas protegidas) ---
router.get("/admin/adminCategorias", requireAdmin, (req, res) => {
  // Exponer API_KEY al cliente sólo si la sesión pertenece a un admin
  const isAdmin =
    req.session && req.session.user && Array.isArray(req.session.user.roles)
      ? req.session.user.roles.includes("admin")
      : false;
  // En entornos de desarrollo, exponer la API_KEY localmente facilita pruebas.
  // En producción, sólo exponerla cuando la sesión es admin.
  let apiKey = "";
  try {
    if (process.env.API_KEY) {
      if (String(process.env.NODE_ENV || "").toLowerCase() !== "production") {
        apiKey = process.env.API_KEY;
      } else if (isAdmin) {
        apiKey = process.env.API_KEY;
      }
    }
  } catch (e) {
    apiKey = "";
  }
  console.log(
    `Rendering /admin/adminCategorias - expose API_KEY to client: ${
      apiKey ? "yes" : "no"
    }`
  );
  res.render("admin/adminCategorias", {
    user: req.session.user || {},
    API_KEY: typeof apiKey !== "undefined" ? apiKey : "",
  });
});
// Ruta principal del panel de administración (dashboard)
router.get("/admin", requireAdmin, (req, res) => {
  // Renderiza la vista principal del dashboard: frontend/views/admin/admin.ejs
  res.render("admin/admin", { user: req.session.user || {} });
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
router.get("/admin/adminExpertos", requireAdmin, async (req, res) => {
  let categorias = [];
  let initialExpertos = [];
  // Decide whether to expose API_KEY to client (same policy as adminCategorias)
  let apiKey = "";
  try {
    const isAdmin =
      req.session && req.session.user && Array.isArray(req.session.user.roles)
        ? req.session.user.roles.includes("admin")
        : false;
    if (process.env.API_KEY) {
      if (String(process.env.NODE_ENV || "").toLowerCase() !== "production") {
        apiKey = process.env.API_KEY;
      } else if (isAdmin) {
        apiKey = process.env.API_KEY;
      }
    }
  } catch (e) {
    apiKey = "";
  }

  try {
    const catRes = await fetch(`${BACKEND_URL}/api/categorias`);
    if (catRes.ok) {
      categorias = await catRes.json();
    }

    const expertosRes = await fetch(
      `${BACKEND_URL}/api/expertos?limit=100&estado=all`,
      {
        headers: req.session.user?.token
          ? {
              Authorization: `Bearer ${req.session.user.token}`,
              "X-API-Key": process.env.API_KEY || "servitech-api-key-2024",
            }
          : {},
      }
    );

    if (expertosRes.ok) {
      const expertosData = await expertosRes.json();
      initialExpertos = Array.isArray(expertosData)
        ? expertosData
        : expertosData.data || expertosData.expertos || [];
    }
  } catch (error) {}

  res.render("admin/adminExpertos", {
    user: req.session.user || {},
    categorias: categorias,
    initialExpertos: initialExpertos,
    API_KEY: typeof apiKey !== "undefined" ? apiKey : "",
  });
});

// Proxy seguro para acciones administrativas que requieren x-api-key
// Estas rutas están protegidas por requireAdmin y ejecutan la petición al
// backend desde el servidor, agregando la API_KEY del entorno.
router.put(
  "/admin/proxy/expertos/aprobar/:email",
  requireAdmin,
  async (req, res) => {
    try {
      const email = req.params.email;
      const backendUrl = `${BACKEND_URL}/api/expertos/aprobar/${encodeURIComponent(
        email
      )}`;
      const headers = {
        "Content-Type": "application/json",
      };
      if (process.env.API_KEY) headers["x-api-key"] = process.env.API_KEY;
      if (req.session && req.session.user && req.session.user.token) {
        headers["Authorization"] = `Bearer ${req.session.user.token}`;
      }
      const resp = await fetch(backendUrl, {
        method: "PUT",
        headers,
      });
      const bodyText = await resp.text();
      let body = null;
      try {
        body = JSON.parse(bodyText);
      } catch (e) {
        body = { mensaje: bodyText };
      }
      return res.status(resp.status).json(body);
    } catch (e) {
      console.error("proxy aprobar error:", e && e.message);
      return res.status(500).json({ error: "proxy_error", mensaje: e.message });
    }
  }
);

router.put(
  "/admin/proxy/expertos/rechazar/:email",
  requireAdmin,
  async (req, res) => {
    try {
      const email = req.params.email;
      const motivo = req.body && req.body.motivo ? req.body.motivo : undefined;
      const backendUrl = `${BACKEND_URL}/api/expertos/rechazar/${encodeURIComponent(
        email
      )}`;
      const headers = {
        "Content-Type": "application/json",
      };
      if (process.env.API_KEY) headers["x-api-key"] = process.env.API_KEY;
      if (req.session && req.session.user && req.session.user.token) {
        headers["Authorization"] = `Bearer ${req.session.user.token}`;
      }
      const resp = await fetch(backendUrl, {
        method: "PUT",
        headers,
        body: JSON.stringify({ motivo }),
      });
      const bodyText = await resp.text();
      let body = null;
      try {
        body = JSON.parse(bodyText);
      } catch (e) {
        body = { mensaje: bodyText };
      }
      return res.status(resp.status).json(body);
    } catch (e) {
      console.error("proxy rechazar error:", e && e.message);
      return res.status(500).json({ error: "proxy_error", mensaje: e.message });
    }
  }
);

// Endpoint temporal de depuración para inspeccionar sesión (solo admin)
router.get("/admin/debug-session", requireAdmin, (req, res) => {
  try {
    const user = req.session.user || null;
    const isAdmin =
      user && Array.isArray(user.roles) ? user.roles.includes("admin") : false;
    const willInjectApiKey = isAdmin && !!process.env.API_KEY;

    return res.json({
      hasSession: !!req.session,
      userPresent: !!user,
      isAdmin,
      roles: user && user.roles ? user.roles : [],
      hasToken: !!(user && user.token),
      tokenPreview:
        user && user.token ? user.token.substring(0, 20) + "..." : null,
      willInjectApiKey,
      hasApiKeyInEnv: !!process.env.API_KEY,
    });
  } catch (e) {
    return res.status(500).json({ error: "debug error", detail: e.message });
  }
});
// Ruta: confirmación de asesoría
router.get("/confirmacion-asesoria", (req, res) => {
  const status = req.query.status || "pending";
  const pagoId = req.query.pagoId || null;
  const paymentId = req.query.paymentId || null;
  const preferenceId = req.query.preferenceId || null;
  const asesoriaId = req.query.asesoriaId || null;

  res.render("confirmacionAsesoria", {
    user: req.session.user || null,
    usuario: req.session.user || null,
    status,
    pagoId,
    paymentId,
    preferenceId,
    asesoriaId,
  });
});

// Manejo de errores 404
router.use((req, res) => {
  res.status(404).render("404", {
    mensaje: "La página que buscas no existe o ha sido movida.",
    user: req.session.user || null,
  });
});

// Exporta el router
module.exports = router;

// Standalone server
if (require.main === module) {
  const app = express();
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "servitech-frontend-secret",
      resave: false,
      saveUninitialized: false,
      store: RedisStore ? new RedisStore({ client: redisClient }) : undefined,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));
  app.use("/assets", express.static(path.join(__dirname, "assets")));

  // Ruta de prueba para el modal
  app.get("/modal-test", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "modal-test-consolidado.html"));
  });

  app.use("/", router);

  app.listen(PORT, () => {
    console.log(`Frontend server listening on http://localhost:${PORT}`);
    console.log(`Proxy mode: ${PROXY_MODE}`);
    console.log(`Backend URL: ${BACKEND_URL}`);
  });
}
