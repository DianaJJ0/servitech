/**
 * LÓGICA PARA EL MENÚ MÓVIL
 * Maneja la funcionalidad de mostrar/ocultar el menú de navegación en dispositivos móviles.
 */
document.addEventListener("DOMContentLoaded", () => {
  // Obtener elementos del DOM
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const navContainer = document.getElementById("navContainer");

  // Verificar que los elementos existan
  if (!mobileMenuToggle || !navContainer) {
    console.warn("Elementos del menú móvil no encontrados");
    return;
  }

  // Función para alternar el menú móvil
  function toggleMobileMenu() {
    navContainer.classList.toggle("active");
    mobileMenuToggle.classList.toggle("active");

    // Cambiar el ícono del botón
    const icon = mobileMenuToggle.querySelector("i");
    if (icon) {
      if (navContainer.classList.contains("active")) {
        icon.className = "fas fa-times"; // Ícono de cerrar (X)
      } else {
        icon.className = "fas fa-bars"; // Ícono de menú hamburguesa
      }
    }
  }

  // Agregar event listener al botón del menú móvil
  mobileMenuToggle.addEventListener("click", toggleMobileMenu);

  // Cerrar el menú cuando se hace click en un enlace de navegación (en móvil)
  const navLinks = navContainer.querySelectorAll(".nav-item");
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      // Solo cerrar en dispositivos móviles (cuando el menú está visible)
      if (navContainer.classList.contains("active")) {
        toggleMobileMenu();
      }
    });
  });

  // Cerrar el menú al hacer click fuera de él
  document.addEventListener("click", (event) => {
    const isClickInsideNav = navContainer.contains(event.target);
    const isClickOnToggle = mobileMenuToggle.contains(event.target);

    // Si el menú está abierto y el click no es dentro del nav o en el botón toggle
    if (
      navContainer.classList.contains("active") &&
      !isClickInsideNav &&
      !isClickOnToggle
    ) {
      toggleMobileMenu();
    }
  });

  // Cerrar el menú al redimensionar la ventana (para evitar problemas al cambiar orientación)
  window.addEventListener("resize", () => {
    // Si cambiamos a una pantalla más grande, cerrar el menú móvil
    if (window.innerWidth > 768 && navContainer.classList.contains("active")) {
      toggleMobileMenu();
    }
  });
});
