/**
 * ARCHIVO PRINCIPAL DEL SERVIDOR API - SERVITECH
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const conectarDB = require("./config/database.js");
const multer = require("multer");
const upload = multer();
const path = require("path");

// se llaman todas las rutas
const usuarioRoutes = require("./routes/usuario.routes.js");
const categoriaRoutes = require("./routes/categoria.routes.js");
const pagoRoutes = require("./routes/pago.routes.js");
const notificacionRoutes = require("./routes/notificacion.routes.js");
const logRoutes = require("./routes/log.routes.js");
const expertoRoutes = require("./routes/experto.routes.js");
const especialidadRoutes = require("./routes/especialidad.routes.js");
const habilidadRoutes = require("./routes/habilidad.routes.js");
const asesoriaRoutes = require("./routes/asesoria.routes.js");

// Conectar a la base de datos
conectarDB();
const app = express();
const session = require("express-session");
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

// --- Swagger ---
const swaggerUi = require('swagger-ui-express'); // pa
const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'API Servitech',
    version: '1.0.0',
    description: 'Documentación interactiva de la API de Servitech',
  },
  servers: [
    { url: 'http://localhost:3000/api', description: 'Servidor local' },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./routes/*.js', './models/*.js'], // el * indica que se lean todos los archivos .js en esa carpeta
};

const swaggerSpec = swaggerJSDoc(options);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Middleware de registro de solicitudes
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

app.use(
  cors({
    origin: ["http://localhost:3001", "http://127.0.0.1:3001"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Configuración de vistas
app.set("views", path.join(__dirname, "../frontend/views"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(upload.none());

// Rutas de la API
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/categorias", categoriaRoutes);
app.use("/api/pagos", pagoRoutes);
app.use("/api/notificaciones", notificacionRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/usuarios/expertos", expertoRoutes);
app.use("/api/especialidades", especialidadRoutes);
app.use("/api/habilidades", habilidadRoutes);
app.use("/api/asesorias", asesoriaRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(
    `Servidor API (Backend) ejecutándose en modo ${process.env.NODE_ENV} en el puerto ${PORT}`
  );
});
