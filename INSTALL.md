# 📋 Manual de Instalación Técnica - SERVITECH

> **Guía completa para instalación, configuración y resolución de problemas**

Este manual detalla paso a paso cómo instalar, configurar y poner en funcionamiento ServiTech en diferentes entornos, incluyendo solución de problemas comunes.

---

## 📋 Tabla de Contenidos

1. [Requisitos del Sistema](#-requisitos-del-sistema)
2. [Instalación por SO](#-instalación-por-sistema-operativo)
3. [Configuración de Base de Datos](#-configuración-de-base-de-datos)
4. [Variables de Entorno](#-configuración-de-variables-de-entorno)
5. [Instalación de Dependencias](#-instalación-de-dependencias)
6. [Configuración de Servicios](#-configuración-de-servicios-externos)
7. [Inicialización del Proyecto](#-inicialización-del-proyecto)
8. [Verificación de Instalación](#-verificación-de-instalación)
9. [Configuración de Producción](#-configuración-de-producción)
10. [Swagger UI y Admin](#-swagger-ui-y-administración)
11. [Troubleshooting](#-solución-de-problemas)
12. [Mantenimiento](#-mantenimiento)

---

## 🔧 Requisitos del Sistema

### Hardware Mínimo

| Componente | Desarrollo | Producción  |
| ---------- | ---------- | ----------- |
| **RAM**    | 4 GB       | 8 GB        |
| **Disco**  | 2 GB libre | 10 GB libre |
| **CPU**    | Dual Core  | Quad Core   |
| **Red**    | 10 Mbps    | 100 Mbps    |

### Software Requerido

- **Node.js**: >= 18.0.0 LTS
- **npm**: >= 9.0.0
- **Git**: >= 2.30.0
- **MongoDB**: Atlas (recomendado) o local >= 5.0

### Servicios Externos Necesarios

- **MongoDB Atlas** (base de datos en la nube)
- **Gmail con App Password** (envío de emails)
- **Google reCAPTCHA v2** (seguridad anti-bot)

### Verificar Versiones

```bash
node --version    # Debe mostrar v18.x.x o superior
npm --version     # Debe mostrar 9.x.x o superior
git --version     # Debe mostrar 2.x.x o superior
```

---

## 🖥️ Instalación por Sistema Operativo

### Windows 10/11

#### 1. Instalar Node.js LTS

```powershell
# Opción 1: Descargar desde nodejs.org (recomendado)
# https://nodejs.org/en/download/

# Opción 2: Usar winget
winget install OpenJS.NodeJS.LTS

# Opción 3: Usar Chocolatey
choco install nodejs-lts

# Verificar instalación
node --version
npm --version
```

#### 2. Instalar Git

```powershell
# Opción 1: Descargar desde git-scm.com
# Opción 2: Usar winget
winget install Git.Git

# Verificar instalación
git --version
```

#### 3. Clonar Repositorio

```powershell
# Abrir PowerShell o Command Prompt
git clone https://github.com/DianaJJ0/servitech.git
cd servitech

# Verificar estructura
dir  # Debe mostrar carpetas backend/ y frontend/
```

### Ubuntu/Debian Linux

#### 1. Actualizar Sistema

```bash
sudo apt update && sudo apt upgrade -y
```

#### 2. Instalar Node.js LTS (via NodeSource)

```bash
# Instalar Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalación
node --version
npm --version
```

#### 3. Instalar Git

```bash
sudo apt install git -y
git --version
```

#### 4. Clonar Repositorio

```bash
git clone https://github.com/DianaJJ0/servitech.git
cd servitech
ls -la  # Verificar estructura
```

### CentOS/RHEL/Fedora

#### 1. Instalar Node.js

```bash
# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Fedora
sudo dnf install nodejs npm git -y

# Verificar
node --version
npm --version
```

#### 2. Clonar Repositorio

```bash
git clone https://github.com/DianaJJ0/servitech.git
cd servitech
```

#### 2. Clonar Repositorio

```bash
git clone https://github.com/DianaJJ0/servitech.git
cd servitech
```

---

## 🗄️ Configuración de Base de Datos

### MongoDB Atlas (Recomendado)

#### 1. Crear Cuenta y Cluster

1. **Registrarse** en [MongoDB Atlas](https://cloud.mongodb.com)
2. **Crear organización** y proyecto
3. **Crear cluster gratuito** (M0 Sandbox)
4. **Seleccionar región** más cercana

#### 2. Configurar Seguridad

##### Database Access (Usuario de BD)

```bash
# En MongoDB Atlas → Database Access
1. Add New Database User
2. Username: servitech_user
3. Password: generar contraseña segura (guardar)
4. Database User Privileges: Read and write to any database
5. Add User
```

##### Network Access (Acceso de Red)

```bash
# En MongoDB Atlas → Network Access
1. Add IP Address
2. Para desarrollo: Add Current IP Address
3. Para producción: Add IP específica de Render
4. Para pruebas: 0.0.0.0/0 (no recomendado en producción)
```

#### 3. Obtener String de Conexión

```bash
# En MongoDB Atlas → Clusters → Connect
1. Choose a connection method → Connect your application
2. Driver: Node.js
3. Version: 4.1 or later
4. Copiar connection string:

mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/servitech?retryWrites=true&w=majority

# Reemplazar:
# <username> → tu_usuario
# <password> → tu_contraseña
# servitech → nombre de tu base de datos
```

### MongoDB Local (Alternativo)

#### Windows

```powershell
# Descargar MongoDB Community Server
# https://www.mongodb.com/try/download/community

# Instalar como servicio
# String de conexión: mongodb://localhost:27017/servitech
```

#### Linux

```bash
# Ubuntu/Debian
sudo apt install mongodb -y
sudo systemctl start mongodb
sudo systemctl enable mongodb

# CentOS/RHEL
sudo yum install mongodb-org -y
sudo systemctl start mongod
sudo systemctl enable mongod

# String de conexión: mongodb://localhost:27017/servitech
```

---

## ⚙️ Configuración de Variables de Entorno

### 1. Crear Archivo `.env` en Backend

```bash
cd backend
touch .env     # Linux/Mac
echo. > .env   # Windows
```

### 2. Configurar Variables Completas

Editar `backend/.env` con tu editor favorito:

```ini
# ===================================
# CONFIGURACIÓN DEL SERVIDOR
# ===================================
PORT=5020
NODE_ENV=development

# ===================================
# BASE DE DATOS MONGODB
# ===================================
MONGO_URI=mongodb+srv://usuario:contraseña@cluster0.xxxxx.mongodb.net/servitech?retryWrites=true&w=majority

# ===================================
# AUTENTICACIÓN JWT
# ===================================
JWT_SECRET=esta_es_una_clave_super_secreta_de_al_menos_32_caracteres_para_jwt
JWT_EXPIRES_IN=7d

# ===================================
# CONFIGURACIÓN DE EMAIL (GMAIL)
# ===================================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=servitech.app.correo@gmail.com
EMAIL_PASS=contraseña_aplicacion_gmail_16_caracteres

# ===================================
# GOOGLE RECAPTCHA V2
# ===================================
RECAPTCHA_SITE_KEY=6LcXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
RECAPTCHA_SECRET_KEY=6LcXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# ===================================
# URLS DE LA APLICACIÓN
# ===================================
APP_URL=http://localhost:5020
FRONTEND_URL=http://localhost:5021

# ===================================
# CONFIGURACIÓN DE SEGURIDAD
# ===================================
API_KEY=8g-X4JgECIPNcQ59tMN
BCRYPT_ROUNDS=12

# ===================================
# CONFIGURACIÓN DE ARCHIVOS
# ===================================
UPLOAD_PATH=uploads
MAX_FILE_SIZE=5242880

# ===================================
# CONFIGURACIÓN DE ADMINISTRACIÓN
# ===================================
ADMIN_EMAIL=servitech.app.correo@gmail.com
ADMIN_PASSWORD=Admin123
```

---

## 📦 Instalación de Dependencias

### 1. Instalar Dependencias del Backend

```bash
cd backend
npm install

# Verificar que se instalaron correctamente
npm ls --depth=0

# Dependencias principales esperadas:
# ├── express@x.x.x
# ├── mongoose@x.x.x
# ├── jsonwebtoken@x.x.x
# ├── bcryptjs@x.x.x
# ├── nodemailer@x.x.x
# ├── ejs@x.x.x
# └── dotenv@x.x.x
```

### 2. Instalar Dependencias del Frontend

```bash
cd ../frontend
npm install

# Verificar instalación
npm ls --depth=0

# Dependencias principales esperadas:
# ├── express@x.x.x
# ├── http-proxy-middleware@x.x.x
# └── nodemon@x.x.x (devDependency)
```

### 3. Verificar Estructura Final

```bash
cd ..
tree -L 3  # Linux/Mac
# O en Windows usar 'dir' recursivo

# Estructura esperada:
servitech/
├── backend/                      # Servidor principal (Node.js/Express)
│   ├── .env ✅                   # Variables de entorno
│   ├── package.json ✅           # Dependencias backend
│   ├── app.js ✅                 # Aplicación principal
│   ├── inicializar.js ✅         # Script de inicialización
│   ├── node_modules/ ✅          # Dependencias instaladas
│   ├── config/                   # Configuraciones del sistema
│   ├── controllers/              # Controladores MVC
│   ├── middleware/               # Middleware personalizado
│   ├── models/                   # Esquemas MongoDB (Mongoose)
│   ├── routes/                   # Rutas API REST
│   ├── services/                 # Servicios de negocio
│   ├── uploads/                  # Archivos subidos
│   └── validators/               # Validaciones de entrada
└── frontend/                     # Assets y vistas
    ├── package.json ✅           # Dependencias frontend
    ├── server.js ✅              # Servidor de desarrollo con proxy
    ├── node_modules/ ✅          # Dependencias instaladas
    ├── assets/                   # Recursos estáticos
    │   ├── css/                  # Hojas de estilo
    │   ├── img/                  # Imágenes
    │   └── js/                   # JavaScript del cliente
    ├── views/                    # Plantillas EJS
    │   ├── admin/                # Panel administrativo
    │   ├── components/           # Componentes reutilizables
    │   ├── index.ejs             # Página principal
    │   ├── login.ejs             # Página de login
    │   ├── registro.ejs          # Registro de usuario
    │   └── ... (más vistas)
    └── tests/                    # Archivos de prueba
```

---

## 🔧 Configuración de Servicios Externos

### Gmail App Password (Obligatorio)

#### 1. Habilitar Verificación en 2 Pasos

```bash
1. Ir a https://myaccount.google.com
2. Seguridad → Verificación en 2 pasos
3. Seguir pasos para activar
```

#### 2. Generar App Password

```bash
1. En Seguridad → Contraseñas de aplicaciones
2. Seleccionar app: "Correo"
3. Seleccionar dispositivo: "Otro (nombre personalizado)"
4. Escribir: "ServiTech App"
5. Generar → Copiar contraseña de 16 caracteres
6. Usar en EMAIL_PASS del .env
```

### Google reCAPTCHA v2 (Obligatorio)

#### 1. Registrar Sitio

```bash
1. Ir a https://www.google.com/recaptcha/admin
2. Crear nuevo sitio:
   - Label: ServiTech
   - reCAPTCHA type: v2 "I'm not a robot"
   - Domains:
     * localhost (para desarrollo)
     * tu-dominio.onrender.com (para producción)
3. Accept términos y enviar
```

#### 2. Obtener Claves

```bash
# Copiar las claves generadas:
Site Key (RECAPTCHA_SITE_KEY): 6LcXXXXXX...
Secret Key (RECAPTCHA_SECRET_KEY): 6LcXXXXXX...

# Añadir al .env
```

---

## 🚀 Inicialización del Proyecto

### Modo Desarrollo (Recomendado para Desarrollo)

#### Arquitectura en Desarrollo

```
Frontend (Puerto 5021) ----proxy----> Backend (Puerto 5020)
    ↓                                      ↓
Live reload para vistas            API + Servir vistas EJS
```

#### Terminal 1: Backend

```bash
cd backend
npm run dev

# Salida esperada:
# [nodemon] starting `node app.js`
# ✅ Conectado a MongoDB Atlas
# 🚀 Servidor backend ejecutándose en puerto 5020
# 📝 Swagger UI disponible en /api-docs
```

#### Terminal 2: Frontend (Proxy)

```bash
cd frontend
npm run dev

# Salida esperada:
# [nodemon] starting `node server.js`
# 🔄 Proxy configurado: localhost:5021 -> localhost:5020
# 🌐 Frontend ejecutándose en puerto 5021
# ✨ Live reload activado
```

#### URLs de Acceso en Desarrollo

```bash
Frontend principal: http://localhost:5021
Backend API directo: http://localhost:5020
Admin panel: http://localhost:5021/admin/adminUsuarios
Swagger UI: http://localhost:5021/api-docs
```

### Modo Producción (Servidor Unificado)

#### Arquitectura en Producción

```
Backend único (Puerto X) = API + Frontend servido
              ↓
    Sirve tanto API como vistas EJS
```

#### Inicializar Producción Local

```bash
cd backend
npm start

# Salida esperada:
# ✅ Conectado a MongoDB Atlas
# 🚀 Servidor unificado ejecutándose en puerto 5020
# 🌐 Sirviendo frontend desde carpeta views
# 📝 Swagger UI disponible en /api-docs
```

#### URL de Acceso en Producción

```bash
Aplicación completa: http://localhost:5020
```

---

## ✅ Verificación de Instalación

### 1. Test de Conectividad

#### Verificar Backend

```bash
# Test API health
curl http://localhost:5020/api/health

# Respuesta esperada:
# {"status":"ok","timestamp":"2024-01-XX","message":"API funcionando correctamente"}
```

#### Verificar Frontend

```bash
# En navegador, ir a:
http://localhost:5021  # Desarrollo
http://localhost:5020  # Producción

# Debe cargar página de inicio de ServiTech
```

### 2. Test de Base de Datos

```bash
# En navegador, ir a registro:
http://localhost:5021/registro.html

# Intentar registrar usuario de prueba
# Debe enviar email de confirmación si todo está configurado
```

### 3. Test de Servicios

#### Gmail (opcional pero recomendado)

```bash
# Verificar en logs del backend que no hay errores de SMTP
# Al registrarse debe llegar email a la cuenta
```

#### reCAPTCHA

```bash
# En página de registro, verificar que aparece reCAPTCHA
# Debe funcionar la validación anti-bot
```

### 4. Test de Admin

```bash
# Ir a panel admin:
http://localhost:5021/admin/adminUsuarios

# Login con credenciales admin configuradas en .env:
# Email: servitech.app.correo@gmail.com
# Password: Admin123

# Debe cargar dashboard administrativo
```

---

## 🌐 Configuración de Producción

### Deploy en Render

#### 1. Preparar Repositorio

```bash
# Asegurar que .env no está en Git
echo ".env" >> .gitignore
echo "node_modules" >> .gitignore

# Commit y push
git add .
git commit -m "feat: preparar para deploy en Render"
git push origin main
```

#### 2. Configurar Web Service en Render

```yaml
# Configuración en dashboard de Render:
Name: servitech
Environment: Node
Region: Oregon (US West) # O más cercana
Branch: main
Root Directory: backend
Build Command: npm run build
Start Command: npm start
```

#### 3. Variables de Entorno en Render

```env
# En Environment tab, añadir todas las variables:
NODE_ENV=production
MONGO_URI=mongodb+srv://...
JWT_SECRET=clave-larga-segura
EMAIL_USER=servitech.app.correo@gmail.com
EMAIL_PASS=contraseña-app-gmail
RECAPTCHA_SITE_KEY=6Lc...
RECAPTCHA_SECRET_KEY=6Lc...
ADMIN_EMAIL=servitech.app.correo@gmail.com
ADMIN_PASSWORD=Admin123
```

#### 4. Configurar Dominio en reCAPTCHA

```bash
# Ir a Google reCAPTCHA admin
# Añadir dominio de Render a la lista:
tu-app-name.onrender.com
```

### Variables de Producción vs Desarrollo

| Variable       | Desarrollo            | Producción                  |
| -------------- | --------------------- | --------------------------- |
| `NODE_ENV`     | development           | production                  |
| `PORT`         | 5020                  | auto (Render)               |
| `FRONTEND_URL` | http://localhost:5021 | (no necesaria)              |
| `APP_URL`      | http://localhost:5020 | https://tu-app.onrender.com |

---

## 🔐 Swagger UI y Administración

### Configuración de Swagger UI

ServiTech incluye documentación interactiva de la API protegida con autenticación admin.

#### 1. Generar Token Admin

```bash
# Método 1: cURL (Linux/Mac/Git Bash)
curl -s -H "Content-Type: application/json" \
  -d '{"email":"servitech.app.correo@gmail.com","password":"Admin123"}' \
  http://localhost:5020/api/usuarios/login

# Método 2: PowerShell (Windows)
$body = '{"email":"servitech.app.correo@gmail.com","password":"Admin123"}'
$response = Invoke-RestMethod -Uri "http://localhost:5020/api/usuarios/login" -Method POST -Body $body -ContentType "application/json"
$response.token

# Método 3: Usando Thunder Client, Postman o Insomnia
# POST http://localhost:5020/api/usuarios/login
# Body: {"email":"servitech.app.correo@gmail.com","password":"Admin123"}
```

#### 2. Respuesta Esperada

```json
{
  "mensaje": "Login exitoso.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": "...",
    "email": "servitech.app.correo@gmail.com",
    "role": "admin"
  }
}
```

#### 3. Acceder a Swagger UI

##### Opción A: Extensión de Navegador (Recomendada)

```bash
# 1. Instalar extensión ModHeader o similar en Chrome/Firefox
# 2. Crear header:
#    Name: Authorization
#    Value: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# 3. Activar perfil y visitar:
http://localhost:5021/api-docs  # Desarrollo
https://tu-app.onrender.com/api-docs  # Producción
```

##### Opción B: Descargar Especificación

```bash
# Descargar spec OpenAPI
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5020/api-docs.json -o swagger-spec.json

# Abrir en https://editor.swagger.io/ (Import File)
```

### Panel de Administración

#### Funcionalidades Disponibles

1. **Gestión de Usuarios**

   - Ver todos los usuarios registrados
   - Editar perfiles de usuario
   - Activar/desactivar cuentas
   - Ver estadísticas de registro

2. **Gestión de Expertos**

   - Aprobar/rechazar solicitudes de expertos
   - Editar perfiles de especialistas
   - Gestionar categorías de servicios
   - Ver estadísticas de servicios

3. **Gestión de Citas**

   - Ver todas las citas agendadas
   - Cancelar citas problemáticas
   - Generar reportes de actividad

4. **Configuración del Sistema**
   - Parámetros globales
   - Configuración de emails
   - Mantenimiento de la base de datos

#### Acceso al Panel

```bash
# URL del panel administrativo:
http://localhost:5021/admin/adminUsuarios  # Desarrollo
https://tu-app.onrender.com/admin/adminUsuarios  # Producción

# Credenciales por defecto (cambiar en producción):
Email: servitech.app.correo@gmail.com
Password: Admin123
```

---

## 🔧 Solución de Problemas

### Problemas Comunes de Instalación

#### Error: "Node.js version not supported"

```bash
# Solución: Actualizar Node.js a LTS
# Desinstalar versión anterior
# Descargar e instalar desde nodejs.org

# Verificar después de instalación
node --version  # Debe mostrar v18.x.x o superior
```

#### Error: "npm install fails with permission errors"

```bash
# Linux/Mac - Problemas de permisos
sudo chown -R $(whoami) ~/.npm
npm cache clean --force

# Windows - Ejecutar como administrador
# Click derecho en PowerShell → "Ejecutar como administrador"
```

#### Error: "Cannot find module"

```bash
# Solución: Reinstalar dependencias
rm -rf node_modules package-lock.json  # Linux/Mac
rmdir /s node_modules && del package-lock.json  # Windows

npm cache clean --force
npm install
```

### Problemas de Conexión a MongoDB

#### Error: "MongoNetworkError"

```bash
# Verificar:
1. String de conexión correcto en .env
2. Usuario y contraseña correctos en MongoDB Atlas
3. IP allowlist configurada en MongoDB Atlas
4. Internet connection estable

# Test manual de conexión:
node -e "
const mongoose = require('mongoose');
mongoose.connect('TU_MONGO_URI')
  .then(() => console.log('✅ Conexión exitosa'))
  .catch(err => console.log('❌ Error:', err.message));
"
```

#### Error: "Authentication failed"

```bash
# Solución:
1. Verificar usuario/contraseña en MongoDB Atlas → Database Access
2. Regenerar contraseña del usuario
3. Actualizar MONGO_URI en .env
4. Verificar que el usuario tiene permisos de lectura/escritura
```

### Problemas con Variables de Entorno

#### Error: "JWT_SECRET is required"

```bash
# Verificar archivo .env existe en backend/
ls -la backend/.env  # Linux/Mac
dir backend\.env     # Windows

# Si no existe, crearlo:
cd backend
echo "JWT_SECRET=clave-super-secreta-larga" > .env

# Verificar que se carga:
node -e "require('dotenv').config(); console.log(process.env.JWT_SECRET);"
```

#### Error: "EMAIL_USER is required"

```bash
# Verificar configuración Gmail:
1. App Password generada correctamente (16 caracteres)
2. 2FA habilitada en cuenta Gmail
3. Variables EMAIL_USER y EMAIL_PASS en .env
4. EMAIL_HOST=smtp.gmail.com y EMAIL_PORT=465
```

### Problemas de reCAPTCHA

#### Error: "reCAPTCHA validation failed"

```bash
# Verificar:
1. RECAPTCHA_SITE_KEY y RECAPTCHA_SECRET_KEY en .env
2. Dominio agregado en Google reCAPTCHA admin:
   - localhost (desarrollo)
   - tu-dominio.onrender.com (producción)
3. Tipo de reCAPTCHA: v2 "I'm not a robot"
```

#### reCAPTCHA no aparece en el frontend

```bash
# Verificar en navegador:
1. Abrir Developer Tools (F12)
2. Console tab - buscar errores de reCAPTCHA
3. Network tab - verificar que se carga script de Google
4. Verificar que RECAPTCHA_SITE_KEY está en el HTML
```

### Problemas de Proxy en Desarrollo

#### Error: "ECONNREFUSED localhost:5020"

```bash
# Solución:
1. Verificar que backend está ejecutándose en puerto 5020
cd backend && npm run dev

2. Verificar puerto en frontend/server.js:
const BACKEND_URL = 'http://localhost:5020';

3. Reiniciar ambos servidores:
Ctrl+C en ambos terminales
cd backend && npm run dev
cd frontend && npm run dev  # En otro terminal
```

#### Frontend no recarga automáticamente

```bash
# Verificar:
1. nodemon instalado en frontend:
cd frontend && npm install --save-dev nodemon

2. Script correcto en package.json:
"dev": "nodemon server.js"

3. Archivos .ejs están en carpeta correcta:
frontend/views/
```

### Problemas de Deploy en Render

#### Error: "Application failed to start"

```bash
# Verificar logs en Render dashboard:
1. Ir a tu servicio en Render
2. Events tab → ver logs de deploy
3. Logs tab → ver errores en tiempo real

# Errores comunes:
- Variables de entorno faltantes
- Problemas de build: verificar "npm run build"
- Puerto incorrecto: debe usar process.env.PORT
```

#### Error: "Module not found in production"

```bash
# Verificar package.json:
1. Dependencias en "dependencies" (no en "devDependencies")
2. Build command instala dependencias de frontend:
"build": "cd ../frontend && npm install && cd ../backend && npm install"

3. Estructura de archivos correcta en Render:
Root Directory: backend
```

### Problemas con Swagger UI

#### Error: "403 Forbidden" en /api-docs

```bash
# Verificar autenticación:
1. Token JWT válido y no expirado
2. Usuario con rol "admin"
3. Header Authorization correctamente formateado:
   "Authorization: Bearer TOKEN_AQUI"

# Regenerar token:
curl -X POST http://localhost:5020/api/usuarios/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@email.com","password":"contraseña"}'
```

#### Swagger UI se abre pero no permite requests

```bash
# Normal en producción por seguridad
# Para testing, temporalmente configurar en swagger.js:
swaggerUi.setup(swaggerDocument, {
  swaggerOptions: {
    tryItOutEnabled: true  // Solo en desarrollo
  }
})
```

### Logs y Debugging

#### Habilitar logs detallados

```bash
# En .env agregar:
DEBUG=app:*
LOG_LEVEL=debug

# Reiniciar servidor para ver logs detallados
```

#### Verificar logs de aplicación

```bash
# Backend logs
cd backend && npm run dev
# Buscar líneas que empiecen con ✅ ❌ 🚀 📧

# MongoDB logs en desarrollo
# Activar en mongoose.connect() agregar:
// mongoose.set('debug', true);
```

#### Herramientas de debugging recomendadas

```bash
# Para API testing:
- Thunder Client (VS Code extension)
- Postman
- Insomnia
- curl (línea de comandos)

# Para MongoDB:
- MongoDB Compass (GUI)
- MongoDB Atlas web interface

# Para logs de producción:
- Render dashboard logs
- Browser developer tools (F12)
```

---

## 🔄 Mantenimiento

### Actualizaciones Regulares

#### Actualizar Dependencias

```bash
# Verificar dependencias obsoletas
cd backend && npm outdated
cd ../frontend && npm outdated

# Actualizar dependencias menores
npm update

# Actualizar dependencias mayores (cuidado)
npm install package@latest
```

#### Actualizar Node.js

```bash
# Verificar versión LTS actual
# https://nodejs.org/

# Actualizar usando Node Version Manager (recomendado)
# Linux/Mac:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts
nvm use --lts

# Windows:
# Descargar e instalar desde nodejs.org
```
