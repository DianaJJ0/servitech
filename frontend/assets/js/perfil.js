/**
 * LÓGICA DEL FRONTEND PARA LA PÁGINA DE PERFIL
 * Protege la ruta y carga los datos del usuario autenticado.
 */
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  const mensajeError = document.getElementById("perfilError");
  if (!token) {
    if (mensajeError) {
      mensajeError.textContent = "Debes iniciar sesión para ver tu perfil.";
      mensajeError.style.display = "block";
    }
    return;
  }
  try {
    const response = await fetch("/api/usuarios/perfil", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      localStorage.removeItem("token");
      if (mensajeError) {
        mensajeError.textContent =
          "Tu sesión ha expirado o el token es inválido. Por favor, inicia sesión nuevamente.";
        mensajeError.style.display = "block";
      }
      return;
    }
    const usuario = await response.json();
    document.body.style.display = "block";
    const userName = document.getElementById("userName");
    const userEmail = document.getElementById("userEmail");
    const profileAvatar = document.getElementById("profileAvatar");
    if (userName)
      userName.textContent = `${usuario.nombre} ${usuario.apellido}`;
    if (userEmail) userEmail.textContent = usuario.email;
    if (profileAvatar) {
      profileAvatar.src = `https://ui-avatars.com/api/?name=${usuario.nombre}+${usuario.apellido}&background=3a8eff&color=fff&size=128`;
    }
    const firstNameInput = document.getElementById("firstName");
    const lastNameInput = document.getElementById("lastName");
    const formEmailInput = document.getElementById("formEmail");
    if (firstNameInput) firstNameInput.value = usuario.nombre;
    if (lastNameInput) lastNameInput.value = usuario.apellido;
    if (formEmailInput) formEmailInput.value = usuario.email;
    if (usuario.roles && usuario.roles.includes("experto")) {
      if (usuario.infoExperto) {
        // Poblar campos de experto si existen
      } else {
        // Mostrar alerta si el perfil está incompleto
      }
    }
  } catch (error) {
    localStorage.removeItem("token");
    if (mensajeError) {
      mensajeError.textContent =
        "Error al cargar el perfil. Intenta iniciar sesión nuevamente.";
      mensajeError.style.display = "block";
    }
  }
});
