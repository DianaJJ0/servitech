# Servitech — Guía rápida: acceder al panel de administradores (admin)

Este documento explica, de forma clara y didáctica, los pasos necesarios para crear una sesión de administrador en un entorno de desarrollo local y abrir el panel de administración de expertos. Está pensado para usarse cuando tengas el backend en `:3000` y el frontend en `:3001`.

Checklist rápido antes de empezar

Pasos para acceder (recomendado: en el navegador)

1. Arrancar los servidores

En dos terminales separados ejecuta:

```bash
# backend
cd backend
NODE_ENV=development node app.js

# frontend (IMPORTANTE: arrancar con API_KEY en el entorno para que el proxy inyecte x-api-key)
cd frontend
API_KEY=tu_api_key node server.js
```

Nota: reemplaza `tu_api_key` por el valor correcto definido en tu `.env` o el que uses localmente.

# ServiTech — Guía de instalación y puesta en marcha

Este README describe cómo instalar, configurar y ejecutar ServiTech en local. Contiene pasos para poner en marcha tanto el backend (API) como el frontend (servidor de vistas EJS), cómo crear una sesión admin de desarrollo y consejos de seguridad.

Índice

## Resumen

ServiTech está dividido en dos componentes principales:

El frontend usa `express-session` para sesiones y el proxy reenvía Authorization y (si procede) inyecta `x-api-key` desde el servidor.

## Requisitos

## Estructura relevante del repo

```
servitech/
  backend/
    app.js
    package.json
    config/database.js
    routes/
    ...
  frontend/
    server.js
    package.json
    views/
    assets/
  .gitignore
  README.md
```

## Variables de entorno

Coloca variables sensibles en `backend/.env` (no lo subas). Ejemplo mínimo:

`backend/.env`:

```
MONGO_URI=mongodb://localhost:27017/servitech
JWT_SECRET=mi_jwt_secreto_dev
PORT=3000
NODE_ENV=development
```

`frontend` (opcional, puedes exportar la variable antes de arrancar):

```
PORT=3001
API_KEY=mi_api_key_secreta
```

## Instalación

Instala dependencias por separado en `backend` y `frontend`:

```bash
# Backend
cd /home/pc/Documentos/servitech/backend
npm install

# Frontend
cd /home/pc/Documentos/servitech/frontend
npm install
```

## Ejecutar el backend

Por defecto el backend usa `dotenv` y leerá `backend/.env`.

```bash
cd /home/pc/Documentos/servitech/backend
# modo desarrollo (si tienes nodemon)
npm run dev
# o producción / simple
npm start
```

El backend escuchará en `http://localhost:3000` a menos que cambies `PORT`.

## Ejecutar el frontend

El frontend sirve vistas EJS y el proxy para `/api`.

```bash
cd /home/pc/Documentos/servitech/frontend
# modo desarrollo
npm run dev
# o
npm start
```

Por defecto escucha en `http://localhost:3001`.

## Crear admin de desarrollo y obtener JWT

El proyecto puede incluir una ruta de desarrollo para crear un admin (en `backend/routes/dev.routes.js`) o un script en `backend/scripts`.

Ejemplo usando curl (si la ruta existe):

```bash
curl -s -X POST http://localhost:3000/api/dev/create-admin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Password123!","nombre":"Admin Dev"}'
```

Dependiendo de la implementación, el endpoint puede devolver el token en JSON o escribirlo en `/tmp/admin_token.txt`.

## Establecer sesión admin en el frontend

El frontend expone `/set-session` para establecer `req.session.user` durante desarrollo. Úsalo para simular sesión admin.

Ejemplo con curl (constructor de sesión):

```bash
# Usando un JWT obtenido (opcional)
curl -X POST http://localhost:3001/set-session \
  -H "Content-Type: application/json" \
  -d '{"usuario":{"roles":["admin"],"token":"TU_JWT_AQUI","email":"admin@test.com"}}'
```

Alternativa: desde la consola del navegador (sitio en http://localhost:3001):

```javascript
fetch("/set-session", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ usuario: { roles: ["admin"], token: "TU_JWT_AQUI" } }),
})
  .then((r) => r.json())
  .then(console.log);
```

Después abre la ruta del panel de admin:

```
http://localhost:3001/admin/adminExpertos
```

## Probar el proxy

El frontend reenvía `/api/*` a `http://localhost:3000/api/*`. Hay una ruta de prueba:

```bash
curl http://localhost:3001/test-proxy
# debe devolver {"message":"Proxy test route working"}
```

## Problemas comunes

## Buenas prácticas de seguridad

## Crear un `backend/.env.example` sugerido

```
# /backend/.env.example
MONGO_URI=
JWT_SECRET=
PORT=3000
NODE_ENV=development
```

## Consejos para desarrollo rápido

```bash
export MONGO_URI='mongodb://localhost:27017/servitech'
export JWT_SECRET='mi_jwt_secreto_dev'
export API_KEY='mi_api_key_local'   # si lo necesitas
```

## Contribuir

Si quieres que cree `backend/.env.example` y lo añada al repo, o que prepare un pequeño script para automatizar la creación de la sesión admin en local, indícalo y lo implemento.

Documentación generada para el repositorio ServiTech.

# servitech
