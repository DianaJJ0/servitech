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

  console.log("Configurando menú móvil...");

  // Limpiar eventos previos clonando el elemento
  const newToggle = mobileMenuToggle.cloneNode(true);
  mobileMenuToggle.parentNode.replaceChild(newToggle, mobileMenuToggle);

  // Event listener para abrir/cerrar menú
  newToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    navContainer.classList.toggle("active");

    const icon = newToggle.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-bars");
      icon.classList.toggle("fa-times");
    }

    console.log(
      "Menu toggled, active:",
      navContainer.classList.contains("active")
    );
  });

  // Cerrar menú al hacer clic en enlaces
  const allNavLinks = navContainer.querySelectorAll(
    ".nav-item, .dropdown-item"
  );
  allNavLinks.forEach((link) => {
    if (link.id !== "logoutBtn") {
      link.addEventListener("click", () => {
        navContainer.classList.remove("active");
        const icon = newToggle.querySelector("i");
        if (icon) {
          icon.classList.add("fa-bars");
          icon.classList.remove("fa-times");
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
      navContainer.classList.remove("active");
      const icon = newToggle.querySelector("i");
      if (icon) {
        icon.classList.add("fa-bars");
        icon.classList.remove("fa-times");
      }
    }
  });

  // Cerrar menú al redimensionar ventana
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 993) {
      navContainer.classList.remove("active");
      const icon = newToggle.querySelector("i");
      if (icon) {
        icon.classList.add("fa-bars");
        icon.classList.remove("fa-times");
      }
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

/**
 * Muestra información personalizada del usuario en el header o perfil.
 */
function mostrarInfoUsuario() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) return;

  const userNameHeader = document.getElementById("userNameHeader");
  if (userNameHeader) {
    userNameHeader.textContent = currentUser.nombre || currentUser.email || "";
  }

  const userEmailHeader = document.getElementById("userEmailHeader");
  if (userEmailHeader) {
    userEmailHeader.textContent = currentUser.email || "";
  }
}

/**
 * Cierra la sesión del usuario
 */
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("currentUser");
  window.location.href = "/login.html";
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
