# SERVITECH 🔧

> **Plataforma web para conectar usuarios con expertos en tecnología**

ServiTech es una aplicación full-stack que facilita la conexión entre usuarios que necesitan asesoría técnica y expertos calificados en tecnología. Permite agendar citas, gestionar perfiles, procesar pagos y administrar servicios de manera integral.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen.svg)](https://www.mongodb.com/)
[![Render](https://img.shields.io/badge/Deploy-Render-blue.svg)](https://render.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🎯 ¿Qué hace ServiTech?

- **Conecta** usuarios con expertos en tecnología
- **Facilita** el agendamiento de asesorías técnicas
- **Gestiona** perfiles de usuarios y especialistas
- **Procesa** pagos de forma segura
- **Administra** servicios a través de panel web

---

## 🚀 Características

### Para Usuarios

- ✅ Registro y login seguro con reCAPTCHA v2
- 🔍 Búsqueda de expertos por especialidad
- 📅 Agendamiento de citas en tiempo real
- 💳 Pagos integrados y seguros
- 📧 Notificaciones automáticas por email
- 🔒 Recuperación de contraseña
- 📱 Interfaz responsive

### Para Expertos

- 📋 Gestión de perfil profesional con foto
- ⏰ Control de disponibilidad por horarios
- 💼 Administración de servicios y tarifas
- 📊 Gestión de solicitudes de asesorías

### Para Administradores

- 🎛️ Panel de control completo con Swagger UI
- 👥 Gestión de usuarios y expertos
- 📈 Estadísticas y reportes en tiempo real
- ⚙️ Configuración del sistema
- 🔒 Autenticación basada en roles
- 📋 Logs de auditoría

---

## 🛠️ Stack Tecnológico

| Componente        | Tecnología                  |
| ----------------- | --------------------------- |
| **Backend**       | Node.js + Express.js        |
| **Base de Datos** | MongoDB (Atlas)             |
| **Frontend**      | EJS + CSS3 + JavaScript     |
| **Autenticación** | JWT + bcrypt + roles        |
| **Emails**        | Nodemailer (Gmail SMTP)     |
| **Seguridad**     | Google reCAPTCHA v2         |
| **API Docs**      | Swagger UI (protegido)      |
| **Deployment**    | Render (servidor unificado) |

---

## ⚡ Inicio Rápido

### Prerrequisitos

- Node.js 18+ y npm 9+
- Git
- Cuenta MongoDB Atlas (gratuita)
- Cuenta Gmail con App Password para emails
- Claves de Google reCAPTCHA v2

### 🏗️ Arquitectura del Sistema

**ServiTech utiliza una arquitectura de servidor unificado:**

```
🔄 DESARROLLO (npm run dev)
Frontend (Puerto 5021) --proxy--> Backend (Puerto 5020)
↳ Servidor de desarrollo con live reload

🚀 PRODUCCIÓN (npm start)
Backend único (Puerto render) = API + Frontend servido
↳ Servidor unificado optimizado
```

### 🔧 Instalación y Desarrollo

```bash
# 1. Clonar repositorio
git clone https://github.com/DianaJJ0/servitech.git
cd servitech

# 2. Instalar dependencias del backend
cd backend
npm install

# 3. Instalar dependencias del frontend
cd ../frontend
npm install

# 4. Configurar variables de entorno (ver sección variables)
cp backend/.env.example backend/.env
# Editar backend/.env con tus credenciales

# 5. MODO DESARROLLO (recomendado para desarrollo)
# Terminal 1 - Backend API:
cd backend
npm run dev  # Puerto 5020 (API + vistas)

# Terminal 2 - Frontend con proxy y live reload:
cd ../frontend
npm run dev  # Puerto 5021 (proxy a backend)

# 6. MODO PRODUCCIÓN LOCAL (para probar antes de deploy)
cd backend
npm start  # Solo backend sirviendo todo en puerto 5020
```

### 🌐 URLs de Acceso

#### Desarrollo (npm run dev):

- **Frontend Principal:** http://localhost:5021
- **Backend API directo:** http://localhost:5020
- **Admin Panel:** http://localhost:5021/admin/adminUsuarios
- **Swagger UI:** http://localhost:5021/api-docs (requiere token admin)

#### Producción:

- **Aplicación completa:** https://servitech-2bja.onrender.com
- **API:** https://servitech-2bja.onrender.com/api/
- **Admin:** https://servitech-2bja.onrender.com/admin/adminUsuarios

---

## 📁 Estructura del Proyecto

```
servitech/
├── 🔧 backend/                    # Servidor principal (Node.js/Express)
│   ├── config/                   # Configuraciones del sistema
│   ├── controllers/              # Lógica de negocio MVC
│   ├── middleware/               # Middleware personalizado
│   ├── models/                   # Esquemas MongoDB (Mongoose)
│   ├── routes/                   # Rutas API REST
│   ├── services/                 # Servicios de negocio
│   ├── uploads/                  # Archivos subidos (fotos perfil)
│   ├── validators/               # Validaciones de entrada
│   ├── .env                      # Variables de entorno
│   ├── app.js                    # Aplicación principal unificada
│   ├── inicializar.js            # Script de inicialización
│   ├── package-lock.json         # Lock de dependencias
│   └── package.json              # Dependencias backend
├── 🖥️ frontend/                   # Assets y vistas (servido por backend)
│   ├── assets/                   # Recursos estáticos
│   │   ├── css/                  # Hojas de estilo CSS
│   │   ├── img/                  # Imágenes del proyecto
│   │   └── js/                   # JavaScript del cliente
│   ├── views/                    # Plantillas EJS
│   │   ├── admin/                # Panel administrativo
│   │   ├── components/           # Componentes reutilizables
│   │   ├── 404.ejs               # Página de error 404
│   │   ├── calendarioAsesorias.ejs # Calendario de asesorías
│   │   ├── confirmacionAsesoria.ejs # Confirmación de asesoría
│   │   ├── contacto.ejs          # Página de contacto
│   │   ├── debug-categorias.ejs  # Debug de categorías
│   │   ├── editarExpertos.ejs    # Edición de expertos
│   │   ├── expertos.ejs          # Lista de expertos
│   │   ├── index.ejs             # Página principal
│   │   ├── login.ejs             # Página de login
│   │   ├── misAsesorias.ejs      # Mis asesorías
│   │   ├── pasarelasPagos.ejs    # Pasarelas de pago
│   │   ├── perfil.ejs            # Perfil de usuario
│   │   ├── privacidad.ejs        # Política de privacidad
│   │   ├── registro.ejs          # Registro de usuario
│   │   ├── registroExperto.ejs   # Registro de experto
│   │   ├── recuperarPassword.ejs # Recuperación de contraseña
│   │   └── terminos.ejs          # Términos y condiciones
│   ├── tests/                    # Archivos de prueba
│   ├── .env                      # Variables de desarrollo (opcional)
│   ├── package-lock.json         # Lock de dependencias
│   ├── package.json              # Dependencias frontend
│   └── server.js                 # Servidor de desarrollo con proxy
├── 📋 INSTALL.md                  # Manual técnico detallado
├── 📄 README.md                   # Documentación principal
└── 🔒 .gitignore                  # Archivos ignorados por Git
```

---

## ⚙️ Variables de Entorno

### Desarrollo Local (backend/.env)

```env
# === CONFIGURACIÓN DEL SERVIDOR ===
PORT=5020
NODE_ENV=development

# === BASE DE DATOS ===
MONGO_URI=mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/servitech

# === AUTENTICACIÓN ===
JWT_SECRET=clave_super_secreta_de_al_menos_32_caracteres
JWT_EXPIRES_IN=7d

# === EMAIL (Gmail SMTP) ===
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=servitech.app.correo@gmail.com
EMAIL_PASS=tu_app_password_de_16_caracteres

# === GOOGLE RECAPTCHA V2 ===
RECAPTCHA_SITE_KEY=6LcXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
RECAPTCHA_SECRET_KEY=6LcXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# === URLs DE LA APLICACIÓN ===
APP_URL=http://localhost:5020
FRONTEND_URL=http://localhost:5021

# === SEGURIDAD ===
API_KEY=8g-X4JgECIPNcQ59tMN
BCRYPT_ROUNDS=12

# === CONFIGURACIÓN DE ARCHIVOS ===
UPLOAD_PATH=uploads
MAX_FILE_SIZE=5242880

# === ADMINISTRACIÓN ===
ADMIN_EMAIL=app.correo@gmail.com
ADMIN_PASSWORD=Admin123
```

### Producción (Variables Render)

```env
# Mismas variables que desarrollo +
NODE_ENV=production
RENDER_EXTERNAL_URL=https://servitech-2bja.onrender.com
PORT=10000  # Configurado automáticamente por Render

# Sin FRONTEND_URL (servidor unificado)
```

---

## 🚀 Scripts de Desarrollo

### Backend (`cd backend`)

```bash
npm start          # 🚀 Servidor producción (unificado)
npm run dev        # 🔧 Desarrollo con nodemon (solo backend)
npm run build      # 📦 Instala dependencias frontend + backend
npm test           # 🧪 Ejecutar tests (si existen)
```

### Frontend (`cd frontend`)

```bash
npm start          # 🌐 Servidor frontend standalone (no recomendado)
npm run dev        # 🔧 Desarrollo con proxy y live reload
npm run dev:proxy  # 🔄 Solo proxy al backend (alternativo)
```

### Comandos Combinados Recomendados

```bash
# DESARROLLO (2 terminales)
Terminal 1: cd backend && npm run dev
Terminal 2: cd frontend && npm run dev

# PRODUCCIÓN LOCAL (1 terminal)
cd backend && npm start
```

---

## 🔐 Panel de Administración

### Acceso al Panel Admin

1. **Login como administrador:**

   - Email: `servitech.app.correo@gmail.com`
   - Password: `Admin123`

2. **Acceder al panel:** `/admin/adminUsuarios`

3. **Swagger UI protegido:**
   - Endpoint: `/api-docs`
   - Requiere token JWT de admin
   - Ver [INSTALL.md](./INSTALL.md) para instrucciones detalladas

### Funcionalidades Admin

- 👥 Gestión completa de usuarios
- 🏆 Administración de expertos
- 📊 Estadísticas en tiempo real
- 🔧 Configuración del sistema
- 📋 Logs de auditoría
- 🗂️ Gestión de categorías

---

## 🔄 Flujo de Trabajo

```mermaid
graph TD
    A[Usuario se registra] --> B[Verifica reCAPTCHA]
    B --> C[Login JWT]
    C --> D[Busca expertos]
    D --> E[Selecciona especialista]
    E --> F[Agenda cita]
    F --> G[Confirma datos]
    G --> H[Recibe email confirmación]
    H --> I[Realiza asesoría]

    J[Experto se registra] --> K[Completa perfil]
    K --> L[Sube foto perfil]
    L --> M[Define servicios y tarifas]
    M --> N[Configura disponibilidad]
    N --> O[Recibe solicitudes]
    O --> I[Realiza asesoría]

    P[Admin] --> Q[Panel administrativo]
    Q --> R[Gestiona usuarios/expertos]
    R --> S[Monitorea sistema]
    S --> T[Configura parámetros]
```

---

## 🛡️ Seguridad Implementada

- 🔐 **Autenticación JWT** con roles (usuario, experto, admin)
- 🛡️ **Encriptación bcrypt** para contraseñas
- 🤖 **Google reCAPTCHA v2** en registro/login
- 🔒 **Rutas protegidas** según rol de usuario
- 📧 **Validación de email** en registro
- 🚫 **Rate limiting** en endpoints críticos
- 🔍 **Validación de entrada** con Joi/express-validator
- 📋 **Logs de auditoría** para acciones importantes

---

## 🎮 Guía de Uso

### Como Usuario Final

1. **Registro:** Ir a `/registro.html`, completar datos + reCAPTCHA
2. **Login:** Autenticarse en `/login.html`
3. **Explorar:** Ver expertos disponibles en `/expertos.html`
4. **Agendar:** Seleccionar experto y agendar cita
5. **Confirmar:** Revisar detalles y confirmar
6. **Conectar:** Recibir detalles por email y conectar

### Como Experto

1. **Registro inicial:** Como usuario normal
2. **Registro experto:** Completar perfil en `/registroExperto`
3. **Configurar perfil:** Subir foto, definir categorías y tarifas
4. **Gestionar servicios:** Precios, disponibilidad
5. **Atender clientes:** Gestionar citas agendadas

### Como Administrador

1. **Login admin:** Credenciales de administrador
2. **Panel control:** Acceder a `/admin/adminUsuarios`
3. **Gestionar usuarios:** CRUD completo de usuarios
4. **Supervisar expertos:** Aprobar/rechazar perfiles
5. **Monitorear sistema:** Ver estadísticas y logs

---

## 🚀 Deployment en Render

### Configuración para Render

1. **Conectar repositorio GitHub** a cuenta Render
2. **Crear Web Service** con configuración:
   ```
   Name: servitech
   Root Directory: backend
   Environment: Node
   Build Command: npm run build
   Start Command: npm start
   ```
3. **Variables de entorno:** Configurar en panel Environment
4. **Auto-deploy:** Activar desde rama main

### Variables Render Requeridas

```env
NODE_ENV=production
MONGO_URI=mongodb+srv://...
JWT_SECRET=clave-larga-segura
EMAIL_USER=tu-gmail@gmail.com
EMAIL_PASS=app-password-16-chars
RECAPTCHA_SITE_KEY=6Lc...
RECAPTCHA_SECRET_KEY=6Lc...
ADMIN_EMAIL=admin@dominio.com
ADMIN_PASSWORD=PasswordSeguro123
```

---

## 🤝 Contribuir

### Preparar Entorno de Desarrollo

```bash
# 1. Fork y clonar
git clone https://github.com/tu-usuario/servitech.git
cd servitech

# 2. Instalar dependencias
cd backend && npm install
cd ../frontend && npm install

# 3. Configurar .env local
cp backend/.env.example backend/.env
# Editar con tus credenciales

# 4. Crear rama feature
git checkout -b feature/nueva-funcionalidad

# 5. Desarrollar en modo dev
# Terminal 1: cd backend && npm run dev
# Terminal 2: cd frontend && npm run dev

# 6. Probar modo producción
cd backend && npm start

# 7. Commit y push
git commit -m "feat: descripción del cambio"
git push origin feature/nueva-funcionalidad

# 8. Crear Pull Request
```

### Estándares de Código

- 🏗️ **Arquitectura MVC** estricta
- 📝 **Comentarios** en funciones complejas
- 🧪 **Tests** para nuevas funcionalidades
- 📋 **Commits semánticos** (feat, fix, docs, etc.)
- 🔍 **ESLint/Prettier** para formato consistente

---

## 📞 Soporte y Recursos

| Recurso               | Enlace                                                        |
| --------------------- | ------------------------------------------------------------- |
| 🐛 **Issues/Bugs**    | [GitHub Issues](https://github.com/DianaJJ0/servitech/issues) |
| 📧 **Email Soporte**  | servitech.app.correo@gmail.com                                |
| 📚 **Manual Técnico** | [INSTALL.md](./INSTALL.md)                                    |
| 🌐 **Demo Live**      | https://servitech-2bja.onrender.com                           |
| 👩‍💻 **Desarrolladora** | [@DianaJJ0](https://github.com/DianaJJ0)                      |
| 📖 **API Docs**       | `/api-docs` (requiere auth admin)                             |

---

## 🔗 Enlaces Útiles

- [MongoDB Atlas](https://cloud.mongodb.com/) - Base de datos
- [Render](https://render.com/) - Hosting
- [Google reCAPTCHA](https://www.google.com/recaptcha/) - Seguridad
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833) - Email
- [Node.js](https://nodejs.org/) - Runtime

---

<div align="center">

**¿Necesitas ayuda técnica? ¡ServiTech te conecta con los mejores expertos! 🚀**

[🌟 Dar estrella](https://github.com/DianaJJ0/servitech) | [🐛 Reportar bug](https://github.com/DianaJJ0/servitech/issues) | [💡 Sugerir feature](https://github.com/DianaJJ0/servitech/issues) | [🚀 Ver demo](https://servitech-2bja.onrender.com)

---

### 🏆 Tecnología desarrollada con ❤️ para conectar talento

</div>
