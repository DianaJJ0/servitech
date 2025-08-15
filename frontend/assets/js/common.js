/**
 * @fileoverview
 * Funciones y utilidades comunes para todas las páginas del views de Servitech.
 */

// Configura animaciones de aparición al hacer scroll para los elementos seleccionados
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

// Configura el comportamiento de desplazamiento suave para los anclajes internos
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

// Configura el menú hamburguesa para dispositivos móviles
function setupMobileMenu() {
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const navContainer = document.getElementById("navContainer");

  if (!mobileMenuToggle || !navContainer) {
    console.log("Elementos del menú no encontrados");
    return;
  }

  // Limpiar eventos previos clonando el elemento
  const newToggle = mobileMenuToggle.cloneNode(true);
  mobileMenuToggle.parentNode.replaceChild(newToggle, mobileMenuToggle);

  // Función para alternar el menú móvil
  function toggleMobileMenu() {
    navContainer.classList.toggle("active");
    newToggle.classList.toggle("active");

    // Cambiar el ícono del botón
    const icon = newToggle.querySelector("i");
    if (icon) {
      if (navContainer.classList.contains("active")) {
        icon.className = "fas fa-times"; // Ícono de cerrar (X)
      } else {
        icon.className = "fas fa-bars"; // Ícono de menú hamburguesa
      }
    }
  }

  // Event listener para abrir/cerrar menú
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

  // Manejar botón de logout
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
    // Si cambiamos a una pantalla más grande, cerrar el menú móvil
    if (window.innerWidth > 768 && navContainer.classList.contains("active")) {
      toggleMobileMenu();
    }
    // También restaurar icono si es necesario
    const icon = newToggle.querySelector("i");
    if (icon && !navContainer.classList.contains("active")) {
      icon.className = "fas fa-bars";
    }
  });
}

// Actualiza la interfaz de usuario según el estado de autenticación
function setupUserInterface() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const authButtons = document.querySelector(".auth-buttons");
  const userMenu = document.querySelector(".user-menu");
  const navContainer = document.getElementById("navContainer");

  if (currentUser && authButtons) {
    authButtons.style.display = "none";
    if (userMenu) {
      userMenu.style.display = "flex";
      // Llamar a setupUserDropdown después de mostrar el menú
      setTimeout(() => {
        setupUserDropdown();
      }, 50);
    }
    if (navContainer) {
      navContainer.classList.add("logged-in");
    }
  } else if (authButtons) {
    authButtons.style.display = "flex";
    if (userMenu) {
      userMenu.style.display = "none";
    }
    if (navContainer) {
      navContainer.classList.remove("logged-in");
    }
  }
}

// Configura el dropdown del menú de usuario
function setupUserDropdown() {
  const userMenu = document.querySelector(".user-menu");
  const userDropdown = document.getElementById("userDropdown");

  if (!userMenu || !userDropdown) return;

  // Limpiar eventos previos
  const newUserMenu = userMenu.cloneNode(true);
  userMenu.parentNode.replaceChild(newUserMenu, userMenu);

  const newUserDropdown = newUserMenu.querySelector("#userDropdown");

  // Función para mostrar/ocultar dropdown
  function toggleDropdown(e) {
    e.stopPropagation();

    newUserDropdown.classList.toggle("show");
    newUserMenu.classList.toggle("active");

    console.log(
      "Dropdown toggled:",
      newUserDropdown.classList.contains("show")
    );
  }

  // Event listener para el menú de usuario (funciona en todas las pantallas)
  newUserMenu.addEventListener("click", toggleDropdown);

  // Cerrar dropdown al hacer click fuera
  document.addEventListener("click", (e) => {
    if (
      !newUserMenu.contains(e.target) &&
      newUserDropdown.classList.contains("show")
    ) {
      newUserDropdown.classList.remove("show");
      newUserMenu.classList.remove("active");
    }
  });

  // Cerrar dropdown al redimensionar ventana
  window.addEventListener("resize", () => {
    newUserDropdown.classList.remove("show");
    newUserMenu.classList.remove("active");
  });

  // Configurar enlaces del dropdown
  const dropdownItems = newUserDropdown.querySelectorAll(".dropdown-item");
  dropdownItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      if (item.id === "logoutBtn") {
        e.preventDefault();
        logout();
      }
      // Cerrar el dropdown después de hacer clic
      newUserDropdown.classList.remove("show");
      newUserMenu.classList.remove("active");
    });
  });
}

/*  para el menú móvil */
if (typeof setupMobileMenu === "function") {
  setupMobileMenu();
} else {
  document.addEventListener("DOMContentLoaded", function () {
    if (typeof setupMobileMenu === "function") {
      setupMobileMenu();
    }
  });
}

/**
 * Muestra información personalizada del usuario en el header o perfil.
 */
function mostrarInfoUsuario() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) return;

  const userDisplayName = document.getElementById("userDisplayName");
  const userAvatar = document.getElementById("userAvatar");

  if (userDisplayName) {
    const nombreCompleto = `${currentUser.nombre || ""} ${
      currentUser.apellido || ""
    }`.trim();
    userDisplayName.textContent =
      nombreCompleto || currentUser.email || "Usuario";
  }

  if (userAvatar) {
    // Si hay una imagen de avatar
    if (currentUser.avatar) {
      userAvatar.innerHTML = `<img src="${currentUser.avatar}" alt="Avatar de ${
        currentUser.nombre || "Usuario"
      }">`;
    } else {
      // Mostrar iniciales
      const nombre = currentUser.nombre || currentUser.email || "U";
      const apellido = currentUser.apellido || "";
      const iniciales = (nombre.charAt(0) + apellido.charAt(0)).toUpperCase();
      userAvatar.textContent = iniciales;
    }
  }
}

/**
 * Cierra la sesión del usuario
 */
function logout() {
  // Limpiar datos del localStorage
  localStorage.removeItem("token");
  localStorage.removeItem("currentUser");

  // Redirigir a la página principal
  window.location.href = "/";
}

/**
 * Realiza una petición fetch protegida
 */
async function fetchProtegido(url, options = {}) {
  const token = localStorage.getItem("token");
  const headers = options.headers || {};
  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }
  return fetch(url, { ...options, headers });
}

/**
 * Protege páginas que requieren autenticación
 */
function requireAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
  }
}

/**
 * Inicialización principal - Se ejecuta en todas las páginas
 */
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing...");

  // Configurar funciones básicas
  setupScrollAnimations();
  setupSmoothScroll();
  setupUserInterface();
  mostrarInfoUsuario();

  // Configurar menú móvil con un pequeño delay para asegurar que el DOM esté listo
  setTimeout(() => {
    setupMobileMenu();
  }, 100);

  // Si hay un contenedor de header, intentar cargar el header dinámico
  const headerContainer = document.getElementById("header-container");
  if (headerContainer) {
    loadDynamicHeader(headerContainer);
  }

  // Si hay un contenedor de footer, intentar cargar el footer dinámico
  const footerContainer = document.getElementById("footer-container");
  if (footerContainer) {
    loadDynamicFooter(footerContainer);
  }
});

/**
 * Carga el header dinámicamente
 */
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
      console.log("Header cargado correctamente.");

      // Reconfigurar todas las funciones después de cargar el header
      setTimeout(() => {
        setupMobileMenu();
        setupUserInterface();
        mostrarInfoUsuario();
      }, 200);
    })
    .catch((error) => {
      console.error("Error al cargar el header:", error);
    });
}

/**
 * Carga el footer dinámicamente
 */
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
      console.log("Footer cargado correctamente.");
    })
    .catch((error) => console.error("Error al cargar el footer:", error));
}
