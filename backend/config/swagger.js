/**
 * ---------------------------------------------
 * Configuración de Swagger (swagger-jsdoc) para documentación OpenAPI
 * ---------------------------------------------
 * Este módulo permite:
 * - Definir la especificación base OpenAPI para la API de Servitech
 * - Configurar los esquemas de seguridad (JWT y API Key)
 * - Generar la lista de archivos a documentar automáticamente
 *
 * @module config/swagger
 * @author Equipo Servitech
 */

const path = require("path");
const fs = require("fs");

// Definición base de la especificación OpenAPI
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

// Genera la lista de archivos de rutas a documentar (excluye dev.routes.js en producción)
const routesDir = path.join(__dirname, "..", "routes");
let routeFiles = fs
  .readdirSync(routesDir)
  .filter((f) => f.endsWith(".js"))
  .map((f) => path.join(routesDir, f));

if (process.env.NODE_ENV === "production") {
  routeFiles = routeFiles.filter((p) => !p.endsWith("dev.routes.js"));
}

// Opciones para swagger-jsdoc
const options = {
  swaggerDefinition,
  apis: [
    path.join(__dirname, "..", "controllers", "*.js"),
    ...routeFiles,
    path.join(__dirname, "..", "models", "*.js"),
  ],
};

// Exporta la configuración para ser usada en app.js
module.exports = options;
