/**
 * @fileoverview
 * Funciones y utilidades comunes para todas las paginas del views de Servitech.
 */

// Variables globales para estado del usuario
let initialUserState = null;
let userDataCheckInterval = null;

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

// Menu hamburguesa para movil
function setupMobileMenu() {
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const navContainer = document.getElementById("navContainer");

  if (!mobileMenuToggle || !navContainer) {
    return;
  }

  // Limpiar eventos previos clonando el elemento
  const newToggle = mobileMenuToggle.cloneNode(true);
  mobileMenuToggle.parentNode.replaceChild(newToggle, mobileMenuToggle);

  // Alternar menu movil
  function toggleMobileMenu() {
    navContainer.classList.toggle("active");
    newToggle.classList.toggle("active");

    // Cambia el icono
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

  // Cerrar menu al hacer clic en enlaces
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

  // Boton logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (event) {
      event.preventDefault();
      logout();
    });
  }

  // Cerrar menu al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (
      navContainer.classList.contains("active") &&
      !newToggle.contains(e.target) &&
      !navContainer.contains(e.target)
    ) {
      toggleMobileMenu();
    }
  });

  // Cerrar menu al redimensionar ventana
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

// Obtener estado inicial del usuario desde el header
function getInitialUserState() {
  const headerUserData = document.getElementById("headerUserData");
  if (headerUserData) {
    try {
      const isAuthenticated =
        headerUserData.getAttribute("data-is-authenticated") === "true";
      const userJson = headerUserData.getAttribute("data-user-json");
      const user = userJson ? JSON.parse(decodeURIComponent(userJson)) : null;

      return {
        isAuthenticated: isAuthenticated,
        user: user,
      };
    } catch (error) {
      console.warn("Error parsing initial user state:", error);
    }
  }
  return null;
}

// Obtener datos actuales del usuario del localStorage
function getCurrentUserData() {
  try {
    const usuarioRaw = localStorage.getItem("usuario");
    const token = localStorage.getItem("token");

    if (!usuarioRaw || !token) {
      return null;
    }

    return JSON.parse(usuarioRaw);
  } catch (error) {
    console.error("Error parsing user data from localStorage:", error);
    return null;
  }
}

// Actualizar datos del usuario en localStorage y UI
function actualizarDatosUsuario(nuevosDatos) {
  try {
    // Obtener datos actuales del localStorage
    const usuarioActual = getCurrentUserData() || {};

    // Fusionar datos nuevos con los existentes
    const usuarioActualizado = {
      ...usuarioActual,
      ...nuevosDatos,
    };

    // Actualizar localStorage
    localStorage.setItem("usuario", JSON.stringify(usuarioActualizado));

    // Actualizar interfaz inmediatamente
    mostrarInfoUsuario(usuarioActualizado);

    // Actualizar estado global si existe
    if (window.initialUserState) {
      window.initialUserState.user = usuarioActualizado;
    }

    console.log("Datos de usuario actualizados:", usuarioActualizado);

    return usuarioActualizado;
  } catch (error) {
    console.error("Error actualizando datos de usuario:", error);
    return null;
  }
}

// Verificar cambios en localStorage y actualizar UI si es necesario
function verificarCambiosUsuario() {
  const currentUser = getCurrentUserData();

  if (!currentUser) {
    // Usuario no autenticado
    const authButtons = document.getElementById("authButtons");
    const userMenu = document.getElementById("userMenuContainer");

    if (authButtons) authButtons.style.display = "flex";
    if (userMenu) userMenu.style.display = "none";
    return;
  }

  // Verificar si los datos del header coinciden con localStorage
  const userDisplayName = document.getElementById("userDisplayName");
  if (userDisplayName) {
    const nombre =
      currentUser.nombre && currentUser.nombre !== "undefined"
        ? currentUser.nombre
        : "";
    const apellido =
      currentUser.apellido && currentUser.apellido !== "undefined"
        ? currentUser.apellido
        : "";
    const nombreCompleto = `${nombre} ${apellido}`.trim();
    const nombreMostrado = nombreCompleto || currentUser.email || "Usuario";

    // Si el nombre mostrado es diferente al actual, actualizar
    if (userDisplayName.textContent !== nombreMostrado) {
      mostrarInfoUsuario(currentUser);
    }
  }
}

// Configurar verificacion periodica de cambios
function setupUserDataSync() {
  // Verificar cambios cada 2 segundos
  if (userDataCheckInterval) {
    clearInterval(userDataCheckInterval);
  }

  userDataCheckInterval = setInterval(verificarCambiosUsuario, 2000);

  // Verificar cuando la ventana recupera el foco
  window.addEventListener("focus", verificarCambiosUsuario);

  // Verificar cuando se almacena algo en localStorage
  window.addEventListener("storage", function (e) {
    if (e.key === "usuario") {
      verificarCambiosUsuario();
    }
  });
}

// Muestra u oculta el header segun el login y el rol
function setupUserInterface() {
  // Obtener estado inicial del servidor primero
  initialUserState = getInitialUserState();

  let isAuthenticated = false;
  let currentUser = null;

  // Priorizar estado del servidor si esta disponible
  if (initialUserState && initialUserState.isAuthenticated) {
    isAuthenticated = initialUserState.isAuthenticated;
    currentUser = initialUserState.user;

    // Sincronizar con localStorage si hay datos del servidor
    if (isAuthenticated && currentUser) {
      localStorage.setItem("usuario", JSON.stringify(currentUser));
      if (!localStorage.getItem("token")) {
        localStorage.setItem("token", "server-auth");
      }
    }
  } else {
    // Fallback a localStorage si no hay estado del servidor
    currentUser = getCurrentUserData();
    const token = localStorage.getItem("token");
    isAuthenticated = !!(currentUser && token);
  }

  // Elementos del DOM
  const authButtons = document.getElementById("authButtons");
  const userMenu = document.getElementById("userMenuContainer");
  const navContainer = document.getElementById("navContainer");
  const adminAccess = document.getElementById("adminAccess");

  if (isAuthenticated && currentUser && currentUser.email) {
    // Usuario autenticado: ocultar botones de auth, mostrar menu usuario
    if (authButtons) authButtons.style.display = "none";
    if (userMenu) {
      userMenu.style.display = "flex";
      mostrarInfoUsuario(currentUser);
      setTimeout(() => {
        setupUserDropdown();
      }, 50);
    }
    if (navContainer) {
      navContainer.classList.add("logged-in");
    }

    // Mostrar boton admin si corresponde
    mostrarBotonAdmin(currentUser);

    // Configurar sincronizacion automatica
    setupUserDataSync();
  } else {
    // Usuario no autenticado: mostrar botones de auth, ocultar menu usuario
    if (authButtons) authButtons.style.display = "flex";
    if (userMenu) userMenu.style.display = "none";
    if (navContainer) navContainer.classList.remove("logged-in");
    if (adminAccess) adminAccess.style.display = "none";

    // Limpiar intervalo si existe
    if (userDataCheckInterval) {
      clearInterval(userDataCheckInterval);
      userDataCheckInterval = null;
    }
  }
}

// Configura el dropdown del menu de usuario
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
function mostrarInfoUsuario(usuario = null) {
  // Si no se pasa usuario, obtenerlo del localStorage
  if (!usuario) {
    usuario = getCurrentUserData();
    if (!usuario) return;
  }

  const userDisplayName = document.getElementById("userDisplayName");
  const userAvatar = document.getElementById("userAvatar");

  if (userDisplayName) {
    let nombreCompleto = "";

    // Verificar que nombre y apellido no sean undefined o null
    const nombre =
      usuario.nombre && usuario.nombre !== "undefined" ? usuario.nombre : "";
    const apellido =
      usuario.apellido && usuario.apellido !== "undefined"
        ? usuario.apellido
        : "";

    nombreCompleto = `${nombre} ${apellido}`.trim();

    // Si no hay nombre completo, usar email como fallback
    if (!nombreCompleto) {
      nombreCompleto = usuario.email || "Usuario";
    }

    userDisplayName.textContent = nombreCompleto;
  }

  if (userAvatar) {
    if (usuario.avatarUrl && !usuario.avatarUrl.includes("ui-avatars.com")) {
      userAvatar.innerHTML = `<img src="${usuario.avatarUrl}" alt="Avatar de ${
        usuario.nombre || "Usuario"
      }" class="avatar-img">`;
    } else {
      const nombre =
        usuario.nombre && usuario.nombre !== "undefined" ? usuario.nombre : "";
      const apellido =
        usuario.apellido && usuario.apellido !== "undefined"
          ? usuario.apellido
          : "";
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

      userAvatar.innerHTML = `<span>${iniciales}</span>`;
    }
  }
}

// Solo muestra el boton de admin si el usuario tiene rol 'admin'
function mostrarBotonAdmin(usuario) {
  const adminAccess = document.getElementById("adminAccess");
  if (!adminAccess) return;

  // Verificar si el usuario tiene rol de admin
  const esAdmin =
    usuario && Array.isArray(usuario.roles) && usuario.roles.includes("admin");

  if (esAdmin) {
    adminAccess.style.display = "block";
    // Agregar event listener al boton de admin para verificar sesion antes de abrir
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

// Funcion para verificar la sesion del servidor antes de abrir el panel de admin
async function verificarSesionYAbrirAdmin() {
  try {
    const token = localStorage.getItem("token");
    const usuario = getCurrentUserData();

    if (
      !token ||
      !usuario ||
      !usuario.roles ||
      !usuario.roles.includes("admin")
    ) {
      alert("No tienes permisos de administrador o tu sesion ha expirado.");
      return;
    }

    // Establecer sesion en el servidor antes de navegar
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
          "Error al establecer la sesion de administrador. Inicia sesion nuevamente."
        );
        window.location.href = "/login.html";
      }
    } catch (error) {
      alert("Error de conexion. Intentalo de nuevo.");
    }
  } catch (error) {
    alert("Error al verificar la sesion. Inicia sesion nuevamente.");
    window.location.href = "/login.html";
  }
}

// Cierra la sesion del usuario
function logout() {
  // Limpiar intervalo de verificacion
  if (userDataCheckInterval) {
    clearInterval(userDataCheckInterval);
    userDataCheckInterval = null;
  }

  localStorage.removeItem("token");
  localStorage.removeItem("usuario");

  // Ocultar boton de admin al cerrar sesion
  const adminAccess = document.getElementById("adminAccess");
  if (adminAccess) adminAccess.style.display = "none";

  // Llama al backend para destruir la sesion
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

// Redireccion si no hay autenticacion
function requireAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
  }
}

// Refrescar interfaz de usuario (util para llamar despues de actualizar datos)
function refrescarInterfazUsuario() {
  setTimeout(() => {
    setupUserInterface();
  }, 100);
}

// Inicializacion principal en todas las paginas
document.addEventListener("DOMContentLoaded", () => {
  setupScrollAnimations();
  setupSmoothScroll();

  // Esperar un poco para que el header se renderice completamente
  setTimeout(() => {
    setupUserInterface();
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

// Limpiar intervalos al cerrar la pagina
window.addEventListener("beforeunload", () => {
  if (userDataCheckInterval) {
    clearInterval(userDataCheckInterval);
  }
});

// Carga dinamica del header
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
    .catch((error) => {
      console.warn("Header dinamico no disponible:", error.message);
    });
}

// Carga dinamica del footer
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
    .catch((error) => {
      console.warn("Footer dinamico no disponible:", error.message);
    });
}

// Hacer funciones disponibles globalmente
window.actualizarDatosUsuario = actualizarDatosUsuario;
window.refrescarInterfazUsuario = refrescarInterfazUsuario;
window.mostrarInfoUsuario = mostrarInfoUsuario;
window.getCurrentUserData = getCurrentUserData;
window.verificarCambiosUsuario = verificarCambiosUsuario;
