/**
 * SERVITECH SERVER.JS - versión optimizada y didáctica
 * Solo renderiza vistas, gestiona sesión y consulta datos al backend.
 * No incluye lógica de UI ni manipulación del DOM.
 */

const express = require("express");
const session = require("express-session");
const path = require("path");
const { createProxyMiddleware } = require("http-proxy-middleware");
const app = express();
const PORT = process.env.PORT || 3001;

// --- Middlewares globales ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "servitech-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      sameSite: "lax",
      domain: "localhost",
    },
  })
);

app.use("/assets", express.static(path.join(__dirname, "assets")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// --- Proxy /api/* al backend ---
app.use(
  "/api",
  createProxyMiddleware({
    target: "http://localhost:3000",
    changeOrigin: true,
    logLevel: "debug",
    pathRewrite: { "^/api": "" },
  })
);

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
  if (req.body && req.body.usuario) {
    req.session.user = req.body.usuario;
    return res.json({ ok: true });
  }
  res.status(400).json({ ok: false, mensaje: "Usuario no recibido" });
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
    const expRes = await fetch("http://localhost:3000/api/expertos");
    expertos = expRes.ok ? await expRes.json() : [];
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
app.get("/registroExperto.html", async (req, res) => {
  if (!req.session.user)
    return res.redirect("/login.html?next=/registroExperto.html");
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
app.get("/admin/admin", requireAdmin, (req, res) => {
  res.render("admin/admin", { user: req.session.user || {} });
});
app.get("/admin/adminClientes", requireAdmin, (req, res) => {
  res.render("admin/adminClientes", { user: req.session.user || {} });
});
app.get("/admin/adminExpertos", requireAdmin, (req, res) => {
  res.render("admin/adminExpertos", { user: req.session.user || {} });
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

// --- Arranque del servidor ---
app.listen(PORT, () => {
  console.log(`Servidor Servitech escuchando en http://localhost:${PORT}`);
});
