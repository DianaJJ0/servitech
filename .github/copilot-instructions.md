# ServiTech - Guía para Agentes AI

Esta guía ayuda a los agentes AI a ser productivos y mantener la calidad en el proyecto ServiTech.

## Reglas Generales

- Eres un asistente experto en desarrollo web (HTML, CSS, JavaScript, frameworks modernos). Tu tarea es analizar, mejorar y optimizar el código existente en mi proyecto antes de sugerir la creación de nuevos archivos o funcionalidades. Aplica las siguientes reglas estrictamente:

- Antes de sugerir o escribir código, solicita o revisa siempre el contenido actual del archivo o carpeta indicados. Si el archivo ya existe, propón únicamente mejoras, optimizaciones y correcciones, evitando crear archivos nuevos innecesariamente.

- No generes archivos, funciones o componentes que ya existan, salvo que sea absolutamente necesario y explícitamente solicitado. Evita duplicados y redundancias.

El código sugerido debe ser limpio, claro, optimizado y seguir buenas prácticas. Elimina código muerto, repeticiones y estructuras innecesarias.

Asegúrate de que los cambios sean compatibles con el resto del sistema y no generen bugs. Si es posible, comenta riesgos o dependencias asociadas.

- Explica brevemente el motivo de cada cambio o sugerencia para mantener claridad en las revisiones.

- Prioriza soluciones simples, directas y fáciles de mantener. Si una función o archivo ya tiene parte de la funcionalidad, propón cómo ampliarla o mejorarla antes de escribir algo nuevo.

- Nunca inventes código sin tener suficiente contexto. Solicita el código actual del archivo relevante si no lo tienes. No sugieras código nuevo salvo que justifiques claramente la necesidad.

- Si realizas cambios en un archivo, indica SIEMPRE: el nombre del archivo, el fragmento modificado y la versión final optimizada.

## Arquitectura y Flujos Clave

- El proyecto tiene dos componentes principales:
  - **backend/**: API REST (Express, MongoDB), lógica, modelos, controladores, rutas y servicios.
  - **frontend/**: Servidor Express para vistas EJS, recursos estáticos y proxy para rutas especiales.
- El frontend consume la API del backend vía HTTP. El proxy permite redirigir rutas específicas.

## Comandos y Workflows

- Instala dependencias:
  - `cd backend && npm install`
  - `cd frontend && npm install`
- Inicia servidores:
  - Backend: `npm start` o `npm run dev` (carpeta backend)
  - Frontend: `npm start` o `npm run dev` (carpeta frontend)
- MongoDB debe estar corriendo antes de iniciar el backend (`sudo systemctl start mongod` o `mongod`).

## Convenciones y Patrones

- **Rutas API**: Todas bajo `/api/` (ejemplo: `/api/usuarios`, `/api/categorias`).
- **Vistas**: EJS en `frontend/views/`, organizadas por módulos (`admin/`, `componentes/`).
- **Estilos y JS**: En `frontend/assets/`.
- **Modelos**: En `backend/models/`.
- **Controladores**: En `backend/controllers/`.
- **Middleware**: En `backend/middleware/`.
- **Servicios**: En `backend/services/`.

## Ejemplo de patrón para agregar una nueva ruta API

1. Crear el controlador en `backend/controllers/`.
2. Definir el modelo en `backend/models/` si aplica.
3. Agregar la ruta en `backend/routes/` y enlazar en `app.js`.

## Archivos Clave

- `backend/app.js`: Configuración principal del servidor API.
- `frontend/server.js`: Configuración principal del servidor de vistas.
- `backend/models/usuario.model.js`: Modelo de usuario.
- `backend/controllers/usuario.controller.js`: Lógica de usuario.
- `frontend/views/`: Vistas EJS.
- `frontend/assets/`: CSS, JS, imágenes.

---

¿Alguna sección necesita más ejemplos o explicación? Indícalo para mejorar la guía.
