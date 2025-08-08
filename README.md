# 🚀 ServiTech - Plataforma de Asesorías Tecnológicas Personalizadas 1:1

ServiTech es una plataforma web moderna que conecta usuarios que necesitan asistencia tecnológica con expertos especializados en diferentes áreas de la tecnología. El sistema permite agendar asesorías personalizadas uno a uno para realizar videollamadas en tiempo real donde prefieran, procesar pagos seguros y gestionar sus datos personales desde un completo panel de perfil tanto usuarios como expertos.

## 📋 Descripción del Aplicativo

### ¿Qué es ServiTech?

ServiTech es una solución integral para asesorías tecnológicas que facilita:

- **Conexión Directa**: Los usuarios pueden encontrar y conectarse con expertos certificados en áreas específicas como desarrollo web, ciberseguridad, análisis de datos, inteligencia artificial, y más.

- **Asesorías Personalizadas**: Cada sesión es completamente personalizada según las necesidades específicas del usuario, garantizando una atención de calidad y resultados efectivos.

- **Múltiples Canales de Comunicación**:

  - Videollamadas programadas para sesiones intensivas o rápidas donde ustedes prefieran
  - Sistema de notificaciones para mantener informados a los usuarios

- **Gestión Integral de Pagos**: Sistema de pagos seguro integrado con PSE para transacciones nacionales, permitiendo pagos rápidos y confiables.

- **Panel de Administración**: Herramientas completas para administrar usuarios, expertos, categorías, transacciones y estadísticas del sistema.

### Características Principales

- ✅ **Autenticación Segura**: Sistema de registro e inicio de sesión con JWT
- ✅ **Calendario Inteligente**: Los expertos pueden configurar su disponibilidad y los usuarios agendar citas
- ✅ **Sistema de Categorías**: Organización por especialidades tecnológicas
- ✅ **Pagos Seguros**: Procesamiento de pagos con PSE
- ✅ **Responsive Design**: Optimizado para dispositivos móviles y escritorio
- ✅ **Panel de Control**: Administración completa del sistema

---

## 📦 Estructura Real del Proyecto

```
servitech-1/
├── backend/
│   ├── config/
│   │   └── database.js         # Configuración de MongoDB
│   ├── controllers/
│   │   ├── categoriaController.js
│   │   └── usuarioController.js
│   ├── middleware/
│   │   └── middleware.js
│   ├── models/
│   │   ├── categoria.model.js
│   │   └── usuario.model.js
│   ├── node_modules/           # Dependencias instaladas
│   ├── routes/
│   │   ├── categoria.routes.js
│   │   └── usuario.routes.js
│   ├── services/
│   │   ├── email.service.js
│   │   └── test-email.js
│   ├── .env                    # Variables de entorno (no incluido en repo)
│   ├── app.js                  # Servidor Express principal
│   ├── inicializar.js          # Script de inicialización de datos
│   ├── package-lock.json       # Lock de versiones exactas
│   └── package.json            # Dependencias del backend
├── frontend/
│   ├── assets/
│   │   ├── css/
│   │   ├── img/
│   │   └── js/
│   ├── node_modules/           # Dependencias del frontend
│   ├── views/
│   │   ├── admin/
│   │   ├── componentes/
│   │   ├── calendario.ejs
│   │   ├── confirmacion-asesoria.ejs
│   │   ├── contacto.ejs
│   │   ├── expertos.ejs
│   │   ├── index.ejs
│   │   ├── login.ejs
│   │   ├── mis-asesorias.ejs
│   │   ├── pasarela-pagos.ejs
│   │   ├── perfiles.ejs
│   │   ├── recuperar-password.ejs
│   │   ├── registro.ejs
│   │   └── terminos.ejs
│   ├── package-lock.json
│   ├── package.json            # Dependencias del frontend
│   ├── server_simple.js        # Servidor simple
│   └── servidor.js             # Servidor principal del frontend
├── COPILOT_GUIDE.md           # Guía de Copilot
└── README.md                  # Este archivo
```

---

## 💻 Requisitos Previos

### Versiones Requeridas

- **Node.js**: v18.0.0 o superior
- **npm**: v9.0.0 o superior
- **MongoDB**: v6.0.0 o superior
- **Git**: v2.30.0 o superior

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
# Para MongoDB Atlas:
# MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/servitech

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
FRONTEND_URL=http://localhost:3001
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
cd frontend && node servidor.js
```

### 3. Acceder a la Aplicación

- **Frontend (Vistas)**: http://localhost:3000 (o el puerto configurado en frontend)
- **Backend (API)**: http://localhost:3001
- **Panel de administración**: Incluido en las vistas del frontend

---

## 🏗️ Arquitectura del Proyecto

### Backend (Node.js + Express + MongoDB)

**Estructura MVC:**

- **Models**: categoria.model.js, usuario.model.js
- **Controllers**: categoriaController.js, usuarioController.js
- **Routes**: categoria.routes.js, usuario.routes.js
- **Services**: email.service.js para envío de correos
- **Config**: database.js para conexión MongoDB
- **Middleware**: middleware.js para autenticación y validaciones

### Frontend (EJS + Express)

**Arquitectura separada:**

- **Views**: Páginas EJS organizadas por funcionalidad
- **Assets**: Archivos estáticos (CSS, JS, imágenes)
- **Servidor**: servidor.js para servir las vistas EJS
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

**Q: Error "Cannot find module"**

```bash
# Verificar que estás en el directorio correcto
# Para backend:
cd backend && npm install

# Para frontend:
cd frontend && npm install
```

**Q: ¿Qué puerto usa cada servidor?**

- Backend (API): Puerto 3001 (por defecto)
- Frontend (Vistas): Configurado en frontend/server.js

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

**Diana Carolina Jiménez**

- GitHub: [@DianaJJ0](https://github.com/DianaJJ0)
- Email: dianacjj23@gmail.com

---
