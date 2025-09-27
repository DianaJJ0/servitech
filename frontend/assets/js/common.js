/**
 * @fileoverview
 * Funciones y utilidades comunes para todas las páginas del views de Servitech.
 */

// Animaciones al hacer scroll
function setupScrollAnimations(selector = ".animate-fade") {
  const animateElements = document.querySelectorAll(selector);

  if (animateElements.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
        }
      });
    },
    { threshold: 0.1 }
  );

  animateElements.forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
    el.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    observer.observe(el);
  });
}

// Desplazamiento suave para anclas internas
function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: "smooth",
        });
      }
    });
  });
}

// Menú hamburguesa para móvil
function setupMobileMenu() {
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const navContainer = document.getElementById("navContainer");

  if (!mobileMenuToggle || !navContainer) {
    return;
  }

  // Limpiar eventos previos clonando el elemento
  const newToggle = mobileMenuToggle.cloneNode(true);
  mobileMenuToggle.parentNode.replaceChild(newToggle, mobileMenuToggle);

  // Alternar menú móvil
  function toggleMobileMenu() {
    navContainer.classList.toggle("active");
    newToggle.classList.toggle("active");

    // Cambia el ícono
    const icon = newToggle.querySelector("i");
    if (icon) {
      if (navContainer.classList.contains("active")) {
        icon.className = "fas fa-times";
      } else {
        icon.className = "fas fa-bars";
      }
    }
  }

  newToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMobileMenu();
  });

  // Cerrar menú al hacer clic en enlaces
  const allNavLinks = navContainer.querySelectorAll(
    ".nav-item, .dropdown-item"
  );
  allNavLinks.forEach((link) => {
    if (link.id !== "logoutBtn") {
      link.addEventListener("click", () => {
        if (navContainer.classList.contains("active")) {
          toggleMobileMenu();
        }
      });
    }
  });

  // Botón logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (event) {
      event.preventDefault();
      logout();
    });
  }

  // Cerrar menú al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (
      navContainer.classList.contains("active") &&
      !newToggle.contains(e.target) &&
      !navContainer.contains(e.target)
    ) {
      toggleMobileMenu();
    }
  });

  // Cerrar menú al redimensionar ventana
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768 && navContainer.classList.contains("active")) {
      toggleMobileMenu();
    }
    const icon = newToggle.querySelector("i");
    if (icon && !navContainer.classList.contains("active")) {
      icon.className = "fas fa-bars";
    }
  });
}

// Muestra u oculta el header según el login y el rol
function setupUserInterface() {
  // Usamos "usuario" y "token" del localStorage de manera consistente
  const usuarioRaw = localStorage.getItem("usuario");
  const token = localStorage.getItem("token");
  const authButtons = document.querySelector(".auth-buttons");
  const userMenu = document.getElementById("userMenuContainer");
  const navContainer = document.getElementById("navContainer");
  const adminAccess = document.getElementById("adminAccess");

  if (usuarioRaw && token) {
    // Oculta login/registro, muestra menú usuario
    if (authButtons) authButtons.style.display = "none";
    if (userMenu) {
      userMenu.style.display = "flex";
      mostrarInfoUsuario();
      setTimeout(() => {
        setupUserDropdown();
      }, 50);
    }
    if (navContainer) {
      navContainer.classList.add("logged-in");
    }
  } else {
    // Muestra login/registro, oculta menú usuario y botón admin
    if (authButtons) authButtons.style.display = "flex";
    if (userMenu) userMenu.style.display = "none";
    if (navContainer) navContainer.classList.remove("logged-in");
    if (adminAccess) adminAccess.style.display = "none";
  }
}

// Configura el dropdown del menú de usuario
function setupUserDropdown() {
  const userMenu = document.getElementById("userMenuContainer");
  const userDropdown = document.getElementById("userDropdown");

  if (!userMenu || !userDropdown) return;

  // Limpiar eventos previos
  const newUserMenu = userMenu.cloneNode(true);
  userMenu.parentNode.replaceChild(newUserMenu, userMenu);

  const newUserDropdown = newUserMenu.querySelector("#userDropdown");

  // Mostrar/ocultar dropdown
  function toggleDropdown(e) {
    e.stopPropagation();
    newUserDropdown.classList.toggle("show");
    newUserMenu.classList.toggle("active");
  }

  newUserMenu.addEventListener("click", toggleDropdown);

  document.addEventListener("click", (e) => {
    if (
      !newUserMenu.contains(e.target) &&
      newUserDropdown.classList.contains("show")
    ) {
      newUserDropdown.classList.remove("show");
      newUserMenu.classList.remove("active");
    }
  });

  window.addEventListener("resize", () => {
    newUserDropdown.classList.remove("show");
    newUserMenu.classList.remove("active");
  });

  // Enlaces del dropdown
  const dropdownItems = newUserDropdown.querySelectorAll(".dropdown-item");
  dropdownItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      if (item.id === "logoutBtn") {
        e.preventDefault();
        logout();
      }
      newUserDropdown.classList.remove("show");
      newUserMenu.classList.remove("active");
    });
  });
}

// Muestra nombre y avatar del usuario en el header
function mostrarInfoUsuario() {
  const usuarioRaw = localStorage.getItem("usuario");
  if (!usuarioRaw) return;
  const usuario = JSON.parse(usuarioRaw);

  const userDisplayName = document.getElementById("userDisplayName");
  const userAvatar = document.getElementById("userAvatar");

  if (userDisplayName) {
    const nombreCompleto = `${usuario.nombre || ""} ${
      usuario.apellido || ""
    }`.trim();
    userDisplayName.textContent = nombreCompleto || usuario.email || "Usuario";
  }

  if (userAvatar) {
    if (usuario.avatarUrl) {
      userAvatar.innerHTML = `<img src="${usuario.avatarUrl}" alt="Avatar de ${
        usuario.nombre || "Usuario"
      }" class="avatar-img">`;
    } else {
      const nombre = usuario.nombre || usuario.email || "U";
      const apellido = usuario.apellido || "";
      const iniciales = (nombre.charAt(0) + apellido.charAt(0)).toUpperCase();
      userAvatar.textContent = iniciales;
    }
  }

  // Mostrar/ocultar botón de admin según el rol del usuario
  mostrarBotonAdmin(usuario);
}

// Solo muestra el botón de admin si el usuario tiene rol 'admin'
function mostrarBotonAdmin(usuario) {
  const adminAccess = document.getElementById("adminAccess");
  if (!adminAccess) return;

  // Verificar si el usuario tiene rol de admin
  const esAdmin =
    usuario && Array.isArray(usuario.roles) && usuario.roles.includes("admin");

  if (esAdmin) {
    adminAccess.style.display = "block";
    // Agregar event listener al botón de admin para verificar sesión antes de abrir
    const adminPanelBtn = document.getElementById("adminPanelBtn");
    if (adminPanelBtn && !adminPanelBtn.hasAttribute("data-listener")) {
      adminPanelBtn.setAttribute("data-listener", "true");
      adminPanelBtn.addEventListener("click", async function (e) {
        e.preventDefault();
        await verificarSesionYAbrirAdmin();
      });
    }
  } else {
    adminAccess.style.display = "none";
  }
}

// Función para verificar la sesión del servidor antes de abrir el panel de admin
async function verificarSesionYAbrirAdmin() {
  try {
    const token = localStorage.getItem("token");
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

    if (!token || !usuario.roles || !usuario.roles.includes("admin")) {
      alert("No tienes permisos de administrador o tu sesión ha expirado.");
      return;
    }

    // Establecer sesión en el servidor antes de navegar
    try {
      const response = await fetch("/set-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usuario: {
            _id: usuario._id,
            email: usuario.email,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            roles: usuario.roles,
            token: token,
          },
        }),
        credentials: "include",
      });

      const result = await response.json();
      if (response.ok && result.ok) {
        // Navegar al panel de admin
        window.location.href = "/admin/adminExpertos";
      } else {
        alert(
          "Error al establecer la sesión de administrador. Inicia sesión nuevamente."
        );
        window.location.href = "/login.html";
      }
    } catch (error) {
      alert("Error de conexión. Inténtalo de nuevo.");
    }
  } catch (error) {
    alert("Error al verificar la sesión. Inicia sesión nuevamente.");
    window.location.href = "/login.html";
  }
}

// Cierra la sesión del usuario
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");

  // Ocultar botón de admin al cerrar sesión
  const adminAccess = document.getElementById("adminAccess");
  if (adminAccess) adminAccess.style.display = "none";

  // Llama al backend para destruir la sesión
  fetch("/logout", { method: "POST", credentials: "include" }).finally(() => {
    window.location.href = "/";
  });
}

// Fetch protegido con token
async function fetchProtegido(url, options = {}) {
  const token = localStorage.getItem("token");
  const headers = options.headers || {};
  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }
  return fetch(url, { ...options, headers });
}

// Redirección si no hay autenticación
function requireAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
  }
}

// Inicialización principal en todas las páginas
document.addEventListener("DOMContentLoaded", () => {
  setupScrollAnimations();
  setupSmoothScroll();
  setupUserInterface();

  setTimeout(() => {
    setupMobileMenu();
  }, 100);

  const headerContainer = document.getElementById("header-container");
  if (headerContainer) {
    loadDynamicHeader(headerContainer);
  }

  const footerContainer = document.getElementById("footer-container");
  if (footerContainer) {
    loadDynamicFooter(footerContainer);
  }
});

// Carga dinámica del header
function loadDynamicHeader(headerContainer) {
  fetch("/componentes/header.html")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error al cargar el header: ${response.statusText}`);
      }
      return response.text();
    })
    .then((html) => {
      headerContainer.innerHTML = html;
      setTimeout(() => {
        setupMobileMenu();
        setupUserInterface();
      }, 200);
    })
    .catch((error) => {});
}

// Carga dinámica del footer
function loadDynamicFooter(footerContainer) {
  fetch("/componentes/footer.html")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error al cargar el footer: ${response.statusText}`);
      }
      return response.text();
    })
    .then((html) => {
      footerContainer.innerHTML = html;
    })
    .catch((error) => {});
}
