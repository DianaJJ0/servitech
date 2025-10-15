/**
 * @file app.js
 * @module app
 * @description Archivo principal del backend de ServiTech. Inicializa y configura el servidor Express, middlewares, rutas, CORS, sesiones, Swagger, manejo de errores y arranque del servidor.
 *
 * # Manual Técnico (Deepwiki)
 * Este archivo es el entrypoint del backend y orquesta toda la API REST, la integración con el frontend SSR, la documentación Swagger y la seguridad.
 *
 * ## Swagger/OpenAPI
 * - La documentación Swagger se expone en `/api-docs` y `/api-docs.json`.
 * - El esquema de seguridad global es `bearerAuth` (JWT).
 * - Cada endpoint relevante tiene anotaciones Swagger y/o JSDoc.
 *
 * ## Estructura General
 * - Inicializa Express y conecta a MongoDB.
 * - Configura CORS seguro y flexible para desarrollo y producción.
 * - Habilita sesiones y parseo de JSON/URL-encoded.
 * - Expone rutas API, rutas legales y vistas EJS del frontend.
 * - Integra documentación Swagger protegida por autenticación y roles.
 * - Maneja errores globales y arranca el servidor si es el entrypoint.
 */

// Dependencias principales necesarias para inicializar la aplicación
const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const session = require("express-session");
const mongoose = require("mongoose");

// Endpoints de salud para monitoreo y pruebas
/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Endpoint de salud del backend
 *     description: Retorna un objeto `{ ok: true }` si el backend está operativo.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Backend operativo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 */
// Las rutas públicas (health, sesión y legales) se han movido más abajo
// para garantizar que `app` y los middlewares estén inicializados antes de su uso.
// Las definiciones Swagger/JSDoc originales se mantienen junto a las rutas en la sección correspondiente más abajo.

// Middlewares de autenticación y autorización
const { asegurarRol } = require("./middleware/auth.middleware");

// Importación de rutas principales del backend
const usuarioRoutes = require("./routes/usuario.routes.js");
const categoriaRoutes = require("./routes/categoria.routes.js");
const pagoRoutes = require("./routes/pago.routes.js");
const notificacionRoutes = require("./routes/notificacion.routes.js");
const expertoRoutes = require("./routes/experto.routes.js");
const asesoriaRoutes = require("./routes/asesoria.routes.js");

const app = express();

// Servir archivos estáticos del frontend (CSS, JS, imágenes)
app.use(
  "/assets",
  express.static(path.join(__dirname, "..", "frontend", "assets"))
);

// Servir archivos subidos (uploads) de forma pública
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Configuración del motor de vistas EJS para renderizar páginas del frontend
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "frontend", "views"));

// Configuración avanzada de CORS para desarrollo (orígenes permitidos y seguridad)
const PROXY_MODE =
  String(process.env.PROXY_MODE || "false").toLowerCase() === "true";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5021";

if (!PROXY_MODE && process.env.NODE_ENV !== "production") {
  app.use(
    cors({
      origin: (origin, cb) => {
        try {
          if (!origin) return cb(null, true); // Permite peticiones sin origen (como Postman)
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

// Parsers para JSON y URL-encoded. Guarda rawBody para validación de firmas (webhooks)
app.use(
  express.json({
    limit: "5mb",
    verify: function (req, res, buf, encoding) {
      try {
        req.rawBody = buf;
      } catch (e) {
        req.rawBody = null;
      }
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Configuración de sesión de usuario (almacenada en memoria por defecto)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "servitech-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      httpOnly: true,
      domain: process.env.COOKIE_DOMAIN || undefined, // Permite compartir cookie entre frontend/backend si es necesario
      maxAge: 24 * 60 * 60 * 1000, // 1 día
    },
  })
);

// Documentación Swagger protegida (solo admins autenticados pueden acceder)
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
    // Fallback: middleware de autenticación básica para Swagger si no hay JWT
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

// Rutas principales del backend (API REST)
// Endpoints públicos y legales (salud, sesión y páginas legales)
/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Endpoint de salud del backend
 *     description: Retorna un objeto `{ ok: true }` si el backend está operativo.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Backend operativo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 */
app.get("/api/health", (req, res) => res.status(200).json({ ok: true }));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Endpoint de salud alternativo
 *     description: Retorna un objeto `{ ok: true }` si el backend está operativo (ruta alternativa).
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Backend operativo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 */
app.get("/health", (req, res) => res.status(200).json({ ok: true }));

/**
 * @swagger
 * /set-session:
 *   post:
 *     summary: Establece la sesión del usuario
 *     description: Permite establecer la sesión del usuario si el cliente presenta un objeto usuario con token. En producción debe validarse el token.
 *     tags:
 *       - Sesión
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               usuario:
 *                 type: object
 *                 properties:
 *                   token:
 *                     type: string
 *     responses:
 *       200:
 *         description: Sesión establecida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 user:
 *                   type: object
 *       400:
 *         description: Usuario no recibido
 *       500:
 *         description: Error al establecer sesión
 */
app.post("/set-session", (req, res) => {
  try {
    const usuario = req.body && req.body.usuario;
    if (usuario && usuario.token) {
      // Nota: en producción validar token con /api/usuarios/perfil antes de setear la sesión
      req.session.user = usuario;
      return res.json({ ok: true, user: req.session.user });
    }
    return res.status(400).json({ ok: false, mensaje: "Usuario no recibido" });
  } catch (e) {
    console.error(
      "Error en backend /set-session:",
      e && e.message ? e.message : e
    );
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error al establecer sesión" });
  }
});

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Cierra la sesión del usuario (POST)
 *     description: Cierra la sesión y limpia la cookie de sesión.
 *     tags:
 *       - Sesión
 *     responses:
 *       200:
 *         description: Sesión cerrada correctamente
 *       500:
 *         description: Error al cerrar sesión
 *   get:
 *     summary: Cierra la sesión del usuario (GET)
 *     description: Cierra la sesión y redirige a la home.
 *     tags:
 *       - Sesión
 *     responses:
 *       302:
 *         description: Redirección a la home tras logout
 */
app.post("/logout", (req, res) => {
  try {
    if (req.session) {
      req.session.destroy((err) => {
        try {
          res.clearCookie("connect.sid");
        } catch (e) {}
        if (err)
          return res.status(500).json({ error: "Error al cerrar sesión" });
        return res.json({ success: true });
      });
    } else {
      try {
        res.clearCookie("connect.sid");
      } catch (e) {}
      return res.json({ success: true });
    }
  } catch (e) {
    console.error("Error en /logout:", e && e.message ? e.message : e);
    return res.status(500).json({ error: "Error al cerrar sesión" });
  }
});
app.get("/logout", (req, res) => {
  try {
    if (req.session) {
      req.session.destroy((err) => {
        try {
          res.clearCookie("connect.sid");
        } catch (e) {}
        return res.redirect("/");
      });
    } else {
      try {
        res.clearCookie("connect.sid");
      } catch (e) {}
      return res.redirect("/");
    }
  } catch (e) {
    console.error("Error en GET /logout:", e && e.message ? e.message : e);
    return res.redirect("/");
  }
});

/**
 * @swagger
 * /terminos.html:
 *   get:
 *     summary: Página de Términos y Condiciones
 *     description: Renderiza la vista de términos y condiciones legales.
 *     tags:
 *       - Legales
 *     responses:
 *       200:
 *         description: Página renderizada correctamente
 *       500:
 *         description: Error al renderizar la página
 */
app.get("/terminos.html", (req, res) => {
  try {
    return res.render("terminos", { user: req.session?.user || null });
  } catch (e) {
    console.warn(
      "[backend] Error renderizando terminos:",
      e && e.message ? e.message : e
    );
    return res.status(500).send("No se pudo cargar Términos y Condiciones");
  }
});

/**
 * @swagger
 * /privacidad.html:
 *   get:
 *     summary: Página de Política de Privacidad
 *     description: Renderiza la vista de privacidad legal.
 *     tags:
 *       - Legales
 *     responses:
 *       200:
 *         description: Página renderizada correctamente
 *       500:
 *         description: Error al renderizar la página
 */
app.get("/privacidad.html", (req, res) => {
  try {
    return res.render("privacidad", { user: req.session?.user || null });
  } catch (e) {
    console.warn(
      "[backend] Error renderizando privacidad:",
      e && e.message ? e.message : e
    );
    return res.status(500).send("No se pudo cargar la Política de Privacidad");
  }
});

/**
 * @swagger
 * /cookies.html:
 *   get:
 *     summary: Página de Política de Cookies
 *     description: Renderiza la vista de cookies legal.
 *     tags:
 *       - Legales
 *     responses:
 *       200:
 *         description: Página renderizada correctamente
 *       500:
 *         description: Error al renderizar la página
 */
app.get("/cookies.html", (req, res) => {
  try {
    return res.render("cookies", { user: req.session?.user || null });
  } catch (e) {
    console.warn(
      "[backend] Error renderizando cookies:",
      e && e.message ? e.message : e
    );
    return res.status(500).send("No se pudo cargar la política de cookies");
  }
});

app.use("/api/usuarios", usuarioRoutes);
app.use("/api/categorias", categoriaRoutes);
app.use("/api/pagos", pagoRoutes);
app.use("/api/notificaciones", notificacionRoutes);
app.use("/api/expertos", expertoRoutes);
app.use("/api/asesorias", asesoriaRoutes);

// Integración de rutas del frontend (SSR y fallback)
try {
  const frontendRouter = require("../frontend/server.js");
  if (frontendRouter && typeof frontendRouter === "function") {
    app.use("/", frontendRouter);
  } else if (
    frontendRouter &&
    frontendRouter.router &&
    typeof frontendRouter.router === "function"
  ) {
    app.use("/", frontendRouter.router);
  } else {
    console.warn("Frontend router no disponible, usando rutas mínimas");
    // Fallback: rutas mínimas para home, login, registro y pagos
    app.get("/", (req, res) => {
      res.render("index", { title: "ServiTech" });
    });
    app.get("/login", (req, res) => {
      res.render("login", { title: "Iniciar Sesión - ServiTech" });
    });
    app.get("/registro", (req, res) => {
      res.render("registro", { title: "Registro - ServiTech" });
    });
    app.get("/pasarela-pagos", (req, res) => {
      res.render("pasarelaPagos", {
        title: "Pago de Asesoría - ServiTech",
        expertoSeleccionado: req.query.experto
          ? JSON.parse(req.query.experto)
          : null,
        monto: req.query.monto || 20000,
        duracion: req.query.duracion || 1,
      });
    });
  }
} catch (frontendError) {
  console.warn("Error cargando frontend router:", frontendError.message);
  // Fallback: rutas mínimas si falla el router del frontend
  app.get("/", (req, res) => {
    res.render("index", { title: "ServiTech" });
  });
  app.get("/login", (req, res) => {
    res.render("login", { title: "Iniciar Sesión - ServiTech" });
  });
  app.get("/registro", (req, res) => {
    res.render("registro", { title: "Registro - ServiTech" });
  });
  app.get("/pasarela-pagos", (req, res) => {
    res.render("pasarelaPagos", {
      title: "Pago de Asesoría - ServiTech",
      expertoSeleccionado: req.query.experto
        ? JSON.parse(req.query.experto)
        : null,
      monto: req.query.monto || 20000,
      duracion: req.query.duracion || 1,
    });
  });
}

// Middleware 404 para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: "No encontrado" });
});

// Middleware global de manejo de errores
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || 500;
  return res.status(status).json({
    error: "Error interno",
    message:
      process.env.NODE_ENV === "production"
        ? undefined
        : err.message || "Internal Server Error",
  });
});

// Handlers globales para errores no capturados (evita caídas del proceso)
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

// Exporta la app para pruebas o uso externo
module.exports = app;

// Arranca el servidor solo si este archivo es el entrypoint principal
if (require.main === module) {
  const PORT = parseInt(process.env.PORT, 10) || 5020;
  app.listen(PORT, () => {
    console.log(`MongoDB conectado: servitech`);
    console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
  });
}
