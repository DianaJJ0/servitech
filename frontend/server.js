/**
 * SERVIDOR FRONTEND - SERVITECH
 * Configura y arranca el servidor Express que gestiona la parte visible de la aplicación.
 */
const express = require("express");
const path = require("path");
const { createProxyMiddleware } = require("http-proxy-middleware");

// --- Inicialización de la Aplicación ---
const app = express();
const PORT = 3001; // Puerto dedicado exclusivamente para el frontend.

// Middleware de logging para ver todas las peticiones entrantes
app.use((req, res, next) => {
  console.log(`[FRONTEND] Petición recibida: ${req.method} ${req.url}`);
  next();
});

// Configuración del motor de vistas y archivos estáticos
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use(express.json());

// --- Proxy y Rutas de Renderizado ---

// Crea una instancia del proxy para ser usada en la ruta específica.
const apiProxy = createProxyMiddleware({
  target: "http://localhost:3000",
  changeOrigin: true,
  logLevel: "debug",
});

// Ruta específica para editar el perfil de experto, que usa el proxy.
app.get("/editar-perfil-experto", apiProxy);

// Se define una ruta para cada página de la aplicación.
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
  // Se pasa un objeto user simulado para desarrollo, en el futuro vendrá de la sesión.
  const mockUser = { nombre: "Diana" };
  res.render("perfil", { user: mockUser });
});

app.get("/mis-asesorias.html", (req, res) => {
  // Se pasan variables simuladas para que la plantilla no falle.
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
  // Se pasan variables simuladas para que la plantilla no falle.
  res.render("calendario", {
    user: null,
    expertoSeleccionado: {},
    pageTitle: "Calendario",
  });
});

// --- Arranque y Escucha del Servidor ---
app.listen(PORT, () => {
  console.log(`Servidor Frontend REINICIADO Y ACTUALIZADO en http://localhost:${PORT}`);
});
