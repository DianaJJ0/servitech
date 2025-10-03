/**
 * @file Rutas de usuario (Identificación por email)
 * @module routes/usuario
 * @description Define los endpoints de la API para la gestión de usuarios en Servitech.
 */

const express = require("express");
const router = express.Router();

const usuarioController = require("../controllers/usuario.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");
const apiKeyMiddleware = require("../middleware/apiKey.middleware.js");
const multer = require("multer");
const path = require("path");

// Configurar storage para avatars (ruta backend/uploads)
const uploadsPath = process.env.UPLOAD_PATH || "uploads";
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../", uploadsPath));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || ".png";
    const name = `avatar_${Date.now()}${ext}`;
    cb(null, name);
  },
});
const upload = multer({
  storage: storage,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE || 5242880) },
});

/**
 * @openapi
 * tags:
 *   - name: Usuarios
 *     description: Operaciones relacionadas con usuarios (registro, login, perfil)
 */

/**
 * @openapi
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *     apiKeyAuth:
 *       type: apiKey
 *       in: header
 *       name: X-API-Key
 */

/**
 * @openapi
 * /api/usuarios/buscar:
 *   get:
 *     summary: Buscar usuario por email (público)
 *     description: Busca un usuario activo por su email para validaciones públicas
 *     tags: [Usuarios]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email del usuario a buscar
 *         example: "usuario@ejemplo.com"
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 nombre:
 *                   type: string
 *                 apellido:
 *                   type: string
 *                 email:
 *                   type: string
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: string
 *                 estado:
 *                   type: string
 *       400:
 *         description: Email no proporcionado o inválido
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/buscar", usuarioController.buscarUsuarioPorEmail);

/**
 * @openapi
 * /api/usuarios/registro:
 *   post:
 *     summary: Registra un nuevo usuario
 *     description: |
 *       Registra un nuevo usuario en el sistema. Por defecto se asigna el rol 'cliente'.
 *       Si se incluye información de experto, se crea una solicitud que requiere aprobación admin.
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - apellido
 *               - email
 *               - password
 *             properties:
 *               nombre:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 80
 *                 description: Nombre del usuario
 *                 example: "Juan Carlos"
 *               apellido:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 80
 *                 description: Apellido del usuario
 *                 example: "Pérez García"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email único del usuario
 *                 example: "juan.perez@ejemplo.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Contraseña del usuario
 *                 example: "miPassword123"
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [cliente, experto]
 *                 description: Roles solicitados
 *                 example: ["cliente", "experto"]
 *               infoExperto:
 *                 type: object
 *                 description: Información para solicitar ser experto
 *                 properties:
 *                   descripcion:
 *                     type: string
 *                     description: Descripción profesional
 *                   precioPorHora:
 *                     type: number
 *                     description: Precio por hora en COP
 *                   categorias:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: IDs de categorías de especialización
 *                   banco:
 *                     type: string
 *                     description: Nombre del banco
 *                   tipoCuenta:
 *                     type: string
 *                     enum: [ahorros, corriente]
 *                   numeroCuenta:
 *                     type: string
 *                     description: Número de cuenta bancaria
 *                   titular:
 *                     type: string
 *                     description: Titular de la cuenta
 *                   tipoDocumento:
 *                     type: string
 *                     enum: [cedula, pasaporte, extranjeria]
 *                   numeroDocumento:
 *                     type: string
 *                     description: Número de documento
 *                   telefonoContacto:
 *                     type: string
 *                     description: Teléfono de contacto
 *                   diasDisponibles:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [lunes, martes, miercoles, jueves, viernes, sabado, domingo]
 *                     description: Días disponibles
 *           examples:
 *             registro_cliente:
 *               summary: Registro básico como cliente
 *               value:
 *                 nombre: "Ana"
 *                 apellido: "García"
 *                 email: "ana.garcia@ejemplo.com"
 *                 password: "miPassword123"
 *             registro_experto:
 *               summary: Registro con solicitud de experto
 *               value:
 *                 nombre: "Carlos"
 *                 apellido: "López"
 *                 email: "carlos.lopez@ejemplo.com"
 *                 password: "miPassword123"
 *                 roles: ["cliente", "experto"]
 *                 infoExperto:
 *                   descripcion: "Desarrollador Full Stack con 5 años de experiencia"
 *                   precioPorHora: 75000
 *                   categorias: ["507f1f77bcf86cd799439011"]
 *                   banco: "Bancolombia"
 *                   tipoCuenta: "ahorros"
 *                   numeroCuenta: "1234567890"
 *                   titular: "Carlos López"
 *                   tipoDocumento: "cedula"
 *                   numeroDocumento: "87654321"
 *                   telefonoContacto: "3009876543"
 *                   diasDisponibles: ["lunes", "martes", "miercoles", "jueves", "viernes"]
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                 token:
 *                   type: string
 *                 estado:
 *                   type: string
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Error en la solicitud
 *       409:
 *         description: Usuario ya existe
 *       500:
 *         description: Error interno del servidor
 */
router.post("/registro", usuarioController.registrarUsuario);

/**
 * @openapi
 * /api/usuarios/login:
 *   post:
 *     summary: Inicia sesión de usuario
 *     description: |
 *       Autentica al usuario con email y contraseña. Devuelve un token JWT válido
 *       por 2 días y establece una sesión en el servidor.
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email registrado del usuario
 *                 example: "juan@ejemplo.com"
 *               password:
 *                 type: string
 *                 description: Contraseña del usuario
 *                 example: "miPassword123"
 *           examples:
 *             login_valido:
 *               summary: Credenciales válidas
 *               value:
 *                 email: "usuario@ejemplo.com"
 *                 password: "miPassword123"
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Login exitoso."
 *                 token:
 *                   type: string
 *                   description: Token JWT para autenticación
 *                 usuario:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     nombre:
 *                       type: string
 *                     apellido:
 *                       type: string
 *                     email:
 *                       type: string
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Credenciales faltantes
 *       401:
 *         description: Credenciales incorrectas
 *       500:
 *         description: Error interno del servidor
 */
router.post("/login", usuarioController.iniciarSesion);

/**
 * @openapi
 * /api/usuarios/recuperar-password:
 *   post:
 *     summary: Solicita recuperación de contraseña
 *     description: |
 *       Genera un token de recuperación único y envía un email con enlace para
 *       restablecer la contraseña. Por seguridad, siempre responde exitosamente
 *       independientemente de si el email existe o no.
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email del usuario que solicita recuperación
 *                 example: "usuario@ejemplo.com"
 *           examples:
 *             recuperacion_valida:
 *               summary: Solicitud de recuperación válida
 *               value:
 *                 email: "juan@ejemplo.com"
 *     responses:
 *       200:
 *         description: Solicitud procesada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Si el email existe, se enviaron instrucciones."
 *       400:
 *         description: Email requerido
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  "/recuperar-password",
  usuarioController.solicitarRecuperacionPassword
);

/**
 * @openapi
 * /api/usuarios/reset-password:
 *   post:
 *     summary: Restablece contraseña usando token
 *     description: |
 *       Valida el token de recuperación enviado por email y actualiza
 *       la contraseña del usuario. El token tiene validez de 1 hora.
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token de recuperación recibido por email
 *                 example: "a1b2c3d4e5f6789abcdef0123456789"
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 description: Nueva contraseña del usuario
 *                 example: "nuevaPassword123"
 *           examples:
 *             reset_valido:
 *               summary: Restablecimiento válido
 *               value:
 *                 token: "a1b2c3d4e5f6789abcdef0123456789"
 *                 newPassword: "miNuevaPassword456"
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Contraseña actualizada. Puedes iniciar sesión."
 *       400:
 *         description: Token inválido o expirado
 *       500:
 *         description: Error interno del servidor
 */
router.post("/reset-password", usuarioController.resetearPassword);


// Rutas protegidas (requieren token)

/**
 * @openapi
 * /api/usuarios/perfil:
 *   get:
 *     summary: Obtiene el perfil del usuario autenticado
 *     description: |
 *       Retorna la información completa del perfil del usuario autenticado,
 *       incluyendo información de experto si aplica y nombres de categorías resueltos.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil de usuario obtenido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 nombre:
 *                   type: string
 *                 apellido:
 *                   type: string
 *                 email:
 *                   type: string
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: string
 *                 estado:
 *                   type: string
 *                 avatarUrl:
 *                   type: string
 *                 infoExperto:
 *                   type: object
 *       404:
 *         description: Usuario no encontrado
 *       401:
 *         description: No autenticado
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  "/perfil",
  authMiddleware.autenticar,
  usuarioController.obtenerPerfilUsuario
);

/**
 * @openapi
 * /api/usuarios/perfil:
 *   put:
 *     summary: Actualiza el perfil del usuario autenticado
 *     description: |
 *       Actualiza los datos del perfil del usuario autenticado. Si es experto,
 *       puede actualizar también la información específica de experto.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - apellido
 *             properties:
 *               nombre:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 80
 *                 description: Nuevo nombre del usuario
 *               apellido:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 80
 *                 description: Nuevo apellido del usuario
 *               descripcion:
 *                 type: string
 *                 description: Descripción profesional (solo expertos)
 *               precioPorHora:
 *                 type: number
 *                 minimum: 1000
 *                 description: Precio por hora en COP (solo expertos)
 *               categorias:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: IDs de categorías (solo expertos)
 *               banco:
 *                 type: string
 *                 description: Banco para pagos (solo expertos)
 *               tipoCuenta:
 *                 type: string
 *                 enum: [ahorros, corriente]
 *                 description: Tipo de cuenta (solo expertos)
 *               numeroCuenta:
 *                 type: string
 *                 description: Número de cuenta (solo expertos)
 *               titular:
 *                 type: string
 *                 description: Titular de la cuenta (solo expertos)
 *               tipoDocumento:
 *                 type: string
 *                 enum: [cedula, pasaporte, extranjeria]
 *                 description: Tipo de documento (solo expertos)
 *               numeroDocumento:
 *                 type: string
 *                 description: Número de documento (solo expertos)
 *               telefonoContacto:
 *                 type: string
 *                 description: Teléfono de contacto (solo expertos)
 *               diasDisponibles:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Días disponibles (solo expertos)
 *           examples:
 *             cliente_basico:
 *               summary: Actualización de cliente básico
 *               value:
 *                 nombre: "Ana María"
 *                 apellido: "González López"
 *             experto_completo:
 *               summary: Actualización de experto
 *               value:
 *                 nombre: "Carlos"
 *                 apellido: "Rodríguez"
 *                 descripcion: "Desarrollador Senior especializado en React y Node.js"
 *                 precioPorHora: 85000
 *                 categorias: ["507f1f77bcf86cd799439011"]
 *                 banco: "Bancolombia"
 *                 tipoCuenta: "ahorros"
 *                 numeroCuenta: "9876543210"
 *                 titular: "Carlos Rodríguez"
 *                 tipoDocumento: "cedula"
 *                 numeroDocumento: "98765432"
 *                 telefonoContacto: "3001234567"
 *                 diasDisponibles: ["lunes", "martes", "miercoles", "jueves", "viernes"]
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       400:
 *         description: Datos faltantes o inválidos
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put(
  "/perfil",
  authMiddleware.autenticar,
  usuarioController.actualizarPerfilUsuario
);

/**
 * @openapi
 * /api/usuarios/avatar:
 *   post:
 *     summary: Sube avatar del usuario autenticado
 *     description: |
 *       Permite al usuario subir una imagen de avatar que se almacena en el servidor.
 *       El archivo debe enviarse como multipart/form-data con el campo 'avatar'.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Archivo de imagen para el avatar
 *     responses:
 *       200:
 *         description: Avatar subido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                 avatarUrl:
 *                   type: string
 *                 usuario:
 *                   type: object
 *       400:
 *         description: Archivo no recibido
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  "/avatar",
  authMiddleware.autenticar,
  upload.single("avatar"),
  usuarioController.subirAvatar
);

/**
 * @openapi
 * /api/usuarios/perfil:
 *   delete:
 *     summary: Elimina/desactiva el usuario autenticado
 *     description: |
 *       Desactiva la cuenta del usuario autenticado y procesa reembolsos automáticos
 *       para todas las asesorías y pagos confirmados asociados.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cuenta desactivada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Cuenta desactivada correctamente. Todas las asesorías y pagos confirmados han sido reembolsados."
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete(
  "/perfil",
  authMiddleware.autenticar,
  usuarioController.eliminarUsuarioPropio
);

// Rutas de administración (requieren permisos de admin)

/**
 * @openapi
 * /api/usuarios:
 *   get:
 *     summary: Lista usuarios con filtros y paginación (admin)
 *     description: |
 *       Obtiene una lista paginada de usuarios con filtros opcionales.
 *       Requiere permisos de administrador.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Límite de resultados por página
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filtro por email (búsqueda parcial)
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [activo, inactivo, pendiente-verificacion]
 *         description: Filtro por estado específico
 *       - in: query
 *         name: roles
 *         schema:
 *           type: string
 *         description: Filtro por roles (separados por coma)
 *         example: "cliente,experto"
 *       - in: query
 *         name: soloClientesPuros
 *         schema:
 *           type: boolean
 *         description: Solo usuarios que tienen únicamente el rol 'cliente'
 *     responses:
 *       200:
 *         description: Usuarios listados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 usuarios:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *       403:
 *         description: Sin permisos de administrador
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  "/",
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  usuarioController.obtenerUsuarios
);

// CRUD individual de usuario por email (admin + API Key)

/**
 * @openapi
 * /api/usuarios/{email}:
 *   get:
 *     summary: Obtiene usuario por email (admin + API Key)
 *     description: |
 *       Obtiene la información completa de un usuario específico por su email.
 *       Requiere permisos de administrador y API Key válida.
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email del usuario
 *         example: "usuario@ejemplo.com"
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Usuario no encontrado
 *       403:
 *         description: Sin permisos o API Key inválida
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  "/:email",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  usuarioController.obtenerUsuarioPorEmailAdmin
);

/**
 * @openapi
 * /api/usuarios/{email}:
 *   put:
 *     summary: Actualiza usuario por email (admin + API Key)
 *     description: |
 *       Actualiza cualquier campo de un usuario específico por su email.
 *       Requiere permisos de administrador y API Key válida.
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email del usuario
 *         example: "usuario@ejemplo.com"
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               apellido:
 *                 type: string
 *               estado:
 *                 type: string
 *                 enum: [activo, inactivo, pendiente-verificacion]
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *               avatarUrl:
 *                 type: string
 *               email:
 *                 type: string
 *               infoExperto:
 *                 type: object
 *           examples:
 *             activar_experto:
 *               summary: Activar usuario experto
 *               value:
 *                 estado: "activo"
 *                 roles: ["cliente", "experto"]
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *       404:
 *         description: Usuario no encontrado
 *       403:
 *         description: Sin permisos o API Key inválida
 *       500:
 *         description: Error interno del servidor
 */
router.put(
  "/:email",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  usuarioController.actualizarUsuarioPorEmailAdmin
);

/**
 * @openapi
 * /api/usuarios/{email}:
 *   delete:
 *     summary: Elimina/desactiva usuario por email (admin + API Key)
 *     description: |
 *       Desactiva usuario por email (solo administradores) y procesa reembolsos
 *       automáticos para todas las asesorías y pagos asociados.
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email del usuario
 *         example: "usuario@ejemplo.com"
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Usuario desactivado y pagos/asesorías actualizados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Usuario desactivado correctamente por admin. Todas las asesorías y pagos confirmados han sido reembolsados."
 *       404:
 *         description: Usuario no encontrado
 *       403:
 *         description: Sin permisos o API Key inválida
 *       500:
 *         description: Error interno del servidor
 */
router.delete(
  "/:email",
  apiKeyMiddleware,
  authMiddleware.autenticar,
  authMiddleware.asegurarRol("admin"),
  usuarioController.eliminarUsuarioPorAdmin
);

module.exports = router;
