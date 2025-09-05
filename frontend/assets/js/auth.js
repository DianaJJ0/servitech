/**
 * FUNCIONES DE AUTENTICACIÓN PARA EL FRONTEND DE SERVITECH
 * Permite iniciar sesión (login) y obtener el token JWT, así como acceder a rutas protegidas del backend.
 */

/**
 * Inicia sesión enviando las credenciales al backend.
 * Si el login es exitoso, guarda el token y los datos del usuario en localStorage.
 * 
 * @param {string} email - Correo electrónico del usuario.
 * @param {string} password - Contraseña del usuario.
 * @returns {Promise<Object>} - Objeto usuario autenticado.
 * @throws {Error} - Si las credenciales son inválidas o hay error de red.
 */
async function login(email, password) {
  // CORRECCIÓN CLAVE: Se usa ruta relativa en lugar de URL absoluta
  const res = await fetch("/api/usuarios/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (res.ok && data.token) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("currentUser", JSON.stringify(data.usuario));
    return data.usuario;
  } else {
    throw new Error(data.mensaje || "Login fallido");
  }
}

/**
 * Obtiene la lista de usuarios desde una ruta protegida del backend.
 * Envía el token JWT en el encabezado Authorization.
 * @returns {Promise<Array>} - Lista de usuarios.
 * @throws {Error} - Si el usuario no está autorizado.
 */
async function getUsuarios() {
  const token = localStorage.getItem("token");

  // CORRECCIÓN CLAVE: Se usa ruta relativa en lugar de URL absoluta
  const res = await fetch("/api/usuarios", {
    headers: {
      Authorization: "Bearer " + token,
    },
  });

  if (res.status === 401) {
    throw new Error("No autorizado");
  }

  return await res.json();
}

/**
 * Registra un nuevo usuario en el sistema.
 * @param {Object} datosUsuario - Datos del usuario a registrar.
 * @returns {Promise<Object>} - Resultado del registro.
 */
async function registrarUsuario(datosUsuario) {
  const res = await fetch("/api/usuarios/registro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datosUsuario),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.mensaje || "Error en el registro");
  }

  return data;
}

/**
 * Cierra la sesión del usuario eliminando el token del localStorage.
 */
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("currentUser");
  window.location.href = "/login.html";
}

/**
 * Verifica si el usuario está autenticado.
 * @returns {boolean} - True si está autenticado, false si no.
 */
function isAuthenticated() {
  return localStorage.getItem("token") !== null;
}

/**
 * Obtiene los datos del usuario actual desde localStorage.
 * @returns {Object|null} - Datos del usuario o null si no está autenticado.
 */
function getCurrentUser() {
  const userData = localStorage.getItem("currentUser");
  return userData ? JSON.parse(userData) : null;
}
