/**
 * ARCHIVO PRINCIPAL DEL SERVIDOR API - SERVITECH
 * - Express API con CORS seguro
 * - Swagger (swagger-jsdoc + swagger-ui-express) con esquema bearerAuth
 */

require("dotenv").config();
require("./services/cronLiberarPagos.js");
const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");

// DB
const conectarDB = require("./config/database.js");

// Middlewares de auth
const { asegurarRol } = require("./middleware/auth.middleware");

// Rutas
const usuarioRoutes = require("./routes/usuario.routes.js");
const categoriaRoutes = require("./routes/categoria.routes.js");
const pagoRoutes = require("./routes/pago.routes.js");
const notificacionRoutes = require("./routes/notificacion.routes.js");
const expertoRoutes = require("./routes/experto.routes.js");
const asesoriaRoutes = require("./routes/asesoria.routes.js");
const perfilExpertoRoutes = require("./routes/perfilExperto.js");
// Conecta a la base de datos y muestra mensaje solo si hay error o éxito
conectarDB();

const app = express();

// Servir assets estáticos del frontend
app.use(
  "/assets",
  express.static(path.join(__dirname, "..", "frontend", "assets"))
);

// Servir uploads (si es necesario que sean públicos)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Motor de vistas EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "frontend", "views"));

// Middleware CORS, solo mostrar mensaje si hay error o CORS activo
const PROXY_MODE =
  String(process.env.PROXY_MODE || "false").toLowerCase() === "true";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5021";

if (!PROXY_MODE && process.env.NODE_ENV !== "production") {
  app.use(
    cors({
      origin: (origin, cb) => {
        try {
          if (!origin) return cb(null, true);
          const allowed = new Set(
            [
              FRONTEND_URL,
              process.env.BACKEND_URL || process.env.APP_URL,
              process.env.RENDER_EXTERNAL_URL,
            ].filter(Boolean)
          );
          if (allowed.has(origin)) return cb(null, true);
          if (typeof origin === "string" && origin.endsWith(".onrender.com"))
            return cb(null, true);
          if (
            String(process.env.ALLOW_ALL_ORIGINS || "").toLowerCase() === "true"
          )
            return cb(null, true);
          return cb(new Error("Origen no permitido por CORS"));
        } catch (e) {
          return cb(new Error("Origen no permitido por CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "x-api-key",
        "x-csrf-token",
        "X-CSRF-Token",
      ],
      exposedHeaders: ["Content-Disposition"],
    })
  );
  console.log(
    "CORS habilitado en entorno de desarrollo, origen permitido:",
    FRONTEND_URL
  );
}

// Parsers
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// Sesión simple
app.use(
  session({
    secret: process.env.SESSION_SECRET || "servitech-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

// Endpoint de salud
app.get("/api/health", (req, res) => res.status(200).json({ ok: true }));
app.get("/health", (req, res) => res.status(200).json({ ok: true }));

// Swagger sólo muestra mensaje si hay error
try {
  const swaggerJSDoc = require("swagger-jsdoc");
  const swaggerUi = require("swagger-ui-express");
  const swaggerOptions = require("./config/swagger");
  const swaggerSpec = swaggerJSDoc(swaggerOptions);

  if (!swaggerSpec.components) swaggerSpec.components = {};
  if (!swaggerSpec.components.securitySchemes) {
    swaggerSpec.components.securitySchemes = {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    };
  }
  swaggerSpec.security = [{ bearerAuth: [] }];

  const { autenticar } = require("./middleware/auth.middleware");
  if (process.env.JWT_SECRET) {
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
} catch (e) {
  // Solo mostrar si ocurre un error real de inicialización de Swagger
  console.warn("Swagger no inicializado:", e && e.message);
}

// Rutas de dominio
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/categorias", categoriaRoutes);
app.use("/api/pagos", pagoRoutes);
app.use("/api/notificaciones", notificacionRoutes);
app.use("/api/expertos", expertoRoutes);
app.use("/api/asesorias", asesoriaRoutes);
app.use("/api/perfil-experto", perfilExpertoRoutes);
// app.use("/api/dev", devRoutes); // Descomenta si usas rutas de desarrollo

// Integración de rutas del frontend
const frontendRouter = require("../frontend/server.js");
app.use("/", frontendRouter);

// 404 controlado
app.use((req, res) => {
  res.status(404).json({ error: "No encontrado" });
});

// Manejo de errores
app.use((err, req, res, next) => {
  // Solo muestra en consola en desarrollo o ante error crítico
  if (process.env.NODE_ENV !== "production" || err.status >= 500) {
    console.error("Error:", err && (err.stack || err.message || err));
  }
  const status = err.status || 500;
  res.status(status).json({
    error: "Error interno",
    message:
      process.env.NODE_ENV === "production"
        ? undefined
        : err.message || "Internal Server Error",
  });
});

// Handlers globales para errores no capturados
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err && (err.stack || err.message || err));
});

process.on("unhandledRejection", (reason, p) => {
  console.error(
    "unhandledRejection at:",
    p,
    "reason:",
    reason && (reason.stack || reason)
  );
});

module.exports = app;

// Arrancar el servidor solo si este archivo es el principal
if (require.main === module) {
  const PORT = parseInt(process.env.PORT, 10) || 5020;
  app.listen(PORT, () => {
    console.log(`MongoDB conectado: servitech`);
    console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
  });
}
