/**
 * SERVIDOR FRONTEND - SERVITECH
 * Configura y arranca el servidor Express para la parte visible de la aplicación.
 */
const express = require("express");
const path = require("path");
const { createProxyMiddleware } = require("http-proxy-middleware");
const session = require("express-session");

const app = express();
const PORT = 3001; // Puerto dedicado para el frontend.

// Configuración de vistas y rutas estáticas
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use(express.json());

// Middleware de sesión (igual que en backend)
app.use(
  session({
    secret: "servitech-secret", // Usa la misma clave que en backend
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // true solo si usas HTTPS
      sameSite: "lax", // Permite compartir entre localhost:3000 y 3001
      // Eliminado domain para evitar problemas de envío de cookie entre puertos
    },
  })
);

app.use((req, res, next) => {
  console.log(`[FRONTEND] Petición recibida: ${req.method} ${req.url}`);
  next();
});

// Proxy para redirigir /api/* al backend en el puerto 3000
app.use(
  "/api",
  createProxyMiddleware({
    target: "http://localhost:3000",
    changeOrigin: true,
    logLevel: "debug",
    pathRewrite: {
      "^/api": "", // Elimina el prefijo /api
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(
        `[PROXY] Redirigiendo: ${req.originalUrl} -> ${proxyReq.path}`
      );
    },
  })
);

// Ruta para cerrar sesión y destruir la sesión del usuario
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Error al cerrar sesión" });
    }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// Ruta para establecer el usuario en la sesión del frontend tras login
app.post("/set-session", (req, res) => {
  if (req.body && req.body.usuario) {
    req.session.user = req.body.usuario;
    return res.json({ ok: true });
  }
  res.status(400).json({ ok: false, mensaje: "Usuario no recibido" });
});

// Rutas principales y vistas
app.get("/", (req, res) => {
  res.render("index", { user: null });
});

app.get("/login.html", (req, res) => {
  res.render("login", { user: null });
});

app.get("/recuperarPassword.html", (req, res) => {
  res.render("recuperarPassword", { user: null });
});

// Ruta protegida para registro de experto
app.get("/registro-experto", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login.html?next=/registro-experto");
    }
    const email =
      req.session.user && req.session.user.email ? req.session.user.email : "";
    const fetch = (...args) =>
      import("node-fetch").then(({ default: fetch }) => fetch(...args));
    const catRes = await fetch("http://localhost:3000/api/categorias");
    const categorias = catRes.ok ? await catRes.json() : [];
    const espRes = await fetch("http://localhost:3000/api/especialidades");
    const especialidades = espRes.ok ? await espRes.json() : [];
    const habRes = await fetch("http://localhost:3000/api/habilidades");
    const habilidades = habRes.ok ? await habRes.json() : [];
    res.render("registroExperto", {
      user: req.session.user,
      email,
      categorias,
      especialidades,
      habilidades,
      error: null,
    });
  } catch (err) {
    console.error("[ERROR registro-experto]", err);
    res.render("registroExperto", {
      user: req.session.user,
      email:
        req.session.user && req.session.user.email
          ? req.session.user.email
          : "",
      categorias: [],
      especialidades: [],
      habilidades: [],
      error: "Error al cargar datos: " + err.message,
    });
  }
});

// Modelos backend
const Categoria = require("../backend/models/categoria.model");
const Especialidad = require("../backend/models/especialidad.model");
const Habilidad = require("../backend/models/habilidad.model");

// Caché simple para categorías, especialidades y habilidades
let cacheCategorias = null;
let cacheEspecialidades = null;
let cacheHabilidades = null;
const cacheTTL = 10 * 60 * 1000; // 10 minutos
let lastCacheTime = 0;

// Ruta para editar perfil de experto
app.get("/editar-perfil-experto", async (req, res) => {
  try {
    if (!req.session?.user?.email) {
      return res.redirect("/login.html?next=/editar-perfil-experto");
    }
    const fetch = (...args) =>
      import("node-fetch").then(({ default: fetch }) => fetch(...args));
    // Obtener experto (usuario actual)
    let experto = null;
    if (req.session.user && req.session.user.token) {
      const perfilRes = await fetch(
        `http://localhost:3000/api/usuarios/perfil`,
        {
          headers: {
            Authorization: `Bearer ${req.session.user.token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (perfilRes.ok) {
        experto = await perfilRes.json();
      }
    }
    // Obtener categorías
    const catRes = await fetch("http://localhost:3000/api/categorias");
    const categorias = catRes.ok ? await catRes.json() : [];
    // Obtener especialidades
    const espRes = await fetch("http://localhost:3000/api/especialidades");
    const especialidades = espRes.ok ? await espRes.json() : [];
    // Obtener habilidades
    const habRes = await fetch("http://localhost:3000/api/habilidades");
    const habilidades = habRes.ok ? await habRes.json() : [];
    res.render("editarExpertos", {
      experto,
      categorias,
      especialidades,
      habilidades,
      error: null,
      success: null,
    });
  } catch (err) {
    console.error("[ERROR editar-perfil-experto]", err);
    res.render("editarExpertos", {
      experto: null,
      categorias: [],
      especialidades: [],
      habilidades: [],
      error: `Error al cargar datos: ${err.message}`,
      success: null,
    });
  }
});

// --- Arranque y Escucha del Servidor ---

// Ruta para mostrar el perfil del usuario autenticado
app.get("/perfil", async (req, res) => {
  // Si el usuario está en sesión, pásalo a la vista
  if (req.session && req.session.user) {
    res.render("perfil", { user: req.session.user });
  } else {
    res.render("perfil", { user: null });
  }
});

app.listen(PORT, () => {
  console.log(
    `Servidor Frontend REINICIADO Y ACTUALIZADO en http://localhost:${PORT}`
  );
});
