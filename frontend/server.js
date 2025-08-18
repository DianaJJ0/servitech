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

// Middleware de sesión (igual que en backend)
app.use(
  session({
    secret: "servitech-secret", // Usa la misma clave que en backend
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // true solo si usas HTTPS
      sameSite: "lax", // Permite compartir entre localhost:3000 y 3001
      domain: "localhost",
    },
  })
);

app.use((req, res, next) => {
  console.log(`[FRONTEND] Petición recibida: ${req.method} ${req.url}`);
  next();
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use(express.json());

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
app.get("/registro-experto", (req, res) => {
  if (!req.session.user) {
    // Redirige a login si no está autenticado
    return res.redirect("/login.html?next=/registro-experto");
  }
  res.render("registroExperto", { user: req.session.user });
});

// Modelos backend
const Categoria = require("../backend/models/categoria.model");
const Especialidad = require("../backend/models/especialidad.model");
const Habilidad = require("../backend/models/habilidad.model");

// Ruta para editar perfil de experto
app.get("/editar-perfil-experto", async (req, res) => {
  try {
    const Usuario = require("../backend/models/usuario.model");
    let experto = null;
    if (req.session && req.session.user && req.session.user.email) {
      experto = await Usuario.findOne({ email: req.session.user.email }).lean();
    }
    const categorias = await Categoria.find().lean();
    const especialidades = await Especialidad.find().lean();
    const habilidades = await Habilidad.find().lean();
    res.render("editarExpertos", {
      experto,
      categorias,
      especialidades,
      habilidades,
      error: null,
      success: null,
    });
  } catch (err) {
    res.render("editarExpertos", {
      experto: null,
      categorias: [],
      especialidades: [],
      habilidades: [],
      error: "Error al cargar datos",
      success: null,
    });
  }
});

// --- Arranque y Escucha del Servidor ---
app.listen(PORT, () => {
  console.log(
    `Servidor Frontend REINICIADO Y ACTUALIZADO en http://localhost:${PORT}`
  );
});
