/**
 * Logica del frontend para la pagina de perfil:
 * - Carga datos del usuario autenticado y renderiza el avatar (iniciales si no hay imagen)
 * - Permite editar nombre/apellido y subir imagen de avatar (PNG/JPG)
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Verifica si la info de experto ya se renderizo en el SSR
  const expertInfoSection = document.querySelector(".profile-info-card h3");
  if (
    expertInfoSection &&
    expertInfoSection.textContent.includes("Informacion de Experto")
  ) {
    document.body.style.display = "block";
    return;
  }

  // Sincroniza la sesion si hay token y usuario en localStorage
  const token = localStorage.getItem("token");
  const usuarioLS = localStorage.getItem("usuario");
  if (token && usuarioLS) {
    try {
      await fetch("/set-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: { ...JSON.parse(usuarioLS), token } }),
        credentials: "include",
      });
    } catch (err) {
      console.warn("Error sincronizando sesion:", err);
    }
  }

  const mensajeError = document.getElementById("perfilError");
  if (!token) {
    if (mensajeError) {
      mensajeError.textContent = "Debes iniciar sesion para ver tu perfil.";
      mensajeError.style.display = "block";
    }
    return;
  }

  try {
    console.log("perfil.js: fetching /api/usuarios/perfil with token present");
    const response = await fetch("/api/usuarios/perfil", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      if (mensajeError) {
        mensajeError.textContent =
          "Tu sesion ha expirado o el token es invalido. Por favor, inicia sesion nuevamente.";
        mensajeError.style.display = "block";
      }
      return;
    }

    const usuario = await response.json();

    // Actualizar localStorage con datos frescos del servidor
    localStorage.setItem("usuario", JSON.stringify(usuario));

    document.body.style.display = "block";

    // Renderiza avatar (imagen o iniciales)
    renderAvatar(usuario);

    // Actualiza campos
    actualizarCamposPerfil(usuario);
  } catch (error) {
    console.error("Error cargando perfil:", error);
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    if (mensajeError) {
      mensajeError.textContent =
        "Error al cargar el perfil. Intenta iniciar sesion nuevamente.";
      mensajeError.style.display = "block";
    }
  }
});

// Actualiza todos los campos del perfil con datos del usuario
function actualizarCamposPerfil(usuario) {
  const userName = document.getElementById("userName");
  const userEmail = document.getElementById("userEmail");
  const firstNameInput = document.getElementById("firstName");
  const lastNameInput = document.getElementById("lastName");
  const formEmailInput = document.getElementById("formEmail");

  // Manejar valores undefined/null
  const nombre =
    usuario.nombre && usuario.nombre !== "undefined" ? usuario.nombre : "";
  const apellido =
    usuario.apellido && usuario.apellido !== "undefined"
      ? usuario.apellido
      : "";
  const email = usuario.email || "";

  // Actualizar campos en la pagina
  if (userName) {
    const nombreCompleto = `${nombre} ${apellido}`.trim();
    userName.textContent = nombreCompleto || email || "Usuario";
  }

  if (userEmail) userEmail.textContent = email;
  if (firstNameInput) firstNameInput.value = nombre;
  if (lastNameInput) lastNameInput.value = apellido;
  if (formEmailInput) formEmailInput.value = email;

  // Actualizar header si las funciones estan disponibles (desde common.js)
  if (typeof window.actualizarDatosUsuario === "function") {
    window.actualizarDatosUsuario(usuario);
  }

  if (typeof window.mostrarInfoUsuario === "function") {
    window.mostrarInfoUsuario(usuario);
  }
}

// Renderiza el avatar: imagen si existe, si no circulo con iniciales
function renderAvatar(usuario) {
  const container = document.getElementById("perfilAvatarContainer");
  if (!container) return;
  container.innerHTML = "";

  // Si hay avatarUrl y NO es la default ni vacio, muestra imagen
  if (
    usuario.avatarUrl &&
    usuario.avatarUrl.trim() !== "" &&
    !usuario.avatarUrl.includes("ui-avatars.com")
  ) {
    const img = document.createElement("img");
    img.src = usuario.avatarUrl;
    img.alt = "Avatar de Usuario";
    img.className = "avatar-img";
    container.appendChild(img);
  } else {
    // Si no hay imagen, circulo con iniciales
    const nombre = (
      usuario.nombre && usuario.nombre !== "undefined" ? usuario.nombre : ""
    ).trim();
    const apellido = (
      usuario.apellido && usuario.apellido !== "undefined"
        ? usuario.apellido
        : ""
    ).trim();
    const email = usuario.email || "";

    let iniciales = "";
    if (nombre && apellido) {
      iniciales = (nombre.charAt(0) + apellido.charAt(0)).toUpperCase();
    } else if (nombre) {
      iniciales = nombre.charAt(0).toUpperCase();
    } else if (email) {
      iniciales = email.charAt(0).toUpperCase();
    } else {
      iniciales = "U";
    }

    const circle = document.createElement("div");
    circle.className = "avatar-iniciales";
    circle.textContent = iniciales;
    container.appendChild(circle);
  }

  // Boton de cambiar avatar
  const btn = document.createElement("button");
  btn.className = "change-avatar-btn";
  btn.type = "button";
  btn.title = "Cambiar foto de perfil";
  btn.innerHTML = '<i class="fas fa-camera"></i>';
  container.appendChild(btn);

  // Input de archivo y error
  const avatarInput = document.getElementById("avatarInput");
  const avatarError = document.getElementById("avatarError");

  btn.onclick = function () {
    if (avatarInput) avatarInput.click();
  };

  // Subida de imagen y validacion
  if (avatarInput) {
    avatarInput.onchange = async function () {
      avatarError.textContent = "";
      const file = avatarInput.files && avatarInput.files[0];
      if (!file) return;

      if (!file.type.match(/^image\/(png|jpeg)$/)) {
        avatarError.textContent = "Solo se permiten imagenes PNG o JPG.";
        avatarInput.value = "";
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        avatarError.textContent = "La imagen no debe superar 2MB.";
        avatarInput.value = "";
        return;
      }

      const fd = new FormData();
      fd.append("avatar", file);

      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/usuarios/avatar", {
          method: "POST",
          headers: token ? { Authorization: "Bearer " + token } : {},
          body: fd,
          cache: "no-store",
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.mensaje || "Error al subir el avatar.");
        }

        // Actualiza localStorage y recarga avatar
        if (data.usuario) {
          localStorage.setItem("usuario", JSON.stringify(data.usuario));
          renderAvatar(data.usuario);

          // Actualizar header tambien
          if (typeof window.actualizarDatosUsuario === "function") {
            window.actualizarDatosUsuario(data.usuario);
          }
        }

        avatarInput.value = "";
        avatarError.textContent = "";
      } catch (err) {
        console.error("Error subiendo avatar:", err);
        avatarError.textContent =
          err.message || "Error al subir la imagen. Intenta de nuevo.";
      }
    };
  }
}

// Mostrar/ocultar numero de cuenta
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
  let usuario = null;

  if (!modal || !btnAbrir || !btnCancelar || !form) return;

  // Abre la modal con los datos actuales
  btnAbrir.addEventListener("click", function (e) {
    e.preventDefault();

    try {
      usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
    } catch (error) {
      console.error("Error parsing user data:", error);
      usuario = {};
    }

    // Manejar valores undefined
    const nombre =
      usuario.nombre && usuario.nombre !== "undefined" ? usuario.nombre : "";
    const apellido =
      usuario.apellido && usuario.apellido !== "undefined"
        ? usuario.apellido
        : "";

    inputNombre.value = nombre;
    inputApellido.value = apellido;
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
      return "Nombre solo puede tener letras y maximo 80 caracteres.";
    return "";
  }

  function validarApellido(valor) {
    if (!valor.trim()) return "El apellido es obligatorio.";
    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s'-]{1,80}$/.test(valor.trim()))
      return "Apellido solo puede tener letras y maximo 80 caracteres.";
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
      actualizarCamposPerfil(updatedUser);

      // Actualiza avatar si cambian iniciales
      renderAvatar(updatedUser);

      // Refrescar interfaz del header
      if (typeof window.refrescarInterfazUsuario === "function") {
        window.refrescarInterfazUsuario();
      }

      modal.style.display = "none";

      console.log("Perfil actualizado exitosamente:", updatedUser);
    } catch (err) {
      console.error("Error actualizando perfil:", err);
      modalErrorGeneral.textContent = err.message;
    }
  });
});
