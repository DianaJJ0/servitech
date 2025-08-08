/**
 * SERVIDOR FRONTEND - SERVITECH
 * Configura y arranca el servidor Express que gestiona la parte visible de la aplicación.
 */
const express = require("express");
const path = require("path");

// --- Inicialización de la Aplicación ---
const app = express();
const PORT = 3001; // Puerto dedicado exclusivamente para el frontend.

// --- Configuración de Middlewares Esenciales ---

// Se establece EJS como el motor de plantillas para renderizar HTML dinámico.
app.set("view engine", "ejs");

// Se define la ruta absoluta donde se encuentran todas las vistas (.ejs).
app.set("views", path.join(__dirname, "views"));

// --- CONFIGURACIÓN CLAVE Y DEFINITIVA DE ARCHIVOS ESTÁTICOS ---
// Se le indica a Express que cuando reciba una petición a una URL que comience con '/assets',
// debe buscar y servir los archivos desde la carpeta física 'frontend/assets'.
// Esta configuración coincide exactamente con la estructura de tu repositorio.
app.use("/assets", express.static(path.join(__dirname, "assets")));

// Middleware para que Express pueda interpretar cuerpos de solicitud en formato JSON.
app.use(express.json());

// --- Rutas de Renderizado de Páginas ---
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
  console.log(`Servidor Frontend escuchando en http://localhost:${PORT}`);
});
