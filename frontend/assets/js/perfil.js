/**
 * Lógica del frontend para la página de perfil.
 * Protege la ruta y carga los datos del usuario autenticado.
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Verifica si la info de experto ya se renderizó desde el servidor
  const expertInfoSection = document.querySelector(".profile-info-card h3");
  if (
    expertInfoSection &&
    expertInfoSection.textContent.includes("Información de Experto")
  ) {
    document.body.style.display = "block";
    return;
  }

  // Sincroniza la sesión si hay token y usuario en localStorage
  const token = localStorage.getItem("token");
  const usuario = localStorage.getItem("usuario");
  if (token && usuario) {
    try {
      await fetch("/set-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: { ...JSON.parse(usuario), token } }),
        credentials: "include",
      });
    } catch (err) {}
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
      headers: { Authorization: `Bearer ${token}` },
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
    // Si el usuario es experto, la info ya está renderizada en el servidor
  } catch (error) {
    localStorage.removeItem("token");
    if (mensajeError) {
      mensajeError.textContent =
        "Error al cargar el perfil. Intenta iniciar sesión nuevamente.";
      mensajeError.style.display = "block";
    }
  }
});

// Mostrar/ocultar número de cuenta
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

/* Modal para editar nombre y apellido */
document.addEventListener("DOMContentLoaded", function () {
  const modal = document.getElementById("modalEditarNombreApellido");
  const btnAbrir = document.getElementById("btnEditarNombreApellido");
  const btnCancelar = document.getElementById("btnCancelarModal");
  const form = document.getElementById("formEditarNombreApellido");
  const inputNombre = document.getElementById("modalFirstName");
  const inputApellido = document.getElementById("modalLastName");
  const errorNombre = document.getElementById("errorNombre");
  const errorApellido = document.getElementById("errorApellido");
  const modalErrorGeneral = document.getElementById("modalErrorGeneral");
  const campoNombre = document.getElementById("firstName");
  const campoApellido = document.getElementById("lastName");
  const userName = document.getElementById("userName");
  const userDisplayName = document.getElementById("userDisplayName");
  let usuario = null;

  if (!modal || !btnAbrir || !btnCancelar || !form) return;

  // Abre la modal con los datos actuales
  btnAbrir.addEventListener("click", function (e) {
    e.preventDefault();
    usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
    inputNombre.value = usuario && usuario.nombre ? usuario.nombre : "";
    inputApellido.value = usuario && usuario.apellido ? usuario.apellido : "";
    errorNombre.textContent = "";
    errorApellido.textContent = "";
    modalErrorGeneral.textContent = "";
    modal.style.display = "flex";
    inputNombre.focus();
  });

  // Cierra la modal
  btnCancelar.addEventListener("click", function () {
    modal.style.display = "none";
  });
  window.addEventListener("click", function (e) {
    if (e.target === modal) modal.style.display = "none";
  });

  function validarNombre(valor) {
    if (!valor.trim()) return "El nombre es obligatorio.";
    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s'-]{1,80}$/.test(valor.trim()))
      return "Nombre solo puede tener letras y máximo 80 caracteres.";
    return "";
  }
  function validarApellido(valor) {
    if (!valor.trim()) return "El apellido es obligatorio.";
    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s'-]{1,80}$/.test(valor.trim()))
      return "Apellido solo puede tener letras y máximo 80 caracteres.";
    return "";
  }

  // Guardar datos editados
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    errorNombre.textContent = "";
    errorApellido.textContent = "";
    modalErrorGeneral.textContent = "";
    const nombre = inputNombre.value.trim();
    const apellido = inputApellido.value.trim();
    let valido = true;

    const errN = validarNombre(nombre);
    const errA = validarApellido(apellido);
    if (errN) {
      errorNombre.textContent = errN;
      valido = false;
    }
    if (errA) {
      errorApellido.textContent = errA;
      valido = false;
    }
    if (!valido) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/usuarios/perfil", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ nombre, apellido }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.mensaje || "Error al actualizar");
      }
      // Backend debe retornar el usuario actualizado
      const updatedUser = await res.json();
      // Actualiza localStorage
      localStorage.setItem("usuario", JSON.stringify(updatedUser));
      // Actualiza los campos en pantalla
      if (campoNombre) campoNombre.value = updatedUser.nombre;
      if (campoApellido) campoApellido.value = updatedUser.apellido;
      if (userName)
        userName.textContent = updatedUser.nombre + " " + updatedUser.apellido;
      if (userDisplayName)
        userDisplayName.textContent =
          updatedUser.nombre + " " + updatedUser.apellido;
      modal.style.display = "none";
    } catch (err) {
      modalErrorGeneral.textContent = err.message;
    }
  });
});
