/**
 * Funciones de autenticación para el frontend de Servitech.
 * Maneja login/logout, token y usuario en localStorage.
 */

/**
 * Inicia sesión y sincroniza sesión (localStorage + backend).
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} usuario autenticado
 */
async function login(email, password) {
  const res = await fetch("/api/usuarios/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });
  const data = await res.json();
  if (res.ok && data.token && data.usuario) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("usuario", JSON.stringify(data.usuario));
    // Sincroniza la sesión backend para SSR/proxy
    await fetch("/set-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: { ...data.usuario, token: data.token } }),
      credentials: "include",
    });
    return data.usuario;
  } else {
    throw new Error(data.mensaje || "Login fallido");
  }
}

/**
 * Obtiene lista de usuarios autenticados.
 * @returns {Promise<Array>}
 */
async function getUsuarios() {
  const token = localStorage.getItem("token");
  const res = await fetch("/api/usuarios", {
    headers: { Authorization: "Bearer " + token },
  });
  if (res.status === 401) throw new Error("No autorizado");
  return await res.json();
}

/**
 * Registra un nuevo usuario.
 * @param {Object} datosUsuario
 * @returns {Promise<Object>}
 */
async function registrarUsuario(datosUsuario) {
  const res = await fetch("/api/usuarios/registro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datosUsuario),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "Error en el registro");
  return data;
}

/**
 * Cierra sesión y limpia storage.
 */
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  fetch("/logout", { method: "POST", credentials: "include" }).finally(() => {
    window.location.href = "/login.html";
  });
}

/**
 * Verifica si el usuario está autenticado.
 * @returns {boolean}
 */
function isAuthenticated() {
  return !!localStorage.getItem("token");
}

/**
 * Obtiene usuario actual desde localStorage.
 * @returns {Object|null}
 */
function usuarioActual() {
  const userData = localStorage.getItem("usuario");
  return userData ? JSON.parse(userData) : null;
}
