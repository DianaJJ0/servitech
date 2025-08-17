# Guía técnica: API de Categorías, Especialidades y Habilidades

Este documento explica cómo se implementó la funcionalidad para consultar y gestionar las opciones de Categorías, Especialidades y Habilidades en el backend de ServiTech, y cómo se conectan con el frontend para el registro de expertos.

---

## Objetivo

Permitir que el frontend obtenga dinámicamente las opciones de categorías, especialidades y habilidades tecnológicas desde la base de datos, usando endpoints RESTful.

---

## Estructura de archivos

- `/backend/controllers/categoria.controller.js`
- `/backend/controllers/especialidad.controller.js`
- `/backend/controllers/habilidad.controller.js`
- `/backend/routes/categoria.routes.js`
- `/backend/routes/especialidad.routes.js`
- `/backend/routes/habilidad.routes.js`
- `/backend/inicializar.js`

---

## Paso a paso y explicación de cada archivo

### 1. Controladores

#### `/backend/controllers/categoria.controller.js`

- **¿Qué hace?**: Define la lógica para crear y consultar categorías.
- **Líneas clave:**
  - `const Categoria = require("../models/categoria.model.js");` → Importa el modelo de categoría.
  - `obtenerCategorias` → Consulta todas las categorías ordenadas por nombre y las devuelve en formato JSON.
  - `crearCategoria` → Permite crear una nueva categoría si no existe.
- **¿Por qué aquí?**: Centraliza la lógica de negocio de categorías, separando la consulta y manipulación de datos del manejo de rutas.

#### `/backend/controllers/especialidad.controller.js`

- **¿Qué hace?**: Permite consultar todas las especialidades tecnológicas.
- **Líneas clave:**
  - `const Especialidad = require("../models/especialidad.model");` → Importa el modelo.
  - `exports.getAll` → Devuelve todas las especialidades en formato JSON.
- **¿Por qué aquí?**: Mantiene la lógica de especialidades separada y reutilizable.

#### `/backend/controllers/habilidad.controller.js`

- **¿Qué hace?**: Permite consultar todas las habilidades tecnológicas.
- **Líneas clave:**
  - `const Habilidad = require("../models/habilidad.model");` → Importa el modelo.
  - `exports.getAll` → Devuelve todas las habilidades en formato JSON.
- **¿Por qué aquí?**: Facilita la consulta y gestión de habilidades desde un único lugar.

---

### 2. Rutas

#### `/backend/routes/categoria.routes.js`

- **¿Qué hace?**: Define los endpoints para consultar y administrar categorías.
- **Líneas clave:**
  - `router.get("/", categoriaController.obtenerCategorias);` → Endpoint público para obtener todas las categorías.
  - `router.post`, `router.put`, `router.delete` → Endpoints protegidos para crear, editar y eliminar categorías.
- **¿Por qué aquí?**: Separa la definición de rutas de la lógica de negocio, siguiendo buenas prácticas de Express.

#### `/backend/routes/especialidad.routes.js`

- **¿Qué hace?**: Expone el endpoint para consultar especialidades.
- **Líneas clave:**
  - `router.get("/", especialidadController.getAll);` → Endpoint público para obtener todas las especialidades.
- **¿Por qué aquí?**: Permite que el frontend consulte las especialidades de forma sencilla.

#### `/backend/routes/habilidad.routes.js`

- **¿Qué hace?**: Expone el endpoint para consultar habilidades.
- **Líneas clave:**
  - `router.get("/", habilidadController.getAll);` → Endpoint público para obtener todas las habilidades.
- **¿Por qué aquí?**: Facilita la consulta de habilidades desde el frontend.

---

### 3. Inicialización

#### `/backend/inicializar.js`

- **¿Qué hace?**: Script para poblar la base de datos con categorías, especialidades y habilidades iniciales.
- **¿Por qué aquí?**: Permite cargar datos de ejemplo o básicos al iniciar el proyecto, asegurando que el frontend tenga opciones disponibles desde el primer uso.
- **Uso típico:** Se ejecuta una vez al instalar el sistema o cuando se necesita resetear los datos base.

---

## Resumen del flujo

1. El frontend realiza una petición GET a `/api/categorias`, `/api/especialidades` y `/api/habilidades`.
2. El backend responde con los datos en formato JSON, consultando la base de datos mediante los controladores.
3. El frontend muestra las opciones en los selectores del formulario de registro de experto.
4. Si se requiere modificar las opciones, se puede usar el script de inicialización para poblar o resetear los datos.

---

## Buenas prácticas aplicadas

- Separación de lógica (controladores) y rutas (endpoints).
- Uso de modelos para mantener la estructura de datos.
- Endpoints RESTful claros y documentados.
- Script de inicialización para facilitar el desarrollo y pruebas.

---

¿Dudas sobre algún archivo o flujo? Puedes consultar este README para entender cómo se conecta cada parte y cómo se puede extender la funcionalidad.
