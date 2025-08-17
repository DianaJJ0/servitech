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

## Análisis y sentido del diseño

La estructura de controladores, rutas y script de inicialización responde a las mejores prácticas de desarrollo backend moderno:

- **Modularidad:** Cada entidad (categoría, especialidad, habilidad) tiene su propio controlador y ruta, lo que facilita la extensión y el mantenimiento del sistema. Si se requiere agregar nuevas funcionalidades, solo se crean nuevos módulos siguiendo el mismo patrón.
- **Escalabilidad:** El sistema puede crecer fácilmente, permitiendo agregar más entidades o lógica sin afectar el resto del proyecto.
- **Reutilización:** Los controladores pueden ser usados por diferentes rutas o servicios, evitando duplicación de código y facilitando pruebas unitarias.
- **Seguridad:** Las rutas públicas solo permiten consulta, mientras que las protegidas requieren autenticación y roles, siguiendo buenas prácticas REST.
- **Facilidad para el frontend:** El frontend puede consumir los datos de manera sencilla y dinámica, mostrando siempre información actualizada.
- **Inicialización controlada:** El script `/backend/inicializar.js` permite poblar la base de datos con datos base, útil para desarrollo, pruebas y despliegue, asegurando que el sistema funcione correctamente desde el inicio.

### ¿Por qué se ubica cada parte en su archivo?

- **Controladores:** Centralizan la lógica de negocio y la interacción con la base de datos. Esto permite que la lógica sea reutilizable y fácil de testear.
- **Rutas:** Definen los endpoints y la seguridad de acceso. Separar rutas y lógica permite que el código sea más claro y fácil de modificar.
- **Inicialización:** Un script aparte permite poblar la base de datos sin mezclar lógica de negocio con lógica de despliegue o pruebas.

### Ejemplo de flujo completo

1. El frontend solicita los datos con una petición GET a `/api/categorias`, `/api/especialidades` y `/api/habilidades`.
2. El backend consulta la base de datos usando los controladores y responde en formato JSON.
3. El frontend muestra las opciones en los selectores del formulario de registro de experto.
4. Si se requiere modificar las opciones base, se ejecuta el script de inicialización.

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

**Conclusión:**

Esta arquitectura permite que el sistema sea robusto, fácil de mantener y que el frontend siempre tenga acceso a datos actualizados y confiables para el registro de expertos. Si necesitas ampliar la funcionalidad, sigue este patrón para mantener la calidad y coherencia del proyecto.

¿Dudas sobre algún archivo o flujo? Puedes consultar este README para entender cómo se conecta cada parte y cómo se puede extender la funcionalidad.
