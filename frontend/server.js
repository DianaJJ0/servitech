const express = require("express");
const session = require("express-session");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3001;

// Configuración básica de middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "servitech-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // true solo si usas HTTPS
      sameSite: "lax", // Permite compartir entre puertos distintos en localhost
      domain: "localhost",
    },
  })
);

app.use("/assets", express.static(path.join(__dirname, "assets")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Ruta POST para editar perfil de experto
app.post("/editarExperto", async (req, res) => {
  try {
    // Validar sesión
    if (!req.session?.user?.token) {
      return res.status(401).render("editarExpertos", {
        experto: null,
        categorias: [],
        especialidades: [],
        habilidades: [],
        error: "No autenticado. Inicia sesión para editar tu perfil.",
        success: null,
      });
    }

    // Enviar datos al backend (API)
    const fetch = (...args) =>
      import("node-fetch").then(({ default: fetch }) => fetch(...args));
    const response = await fetch("http://localhost:3000/api/usuarios/perfil", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${req.session.user.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Error al actualizar perfil");
    }
    // Obtener datos actualizados para mostrar en la vista
    const perfilActualizado = await response.json();

    // Actualizar la sesión con los datos nuevos
    await fetch("http://localhost:3001/set-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: perfilActualizado }),
    });

    // Opcional: recargar categorías, especialidades, habilidades si se usan en la vista
    const catRes = await fetch("http://localhost:3000/api/categorias");
    const categorias = catRes.ok ? await catRes.json() : [];
    const espRes = await fetch("http://localhost:3000/api/especialidades");
    const especialidades = espRes.ok ? await espRes.json() : [];
    const habRes = await fetch("http://localhost:3000/api/habilidades");
    const habilidades = habRes.ok ? await habRes.json() : [];

    res.render("editarExpertos", {
      experto: perfilActualizado,
      categorias,
      especialidades,
      habilidades,
      error: null,
      success: "Perfil actualizado correctamente.",
    });
  } catch (err) {
    console.error("[ERROR POST editarExperto]", err);
    res.status(500).render("editarExpertos", {
      experto: null,
      categorias: [],
      especialidades: [],
      habilidades: [],
      error: err.message || "Error al actualizar perfil.",
      success: null,
    });
  }
});
/**
 * SERVIDOR FRONTEND - SERVITECH
 * Configura y arranca el servidor Express para la parte visible de la aplicación.
 */

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

// Ruta para cerrar sesión y destruir la sesión del usuario
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Error al cerrar sesión" });
    }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// Ruta para establecer el usuario en la sesión del frontend tras login
app.post("/set-session", (req, res) => {
  if (req.body && req.body.usuario) {
    req.session.user = req.body.usuario;
    return res.json({ ok: true });
  }
  res.status(400).json({ ok: false, mensaje: "Usuario no recibido" });
});

// Rutas principales y vistas
app.get("/expertos.html", async (req, res) => {
  const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
  let categorias = [];
  let expertos = [];
  try {
    const catRes = await fetch("http://localhost:3000/api/categorias");
    categorias = catRes.ok ? await catRes.json() : [];
    const expRes = await fetch("http://localhost:3000/api/expertos");
    expertos = expRes.ok ? await expRes.json() : [];
  } catch (err) {
    categorias = [];
    expertos = [];
  }
  res.render("expertos", {
    user: req.session.user || null,
    categorias,
    expertos,
  });
});
app.get("/contacto.html", (req, res) => {
  res.render("contacto", { user: req.session.user || null });
});

app.get("/", (req, res) => {
  res.render("index", { user: req.session.user || null });
});

app.get("/login.html", (req, res) => {
  res.render("login", { user: null });
});

app.get("/recuperarPassword.html", (req, res) => {
  res.render("recuperarPassword", { user: null });
});

// Nueva ruta para registro
app.get("/registro.html", (req, res) => {
  res.render("registro", { user: req.session.user || null });
});

// Ruta protegida para registro de experto (.html)
app.get("/registroExperto.html", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login.html?next=/registroExperto");
    }
    const email =
      req.session.user && req.session.user.email ? req.session.user.email : "";
    const fetch = (...args) =>
      import("node-fetch").then(({ default: fetch }) => fetch(...args)); // para obtener datos de la API
    const catRes = await fetch("http://localhost:3000/api/categorias"); // para obtener categorías
    const categorias = catRes.ok ? await catRes.json() : [];
    const espRes = await fetch("http://localhost:3000/api/especialidades");
    const especialidades = espRes.ok ? await espRes.json() : [];
    const habRes = await fetch("http://localhost:3000/api/habilidades");
    const habilidades = habRes.ok ? await habRes.json() : [];
    res.render("registroExperto", {
      user: req.session.user,
      email,
      categorias,
      especialidades,
      habilidades,
      error: null,
    });
  } catch (err) {
    console.error("[ERROR registroExperto]", err);
    res.render("registroExperto", {
      user: req.session.user,
      email:
        req.session.user && req.session.user.email
          ? req.session.user.email
          : "",
      categorias: [],
      especialidades: [],
      habilidades: [],
      error: "Error al cargar datos: " + err.message,
    });
  }
});

// Nueva ruta para registro de experto
app.get("/registroExperto", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login.html?next=/registroExperto");
    }
    const email =
      req.session.user && req.session.user.email ? req.session.user.email : "";
    const fetch = (...args) =>
      import("node-fetch").then(({ default: fetch }) => fetch(...args));
    const catRes = await fetch("http://localhost:3000/api/categorias");
    const categorias = catRes.ok ? await catRes.json() : [];
    const espRes = await fetch("http://localhost:3000/api/especialidades");
    const especialidades = espRes.ok ? await espRes.json() : [];
    const habRes = await fetch("http://localhost:3000/api/habilidades");
    const habilidades = habRes.ok ? await habRes.json() : [];
    res.render("registroExperto", {
      user: req.session.user,
      email,
      categorias,
      especialidades,
      habilidades,
      error: null,
    });
  } catch (err) {
    console.error("[ERROR registroExperto]", err);
    res.render("registroExperto", {
      user: req.session.user,
      email:
        req.session.user && req.session.user.email
          ? req.session.user.email
          : "",
      categorias: [],
      especialidades: [],
      habilidades: [],
      error: "Error al cargar datos: " + err.message,
    });
  }
});

// Ruta POST para editar perfil de experto
app.post("/editarExperto", async (req, res) => {
  try {
    // Validar sesión
    if (!req.session?.user?.token) {
      return res.status(401).render("editarExpertos", {
        experto: null,
        categorias: [],
        especialidades: [],
        habilidades: [],
        error: "No autenticado. Inicia sesión para editar tu perfil.",
        success: null,
      });
    }

    // Enviar datos al backend (API)
    const fetch = (...args) =>
      import("node-fetch").then(({ default: fetch }) => fetch(...args));
    const response = await fetch("http://localhost:3000/api/usuarios/perfil", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${req.session.user.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Error al actualizar perfil");
    }
    // Obtener datos actualizados para mostrar en la vista
    const perfilActualizado = await response.json();

    // Opcional: recargar categorías, especialidades, habilidades si se usan en la vista
    const catRes = await fetch("http://localhost:3000/api/categorias");
    const categorias = catRes.ok ? await catRes.json() : [];
    const espRes = await fetch("http://localhost:3000/api/especialidades");
    const especialidades = espRes.ok ? await espRes.json() : [];
    const habRes = await fetch("http://localhost:3000/api/habilidades");
    const habilidades = habRes.ok ? await habRes.json() : [];

    res.render("editarExpertos", {
      experto: perfilActualizado,
      categorias,
      especialidades,
      habilidades,
      error: null,
      success: "Perfil actualizado correctamente.",
    });
  } catch (err) {
    console.error("[ERROR POST editarExperto]", err);
    res.status(500).render("editarExpertos", {
      experto: null,
      categorias: [],
      especialidades: [],
      habilidades: [],
      error: err.message || "Error al actualizar perfil.",
      success: null,
    });
  }
});
// Modelos backend
const Categoria = require("../backend/models/categoria.model");
const Especialidad = require("../backend/models/especialidad.model");
const Habilidad = require("../backend/models/habilidad.model");

// Caché simple para categorías, especialidades y habilidades
let cacheCategorias = null;
let cacheEspecialidades = null;
let cacheHabilidades = null;
const cacheTTL = 10 * 60 * 1000; // 10 minutos
let lastCacheTime = 0;

// Ruta para editar perfil de experto
app.get("/editarExperto", async (req, res) => {
  try {
    if (!req.session?.user?.email) {
      return res.redirect("/login.html?next=/editarExperto");
    }
    const fetch = (...args) =>
      import("node-fetch").then(({ default: fetch }) => fetch(...args));
    // Obtener experto (usuario actual)
    let experto = null;
    if (req.session.user && req.session.user.token) {
      const perfilRes = await fetch(
        `http://localhost:3000/api/usuarios/perfil`,
        {
          headers: {
            Authorization: `Bearer ${req.session.user.token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (perfilRes.ok) {
        experto = await perfilRes.json();
      }
    }
    // Obtener categorías
    const catRes = await fetch("http://localhost:3000/api/categorias");
    const categorias = catRes.ok ? await catRes.json() : [];
    // Obtener especialidades
    const espRes = await fetch("http://localhost:3000/api/especialidades");
    const especialidades = espRes.ok ? await espRes.json() : [];
    // Obtener habilidades
    const habRes = await fetch("http://localhost:3000/api/habilidades");
    const habilidades = habRes.ok ? await habRes.json() : [];
    res.render("editarExpertos", {
      experto,
      categorias,
      especialidades,
      habilidades,
      error: null,
      success: null,
    });
  } catch (err) {
    console.error("[ERROR editarExperto]", err);
    res.render("editarExpertos", {
      experto: null,
      categorias: [],
      especialidades: [],
      habilidades: [],
      error: `Error al cargar datos: ${err.message}`,
      success: null,
    });
  }
});

// --- Arranque y Escucha del Servidor ---

// Ruta para mostrar el perfil del usuario autenticado
app.get("/perfil", async (req, res) => {
  // Si existe token en sesión, siempre consulta el backend y actualiza la sesión
  if (req.session && req.session.user && req.session.user.token) {
    const fetch = (...args) =>
      import("node-fetch").then(({ default: fetch }) => fetch(...args));
    try {
      const perfilRes = await fetch(
        "http://localhost:3000/api/usuarios/perfil",
        {
          headers: {
            Authorization: `Bearer ${req.session.user.token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (perfilRes.ok) {
        const user = await perfilRes.json();
        // Actualiza la sesión con el usuario más reciente
        req.session.user = user;
        return res.render("perfil", { user });
      } else {
        // Si el token es inválido, borra la sesión y muestra perfil vacío
        req.session.user = null;
        return res.render("perfil", { user: null });
      }
    } catch (err) {
      // Si hay error, muestra perfil vacío
      req.session.user = null;
      return res.render("perfil", { user: null });
    }
  } else {
    // Si no hay token, muestra perfil vacío
    return res.render("perfil", { user: null });
  }
});

app.listen(PORT, () => {
  console.log(
    `Servidor Frontend REINICIADO Y ACTUALIZADO en http://localhost:${PORT}`
  );
});
