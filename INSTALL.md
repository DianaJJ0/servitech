# 📋 Manual de Instalación Técnica - SERVITECH

> **Guía completa para instalación, configuración y resolución de problemas**

Este manual detalla paso a paso cómo instalar, configurar y poner en funcionamiento ServiTech en diferentes entornos, incluyendo solución de problemas comunes.

---

## 📋 Tabla de Contenidos

1. [Requisitos del Sistema](#-requisitos-del-sistema)
2. [Instalación por SO](#-instalación-por-sistema-operativo)
3. [Configuración de Base de Datos](#-configuración-de-base-de-datos)
4. [Variables de Entorno](#-configuración-de-variables-de-entorno)
5. [Inicialización de Servicios](#-inicialización-de-servicios)
6. [Verificación de Instalación](#-verificación-de-instalación)
7. [Configuración de Producción](#-configuración-de-producción)
8. [Troubleshooting](#-solución-de-problemas)
9. [Mantenimiento](#-mantenimiento)

---

## 🔧 Requisitos del Sistema

### Hardware Mínimo

| Componente | Mínimo     | Recomendado |
| ---------- | ---------- | ----------- |
| **RAM**    | 2 GB       | 4 GB        |
| **Disco**  | 1 GB libre | 5 GB libre  |
| **CPU**    | Dual Core  | Quad Core   |
| **Red**    | 10 Mbps    | 50 Mbps     |

### Software Requerido

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Git**: >= 2.30.0
- **MongoDB**: Atlas (recomendado) o local >= 5.0

### Verificar Versiones

```bash
node --version    # Debe mostrar v18.x.x o superior
npm --version     # Debe mostrar 9.x.x o superior
git --version     # Debe mostrar 2.x.x o superior
```

---

## 🖥️ Instalación por Sistema Operativo

### Windows 10/11

#### 1. Instalar Node.js

```powershell
# Opción 1: Descargar desde nodejs.org
# Opción 2: Usar winget
winget install OpenJS.NodeJS

# Opción 3: Usar Chocolatey
choco install nodejs
```

#### 2. Instalar Git

```powershell
# Opción 1: Descargar desde git-scm.com
# Opción 2: Usar winget
winget install Git.Git
```

#### 3. Clonar Repositorio

```powershell
# Abrir PowerShell como administrador
git clone https://github.com/DianaJJ0/servitech.git
cd servitech
```

### Ubuntu/Debian Linux

#### 1. Actualizar Sistema

```bash
sudo apt update && sudo apt upgrade -y
```

#### 2. Instalar Node.js (via NodeSource)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 3. Instalar Git

```bash
sudo apt install git -y
```

#### 4. Clonar Repositorio

```bash
git clone https://github.com/DianaJJ0/servitech.git
cd servitech
```

### CentOS/RHEL/Fedora

#### 1. Instalar Node.js

```bash
# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Fedora
sudo dnf install nodejs npm git -y
```

#### 2. Clonar Repositorio

```bash
git clone https://github.com/DianaJJ0/servitech.git
cd servitech
```

---

## 🗄️ Configuración de Base de Datos

### Opción 1: MongoDB Atlas (Recomendado)

#### 1. Crear Cuenta

1. Ir a [MongoDB Atlas](https://cloud.mongodb.com)
2. Registrarse con email
3. Crear cluster gratuito (M0)

#### 2. Configurar Acceso

1. **Database Access**: Crear usuario con permisos de lectura/escritura
2. **Network Access**: Añadir `0.0.0.0/0` (para desarrollo) o IP específica
3. **Connect**: Copiar URI de conexión

#### 3. Obtener URI de Conexión

```
mongodb+srv://<usuario>:<contraseña>@cluster0.xxxxx.mongodb.net/servitech?retryWrites=true&w=majority
```

### Opción 2: MongoDB Local

#### Windows

```powershell
# Descargar MongoDB Community desde mongodb.com
# Instalar como servicio
# URI de conexión: mongodb://localhost:27017/servitech
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
```

---

## ⚙️ Configuración de Variables de Entorno

### 1. Crear Archivo `.env`

En la carpeta `backend/`, crear archivo `.env`:

```bash
cd backend
touch .env  # Linux/Mac
echo. > .env  # Windows
```

### 2. Configurar Variables

Editar `backend/.env` con tu editor favorito:

```ini
# === CONFIGURACIÓN DEL SERVIDOR ===
PORT=3000
NODE_ENV=development

# === BASE DE DATOS ===
MONGO_URI=mongodb+srv://usuario:contraseña@cluster.mongodb.net/servitech

# === AUTENTICACIÓN ===
JWT_SECRET=tu_clave_super_secreta_de_al_menos_32_caracteres
JWT_EXPIRES_IN=7d

# === CONFIGURACIÓN DE EMAIL ===
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=servitech.app.correo@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicacion_gmail

# === URLS DE LA APLICACIÓN ===
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001

# === SEGURIDAD ===
API_KEY=8g-X4JgECIPNcQ59tMN
BCRYPT_ROUNDS=12

# === CONFIGURACIÓN DE ARCHIVOS ===
UPLOAD_PATH=uploads
MAX_FILE_SIZE=5242880

# === CONFIGURACIÓN DE PAGOS (si aplica) ===
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

### 3. Configurar Gmail para Emails

#### Habilitar Autenticación de 2 Factores

1. Ir a [Cuenta de Google](https://myaccount.google.com)
2. Seguridad → Verificación en 2 pasos → Activar

#### Generar Contraseña de Aplicación

1. Seguridad → Contraseñas de aplicaciones
2. Seleccionar "Correo" y "Otro"
3. Generar contraseña de 16 caracteres
4. Usar esta contraseña en `EMAIL_PASS`

---

## 🚀 Inicialización de Servicios

### 1. Instalar Dependencias

#### Backend

```bash
cd backend
npm install

# Verificar instalación
npm ls --depth=0
```

#### Frontend

```bash
cd ../frontend
npm install

# Verificar instalación
npm ls --depth=0
```

### 2. Verificar Archivos de Configuración

#### Estructura esperada:

```
servitech/
├── backend/
│   ├── .env ✅
│   ├── package.json ✅
│   ├── app.js ✅
│   └── node_modules/ ✅
├── frontend/
│   ├── package.json ✅
│   ├── server.js ✅
│   └── node_modules/ ✅
```
