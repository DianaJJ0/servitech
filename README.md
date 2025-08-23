# Guía Sencilla de ServiTech

Esta guía te ayudará a entender la estructura del proyecto y cómo activar los servidores paso a paso, incluso si eres principiante.

---

## 1. ¿Qué es ServiTech?

ServiTech es una plataforma web para conectar usuarios con expertos en tecnología. Permite agendar asesorías, gestionar usuarios y expertos, y realizar pagos seguros.

---

## 2. Estructura del Proyecto

```
servitech-1/
├── backend/      # Lógica y API del servidor
│   ├── app.js    # Archivo principal del servidor backend
│   ├── config/   # Configuración de la base de datos
│   ├── controllers/ # Lógica de usuarios y categorías
│   ├── middleware/  # Autenticación y seguridad
│   ├── models/      # Modelos de datos (usuario, categoría, asesoría)
│   ├── routes/      # Rutas de la API
│   ├── services/    # Servicios como envío de emails
│   ├── inicializar.js # Scripts para inicializar datos
│   ├── package.json # Dependencias y scripts
│   └── ...otros archivos
├── frontend/     # Parte visual y cliente
│   ├── server.js # Servidor principal del frontend
│   ├── assets/   # Archivos estáticos (CSS, imágenes, JS)
│   ├── views/    # Vistas EJS (páginas)
│   ├── package.json # Dependencias y scripts
│   └── ...otros archivos
└── README.md     # Esta guía

---

## 3. ¿Qué hace cada carpeta?

### backend/

- **app.js**: Inicia el servidor Express y conecta la base de datos.
- **config/**: Configuración de la base de datos MongoDB.
- **controllers/**: Funciones para manejar usuarios y categorías.
- **middleware/**: Verifica autenticación y permisos.
- **models/**: Estructura de los datos (usuario, categoría, asesoría).
- **routes/**: Define las rutas de la API (usuarios, categorías, expertos).
- **services/**: Funciones extra como envío de correos.
- **inicializar.js**: Script para cargar datos de ejemplo.

### frontend/

- **server.js**: Inicia el servidor Express para mostrar las páginas.
- **assets/**: Archivos estáticos (CSS, imágenes, JS).
- **views/**: Páginas EJS que ve el usuario.

---

## 4. ¿Cómo activar los servidores?

### Requisitos previos

- Tener instalado Node.js y npm
- Tener MongoDB instalado y corriendo

### Paso a paso

#### 1. Instala las dependencias

Abre la terminal y ejecuta estos comandos en la carpeta principal del proyecto:

```bash
cd backend
npm install
cd ../frontend
npm install
```

#### 2. Inicia MongoDB

Asegúrate de que el servicio de MongoDB esté activo. Puedes iniciar MongoDB con:

```bash
sudo systemctl start mongod
```

o

```bash
mongod
```

#### 3. Activa el servidor backend

Abre una terminal nueva y asegúrate de estar en la carpeta `backend`. Puedes navegar con:

```bash
cd /ruta/a/tu/proyecto/servitech-1/backend
```

Luego inicia el servidor backend con:

```bash
npm start
```

> **Consejo:**
> Si ves un error como "command not found" o "Cannot find module", verifica que ejecutaste `npm install` antes y que estás en la carpeta correcta.
> Mantén esta terminal abierta para ver mensajes y errores del servidor.

#### 4. Activa el servidor frontend

Abre una terminal nueva y asegúrate de estar en la carpeta `frontend`. Puedes navegar con:

```bash
cd /ruta/a/tu/proyecto/servitech-1/frontend
```

Luego inicia el servidor frontend con:

```bash
node server.js
```

> **Consejo:**
> Si ves un error como "command not found" o "Cannot find module", verifica que ejecutaste `npm install` antes y que estás en la carpeta correcta.
> Mantén esta terminal abierta para ver mensajes y errores del servidor frontend.

## 5. ¿Cómo acceder a la aplicación?

- El backend estará en: `http://localhost:3001`
- El frontend estará en: `http://localhost:3000`

Abre tu navegador y visita `http://localhost:3000` para ver la página principal.

---

## 6. Consejos y ayuda

- Si tienes errores, revisa que MongoDB esté corriendo y que las dependencias estén instaladas.
- Puedes modificar las vistas en `frontend/views` para cambiar el diseño.
- Los archivos JS y CSS están en `frontend/assets`.
- Para agregar datos de ejemplo, puedes usar los scripts en `backend` como `inicializar.js`.

---

## 7. ¿Dónde modificar o agregar funciones?

- Para cambiar la lógica de usuarios, ve a `backend/controllers/usuario.controller.js`.
- Para agregar nuevas rutas, usa `backend/routes/`.
- Para cambiar el diseño, edita los archivos en `frontend/views/` y `frontend/assets/css/`.

---

¡Listo! Ahora puedes activar y modificar ServiTech fácilmente.

### Verificación de Versiones

```bash
# Verificar versiones instaladas
node --version
npm --version
git --version
mongod --version
```

---

## 🔧 Instalación Paso a Paso

### Para Windows

#### 1. Preparar el Entorno

```bash

# Instalar Node.js
choco install nodejs

# Instalar MongoDB (opcional, puedes usar MongoDB Atlas)
choco install mongodb

# Instalar Git
choco install git
```

#### 2. Clonar el Repositorio

```bash
# Crear directorio de trabajo
mkdir C:\Proyectos
cd C:\Proyectos

# Clonar el repositorio
git clone https://github.com/DianaJJ0/servitechWeb.git
cd servitechWeb\servitech-1
```

#### 3. Configuración del Backend

```bash
# Navegar al directorio del backend
cd backend

# Instalar dependencias
npm install

# Crear archivo de variables de entorno (si no existe)
copy .env.example .env

# Editar el archivo .env con tus configuraciones
notepad .env
```

#### 4. Configuración del Frontend

```bash
# Desde la raíz del proyecto, ir al frontend
cd ..\frontend

# Instalar dependencias del frontend
npm install
```

### Para Linux (Ubuntu/Debian)

#### 1. Preparar el Entorno

```bash
# Actualizar el sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js y npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Instalar Git
sudo apt install git -y

# Iniciar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### 2. Clonar el Repositorio

```bash
# Crear directorio de trabajo
mkdir ~/Proyectos
cd ~/Proyectos

# Clonar el repositorio
git clone https://github.com/DianaJJ0/servitechWeb.git
cd servitechWeb/servitech
```

#### 3. Configuración del Backend

```bash
# Navegar al directorio del backend
cd backend

# Instalar dependencias
npm install

# Crear archivo de variables de entorno (si no existe)
cp .env.example .env

# Editar el archivo .env
nano .env
```

#### 4. Configuración del Frontend

```bash
# Desde la raíz del proyecto, ir al frontend
cd ../frontend

# Instalar dependencias del frontend
npm install
```

---

## ⚙️ Configuración del Archivo .env

Crea y configura el archivo `.env` en el directorio `backend/` con las siguientes variables:

```bash
# Configuración de la Base de Datos
MONGODB_URI=mongodb://localhost:27017/servitech

# Configuración del Servidor
PORT=3001
NODE_ENV=development

# Configuración de JWT
JWT_SECRET=tu_clave_secreta_muy_segura_aqui
JWT_EXPIRE=24h

# Configuración de Correo Electrónico
EMAIL_SERVICE=gmail
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicación

# URLs del Sistema
FRONTEND_URL=http://localhost:3000
API_BASE_URL=http://localhost:3001/api
```

---

## 🚀 Inicialización y Ejecución

### 1. Inicializar la Base de Datos

```bash
# Desde el directorio backend/
node inicializar.js
```

### 2. Iniciar la Aplicación

```bash
# Terminal 1: Iniciar backend
cd backend && node app.js

# Terminal 2: Iniciar frontend
cd frontend && node server.js
```

### 3. Acceder a la Aplicación

- **Frontend (Vistas)**: http://localhost:3000
- **Backend (API)**: http://localhost:3001
- **Panel de administración**: Incluido en las vistas del frontend

---

## 🏗️ Arquitectura del Proyecto

### Backend (Node.js + Express + MongoDB)

**Estructura MVC:**

- **Models**: categoria.model.js, usuario.model.js
- **Controllers**: categoria.controller.js, usuario.controller.js
- **Routes**: categoria.routes.js, usuario.routes.js
- **Services**: email.service.js para envío de correos
- **Config**: database.js para conexión MongoDB
- **Middleware**: middleware.js para autenticación y validaciones

### Frontend (EJS + Express)

**Arquitectura separada:**

- **Views**: Páginas EJS organizadas por funcionalidad
- **Assets**: Archivos estáticos (CSS, JS, imágenes)
- **Servidor**: server.js para servir las vistas EJS
- **Componentes**: Elementos reutilizables en views/componentes/

---

## 🔗 Endpoints Principales de la API

### Usuarios

- `GET /api/usuarios` - Listar usuarios
- `POST /api/usuarios` - Crear usuario
- `PUT /api/usuarios/:id` - Actualizar usuario
- `DELETE /api/usuarios/:id` - Eliminar usuario

### Categorías

- `GET /api/categorias` - Listar categorías
- `POST /api/categorias` - Crear categoría
- `PUT /api/categorias/:id` - Actualizar categoría
- `DELETE /api/categorias/:id` - Eliminar categoría

---

## 📊 Estado Actual del Proyecto

### ✅ Funcionalidades Base Completadas

- Estructura MVC del backend implementada
- Modelos de Usuario y Categoría definidos
- Rutas y controladores básicos
- Configuración de base de datos MongoDB
- Servicio de email configurado
- Frontend con vistas EJS organizadas
- Sistema de componentes reutilizables

### 🔄 En Desarrollo

- Sistema completo de autenticación
- Integración completa backend-frontend
- Sistema de pagos PSE
- Panel de administración funcional
- Sistema de calificaciones y reseñas

---

## ❓ Preguntas Frecuentes

### Instalación y Configuración

**Q: ¿Dónde están los archivos del frontend?**

- El frontend está en la carpeta `/frontend/` como aplicación separada
- Las vistas EJS están en `/frontend/views/`
- Los archivos estáticos están en `/frontend/assets/`

**Q: ¿Cómo ejecuto ambos servidores?**

```bash
# Opción 1: Dos terminales
Terminal 1: cd backend && node app.js
Terminal 2: cd frontend && node server.js

# Opción 2: Con concurrently (instalar globalmente)
npm install -g concurrently
concurrently "cd backend && node app.js" "cd frontend && node server.js"
```

**Q: ¿Qué puerto usa cada servidor?**

- Backend (API): Puerto 3001 (por defecto)
- Frontend (Vistas): Puerto 3000 (por defecto, ver frontend/server.js)

### Base de Datos

**Q: ¿Cómo reinicializar los datos?**

```bash
cd backend
node inicializar.js
```

**Q: Error "npm ERR! Cannot read properties of null"**

```bash
# Limpiar caché de npm
npm cache clean --force
# Eliminar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install
```

**Q: "MongoDB connection failed"**

- Verificar que MongoDB esté ejecutándose: `sudo systemctl status mongod` (Linux) o `net start MongoDB` (Windows)
- Verificar la URI en el archivo .env
- Para MongoDB Atlas, verificar credenciales y whitelist de IPs

**Q: "Puerto 3001 ya está en uso"**

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID_NUMBER> /F

# Linux/Mac
sudo lsof -ti:3001 | xargs kill -9
```

### Errores de Desarrollo

**Q: "JWT token invalid"**

- Verificar que JWT_SECRET esté configurado en .env
- Verificar que el token no haya expirado
- Limpiar localStorage del navegador

**Q: "CORS policy error"**

- Verificar configuración de CORS en backend/middleware/cors.js
- Asegurar que FRONTEND_URL esté correctamente configurado

**Q: "Cannot find module"**

```bash
# Reinstalar dependencias específicas
npm install <nombre-del-modulo>
# O reinstalar todas las dependencias
rm -rf node_modules && npm install
```

---

## 👨‍💻 Autor

**Diana Jiménez**

- GitHub: [@DianaJJ0](https://github.com/DianaJJ0)
- Email: dianacjj23@gmail.com

---
