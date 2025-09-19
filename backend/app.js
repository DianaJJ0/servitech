/**
 * ARCHIVO PRINCIPAL DEL SERVIDOR API - SERVITECH (rama develop)
 * - Express API con CORS seguro
 * - Swagger (swagger-jsdoc + swagger-ui-express) con esquema bearerAuth

 */

require("dotenv").config();
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
const logRoutes = require("./routes/log.routes.js");
const expertoRoutes = require("./routes/experto.routes.js");
const asesoriaRoutes = require("./routes/asesoria.routes.js");
const perfilExpertoRoutes = require("./routes/perfilExperto.js");
const devRoutes = require("./routes/dev.routes.js");

// Conecta a la base de datos
conectarDB();

const app = express();

// --- INICIO: Integración con Frontend ---
// Servir assets estáticos del frontend
app.use(
  "/assets",
  express.static(path.join(__dirname, "..", "frontend", "assets"))
);

// Servir uploads (si es necesario que sean públicos)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Configurar EJS como motor de vistas, apuntando a las vistas del frontend
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "frontend", "views"));
// --- FIN: Integración con Frontend ---

// --- Nuevo: log simple de peticiones API para depuración de Authorization ---
app.use((req, res, next) => {
  try {
    if (String(req.path || "").startsWith("/api")) {
      const auth =
        req.headers && (req.headers.authorization || req.headers.Authorization);
      console.log(
        `API request -> ${req.method} ${req.originalUrl} | Authorization: ${
          auth ? "present" : "missing"
        }`
      );
      // opcional: para menos ruido, comentar la siguiente línea
      // console.debug("Headers:", Object.keys(req.headers).reduce((o,k)=> (o[k]=req.headers[k],o), {}));
    }
  } catch (e) {}
  next();
});

// Aviso si no hay fetch nativo en este runtime
if (typeof globalThis.fetch !== "function") {
  console.warn(
    "Aviso: global fetch no disponible en este runtime. Se recomienda Node >= 18 para usar fetch nativo."
  );
}

const PROXY_MODE =
  String(process.env.PROXY_MODE || "false").toLowerCase() === "true";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5021";

// Activar CORS únicamente en desarrollo cuando no usamos proxy.
// Si PROXY_MODE=true asumimos que el frontend hará proxy y no necesitamos abrir CORS en producción.
if (!PROXY_MODE && process.env.NODE_ENV !== "production") {
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || origin === FRONTEND_URL) return cb(null, true);
        return cb(new Error("Origen no permitido por CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "x-api-key",
      ],
      exposedHeaders: ["Content-Disposition"],
    })
  );
  console.log(
    "CORS habilitado en entorno de desarrollo, origen permitido:",
    FRONTEND_URL
  );
} else {
  console.log(
    `CORS deshabilitado (PROXY_MODE=${PROXY_MODE}, NODE_ENV=${process.env.NODE_ENV})`
  );
}

// Parsers
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// Sesión simple (si usas Redis, configúralo en otra capa)
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

// Salud
/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Sistema]
 *     summary: Verifica el estado de la API
 *     responses:
 *       200:
 *         description: OK
 */
app.get("/api/health", (req, res) => res.status(200).json({ ok: true }));

// Health simple (útil para checks desde frontend / infra)
app.get("/health", (req, res) => res.status(200).json({ ok: true }));

// Swagger (swagger-jsdoc + swagger-ui-express)
try {
  const swaggerJSDoc = require("swagger-jsdoc");
  const swaggerUi = require("swagger-ui-express");
  const swaggerOptions = require("./config/swagger"); // Archivo aparte con opciones
  const swaggerSpec = swaggerJSDoc(swaggerOptions);

  // Security Schemes
  if (!swaggerSpec.components) swaggerSpec.components = {};
  if (!swaggerSpec.components.securitySchemes) {
    swaggerSpec.components.securitySchemes = {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    };
  }
  swaggerSpec.security = [{ bearerAuth: [] }];

  // Protege documentación con JWT + admin
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
    // Fallback básico si falta JWT_SECRET
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
  console.warn("Swagger no inicializado:", e && e.message);
}

// Corregir import del middleware de auth - usar destructuring para obtener la función autenticar
console.log("DEBUG: Importando middleware de autenticación...");
const { autenticar } = require("./middleware/auth.middleware");
console.log("DEBUG: Middleware de autenticación importado correctamente");

// Asegurar que el middleware de auth se aplique a rutas API
// Aplicar middleware de auth a todas las rutas /api
console.log("DEBUG: Aplicando middleware de autenticación a /api");
app.use("/api", autenticar);

// Rutas de dominio (MOVIDAS ANTES DEL FRONTEND ROUTER)
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/categorias", categoriaRoutes);
app.use("/api/pagos", pagoRoutes);
app.use("/api/notificaciones", notificacionRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/expertos", expertoRoutes);
app.use("/api/asesorias", asesoriaRoutes);
app.use("/api/perfil-experto", perfilExpertoRoutes);
app.use("/api/dev", devRoutes);

// --- INICIO: Integración de rutas del frontend ---
// Importar y usar el servidor del frontend como un router.
// Esto nos permite usar las rutas de renderizado de vistas (/, /login, /perfil, etc.)
const frontendRouter = require("../frontend/server.js");
app.use("/", frontendRouter);
// --- FIN: Integración de rutas del frontend ---

// 404 controlado
app.use((req, res) => {
  res.status(404).json({ error: "No encontrado" });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error("Error:", err && (err.stack || err.message || err));
  const status = err.status || 500;
  res.status(status).json({
    error: "Error interno",
    message:
      process.env.NODE_ENV === "production"
        ? undefined
        : err.message || "Internal Server Error",
  });
});

// --- Nuevo: handlers globales para errores no capturados ---
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err && (err.stack || err.message || err));
  // Notar: normalmente conviene reiniciar el proceso; aquí solo logueamos para depuración.
});

process.on("unhandledRejection", (reason, p) => {
  console.error(
    "unhandledRejection at:",
    p,
    "reason:",
    reason && (reason.stack || reason)
  );
  // Notar: registra razones de promesas rechazadas sin catch.
});

module.exports = app;

// Si se ejecuta este archivo directamente (node app.js), arrancar el servidor.
// Por defecto usa el puerto 5020 si no hay process.env.PORT definido.
if (require.main === module) {
  const PORT = parseInt(process.env.PORT, 10) || 5020;
  app.listen(PORT, () => {
    console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
  });
}
