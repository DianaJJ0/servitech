/**
 * LÓGICA DEL FRONTEND PARA LA PÁGINA DE PERFIL
 * Protege la ruta y carga los datos del usuario autenticado.
 */
document.addEventListener("DOMContentLoaded", async () => {
  // Verificar si ya tenemos información de experto renderizada desde el servidor
  const expertInfoSection = document.querySelector(".profile-info-card h3");
  if (
    expertInfoSection &&
    expertInfoSection.textContent.includes("Información de Experto")
  ) {
    console.log(
      "Información de experto ya cargada desde el servidor - omitiendo AJAX"
    );
    document.body.style.display = "block"; // Mostrar el contenido inmediatamente
    return; // No hacer la llamada AJAX
  }

  // Sincroniza la sesión del backend si hay token y usuario en localStorage
  const token = localStorage.getItem("token");
  const usuario = localStorage.getItem("usuario");
  if (token && usuario) {
    try {
      await fetch("/set-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: { ...JSON.parse(usuario), token } }),
      });
    } catch (err) {
      // Si falla, no bloquea la carga
    }
  }
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
      // Preferir la URL del avatar provista por el backend (usuario.avatarUrl).
      // Si no existe, usar el generador de UI Avatars como fallback.
      try {
        if (
          usuario &&
          usuario.avatarUrl &&
          typeof usuario.avatarUrl === "string" &&
          usuario.avatarUrl.trim() !== ""
        ) {
          profileAvatar.src = usuario.avatarUrl;
        } else {
          profileAvatar.src = `https://ui-avatars.com/api/?name=${usuario.nombre}+${usuario.apellido}&background=3a8eff&color=fff&size=128`;
        }
      } catch (e) {
        profileAvatar.src = `https://ui-avatars.com/api/?name=${usuario.nombre}+${usuario.apellido}&background=3a8eff&color=fff&size=128`;
      }
    }
    const firstNameInput = document.getElementById("firstName");
    const lastNameInput = document.getElementById("lastName");
    const formEmailInput = document.getElementById("formEmail");
    if (firstNameInput) firstNameInput.value = usuario.nombre;
    if (lastNameInput) lastNameInput.value = usuario.apellido;
    if (formEmailInput) formEmailInput.value = usuario.email;

    // Si el usuario es experto, mantener la información ya renderizada en el servidor
    if (usuario.roles && usuario.roles.includes("experto")) {
      // La información del experto ya está renderizada en el servidor via EJS
      // No necesitamos modificar nada aquí para evitar conflictos
      console.log(
        "Usuario experto detectado - información cargada desde servidor"
      );
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

// Manejo mostrar/ocultar número de cuenta con delegación
document.addEventListener("click", function (e) {
  const btn = e.target.closest(".btn-show-account");
  if (!btn) return;
  const accountEl = btn.closest(".account-number");
  if (!accountEl) return;
  const span = accountEl.querySelector(".account-value");
  const real = accountEl.getAttribute("data-number") || "";
  if (!span) return;
  const isMasked = span.textContent.includes("•");
  if (isMasked) {
    span.textContent = real;
    btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
  } else {
    span.textContent = "••••••••••••••••";
    btn.innerHTML = '<i class="fas fa-eye"></i>';
  }
});
