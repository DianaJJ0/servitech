# 🚀 ServiTech Web

ServiTech es una plataforma web para conectar usuarios con expertos en tecnología, permitiendo agendar asesorías, realizar pagos seguros, gestionar mensajería y administrar usuarios y expertos desde un panel de administración. El sistema incluye autenticación, videollamadas, pagos integrados y un flujo completo para clientes y expertos.

---

## 📦 Estructura del Proyecto

```
SERVITECH1/
├── backend/
│   ├── config/           # Configuración de base de datos y entorno
│   ├── models/          # Modelos Mongoose
│   ├── routes/          # Rutas API REST
│   ├── services/        # Servicios (email, etc)
│   ├── controllers/     # Controladores
│   ├── app.js          # Servidor Express principal
│   ├── .env            # Variables de entorno
│   ├── package.json    # Dependencias
│   └── inicializar.js  # Script para datos iniciales
```

---

## 🖥️ Instalación y Uso en Otro PC

Esta guía te ayudará a configurar y ejecutar el proyecto ServiTech en tu máquina local.

### 1. Requisitos Previos

- **Node.js** v18 o superior
- **MongoDB** v6 o superior (local o en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **Git** (para clonar el repositorio)

---

### 2. Configuración del Backend

Sigue estos pasos en tu terminal (Git Bash o WSL en Windows, Terminal en Linux/macOS).

1.  **Clona el repositorio:**

    ```bash
    git clone https://github.com/DianaJJ0/servitechWeb.git
    ```

2.  **Navega al directorio del backend:**

    ```bash
    cd servitechWeb/SERVITECH1/backend
    ```

3.  **Instala las dependencias del proyecto:**

    ```bash
    npm install
    ```

4.  **Configura las variables de entorno:**
    Crea una copia del archivo de ejemplo `.env.example` y renómbrala a `.env`.

    ```bash
    # En Linux/macOS
    cp .env.example .env
    # En Windows (Command Prompt)
    copy .env.example .env
    ```

    Luego, edita el archivo `.env` con tus propias credenciales (por ejemplo, con `nano .env`, VS Code o Notepad).

    ```
    # Ejemplo de configuración:
    MONGODB_URI=mongodb://localhost:27017/servitech
    JWT_SECRET=tu_clave_secreta_muy_segura
    PORT=3001
    ```

5.  **Inicializa la base de datos (opcional):**
    Este comando poblará la base de datos con categorías y usuarios de prueba.

    ```bash
    node inicializar.js
    ```

6.  **Inicia el servidor:**
    - Para producción:
      ```bash
      node app.js
      ```
    - Para desarrollo (con reinicio automático al guardar cambios):
      ```bash
      npx nodemon app.js
      ```

---

### 3. Configuración del Frontend

El frontend está construido con **EJS (Embedded JavaScript templates)** y se sirve directamente desde el backend de Express. **No requiere una instalación ni un proceso de inicio por separado.**

Una vez que el servidor backend esté en funcionamiento (paso 6 anterior), el frontend estará automáticamente disponible.

---

### 🗄️ Iniciar la base de datos con MongoDB Atlas y Compass en Linux

1. Ingresa a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) y crea una cuenta (si no tienes una).
2. Crea un nuevo cluster gratuito y espera a que esté listo.
3. En "Database Access", crea un usuario con contraseña y permisos de lectura/escritura.
4. En "Network Access", agrega tu IP pública o permite acceso desde cualquier IP (`0.0.0.0/0`).
5. Copia la URI de conexión del cluster (formato:
   `mongodb+srv://dianacjj23:<db_password>@adso2873441.e4hnh5b.mongodb.net/servitech?retryWrites=true&w=majority`)
6. Abre MongoDB Compass y pega la URI en el campo de conexión.
7. Haz clic en "Connect" para conectarte y gestionar la base de datos.
8. Actualiza la variable `MONGODB_URI` en tu archivo `.env` con la URI de Atlas.

---

## ⚙️ Comandos Clave

- Instalar dependencias:
  `npm install`
- Inicializar datos de prueba:
  `node inicializar.js`
- Iniciar servidor backend:
  `node app.js`
- Iniciar servidor con nodemon (desarrollo):
  `npx nodemon app.js`
  o si está instalado globalmente:
  `nodemon app.js`

---

## 🌐 Acceso a la Aplicación

Con el servidor en marcha, abre tu navegador y visita:

- **Página principal:** [http://localhost:3001/](http://localhost:3001/)
- **Panel de administración:** [http://localhost:3001/admin/admin.html](http://localhost:3001/admin/admin.html)

---

## 🛠️ Backend

- **Express.js:** Servidor web y API REST.
- **Mongoose:** Modelos y conexión a MongoDB.
- **Rutas:** Endpoints para usuarios, expertos, categorías, pagos y mensajería.
- **Autenticación:** JWT y sesiones.
- **Inicialización:** Script para poblar categorías y usuarios de prueba.
- **Configuración:** Variables en `.env` (MongoDB, JWT, puerto, etc.)

---

## 🎨 Frontend (views/)

- **EJS:** Plantillas dinámicas para las vistas, renderizadas por el servidor.
- **Archivos estáticos:** CSS, JS de cliente y multimedia se encuentran en la carpeta `public/`.
- **Flujo usuario:** Registro → Login → Selección de experto → Calendario → Pago → Chat.
- **Panel admin:** Gestión de usuarios y expertos.
- **Componentes:** Partes reutilizables de la interfaz (header, footer, etc.) se encuentran en `views/componentes`.
- **Personalización:** Puedes editar los archivos `.ejs` y los recursos en `public/` para adaptar el diseño.

---

## 🔗 Endpoints Principales

- `POST /api/usuarios/login` — Inicio de sesión
- `POST /api/usuarios` — Registro de usuario
- `GET /api/categorias` — Listado de categorías
- `GET /api/expertos` — Listado de expertos
- `POST /api/pse/crear-transaccion` — Iniciar pago
- `GET /api/mensajeria/conversaciones` — Conversaciones usuario

---

## 🧑‍💻 Autor

**Diana Carolina Jiménez**
GitHub: [@DianaJJ0](https://github.com/DianaJJ0)

---

## 🏆 Estado Actual

- Backend y frontend operativos
- Mensajería y pagos integrados
- Estructura lista para escalar y agregar nuevas funcionalidades

---

## ❓ Preguntas Frecuentes

**¿Por qué me sale error con `npm install`?**
Asegúrate de estar en la carpeta `backend` y que exista el archivo `package.json`.

**¿Cómo cambio el puerto?**
Edita la variable `PORT` en el archivo `.env`.

**¿Cómo inicializo datos de prueba?**
Ejecuta `node inicializar.js` en la carpeta `backend`.

**¿Cómo accedo al sistema?**
Abre tu navegador y visita `http://localhost:3001/`.

**¿Cómo uso nodemon para desarrollo?**
Instala nodemon con `npm install -g nodemon` y ejecuta `nodemon app.js` en la carpeta `backend` para reinicio automático del servidor al hacer cambios.

---

Asegúrate de estar en la carpeta `backend` y que exista el archivo `package.json`.

**¿Cómo cambio el puerto?**
Edita la variable `PORT` en el archivo `.env`.

**¿Cómo inicializo datos de prueba?**
Ejecuta `node inicializar.js` en la carpeta `backend`.

**¿Cómo accedo al sistema?**
Abre tu navegador y visita `http://localhost:3001/`.

**¿Cómo uso nodemon para desarrollo?**
Instala nodemon con `npm install -g nodemon` y ejecuta `nodemon app.js` en la carpeta `backend` para reinicio automático del servidor al hacer cambios.

---
# servitech
