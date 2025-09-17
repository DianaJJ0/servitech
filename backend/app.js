/**
 * ARCHIVO PRINCIPAL DEL SERVIDOR API - SERVITECH
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const conectarDB = require("./config/database.js");
const multer = require("multer");
const path = require("path");
const backup = require("./config/backup.js"); // Importar el módulo de backup
const cron = require("node-cron"); // Importar cron para programar tareas

// se llaman todas las rutas
const usuarioRoutes = require("./routes/usuario.routes.js");
const categoriaRoutes = require("./routes/categoria.routes.js");
const pagoRoutes = require("./routes/pago.routes.js");
const notificacionRoutes = require("./routes/notificacion.routes.js");
const logRoutes = require("./routes/log.routes.js");
const expertoRoutes = require("./routes/experto.routes.js");
const expertoController = require("./controllers/experto.controller.js");
const asesoriaRoutes = require("./routes/asesoria.routes.js");
const devRoutes = require("./routes/dev.routes.js");
const { autenticar, asegurarRol } = require("./middleware/auth.middleware");

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
    },
  })
);

// Integración de Swagger (swagger-jsdoc + swagger-ui-express)
try {
  const swaggerJSDoc = require("swagger-jsdoc");
  const swaggerUi = require("swagger-ui-express");
  const swaggerOptions = require("./config/swagger");
  const swaggerSpec = swaggerJSDoc(swaggerOptions);

  // Añadir security definitions al spec para habilitar el botón Authorize
  if (!swaggerSpec.components) swaggerSpec.components = {};
  if (!swaggerSpec.components.securitySchemes) {
    swaggerSpec.components.securitySchemes = {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    };
  }
  // Seguridad global para que Swagger UI muestre el botón Authorize
  swaggerSpec.security = [{ bearerAuth: [] }];

  // Proteger las rutas de documentación con autenticación JWT y rol admin
  if (process.env.JWT_SECRET) {
    // Requerir siempre autenticación y rol admin para /api-docs
    app.use(
      "/api-docs",
      autenticar,
      asegurarRol("admin"),
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        swaggerOptions: { supportedSubmitMethods: [] },
      })
    );
    app.get("/api-docs.json", autenticar, asegurarRol("admin"), (req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.send(swaggerSpec);
    });
  } else {
    // Si no hay JWT_SECRET, usar el middleware swaggerAuth como fallback (Basic)
    const swaggerAuth = require("./middleware/swaggerAuth.middleware");
    app.use(
      "/api-docs",
      swaggerAuth,
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        swaggerOptions: { supportedSubmitMethods: [] },
      })
    );
    app.get("/api-docs.json", swaggerAuth, (req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.send(swaggerSpec);
    });
  }
} catch (err) {
  console.warn(
    "Advertencia: no se pudo cargar swagger-jsdoc o swagger-ui-express. Ejecuta: npm install swagger-jsdoc swagger-ui-express"
  );
}

// Middleware de registro de solicitudes
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

app.use(
  cors({
    origin: ["http://localhost:5021", "http://127.0.0.1:5021"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Configuración de vistas
app.set("views", path.join(__dirname, "../frontend/views"));
app.set("view engine", "ejs");
// Limitar tamaño del body y manejar JSON malformado de forma explícita
app.use(express.json({ limit: "100kb" }));

// Servir archivos subidos (avatars) desde backend/uploads
const uploadsPath = process.env.UPLOAD_PATH || "uploads";
const uploadsFullPath = path.join(__dirname, uploadsPath);
try {
  // Ensure directory exists
  const fs = require("fs");
  if (!fs.existsSync(uploadsFullPath))
    fs.mkdirSync(uploadsFullPath, { recursive: true });
} catch (e) {}
app.use("/uploads", express.static(uploadsFullPath));

// Middleware para interceptar SyntaxError de body-parser (JSON inválido)
app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    console.warn("JSON inválido en request:", req.method, req.url);
    return res
      .status(400)
      .json({ mensaje: "JSON inválido en el cuerpo de la petición" });
  }
  next(err);
});

// Rutas de la API
app.use("/api/categorias", categoriaRoutes);
app.use("/api/pagos", pagoRoutes);
app.use("/api/notificaciones", notificacionRoutes);
app.use("/api/logs", logRoutes);
// Registrar rutas de expertos antes de las rutas generales de usuarios
app.use("/api/usuarios/expertos", expertoRoutes);
// RUTA PÚBLICA: exponer listado de expertos para la página pública sin requerir autenticación
app.get("/api/expertos", expertoController.listarExpertos);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/asesorias", asesoriaRoutes);
// Rutas de desarrollo (solo en entornos no productivos)
app.use("/api/dev", devRoutes);

const PORT = process.env.PORT || 5020;
app.listen(PORT, () => {
  console.log(
    `Servidor API (Backend) ejecutándose en modo ${process.env.NODE_ENV} en el puerto ${PORT}`
  );
});

// Nota: anteriormente había un fetch() aquí que se ejecutaba en el entorno Node
// y causaba errores al iniciar el servidor (intento de usar fetch con URL relativa).
// El código de set-session debe ejecutarse desde el cliente (navegador) o implementarse
// como una ruta propia en el servidor si se necesita para tests.
