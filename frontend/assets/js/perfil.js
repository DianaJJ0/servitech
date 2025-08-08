/**
 * LÓGICA DEL FRONTEND PARA LA PÁGINA DE PERFIL
 * Protege la ruta y carga los datos del usuario autenticado.
 */
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");

  // 1. VERIFICACIÓN INMEDIATA: Si no hay token, no continúes. Redirige al login.
  if (!token) {
    window.location.href = "/login.html";
    return; // Detiene la ejecución del script por completo.
  }

  // Si hay un token, intentamos obtener los datos del perfil
  try {
    const response = await fetch("/api/usuarios/perfil", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Si el token es inválido o expiró, el backend devolverá un error.
      localStorage.removeItem("token"); // Limpiar token inválido
      window.location.href = "/login.html";
      return;
    }

    const usuario = await response.json();

    // 2. POBLAR LA PÁGINA CON LOS DATOS: Solo si la autenticación fue exitosa.
    document.body.style.display = "block"; // Mostrar el cuerpo de la página

    const userName = document.getElementById("userName");
    const userEmail = document.getElementById("userEmail");
    const profileAvatar = document.getElementById("profileAvatar");

    if (userName)
      userName.textContent = `${usuario.nombre} ${usuario.apellido}`;
    if (userEmail) userEmail.textContent = usuario.email;
    if (profileAvatar) {
      // Usamos una API para generar un avatar con las iniciales
      profileAvatar.src = `https://ui-avatars.com/api/?name=${usuario.nombre}+${usuario.apellido}&background=3a8eff&color=fff&size=128`;
    }

    // Poblar el formulario de información personal
    const firstNameInput = document.getElementById("firstName");
    const lastNameInput = document.getElementById("lastName");
    const formEmailInput = document.getElementById("formEmail");

    if (firstNameInput) firstNameInput.value = usuario.nombre;
    if (lastNameInput) lastNameInput.value = usuario.apellido;
    if (formEmailInput) formEmailInput.value = usuario.email;
  } catch (error) {
    console.error("Error al cargar el perfil:", error);
    localStorage.removeItem("token");
    window.location.href = "/login.html";
  }
});
