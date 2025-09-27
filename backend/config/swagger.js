/**
 * Configuración de Swagger (swagger-jsdoc) para generar la documentación OpenAPI.
 */
const path = require("path");
const fs = require("fs");

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Servitech API",
    version: "1.0.0",
    description: "Documentación API generada con swagger-jsdoc",
  },
  servers: [
    {
      url: "http://localhost:5020",
      description: "Servidor local",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
      },
    },
  },
};

// Generar lista de archivos .js en routes, excluyendo dev.routes.js en producción
const routesDir = path.join(__dirname, "..", "routes");
let routeFiles = fs
  .readdirSync(routesDir)
  .filter((f) => f.endsWith(".js"))
  .map((f) => path.join(routesDir, f));

if (process.env.NODE_ENV === "production") {
  routeFiles = routeFiles.filter((p) => !p.endsWith("dev.routes.js"));
}

const options = {
  swaggerDefinition,
  apis: [
    path.join(__dirname, "..", "controllers", "*.js"),
    ...routeFiles,
    path.join(__dirname, "..", "models", "*.js"),
  ],
};

module.exports = options;
