/**
 * ARCHIVO PRINCIPAL DEL SERVIDOR API - SERVITECH
 * Configura y arranca la aplicación de Express para la API.
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const conectarDB = require("./config/database.js");
const path = require("path");

// Importación de los enrutadores de la aplicación.
const usuarioRoutes = require("./routes/usuario.routes.js");
const categoriaRoutes = require("./routes/categoria.routes.js");
const pagoRoutes = require("./routes/pago.routes.js");
const notificacionRoutes = require("./routes/notificacion.routes.js");
const logRoutes = require("./routes/log.routes.js");
const configuracionRoutes = require("./routes/configuracion.routes.js");
const expertoRoutes = require("./routes/experto");

// Inicialización de la Aplicación
conectarDB();
const app = express();

// Middlewares Esenciales
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

app.use(
  cors({
    origin: ["http://localhost:3001", "http://127.0.0.1:3001"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.set("views", path.join(__dirname, "../frontend/views"));
app.set("view engine", "ejs");
app.use(express.json());

// Enrutamiento Principal de la API
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/categorias", categoriaRoutes);
app.use("/api/pagos", pagoRoutes);
app.use("/api/notificaciones", notificacionRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/configuraciones", configuracionRoutes);
app.use("/", expertoRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(
    `Servidor API (Backend) ejecutándose en modo ${process.env.NODE_ENV} en el puerto ${PORT}`
  );
});
