/**
 * @fileoverview
 * Funcionalidad para la página de administración de usuarios.
 * Carga y muestra una lista de todos los usuarios del sistema.
 */

document.addEventListener("DOMContentLoaded", function () {
  // --- Criterios dinámicos para campo Roles (coma separado) ---
  const allowedRoles = ["cliente", "experto", "admin"];
  /**
   * Deepwiki: metadata
   * - propósito: validación y gestión de formularios de creación/edición de usuarios en Admin
   * - variables DOM esperadas: #create-roles, #createRolesCriteria, #edit-roles, #editRolesCriteria
   * - dependencias: none (DOM-only)
   */
  // Crear usuario
  const createRolesInput = document.getElementById("create-roles");
  const createRolesCriteriaList = document.getElementById(
    "createRolesCriteria"
  );
  const createRolesValidItem = document.getElementById(
    "createRolesValidCriteria"
  );
  const createRolesAllowedItem = document.getElementById(
    "createRolesAllowedCriteria"
  );
  const createRolesNoSpacesItem = document.getElementById(
    "createRolesNoSpacesCriteria"
  );
  if (
    createRolesInput &&
    createRolesCriteriaList &&
    createRolesValidItem &&
    createRolesAllowedItem &&
    createRolesNoSpacesItem
  ) {
    function parseRoles(str) {
      return str
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
    }
    function isValidRoles(str) {
      return parseRoles(str).length > 0;
    }
    function isAllowedRoles(str) {
      const roles = parseRoles(str);
      return roles.every((r) => allowedRoles.includes(r));
    }
    function noExtraSpacesOrCommas(str) {
      return str === str.replace(/^,|,$/g, "").replace(/\s*,\s*/g, ",");
    }
    function updateCreateRolesCriteriaUI(val) {
      createRolesCriteriaList.style.display = val ? "block" : "none";
      // Al menos un rol válido
      const valid = isValidRoles(val);
      createRolesValidItem.classList.remove("valid", "invalid");
      createRolesValidItem.classList.add(valid ? "valid" : "invalid");
      let icon1 = createRolesValidItem.querySelector(".roles-criteria-icon");
      if (icon1) icon1.textContent = valid ? "✔" : "✖";
      // Solo roles permitidos
      const allowed = valid && isAllowedRoles(val);
      createRolesAllowedItem.classList.remove("valid", "invalid");
      createRolesAllowedItem.classList.add(allowed ? "valid" : "invalid");
      let icon2 = createRolesAllowedItem.querySelector(".roles-criteria-icon");
      if (icon2) icon2.textContent = allowed ? "✔" : "✖";
      // Sin espacios extra ni comas al inicio/final
      const noSpaces = !!val && noExtraSpacesOrCommas(val);
      createRolesNoSpacesItem.classList.remove("valid", "invalid");
      createRolesNoSpacesItem.classList.add(noSpaces ? "valid" : "invalid");
      let icon3 = createRolesNoSpacesItem.querySelector(".roles-criteria-icon");
      if (icon3) icon3.textContent = noSpaces ? "✔" : "✖";
    }
    createRolesInput.addEventListener("focus", () => {
      updateCreateRolesCriteriaUI(createRolesInput.value || "");
    });
    createRolesInput.addEventListener("blur", () => {
      createRolesCriteriaList.style.display = "none";
    });
    createRolesInput.addEventListener("input", (e) => {
      updateCreateRolesCriteriaUI(e.target.value || "");
    });
  }

  // Editar usuario
  const editRolesInput = document.getElementById("edit-roles");
  const editRolesCriteriaList = document.getElementById("editRolesCriteria");
  const editRolesValidItem = document.getElementById("editRolesValidCriteria");
  const editRolesAllowedItem = document.getElementById(
    "editRolesAllowedCriteria"
  );
  const editRolesNoSpacesItem = document.getElementById(
    "editRolesNoSpacesCriteria"
  );
  if (
    editRolesInput &&
    editRolesCriteriaList &&
    editRolesValidItem &&
    editRolesAllowedItem &&
    editRolesNoSpacesItem
  ) {
    function parseRoles(str) {
      return str
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
    }
    function isValidRoles(str) {
      return parseRoles(str).length > 0;
    }
    function isAllowedRoles(str) {
      const roles = parseRoles(str);
      return roles.every((r) => allowedRoles.includes(r));
    }
    function noExtraSpacesOrCommas(str) {
      return str === str.replace(/^,|,$/g, "").replace(/\s*,\s*/g, ",");
    }
    function updateEditRolesCriteriaUI(val) {
      editRolesCriteriaList.style.display = val ? "block" : "none";
      // Al menos un rol válido
      const valid = isValidRoles(val);
      editRolesValidItem.classList.remove("valid", "invalid");
      editRolesValidItem.classList.add(valid ? "valid" : "invalid");
      let icon1 = editRolesValidItem.querySelector(".roles-criteria-icon");
      if (icon1) icon1.textContent = valid ? "✔" : "✖";
      // Solo roles permitidos
      const allowed = valid && isAllowedRoles(val);
      editRolesAllowedItem.classList.remove("valid", "invalid");
      editRolesAllowedItem.classList.add(allowed ? "valid" : "invalid");
      let icon2 = editRolesAllowedItem.querySelector(".roles-criteria-icon");
      if (icon2) icon2.textContent = allowed ? "✔" : "✖";
      // Sin espacios extra ni comas al inicio/final
      const noSpaces = !!val && noExtraSpacesOrCommas(val);
      editRolesNoSpacesItem.classList.remove("valid", "invalid");
      editRolesNoSpacesItem.classList.add(noSpaces ? "valid" : "invalid");
      let icon3 = editRolesNoSpacesItem.querySelector(".roles-criteria-icon");
      if (icon3) icon3.textContent = noSpaces ? "✔" : "✖";
    }
    editRolesInput.addEventListener("focus", () => {
      updateEditRolesCriteriaUI(editRolesInput.value || "");
    });
    editRolesInput.addEventListener("blur", () => {
      editRolesCriteriaList.style.display = "none";
    });
    editRolesInput.addEventListener("input", (e) => {
      updateEditRolesCriteriaUI(e.target.value || "");
    });
  }
  // --- Criterios dinámicos para modal Editar Usuario ---
  // Nombre
  const editNombreInput = document.getElementById("edit-nombre");
  const editNombreCriteriaList = document.getElementById("editNombreCriteria");
  const editNombreLettersItem = document.getElementById(
    "editNombreLettersCriteria"
  );
  const editNombreMinItem = document.getElementById("editNombreMinCriteria");
  const editNombreTrimItem = document.getElementById("editNombreTrimCriteria");
  if (
    editNombreInput &&
    editNombreCriteriaList &&
    editNombreLettersItem &&
    editNombreMinItem &&
    editNombreTrimItem
  ) {
    function isOnlyLettersSpaces(str) {
      return /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(str);
    }
    function isMinLength(str) {
      return str.trim().length >= 2;
    }
    function isTrimmed(str) {
      return str === str.trim();
    }
    function updateEditNombreCriteriaUI(val) {
      editNombreCriteriaList.style.display = val ? "block" : "none";
      // Solo letras y espacios
      const onlyLetters = !!val && isOnlyLettersSpaces(val);
      editNombreLettersItem.classList.remove("valid", "invalid");
      editNombreLettersItem.classList.add(onlyLetters ? "valid" : "invalid");
      let icon1 = editNombreLettersItem.querySelector(".nombre-criteria-icon");
      if (icon1) icon1.textContent = onlyLetters ? "✔" : "✖";
      // Mínimo 2 caracteres
      const minLen = !!val && isMinLength(val);
      editNombreMinItem.classList.remove("valid", "invalid");
      editNombreMinItem.classList.add(minLen ? "valid" : "invalid");
      let icon2 = editNombreMinItem.querySelector(".nombre-criteria-icon");
      if (icon2) icon2.textContent = minLen ? "✔" : "✖";
      // Sin espacios al inicio/final
      const trimmed = !!val && isTrimmed(val);
      editNombreTrimItem.classList.remove("valid", "invalid");
      editNombreTrimItem.classList.add(trimmed ? "valid" : "invalid");
      let icon3 = editNombreTrimItem.querySelector(".nombre-criteria-icon");
      if (icon3) icon3.textContent = trimmed ? "✔" : "✖";
    }
    editNombreInput.addEventListener("focus", () => {
      updateEditNombreCriteriaUI(editNombreInput.value || "");
    });
    editNombreInput.addEventListener("blur", () => {
      editNombreCriteriaList.style.display = "none";
    });
    editNombreInput.addEventListener("input", (e) => {
      updateEditNombreCriteriaUI(e.target.value || "");
    });
  }

  // Apellido
  const editApellidoInput = document.getElementById("edit-apellido");
  const editApellidoCriteriaList = document.getElementById(
    "editApellidoCriteria"
  );
  const editApellidoLettersItem = document.getElementById(
    "editApellidoLettersCriteria"
  );
  const editApellidoMinItem = document.getElementById(
    "editApellidoMinCriteria"
  );
  const editApellidoTrimItem = document.getElementById(
    "editApellidoTrimCriteria"
  );
  if (
    editApellidoInput &&
    editApellidoCriteriaList &&
    editApellidoLettersItem &&
    editApellidoMinItem &&
    editApellidoTrimItem
  ) {
    function isOnlyLettersSpaces(str) {
      return /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(str);
    }
    function isMinLength(str) {
      return str.trim().length >= 2;
    }
    function isTrimmed(str) {
      return str === str.trim();
    }
    function updateEditApellidoCriteriaUI(val) {
      editApellidoCriteriaList.style.display = val ? "block" : "none";
      // Solo letras y espacios
      const onlyLetters = !!val && isOnlyLettersSpaces(val);
      editApellidoLettersItem.classList.remove("valid", "invalid");
      editApellidoLettersItem.classList.add(onlyLetters ? "valid" : "invalid");
      let icon1 = editApellidoLettersItem.querySelector(
        ".apellido-criteria-icon"
      );
      if (icon1) icon1.textContent = onlyLetters ? "✔" : "✖";
      // Mínimo 2 caracteres
      const minLen = !!val && isMinLength(val);
      editApellidoMinItem.classList.remove("valid", "invalid");
      editApellidoMinItem.classList.add(minLen ? "valid" : "invalid");
      let icon2 = editApellidoMinItem.querySelector(".apellido-criteria-icon");
      if (icon2) icon2.textContent = minLen ? "✔" : "✖";
      // Sin espacios al inicio/final
      const trimmed = !!val && isTrimmed(val);
      editApellidoTrimItem.classList.remove("valid", "invalid");
      editApellidoTrimItem.classList.add(trimmed ? "valid" : "invalid");
      let icon3 = editApellidoTrimItem.querySelector(".apellido-criteria-icon");
      if (icon3) icon3.textContent = trimmed ? "✔" : "✖";
    }
    editApellidoInput.addEventListener("focus", () => {
      updateEditApellidoCriteriaUI(editApellidoInput.value || "");
    });
    editApellidoInput.addEventListener("blur", () => {
      editApellidoCriteriaList.style.display = "none";
    });
    editApellidoInput.addEventListener("input", (e) => {
      updateEditApellidoCriteriaUI(e.target.value || "");
    });
  }

  // Email (solo formato y dominio, aunque está deshabilitado)
  const editEmailInput = document.getElementById("edit-email");
  const editEmailCriteriaList = document.getElementById("editEmailCriteria");
  const editEmailValidItem = document.getElementById("editEmailValidCriteria");
  const editEmailDomainItem = document.getElementById(
    "editEmailDomainCriteria"
  );
  if (
    editEmailInput &&
    editEmailCriteriaList &&
    editEmailValidItem &&
    editEmailDomainItem
  ) {
    const tempDomains = [
      "mailinator.com",
      "tempmail.com",
      "10minutemail.com",
      "guerrillamail.com",
      "yopmail.com",
    ];
    function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    function isAllowedDomain(email) {
      const domain = (email.split("@")[1] || "").toLowerCase();
      if (!domain) return false;
      return !tempDomains.some((tmp) => domain.endsWith(tmp));
    }
    function updateEditEmailCriteriaUI(email) {
      editEmailCriteriaList.style.display = email ? "block" : "none";
      const valid = isValidEmail(email);
      editEmailValidItem.classList.remove("valid", "invalid");
      editEmailValidItem.classList.add(valid ? "valid" : "invalid");
      let icon1 = editEmailValidItem.querySelector(".email-criteria-icon");
      if (icon1) icon1.textContent = valid ? "✔" : "✖";
      const allowed = valid && isAllowedDomain(email);
      editEmailDomainItem.classList.remove("valid", "invalid");
      editEmailDomainItem.classList.add(allowed ? "valid" : "invalid");
      let icon2 = editEmailDomainItem.querySelector(".email-criteria-icon");
      if (icon2) icon2.textContent = allowed ? "✔" : "✖";
    }
    // Aunque el campo está deshabilitado, mostrar criterios al enfocar (por accesibilidad)
    editEmailInput.addEventListener("focus", () => {
      updateEditEmailCriteriaUI(editEmailInput.value || "");
    });
    editEmailInput.addEventListener("blur", () => {
      editEmailCriteriaList.style.display = "none";
    });
    editEmailInput.addEventListener("input", (e) => {
      updateEditEmailCriteriaUI(e.target.value || "");
    });
  }
  // Nombre: criterios dinámicos
  const nombreInput = document.getElementById("create-nombre");
  const nombreCriteriaList = document.getElementById("createNombreCriteria");
  const nombreLettersItem = document.getElementById(
    "createNombreLettersCriteria"
  );
  const nombreMinItem = document.getElementById("createNombreMinCriteria");
  const nombreTrimItem = document.getElementById("createNombreTrimCriteria");
  if (
    nombreInput &&
    nombreCriteriaList &&
    nombreLettersItem &&
    nombreMinItem &&
    nombreTrimItem
  ) {
    function isOnlyLettersSpaces(str) {
      return /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(str);
    }
    function isMinLength(str) {
      return str.trim().length >= 2;
    }
    function isTrimmed(str) {
      return str === str.trim();
    }
    function updateNombreCriteriaUI(val) {
      nombreCriteriaList.style.display = val ? "block" : "none";
      // Solo letras y espacios
      const onlyLetters = !!val && isOnlyLettersSpaces(val);
      nombreLettersItem.classList.remove("valid", "invalid");
      nombreLettersItem.classList.add(onlyLetters ? "valid" : "invalid");
      let icon1 = nombreLettersItem.querySelector(".nombre-criteria-icon");
      if (icon1) icon1.textContent = onlyLetters ? "✔" : "✖";
      // Mínimo 2 caracteres
      const minLen = !!val && isMinLength(val);
      nombreMinItem.classList.remove("valid", "invalid");
      nombreMinItem.classList.add(minLen ? "valid" : "invalid");
      let icon2 = nombreMinItem.querySelector(".nombre-criteria-icon");
      if (icon2) icon2.textContent = minLen ? "✔" : "✖";
      // Sin espacios al inicio/final
      const trimmed = !!val && isTrimmed(val);
      nombreTrimItem.classList.remove("valid", "invalid");
      nombreTrimItem.classList.add(trimmed ? "valid" : "invalid");
      let icon3 = nombreTrimItem.querySelector(".nombre-criteria-icon");
      if (icon3) icon3.textContent = trimmed ? "✔" : "✖";
    }
    nombreInput.addEventListener("focus", () => {
      updateNombreCriteriaUI(nombreInput.value || "");
    });
    nombreInput.addEventListener("blur", () => {
      nombreCriteriaList.style.display = "none";
    });
    nombreInput.addEventListener("input", (e) => {
      updateNombreCriteriaUI(e.target.value || "");
    });
  }

  // Apellido: criterios dinámicos
  const apellidoInput = document.getElementById("create-apellido");
  const apellidoCriteriaList = document.getElementById(
    "createApellidoCriteria"
  );
  const apellidoLettersItem = document.getElementById(
    "createApellidoLettersCriteria"
  );
  const apellidoMinItem = document.getElementById("createApellidoMinCriteria");
  const apellidoTrimItem = document.getElementById(
    "createApellidoTrimCriteria"
  );
  if (
    apellidoInput &&
    apellidoCriteriaList &&
    apellidoLettersItem &&
    apellidoMinItem &&
    apellidoTrimItem
  ) {
    function isOnlyLettersSpaces(str) {
      return /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(str);
    }
    function isMinLength(str) {
      return str.trim().length >= 2;
    }
    function isTrimmed(str) {
      return str === str.trim();
    }
    function updateApellidoCriteriaUI(val) {
      apellidoCriteriaList.style.display = val ? "block" : "none";
      // Solo letras y espacios
      const onlyLetters = !!val && isOnlyLettersSpaces(val);
      apellidoLettersItem.classList.remove("valid", "invalid");
      apellidoLettersItem.classList.add(onlyLetters ? "valid" : "invalid");
      let icon1 = apellidoLettersItem.querySelector(".apellido-criteria-icon");
      if (icon1) icon1.textContent = onlyLetters ? "✔" : "✖";
      // Mínimo 2 caracteres
      const minLen = !!val && isMinLength(val);
      apellidoMinItem.classList.remove("valid", "invalid");
      apellidoMinItem.classList.add(minLen ? "valid" : "invalid");
      let icon2 = apellidoMinItem.querySelector(".apellido-criteria-icon");
      if (icon2) icon2.textContent = minLen ? "✔" : "✖";
      // Sin espacios al inicio/final
      const trimmed = !!val && isTrimmed(val);
      apellidoTrimItem.classList.remove("valid", "invalid");
      apellidoTrimItem.classList.add(trimmed ? "valid" : "invalid");
      let icon3 = apellidoTrimItem.querySelector(".apellido-criteria-icon");
      if (icon3) icon3.textContent = trimmed ? "✔" : "✖";
    }
    apellidoInput.addEventListener("focus", () => {
      updateApellidoCriteriaUI(apellidoInput.value || "");
    });
    apellidoInput.addEventListener("blur", () => {
      apellidoCriteriaList.style.display = "none";
    });
    apellidoInput.addEventListener("input", (e) => {
      updateApellidoCriteriaUI(e.target.value || "");
    });
  }
  // Email: criterios dinámicos
  const emailInput = document.getElementById("create-email");
  const emailCriteriaList = document.getElementById("createEmailCriteria");
  const emailValidItem = document.getElementById("createEmailValidCriteria");
  const emailDomainItem = document.getElementById("createEmailDomainCriteria");
  if (emailInput && emailCriteriaList && emailValidItem && emailDomainItem) {
    // Dominios temporales comunes (puedes ampliar la lista)
    const tempDomains = [
      "mailinator.com",
      "tempmail.com",
      "10minutemail.com",
      "guerrillamail.com",
      "yopmail.com",
    ];
    function isValidEmail(email) {
      // Regex simple para email válido
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    function isAllowedDomain(email) {
      const domain = (email.split("@")[1] || "").toLowerCase();
      if (!domain) return false;
      return !tempDomains.some((tmp) => domain.endsWith(tmp));
    }
    function updateEmailCriteriaUI(email) {
      // Mostrar/ocultar lista
      emailCriteriaList.style.display = email ? "block" : "none";
      // Criterio 1: formato válido
      const valid = isValidEmail(email);
      emailValidItem.classList.remove("valid", "invalid");
      emailValidItem.classList.add(valid ? "valid" : "invalid");
      let icon1 = emailValidItem.querySelector(".email-criteria-icon");
      if (icon1) icon1.textContent = valid ? "✔" : "✖";
      // Criterio 2: dominio permitido
      const allowed = valid && isAllowedDomain(email);
      emailDomainItem.classList.remove("valid", "invalid");
      emailDomainItem.classList.add(allowed ? "valid" : "invalid");
      let icon2 = emailDomainItem.querySelector(".email-criteria-icon");
      if (icon2) icon2.textContent = allowed ? "✔" : "✖";
    }
    emailInput.addEventListener("focus", () => {
      updateEmailCriteriaUI(emailInput.value || "");
    });
    emailInput.addEventListener("blur", () => {
      emailCriteriaList.style.display = "none";
    });
    emailInput.addEventListener("input", (e) => {
      updateEmailCriteriaUI(e.target.value || "");
    });
  }
  // Mostrar/ocultar contraseña en modal crear usuario
  const pwInput = document.getElementById("create-password");
  const pwToggle = document.getElementById("create-password-toggle");
  if (pwInput && pwToggle) {
    pwToggle.addEventListener("click", function (e) {
      e.preventDefault();
      const isHidden = pwInput.type === "password";
      pwInput.type = isHidden ? "text" : "password";
      // Cambiar icono
      const icon = pwToggle.querySelector("i");
      if (icon) {
        icon.classList.toggle("fa-eye");
        icon.classList.toggle("fa-eye-slash");
      }
      pwToggle.setAttribute(
        "aria-label",
        isHidden ? "Ocultar contraseña" : "Mostrar contraseña"
      );
    });
  }
  // Asegura que el contenedor de mensajes exista (si se usa admin-common.js)
  if (typeof ensureAdminMessageContainer === "function") {
    ensureAdminMessageContainer();
  }

  // Carga inicial de usuarios
  loadUsuarios();
  // Inicializar manejo de modales y delegación de botones
  initUserModals();
});

/**
 * Obtiene los encabezados de autenticación necesarios para las peticiones a la API.
 * @returns {HeadersInit} Un objeto con los encabezados, incluyendo el token de autorización.
 */
function getAuthHeaders() {
  const headers = {
    "Content-Type": "application/json",
  };
  const token = localStorage.getItem("token");
  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }
  // Si usas una API Key para rutas de admin, también se puede añadir aquí.
  if (window.API_KEY) {
    headers["x-api-key"] = window.API_KEY;
  }
  return headers;
}

// Estado de paginación global para la página
const usuariosPaginationState = {
  page: 1,
  limit: 10,
  // total puede ser null si el backend no lo devuelve — usamos lastCount para inferir
  total: null,
  lastCount: 0,
  isLoading: false,
};

/**
 * Carga la lista de usuarios desde la API y la renderiza en la tabla.
 */
async function loadUsuarios(
  page = usuariosPaginationState.page,
  limit = usuariosPaginationState.limit
) {
  const tbody = document.getElementById("usuarios-tbody");
  if (!tbody) return;

  // Normalizar página
  page = Math.max(1, Number(page) || 1);
  usuariosPaginationState.page = page;
  usuariosPaginationState.limit =
    Number(limit) || usuariosPaginationState.limit;
  usuariosPaginationState.isLoading = true;
  // mostrar fila de carga
  tbody.innerHTML =
    '<tr><td colspan="5" style="text-align: center;">Cargando usuarios...</td></tr>';
  // refrescar controles para que se muestren deshabilitados mientras cargamos
  renderPaginationControls();

  try {
    console.debug(
      `[admin-usuarios] fetch /api/usuarios?page=${page}&limit=${limit}`
    );
    const response = await fetch(`/api/usuarios?page=${page}&limit=${limit}`, {
      method: "GET",
      headers: getAuthHeaders(),
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.mensaje || "Error al cargar los usuarios.");
    }

    const data = await response.json();
    // data puede venir como { usuarios, total } o como array
    const usuarios = data.usuarios || data || [];
    usuariosPaginationState.page = Number(
      data.page || page || usuariosPaginationState.page
    );
    usuariosPaginationState.limit = Number(
      data.limit || limit || usuariosPaginationState.limit
    );
    // Si el backend nos devuelve total lo usamos; si no, lo dejamos como null y guardamos el count
    usuariosPaginationState.lastCount = Array.isArray(usuarios)
      ? usuarios.length
      : 0;
    usuariosPaginationState.total =
      typeof data.total !== "undefined" && data.total !== null
        ? Number(data.total)
        : null;

    console.debug("[admin-usuarios] datos recibidos", {
      page: usuariosPaginationState.page,
      limit: usuariosPaginationState.limit,
      total: usuariosPaginationState.total,
      lastCount: usuariosPaginationState.lastCount,
    });

    renderUsuarios(usuarios);
    usuariosPaginationState.isLoading = false;
    renderPaginationControls();
  } catch (error) {
    console.error("Error en loadUsuarios:", error);
    usuariosPaginationState.isLoading = false;
    renderPaginationControls();
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">${error.message}</td></tr>`;
  }
}

/**
 * Renderiza las filas de la tabla de usuarios.
 * @param {Array} usuarios - Un array de objetos de usuario.
 */
function renderUsuarios(usuarios) {
  const tbody = document.getElementById("usuarios-tbody");
  if (!tbody) return;

  if (usuarios.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align: center;">No se encontraron usuarios.</td></tr>';
    return;
  }

  tbody.innerHTML = usuarios.map((user) => createUserRow(user)).join("");
}

/** Renderiza los controles de paginación debajo de la tabla */
function renderPaginationControls() {
  const container = document.getElementById("usuarios-pagination");
  if (!container) return;
  const { page, limit, total, lastCount } = usuariosPaginationState;
  // Si total es null, el backend no lo devolvió; inferimos comportamiento usando lastCount
  let totalPages;
  if (total === null) {
    // Si el número de resultados devueltos alcanza el límite, asumimos que puede haber al menos otra página
    totalPages = lastCount === 0 ? 1 : lastCount === limit ? page + 1 : page;
  } else {
    totalPages = Math.max(1, Math.ceil(total / limit));
  }

  let html = "";
  html += `<button class="btn-outline" data-pg="prev" ${
    page <= 1 ? "disabled" : ""
  }>Anterior</button>`;

  // Si no conocemos total, mostramos controles simplificados: página anterior (si aplica), página actual, posible siguiente
  if (total === null) {
    if (page > 1) {
      html += `<button class="btn-outline" data-pg="${page - 1}">${
        page - 1
      }</button>`;
    }
    html += `<button class="btn-outline" data-pg="${page}" aria-current="page" style="background:var(--admin-accent-color); color:#072034;">${page}</button>`;
    if (lastCount === limit) {
      html += `<button class="btn-outline" data-pg="${page + 1}">${
        page + 1
      }</button>`;
    }
  } else {
    // Mostramos hasta 5 botones centrados en la página actual
    const maxButtons = 5;
    let start = Math.max(1, page - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);
    for (let p = start; p <= end; p++) {
      html += `<button class="btn-outline" data-pg="${p}" ${
        p === page
          ? 'aria-current="page" style="background:var(--admin-accent-color); color:#072034;"'
          : ""
      }>${p}</button>`;
    }
  }

  html += `<button class="btn-outline" data-pg="next" ${
    page >= totalPages ? "disabled" : ""
  }>Siguiente</button>`;

  container.innerHTML = html;

  // attach events
  console.debug("[admin-usuarios] renderPaginationControls state=", {
    page,
    limit,
    total,
    lastCount,
    isLoading: usuariosPaginationState.isLoading,
    totalPages,
  });
  container.querySelectorAll("button[data-pg]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const v = btn.getAttribute("data-pg");
      console.debug("[admin-usuarios] pagination click", {
        v,
        state: usuariosPaginationState,
      });
      // si estamos cargando, ignorar clicks
      if (usuariosPaginationState.isLoading) return;
      if (v === "prev") {
        if (usuariosPaginationState.page > 1) {
          usuariosPaginationState.page -= 1;
          loadUsuarios(
            usuariosPaginationState.page,
            usuariosPaginationState.limit
          );
        }
      } else if (v === "next") {
        // calcular página máxima disponible: usar total si está, o permitir avanzar si lastCount === limit
        const { total, lastCount, limit } = usuariosPaginationState;
        const maxIfKnown = total ? Math.ceil(total / limit) : null;
        const canAdvance = maxIfKnown
          ? usuariosPaginationState.page < maxIfKnown
          : lastCount === limit;
        if (canAdvance) {
          usuariosPaginationState.page = usuariosPaginationState.page + 1;
          loadUsuarios(
            usuariosPaginationState.page,
            usuariosPaginationState.limit
          );
        }
      } else {
        const np = Number(v);
        if (!isNaN(np) && np !== usuariosPaginationState.page) {
          usuariosPaginationState.page = np;
          loadUsuarios(
            usuariosPaginationState.page,
            usuariosPaginationState.limit
          );
        }
      }
    });
  });

  // mientras isLoading true, deshabilitar botones
  if (usuariosPaginationState.isLoading) {
    container
      .querySelectorAll("button")
      .forEach((b) => b.setAttribute("disabled", ""));
  }
}

// manejar cambios de tamaño de página
document.addEventListener("DOMContentLoaded", function () {
  const pageSize = document.getElementById("usuarios-page-size");
  if (pageSize) {
    pageSize.addEventListener("change", function () {
      usuariosPaginationState.limit = Number(this.value) || 10;
      usuariosPaginationState.page = 1;
      // cuando cambia el tamaño de página, invalidamos total conocido para forzar recálculo desde el servidor
      usuariosPaginationState.total = null;
      loadUsuarios(usuariosPaginationState.page, usuariosPaginationState.limit);
    });
  }
});

/**
 * Crea el HTML para una fila de la tabla de un usuario.
 * @param {object} user - El objeto del usuario.
 * @returns {string} El string HTML para la fila (<tr>).
 */
function createUserRow(user) {
  const nombreCompleto = `${user.nombre || ""} ${user.apellido || ""}`.trim();
  const avatarUrl =
    user.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      nombreCompleto || user.email
    )}&background=random`;
  const roles = (user.roles || []).join(", ") || "usuario";
  const estado = user.estado || "inactivo";

  return `
    <tr data-user-id="${user._id}" data-nombre="${escapeHtml(
    user.nombre || ""
  )}" data-apellido="${escapeHtml(user.apellido || "")}" ${
    user.infoExperto
      ? `data-info-experto='${escapeHtml(JSON.stringify(user.infoExperto))}'`
      : ""
  }>
      <td>
        <div class="user-info">
          <img src="${avatarUrl}" alt="Avatar de ${nombreCompleto}" class="clientes-avatar" />
          <div class="user-details">
            <h4>${nombreCompleto}</h4>
            <span class="user-sub">ID: ${user._id.slice(-6)}</span>
          </div>
        </div>
      </td>
      <td>${user.email || "-"}</td>
      <td>${roles}</td>
      <td>
        <span class="status ${
          estado === "activo" ? "active" : "inactive"
        }">${estado}</span>
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon" data-action="view" title="Ver perfil"><i class="fas fa-eye"></i></button>
          <button class="btn-icon" data-action="edit" title="Editar"><i class="fas fa-edit"></i></button>
          ${
            estado === "activo"
              ? `<button class="btn-icon" data-action="delete" title="Inactivar"><i class="fas fa-toggle-off"></i></button>`
              : `<button class="btn-icon" data-action="delete" title="Activar"><i class="fas fa-toggle-off"></i></button>`
          }
        </div>
      </td>
    </tr>
  `;
}

// Helper simple para escapar texto cuando inyectamos JSON en atributos
function escapeHtml(str) {
  if (str === null || typeof str === "undefined") return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// -----------------------
// Modales y comportamiento
// -----------------------
/**
 * Abre un modal por su ID con animaciones CSS
 * @param {string} id - ID del modal a abrir
 */
function openModalById(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.setAttribute("aria-hidden", "false");
  m.style.display = "block";
  // small delay to allow the browser to apply display before starting transition
  requestAnimationFrame(() => {
    m.classList.add("active");
  });
  document.body.classList.add("modal-open");
}

/**
 * Cierra un modal buscando el elemento .admin-modal más cercano
 * @param {HTMLElement} el - Elemento dentro del modal (ej: botón con data-close)
 */
function closeModalByElement(el) {
  if (!el) return;
  const m = el.closest(".admin-modal");
  if (!m) return;
  m.classList.remove("active");
  m.setAttribute("aria-hidden", "true");
  // wait for CSS transition to finish before hiding the element
  setTimeout(() => {
    m.style.display = "none";
  }, 260);
  document.body.classList.remove("modal-open");
}

/**
 * Cierra un modal por su ID con animaciones CSS
 * @param {string} id - ID del modal a cerrar
 */
function closeModalById(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove("active");
  m.setAttribute("aria-hidden", "true");
  setTimeout(() => {
    m.style.display = "none";
  }, 260);
  document.body.classList.remove("modal-open");
}

function initUserModals() {
  // Inicialización: ocultar modales que puedan estar visibles por estilos inline y ocultar elementos de error/criterios
  try {
    const modals = [
      document.getElementById("modalCreateUser"),
      document.getElementById("modalViewUser"),
      document.getElementById("modalEditUser"),
    ];
    modals.forEach((m) => {
      if (!m) return;
      m.style.display = "none";
      m.setAttribute("aria-hidden", "true");
      m.classList.remove("active");
    });
  } catch (err) {}

  // ocultar errores de creación y criterios por defecto
  try {
    const errs = [
      "create-nombre-error",
      "create-apellido-error",
      "create-email-error",
      "create-password-error",
    ];
    errs.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.display = "none";
      el.textContent = "";
    });
    const crit = document.getElementById("createPasswordCriteria");
    if (crit) crit.style.display = "none";
  } catch (err) {}

  // Delegación en el tbody para acciones (ver/editar/eliminar)
  const tbody = document.getElementById("usuarios-tbody");
  if (tbody && !tbody.__userDelegation) {
    tbody.__userDelegation = true;
    tbody.addEventListener("click", function (e) {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      // debug
      try {
        console.debug(
          "[admin-usuarios] tbody click action=",
          btn.getAttribute("data-action")
        );
      } catch (e) {}
      const action = btn.getAttribute("data-action");
      const row = btn.closest("tr");
      if (!row) return;
      const cols = row.children;
      const nombre = cols[0] ? cols[0].innerText.trim() : "";
      const email = cols[1] ? cols[1].innerText.trim() : "";
      const roles = cols[2] ? cols[2].innerText.trim() : "";
      const estado = cols[3] ? cols[3].innerText.trim() : "";

      if (action === "view") {
        const viewNombre = document.getElementById("view-nombre");
        const viewEmail = document.getElementById("view-email");
        const viewRoles = document.getElementById("view-roles");
        const viewEstado = document.getElementById("view-estado");
        const viewAvatar = document.getElementById("view-avatar");
        if (viewNombre) viewNombre.innerText = nombre;
        if (viewEmail) viewEmail.innerText = email;
        if (viewRoles) viewRoles.innerText = roles;
        if (viewEstado) viewEstado.innerText = estado;
        const img = row.querySelector("img");
        if (viewAvatar) viewAvatar.src = img ? img.src : "";
        // infoExperto
        const infoExp = row.getAttribute("data-info-experto") || "";
        if (infoExp) {
          try {
            const parsed = JSON.parse(infoExp);
            const descEl = document.getElementById("view-descripcion");
            const catsEl = document.getElementById("view-categorias");
            const infoWrap = document.getElementById("view-infoExperto");
            if (descEl) descEl.innerText = parsed.descripcion || "";
            if (catsEl) catsEl.innerText = (parsed.categorias || []).join(", ");
            if (infoWrap) infoWrap.style.display = "";
          } catch (err) {
            const infoWrap = document.getElementById("view-infoExperto");
            if (infoWrap) infoWrap.style.display = "none";
          }
        }
        openModalById("modalViewUser");
      }

      if (action === "edit") {
        const editId = document.getElementById("edit-user-id");
        const editNombre = document.getElementById("edit-nombre");
        const editApellido = document.getElementById("edit-apellido");
        const editEmail = document.getElementById("edit-email");
        const editRoles = document.getElementById("edit-roles");
        const editEstado = document.getElementById("edit-estado");
        if (editId) editId.value = row.getAttribute("data-user-id") || "";
        // Preferir dataset con nombre y apellido (más fiable que parsear el h4)
        const dataNombre = row.getAttribute("data-nombre");
        const dataApellido = row.getAttribute("data-apellido");
        if (editNombre) {
          if (dataNombre || dataNombre === "") {
            editNombre.value = dataNombre || "";
          } else {
            const fallback = (nombre || "").split("\n")[0] || "";
            const first = fallback.split(" ").filter(Boolean)[0] || "";
            editNombre.value = first;
          }
        }
        if (editApellido) {
          if (dataApellido || dataApellido === "") {
            editApellido.value = dataApellido || "";
          } else {
            const parts = (nombre || "").split("\n")[0] || "";
            const nameParts = parts.split(" ").filter(Boolean);
            editApellido.value =
              nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
          }
        }
        if (editEmail) editEmail.value = email || "";
        if (editRoles) editRoles.value = roles || "";
        if (editEstado) editEstado.value = estado || "activo";
        // Marcar en el modal si existía infoExperto (para uso posterior al guardar)
        const infoExp = row.getAttribute("data-info-experto");
        const modal = document.getElementById("modalEditUser");
        if (modal) modal.dataset.hadInfoExperto = infoExp ? "1" : "0";
        openModalById("modalEditUser");
      }

      if (action === "delete") {
        // Toggle estado instead of deleting user
        const current = (estado || "").toLowerCase();
        const nuevoEstado = current === "activo" ? "inactivo" : "activo";
        const promptMsg =
          nuevoEstado === "inactivo"
            ? "¿Desactivar usuario?"
            : "¿Activar usuario?";
        if (!confirm(promptMsg)) return;
        const emailEnc = encodeURIComponent(email);
        const headers = getAuthHeaders();
        const payload = { estado: nuevoEstado };
        fetch("/api/usuarios/" + emailEnc, {
          method: "PUT",
          credentials: "same-origin",
          headers,
          body: JSON.stringify(payload),
        })
          .then(async (r) => {
            const body = await r.json().catch(() => null);
            if (r.ok) {
              // recargar lista para mostrar estado actualizado
              try {
                loadUsuarios(
                  usuariosPaginationState.page,
                  usuariosPaginationState.limit
                );
              } catch (e) {}
            } else {
              alert(
                "Error al actualizar estado: " +
                  (body && body.mensaje ? body.mensaje : JSON.stringify(body))
              );
            }
          })
          .catch((err) => {
            console.error(err);
            alert("Error actualizando estado del usuario");
          });
      }
    });
  }

  // Delegación a nivel de documento (cubre casos donde el evento no llega al tbody)
  if (!document.__userDelegationGlobal) {
    document.__userDelegationGlobal = true;
    document.addEventListener("click", function (e) {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      // Si el manejador del tbody ya procesó el evento, esto seguirá siendo idempotente
      try {
        console.debug(
          "[admin-usuarios] document click action=",
          btn.getAttribute("data-action")
        );
      } catch (e) {}
      // Reutilizar el mismo comportamiento: simular un click en el tbody para aprovechar la misma ruta de código llamando al manejador directamente
      // Buscaremos la fila más cercana y aplicaremos la misma lógica en línea
      const row = btn.closest("tr");
      if (!row) return;
      const cols = row.children;
      const nombre = cols[0] ? cols[0].innerText.trim() : "";
      const email = cols[1] ? cols[1].innerText.trim() : "";
      const roles = cols[2] ? cols[2].innerText.trim() : "";
      const estado = cols[3] ? cols[3].innerText.trim() : "";
      const action = btn.getAttribute("data-action");
      // manejar acciones (duplicado del manejador del tbody)
      if (action === "view") {
        const viewNombre = document.getElementById("view-nombre");
        const viewEmail = document.getElementById("view-email");
        const viewRoles = document.getElementById("view-roles");
        const viewEstado = document.getElementById("view-estado");
        const viewAvatar = document.getElementById("view-avatar");
        if (viewNombre) viewNombre.innerText = nombre;
        if (viewEmail) viewEmail.innerText = email;
        if (viewRoles) viewRoles.innerText = roles;
        if (viewEstado) viewEstado.innerText = estado;
        const img = row.querySelector("img");
        if (viewAvatar) viewAvatar.src = img ? img.src : "";
        openModalById("modalViewUser");
        return;
      }
      if (action === "edit") {
        const editId = document.getElementById("edit-user-id");
        const editNombre = document.getElementById("edit-nombre");
        const editApellido = document.getElementById("edit-apellido");
        const editEmail = document.getElementById("edit-email");
        const editRoles = document.getElementById("edit-roles");
        const editEstado = document.getElementById("edit-estado");
        if (editId) editId.value = row.getAttribute("data-user-id") || "";
        const parts = (nombre || "").split("\n")[0] || nombre;
        const nameParts = parts.split(" ").filter(Boolean);
        if (editNombre)
          editNombre.value = nameParts.length > 0 ? nameParts[0] : "";
        if (editApellido)
          editApellido.value =
            nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
        if (editEmail) editEmail.value = email || "";
        if (editRoles) editRoles.value = roles || "";
        if (editEstado) editEstado.value = estado || "activo";
        openModalById("modalEditUser");
        return;
      }
      if (action === "delete") {
        // Toggle estado instead of deleting user (document-level handler)
        const current = (estado || "").toLowerCase();
        const nuevoEstado = current === "activo" ? "inactivo" : "activo";
        const promptMsg =
          nuevoEstado === "inactivo"
            ? "¿Desactivar usuario?"
            : "¿Activar usuario?";
        if (!confirm(promptMsg)) return;
        const emailEnc = encodeURIComponent(email);
        const headers = getAuthHeaders();
        const payload = { estado: nuevoEstado };
        fetch("/api/usuarios/" + emailEnc, {
          method: "PUT",
          credentials: "same-origin",
          headers,
          body: JSON.stringify(payload),
        })
          .then(async (r) => {
            const body = await r.json().catch(() => null);
            if (r.ok) {
              try {
                loadUsuarios(
                  usuariosPaginationState.page,
                  usuariosPaginationState.limit
                );
              } catch (e) {}
            } else {
              alert(
                "Error al actualizar estado: " +
                  (body && body.mensaje ? body.mensaje : JSON.stringify(body))
              );
            }
          })
          .catch((err) => {
            console.error(err);
            alert("Error actualizando estado del usuario");
          });
      }
    });
  }

  // Cierre de modales por botones data-close
  document.addEventListener("click", function (e) {
    const cl = e.target.closest("[data-close]");
    if (cl) {
      closeModalByElement(cl);
    }
  });

  // Abrir modal Nuevo Cliente cuando se pulsa el botón superior
  const btnAddUser = document.getElementById("btnAddUser");
  if (btnAddUser) {
    btnAddUser.addEventListener("click", function () {
      openModalById("modalCreateUser");
    });
  }

  // Sanitización y bloqueo en tiempo real para los campos de nombre/apellido del modal Crear Usuario
  (function setupCreateNameSanitizers() {
    const crearNombreEl = document.getElementById("create-nombre");
    const crearApellidoEl = document.getElementById("create-apellido");
    if (!crearNombreEl && !crearApellidoEl) return;

    function allowOnlyNameChars(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const allowed = /[A-Za-zÁÉÍÓÚáéíóúÑñ ]/;
      const key = e.key || String.fromCharCode(e.which || e.keyCode || 0);
      if (key && key.length === 1 && !allowed.test(key)) {
        e.preventDefault();
      }
    }

    function sanitizePastedName(e) {
      const text =
        (e.clipboardData || window.clipboardData).getData("text") || "";
      const clean = text.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ]/g, "");
      e.preventDefault();
      const el = e.target;
      const start = el.selectionStart || 0;
      const end = el.selectionEnd || 0;
      const value = el.value || "";
      el.value = value.slice(0, start) + clean + value.slice(end);
      try {
        el.setSelectionRange(start + clean.length, start + clean.length);
      } catch (err) {}
    }

    function addSanitizers(el) {
      if (!el) return;
      el.addEventListener("keypress", allowOnlyNameChars);
      el.addEventListener("paste", sanitizePastedName);
      // input cleanup
      let timer = null;
      el.addEventListener("input", function (e) {
        const target = e.target;
        clearTimeout(timer);
        timer = setTimeout(() => {
          const before = target.value || "";
          const cleaned = before.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ]/g, "");
          if (cleaned !== before) {
            const pos = target.selectionStart || 0;
            target.value = cleaned;
            try {
              const newPos = Math.max(
                0,
                pos - (before.length - cleaned.length)
              );
              target.setSelectionRange(newPos, newPos);
            } catch (err) {}
          }
        }, 0);
      });
      // composition handling (IME)
      el.addEventListener("compositionstart", () => (el.__composing = true));
      el.addEventListener("compositionend", function (e) {
        el.__composing = false;
        const before = el.value || "";
        const cleaned = before.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ '\-]/g, "");
        if (cleaned !== before) el.value = cleaned;
      });
      // beforeinput to block advanced insertions
      el.addEventListener("beforeinput", function (e) {
        try {
          const data = e.data || "";
          if (/[^A-Za-zÁÉÍÓÚáéíóúÑñ ]/.test(data)) {
            e.preventDefault();
          }
        } catch (err) {}
      });
    }

    addSanitizers(crearNombreEl);
    addSanitizers(crearApellidoEl);
  })();

  // Crear usuario desde modal (delegado para soportar modal insertado después de cargar el script)
  if (!document.__adminUsuariosCreateDelegated) {
    document.__adminUsuariosCreateDelegated = true;
    document.addEventListener("click", function (e) {
      const target = e.target.closest("#btnCreateUser");
      if (!target) return;
      e.preventDefault();

      const nombreEl = document.getElementById("create-nombre");
      const apellidoEl = document.getElementById("create-apellido");
      const emailEl = document.getElementById("create-email");
      const passwordEl = document.getElementById("create-password");
      const rolesEl = document.getElementById("create-roles");
      const estadoEl = document.getElementById("create-estado");

      // limpieza defensiva de nombres (eliminar dígitos u otros caracteres no permitidos)
      try {
        if (nombreEl)
          nombreEl.value = (nombreEl.value || "")
            .replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ '\-]/g, "")
            .trim();
        if (apellidoEl)
          apellidoEl.value = (apellidoEl.value || "")
            .replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ '\-]/g, "")
            .trim();
      } catch (err) {}

      const nombre = nombreEl ? nombreEl.value.trim() : "";
      const apellido = apellidoEl ? apellidoEl.value.trim() : "";
      const email = emailEl ? emailEl.value.trim() : "";
      const password = passwordEl ? passwordEl.value : "";
      const roles = rolesEl
        ? (rolesEl.value || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      const estado = (estadoEl && estadoEl.value) || "activo";

      // Validaciones inline
      const namePattern = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s'\-]+$/;
      let hasErr = false;
      // limpiar mensajes previos
      const setError = (id, msg) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = msg;
        el.style.display = "block";
      };
      const clearError = (id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = "";
        el.style.display = "none";
      };
      [
        "create-nombre-error",
        "create-apellido-error",
        "create-email-error",
        "create-password-error",
      ].forEach(clearError);

      if (!nombre || !namePattern.test(nombre)) {
        setError(
          "create-nombre-error",
          "Nombre inválido. Solo letras, espacios, guiones o apóstrofes."
        );
        if (nombreEl) nombreEl.classList.add("invalid");
        hasErr = true;
      }
      if (!apellido || !namePattern.test(apellido)) {
        setError(
          "create-apellido-error",
          "Apellido inválido. Solo letras, espacios, guiones o apóstrofes."
        );
        if (apellidoEl) apellidoEl.classList.add("invalid");
        hasErr = true;
      }
      if (!email || !email.includes("@")) {
        setError("create-email-error", "Correo inválido. Debe incluir un '@'.");
        if (emailEl) emailEl.classList.add("invalid");
        hasErr = true;
      }
      if (!password) {
        setError("create-password-error", "La contraseña es obligatoria.");
        if (passwordEl) passwordEl.classList.add("invalid");
        hasErr = true;
      }
      // Validar contraseña con PasswordUtils si está disponible
      if (password) {
        const pwCriteriaList = document.getElementById(
          "createPasswordCriteria"
        );
        const pwNodes = {
          minLengthItem: document.getElementById("createMinLengthCriteria"),
          uppercaseItem: document.getElementById("createUppercaseCriteria"),
          lowercaseItem: document.getElementById("createLowercaseCriteria"),
          numberItem: document.getElementById("createNumberCriteria"),
        };
        if (window.PasswordUtils) {
          if (!window.PasswordUtils.isPasswordValid(password)) {
            setError(
              "create-password-error",
              "La contraseña no cumple los requisitos (mínimo 8, mayúscula, minúscula y número)."
            );
            if (passwordEl) passwordEl.classList.add("invalid");
            hasErr = true;
          }
        } else {
          if (password.length < 8) {
            setError(
              "create-password-error",
              "La contraseña debe tener al menos 8 caracteres."
            );
            if (passwordEl) passwordEl.classList.add("invalid");
            hasErr = true;
          }
        }
        // mostrar criterios si existen
        if (pwCriteriaList) {
          pwCriteriaList.style.display = password ? "block" : "none";
          if (window.PasswordUtils)
            window.PasswordUtils.updateCriteriaNodes(password, pwNodes);
        }
      }
      if (hasErr) return;

      // UX: deshabilitar botón para evitar envíos duplicados
      const btn = target;
      if (btn) btn.setAttribute("disabled", "");

      const payload = { nombre, apellido, email, password, roles, estado };
      const headers = getAuthHeaders();

      console.debug("[admin-usuarios] crear usuario payload=", payload);

      fetch("/api/usuarios/registro", {
        method: "POST",
        credentials: "same-origin",
        headers,
        body: JSON.stringify(payload),
      })
        .then(async (r) => {
          const body = await r.json().catch(() => null);
          console.debug(
            "[admin-usuarios] crear usuario response",
            r.status,
            body
          );
          if (!r.ok) {
            throw new Error((body && body.mensaje) || r.status);
          }
          // mostrar mensaje de éxito si el backend lo proporciona
          const successMsg =
            (body && body.mensaje) || "Usuario creado correctamente.";
          try {
            alert(successMsg);
          } catch (e) {
            console.log(successMsg);
          }

          // cerrar modal: intentar varias vías
          if (typeof closeModalById === "function") {
            closeModalById("modalCreateUser");
          } else if (typeof closeModalByElement === "function") {
            const modal = document.getElementById("modalCreateUser");
            if (modal)
              closeModalByElement(modal.querySelector("[data-close]") || modal);
          } else {
            const modal = document.getElementById("modalCreateUser");
            if (modal) {
              modal.classList.remove("active");
              modal.setAttribute("aria-hidden", "true");
              modal.style.display = "none";
              document.body.classList.remove("modal-open");
            }
          }

          // recargar la lista (volver a la primera página)
          usuariosPaginationState.page = 1;
          loadUsuarios(1, usuariosPaginationState.limit);
        })
        .catch((err) => {
          console.error("Error creando usuario", err);
          alert(
            "Error creando usuario: " + (err && err.message ? err.message : err)
          );
        })
        .finally(() => {
          if (btn) btn.removeAttribute("disabled");
        });
    });
  }

  // password criteria UI para modal Crear Usuario
  (function setupCreatePasswordUI() {
    const passwordEl = document.getElementById("create-password");
    const criteriaList = document.getElementById("createPasswordCriteria");
    const nodes = {
      minLengthItem: document.getElementById("createMinLengthCriteria"),
      uppercaseItem: document.getElementById("createUppercaseCriteria"),
      lowercaseItem: document.getElementById("createLowercaseCriteria"),
      numberItem: document.getElementById("createNumberCriteria"),
    };
    if (!passwordEl || !criteriaList) return;
    criteriaList.style.display = "none";
    function updateCriteriaUI(pw) {
      // Criterios
      const minLen = pw.length >= 8;
      const hasUpper = /[A-Z]/.test(pw);
      const hasLower = /[a-z]/.test(pw);
      const hasNum = /[0-9]/.test(pw);
      // Array de criterios: [nodo, cumplido, texto]
      const criterios = [
        [nodes.minLengthItem, minLen, "Mínimo 8 caracteres"],
        [nodes.uppercaseItem, hasUpper, "Al menos una mayúscula"],
        [nodes.lowercaseItem, hasLower, "Al menos una minúscula"],
        [nodes.numberItem, hasNum, "Al menos un número"],
      ];
      criterios.forEach(([li, cumple, texto]) => {
        if (!li) return;
        li.classList.remove("valid", "invalid");
        li.classList.add(cumple ? "valid" : "invalid");
        // Icono: buscar el span.pw-criteria-icon dentro del li
        let iconSpan = li.querySelector(".pw-criteria-icon");
        if (!iconSpan) {
          iconSpan = document.createElement("span");
          iconSpan.className = "pw-criteria-icon";
          li.prepend(iconSpan);
        }
        iconSpan.textContent = cumple ? "✔" : "✖";
        // Texto descriptivo
        // Si el li tiene más nodos, solo actualiza el texto después del icono
        // Elimina nodos de texto extra
        let textNode = li.childNodes[1];
        if (!textNode || textNode.nodeType !== 3) {
          // Si no hay nodo de texto, crea uno
          textNode = document.createTextNode("");
          li.appendChild(textNode);
        }
        textNode.textContent = " " + texto;
      });
    }
    passwordEl.addEventListener("focus", () => {
      criteriaList.style.display = "block";
      updateCriteriaUI(passwordEl.value || "");
    });
    passwordEl.addEventListener("blur", () => {
      criteriaList.style.display = "none";
    });
    passwordEl.addEventListener("input", (e) => {
      criteriaList.style.display = "block";
      updateCriteriaUI(e.target.value || "");
    });
  })();

  // Guardar edición
  const saveBtn = document.getElementById("btnSaveEditUser");
  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      const id = document.getElementById("edit-user-id").value;
      const email = document.getElementById("edit-email").value;
      // normalize name fields: trim and collapse multiple spaces
      const rawNombre = document.getElementById("edit-nombre").value || "";
      const rawApellido = document.getElementById("edit-apellido").value || "";
      const nombre = rawNombre.replace(/\s+/g, " ").trim();
      const apellido = rawApellido.replace(/\s+/g, " ").trim();
      const roles = document
        .getElementById("edit-roles")
        .value.split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const estado = document.getElementById("edit-estado").value;

      const payload = { nombre, apellido, roles, estado };

      // If the row previously had infoExperto but now the roles don't include 'experto',
      // explicitly send infoExperto with empty arrays so the backend can clear it.
      const modal = document.getElementById("modalEditUser");
      const hadInfoExperto =
        modal && modal.dataset && modal.dataset.hadInfoExperto === "1";
      const isNowExperto = roles.includes("experto");
      if (hadInfoExperto && !isNowExperto) {
        payload.infoExperto = { categorias: [], skills: [] };
      }

      // Also ensure that if the modal previously had no infoExperto but the roles include experto,
      // we don't accidentally send undefined fields; however if admin wants to clear categorias/skills
      // they should send explicit empties — provide a simple UI behaviour: if infoExperto existed, always
      // include categorias/skills keys (even as empty arrays) to reflect intent.
      if (hadInfoExperto && isNowExperto) {
        // if admin removed categorias/skills from UI (not present inputs), send empty arrays to clear
        if (!payload.infoExperto) payload.infoExperto = {};
        if (
          !Object.prototype.hasOwnProperty.call(
            payload.infoExperto,
            "categorias"
          )
        )
          payload.infoExperto.categorias = [];
        if (
          !Object.prototype.hasOwnProperty.call(payload.infoExperto, "skills")
        )
          payload.infoExperto.skills = [];
      }

      const headers = getAuthHeaders();
      // DEBUG: mostrar headers y payload para diagnosticar 403
      try {
        console.debug("PUT /api/usuarios/", encodeURIComponent(email), {
          headers,
          payload,
        });
      } catch (e) {}

      fetch("/api/usuarios/" + encodeURIComponent(email), {
        method: "PUT",
        credentials: "same-origin",
        headers,
        body: JSON.stringify(payload),
      })
        .then(async (r) => {
          const body = await r.json().catch(() => null);
          if (!r.ok) {
            try {
              console.warn(
                "PUT /api/usuarios/ response not ok",
                r.status,
                body
              );
            } catch (e) {}
            throw new Error((body && body.mensaje) || r.status);
          }
          // Recargar la lista desde el servidor para garantizar que la UI refleje exactamente
          // lo que quedó guardado en la base de datos (incluyendo borrado de infoExperto).
          try {
            usuariosPaginationState.page = usuariosPaginationState.page || 1;
            loadUsuarios(
              usuariosPaginationState.page,
              usuariosPaginationState.limit
            );
          } catch (e) {
            console.warn("Error al recargar usuarios tras guardar:", e);
          }

          // cerrar modal
          const closeEl = saveBtn.closest(".admin-modal");
          if (closeEl)
            closeModalByElement(
              closeEl.querySelector("[data-close]") || closeEl
            );
        })
        .catch((err) => {
          console.error(err);
          alert("Error guardando usuario: " + (err && err.message));
        });
    });
  }
}
