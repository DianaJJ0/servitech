/**
 * SERVIDOR FRONTEND - SERVITECH
 * Configura y arranca el servidor Express para la parte visible de la aplicación.
 */
const express = require("express");
const path = require("path");
const { createProxyMiddleware } = require("http-proxy-middleware");

// --- Inicialización de la Aplicación ---
const app = express();
const PORT = 3001; // Puerto dedicado para el frontend.

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

app.get("/", (req, res) => {
  res.render("index", { user: null });
});

app.get("/login.html", (req, res) => {
  res.render("login", { user: null });
});

app.get("/registro.html", (req, res) => {
  res.render("registro", { user: null });
});

app.get("/registroExperto.html", (req, res) => {
  res.render("registroExperto", { user: null });
});

app.get("/expertos.html", (req, res) => {
  res.render("expertos", { user: null, categorias: [], expertos: [] });
});

app.get("/contacto.html", (req, res) => {
  res.render("contacto", { user: null });
});

app.get("/perfil.html", (req, res) => {
  const mockUser = { nombre: "Diana" };
  res.render("perfil", { user: mockUser });
});

app.get("/mis-asesorias.html", (req, res) => {
  const mockUser = {
    nombre: "Diana",
    usuarioId: "mockId",
    rolUsuario: "cliente",
  };
  res.render("mis-asesorias", {
    user: mockUser,
    usuarioId: "mockId",
    rolUsuario: "cliente",
  });
});

app.get("/calendario.html", (req, res) => {
  res.render("calendario", {
    user: null,
    expertoSeleccionado: {},
    pageTitle: "Calendario",
  });
});

// --- RUTA QUE DEBES AGREGAR ---
app.get("/recuperarPassword.html", (req, res) => {
  res.render("recuperarPassword", { user: null });
});

// --- Arranque y Escucha del Servidor ---
app.listen(PORT, () => {
  console.log(
    `Servidor Frontend REINICIADO Y ACTUALIZADO en http://localhost:${PORT}`
  );
});
