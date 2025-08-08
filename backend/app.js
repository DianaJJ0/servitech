/**
 * ARCHIVO PRINCIPAL DEL SERVIDOR API - SERVITECH
 * Configura y arranca la aplicación de Express para la API.
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors"); // Se importa cors.
const conectarDB = require("./config/database.js");

// Importación de los enrutadores de la aplicación.
const usuarioRoutes = require("./routes/usuario.routes.js");
const categoriaRoutes = require("./routes/categoria.routes.js");

// --- Inicialización de la Aplicación ---

conectarDB();
const app = express();

// --- Middlewares Esenciales ---

// Middleware de logging para debug
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// Se configura CORS para permitir peticiones desde el servidor de frontend.
app.use(
  cors({
    origin: ["http://localhost:3001", "http://127.0.0.1:3001"], // Permite peticiones de estos orígenes.
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware para que Express pueda interpretar cuerpos de solicitud en formato JSON.
app.use(express.json());

// --- Enrutamiento Principal de la API ---

// Se asignan las rutas de la API a sus respectivos endpoints base.
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/categorias", categoriaRoutes);

// --- Arranque y Escucha del Servidor ---

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(
    `Servidor API (Backend) ejecutándose en modo ${process.env.NODE_ENV} en el puerto ${PORT}`
  );
});
