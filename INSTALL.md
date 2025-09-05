# Manual de Instalación y Puesta en Marcha – SERVITECH

---

## 1. Descripción General

ServiTech es una plataforma web para conectar usuarios con expertos en tecnología, permitiendo agendar asesorías, gestionar perfiles y realizar pagos seguros.
Este manual detalla cómo preparar el entorno, instalar dependencias y activar el proyecto desde cero.

---

## 2. Requisitos Previos

### Hardware y Software

- PC con Windows 10/11 o Linux (Ubuntu/Debian recomendado)
- Al menos 2 GB de RAM, 1 GB libre en disco
- Acceso a Internet (para dependencias y MongoDB Atlas)

### Dependencias

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Git** >= 2.x
- **MongoDB** (puede ser local o MongoDB Atlas)

---

## 3. Clonación del Repositorio

Abre la terminal/PowerShell y ejecuta:

```bash
git clone https://github.com/DianaJJ0/servitech.git
cd servitech
```

---

## 4. Instalación de Dependencias

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd ../frontend
npm install
```

---

## 5. Configuración de la Base de Datos y Variables de Entorno

### MongoDB

- Puedes usar **MongoDB Atlas** (recomendado) o local.
- Si usas Atlas, crea una cuenta en [mongodb.com](https://cloud.mongodb.com).
- Copia tu URI de conexión. Ejemplo:
  ```
  mongodb+srv://usuario:contraseña@cluster.mongodb.net/servitech
  ```

### Archivo `.env` en `backend/`

Copia el archivo de ejemplo si existe:

```bash
copy .env.example .env
```

Edita el archivo `.env` en `backend/` con tus datos:

```ini
# Puerto del backend
PORT=3000

# URI de MongoDB (Atlas o local)
MONGO_URI=mongodb+srv://usuario:contraseña@cluster.mongodb.net/servitech

# Clave secreta JWT
JWT_SECRET=TU_CLAVE_SECRETA_MUY_SEGURA

# Entorno de ejecución
NODE_ENV=development

# Configuración de correo (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=servitech.app.correo@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicacion

# URLs de la aplicación
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001

# API Key (para rutas protegidas)
API_KEY=8g-X4JgECIPNcQ59tMN
```

> **Nota:** Nunca subas tus datos sensibles al repositorio público.

---

## 6. Inicialización y Ejecución

### 1. Iniciar el Backend

```bash
cd backend
npm start
```

El backend corre por defecto en el puerto **3000**.

### 2. Iniciar el Frontend

Abre otra terminal:

```bash
cd frontend
node server.js
```

El frontend corre por defecto en el puerto **3001**.

> Importante (desarrollo local): para que el proxy del frontend inyecte la cabecera
> `x-api-key` en las solicitudes hacia el backend (necesario para las operaciones
> administrativas) debes iniciar el proceso del frontend con la variable de entorno
> `API_KEY` definida. Ejemplo:

```bash
# desde la carpeta raíz del repo
API_KEY=8g-X4JgECIPNcQ59tMN PORT=3001 node frontend/server.js
```

Si usas un servicio o systemd, añade `API_KEY` al env del servicio para producción.

---

## 7. Acceso a la Aplicación

- **Frontend (vistas EJS):** [http://localhost:3001](http://localhost:3001)
- **Backend (API):** [http://localhost:3000](http://localhost:3000)

Abre tu navegador y visita [http://localhost:3001](http://localhost:3001).

---

## 8. Estructura de Carpetas

```
servitech/
├── backend/
│   ├── app.js
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── package.json
│   └── .env
├── frontend/
│   ├── server.js
│   ├── assets/
│   ├── views/
│   ├── package.json
├── install.md
└── README.md
```

---

## 9. Versiones Recomendadas

Verifica que tienes las versiones correctas:

```bash
node --version
npm --version
git --version
```

---

## 10. Problemas Frecuentes y Soluciones

- **MongoDB no conecta:** Verifica la URI y que el servicio esté activo.
- **Error de dependencias:** Ejecuta `npm install` en cada carpeta.
- **Puerto ocupado:** Libera el puerto (Windows: `netstat -ano | findstr :3000` y `taskkill /PID <PID_NUMBER> /F`)
- **Variables de entorno:** Revisa `.env` y que los datos estén correctos.
- **Correo no se envía:** Verifica credenciales Gmail (EMAIL_USER y EMAIL_PASS).
- **CORS:** Backend permite origen `http://localhost:3001` por defecto.

---

## 11. Inicialización de Datos de Ejemplo (opcional)

Si tienes un script de inicialización (por ejemplo, para datos de prueba):

```bash
cd backend
node inicializar.js
```

---

## 12. Referencia de Arquitectura

- **Backend:** Node.js + Express + MongoDB, estructura MVC, autenticación JWT.
- **Frontend:** Express + EJS, vistas organizadas y componentes reutilizables.
- **Servicios:** Email (Nodemailer) y API protegida por API Key.
- **Seguridad:** Contraseñas cifradas (bcrypt), rutas protegidas, manejo de sesiones.

---

## 13. Créditos y Licencia

- Desarrollado por Diana Jiménez (@DianaJJ0)
- Licencia: MIT

---
