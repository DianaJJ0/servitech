/**
 * @fileoverview
 * Funciones y utilidades comunes para todas las páginas del panel de administración de Servitech.
 * Incluye helpers para menús, navegación, notificaciones y manejo de eventos globales.
 *
 * Autor: Diana Carolina Jimenez
 * Fecha: 2025-06-04
 */

/**
 * Funciones comunes para todas las páginas del panel de administración
 */
document.addEventListener("DOMContentLoaded", () => {
  // Sidebar: renderizado ahora server-side mediante EJS include.
  // Si por alguna razón aún existe un placeholder en la página, no intentamos
  // hacer fetch del partial desde el cliente (evitamos 404/errores y doble carga).
  const sidebarContainer = document.getElementById("admin-sidebar-container");
  if (sidebarContainer) {
    // El servidor debería haber incluido el sidebar. Si el placeholder persiste,
    // lo dejamos vacío para evitar inyectar templates desde el cliente.
    // (Mantener el container por compatibilidad con versiones anteriores.)
  }
  // 2) Setups restantes
  setupNotifications();
  setupProfileDropdown();
  setupInteractionEffects();
  setupMobileMenu();
});

/**
 * Configura las notificaciones del panel de administración
 */
function setupNotifications() {
  const notificationIcon = document.querySelector(".notification-icon");
  if (notificationIcon) {
    notificationIcon.addEventListener("click", () =>
      console.log("Notificaciones clickeadas")
    );
  }
}

// Ensure Bootstrap Offcanvas is programmatically available and bind toggle as a fallback
document.addEventListener("DOMContentLoaded", function () {
  try {
    const toggle = document.getElementById("menu-toggle");
    const offEl = document.getElementById("offcanvasAdminSidebar");
    if (toggle && offEl) {
      if (typeof bootstrap !== "undefined" && bootstrap.Offcanvas) {
        try {
          // Create instance if not already created by Data API
          const existing = bootstrap.Offcanvas.getInstance(offEl);
          const inst = existing || new bootstrap.Offcanvas(offEl);
          // Bind a safe click handler that calls show() to guarantee opening
          toggle.addEventListener("click", function (e) {
            try {
              if (!offEl.classList.contains("show")) inst.show();
              else inst.hide();
            } catch (err) {
              console.warn("offcanvas toggle error", err);
            }
          });
        } catch (e) {
          console.warn("bootstrap Offcanvas init failed", e);
        }
      } else {
        // Debug fallback: log clicks so user can report
        toggle.addEventListener("click", function () {
          console.log("menu-toggle clicked (no bootstrap)");
        });
      }
    }
  } catch (e) {
    console.warn("offcanvas setup error", e);
  }
});

/**
 * Configura el dropdown del perfil de administrador
 */
function setupProfileDropdown() {
  const adminProfile = document.querySelector(".admin-profile");
  if (adminProfile) {
    adminProfile.addEventListener("click", () =>
      console.log("Perfil clickeado")
    );
  }
}

/**
 * Configura efectos visuales para elementos interactivos
 */
function setupInteractionEffects() {
  document.querySelectorAll(".action-buttons .btn-icon").forEach((btn) => {
    btn.addEventListener(
      "mouseenter",
      () => (btn.style.backgroundColor = "rgba(58, 142, 255, 0.1)")
    );
    btn.addEventListener("mouseleave", () => (btn.style.backgroundColor = ""));
  });

  document.querySelectorAll(".btn-primary").forEach((btn) => {
    btn.addEventListener(
      "mouseenter",
      () => (btn.style.filter = "brightness(1.1)")
    );
    btn.addEventListener("mouseleave", () => (btn.style.filter = ""));
  });
}

/**
 * Configura el menú responsive para móvil y tablet
 */
function setupMobileMenu() {
  // Esperar a que el sidebar se cargue completamente
  setTimeout(() => {
    // Crear overlay si no existe
    if (!document.querySelector(".sidebar-overlay")) {
      const overlay = document.createElement("div");
      overlay.className = "sidebar-overlay";
      document.body.appendChild(overlay);

      // Cerrar menú al hacer clic en el overlay
      overlay.addEventListener("click", () => {
        closeMobileMenu();
      });
    }

    // Configurar botón de menú hamburguesa
    const menuToggle = document.getElementById("menu-toggle");
    // If the toggle is using Bootstrap data attributes, don't intercept the click
    // instead listen to Bootstrap offcanvas events to set body/menu state
    if (
      menuToggle &&
      menuToggle.hasAttribute &&
      menuToggle.hasAttribute("data-bs-toggle")
    ) {
      const targetSelector =
        menuToggle.getAttribute("data-bs-target") ||
        menuToggle.getAttribute("data-target");
      const selector =
        targetSelector && targetSelector.startsWith("#")
          ? targetSelector.slice(1)
          : targetSelector;
      const offcanvasEl = selector ? document.getElementById(selector) : null;
      if (
        offcanvasEl &&
        typeof bootstrap !== "undefined" &&
        offcanvasEl.addEventListener
      ) {
        offcanvasEl.addEventListener("shown.bs.offcanvas", () => {
          document.body.classList.add("menu-open");
          menuToggle.setAttribute("aria-expanded", "true");
          document.documentElement.style.overflow = "hidden";
          document.body.style.overflow = "hidden";
          const firstLink = document.querySelector(
            ".offcanvas.admin-sidebar .sidebar-nav a"
          );
          if (firstLink) firstLink.focus();
        });
        offcanvasEl.addEventListener("hidden.bs.offcanvas", () => {
          document.body.classList.remove("menu-open");
          menuToggle.setAttribute("aria-expanded", "false");
          document.documentElement.style.overflow = "";
          document.body.style.overflow = "";
          try {
            menuToggle.focus();
          } catch (e) {}
        });
      } else if (offcanvasEl) {
        // Fallback simple toggle when Bootstrap JS is not available
        menuToggle.addEventListener("click", (e) => {
          e.preventDefault();
          const isOpen = offcanvasEl.classList.toggle("show");
          if (isOpen) {
            document.body.classList.add("menu-open");
            menuToggle.setAttribute("aria-expanded", "true");
            offcanvasEl.setAttribute("aria-hidden", "false");
            document.documentElement.style.overflow = "hidden";
            document.body.style.overflow = "hidden";
            const firstLink = offcanvasEl.querySelector(".sidebar-nav a");
            if (firstLink) firstLink.focus();
          } else {
            closeMobileMenu();
          }
        });

        // Close buttons inside offcanvas
        offcanvasEl
          .querySelectorAll('[data-bs-dismiss="offcanvas"], .btn-close')
          .forEach((btn) => {
            btn.addEventListener("click", () => {
              closeMobileMenu();
            });
          });
      }
    } else if (menuToggle) {
      // Fallback: non-Bootstrap toggle
      menuToggle.addEventListener("click", (e) => {
        e.preventDefault();
        const isOpen = document.body.classList.toggle("menu-open");
        menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        // prevent background scroll when menu open
        if (isOpen) {
          document.documentElement.style.overflow = "hidden";
          document.body.style.overflow = "hidden";
          // move focus to first nav link
          const firstLink = document.querySelector(".sidebar-nav a");
          if (firstLink) firstLink.focus();
        } else {
          document.documentElement.style.overflow = "";
          document.body.style.overflow = "";
        }
      });
    }

    // Cerrar menú al cambiar de tamaño de ventana a escritorio
    window.addEventListener("resize", () => {
      if (
        window.innerWidth > 991 &&
        document.body.classList.contains("menu-open")
      ) {
        document.body.classList.remove("menu-open");
      }
    });

    // Cerrar menú al seleccionar un elemento de navegación en móvil/tablet
    const navLinks = document.querySelectorAll(".sidebar-nav a");
    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth <= 991) {
          closeMobileMenu();
        }
      });
    });

    // Añadir clase para indicar que el menú móvil está listo
    document.body.classList.add("mobile-menu-ready");
  }, 300);
}

function closeMobileMenu() {
  const menuToggle = document.getElementById("menu-toggle");
  document.body.classList.remove("menu-open");
  if (menuToggle) {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.focus();
  }
  // restore scrolling
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
}

// Close menu on ESC globally
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" || e.key === "Esc") {
    if (document.body.classList.contains("menu-open")) {
      closeMobileMenu();
    }
  }
});

/**
 * Inicializa el menú lateral y la navegación del panel de administración.
 */
function setupAdminSidebar() {
  // Lógica para inicializar el menú lateral
}

/**
 * Muestra notificaciones o mensajes globales en el panel de administración.
 */
function mostrarNotificacionAdmin(mensaje, tipo) {
  // Lógica para mostrar notificaciones
}
