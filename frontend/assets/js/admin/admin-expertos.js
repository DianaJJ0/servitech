/**
 * @file admin-expertos.js
 * @description
 * Módulo autoejecutable que gestiona la visualización y la interacción de la
 * lista de "expertos" en la vista de administración. Proporciona utilidades para:
 * - parsear datos iniciales inyectados en el DOM (JSON dentro de elementos con id)
 * - escapar y formatear valores (escapeHtml, formatDate)
 * - normalizar campos de un objeto experto con distintas posibles rutas/propiedades
 *   (getExpertField)
 * - renderizar filas de una tabla con paginación y controles (renderRows,
 *   createExpertRow, updatePagination)
 * - enlazar eventos de fila y paginación (bindRowActions, bindPaginationEvents)
 * - acciones sobre filas (ver, editar, inactivar) mediante modales simples
 *   (openModal, openModalView, openModalEdit, inactivateExpert)
 * - filtros por estado, categoría y búsqueda de texto (applyFilters)
 * - inicialización de selectores, controles "select all" y cierre de modales
 *   (populateCategories, initSelectAll, initModalClose, init)
 *
 * Datos consumidos:
 * - Elemento con id "initial-expertos": JSON con la lista completa de expertos.
 * - Elemento con id "categorias-data": JSON con lista de categorías.
 *
 * Estado interno relevante:
 * - allExperts: array con todos los expertos parseados desde el DOM.
 * - categorias: array con las categorías parseadas desde el DOM.
 * - categoriesMap: mapa id -> nombre para resolver nombres de categoría.
 * - filteredExperts: lista resultante tras aplicar filtros y búsqueda.
 * - currentPage: página actual para paginación.
 * - pageSize: tamaño de página (por defecto 10).
 * - headerSearch: referencia al input de búsqueda en la cabecera.
 *
 * Comportamiento clave:
 * - Al cargar el DOM se enlazan eventos de búsqueda y botones de filtros y se
 *   inicializa la UI (populateCategories, renderRows).
 * - La tabla se actualiza solo con la porción de datos correspondiente a la
 *   página actual; si no hay datos muestra una fila placeholder.
 * - Los botones de cada fila permiten ver/editar (muestran modales) o
 *   cambiar visualmente el estado a "inactive" (inactivateExpert).
 * - La función getExpertField permite manejar estructuras de datos heterogéneas
 *   (donde el mismo dato puede venir con nombres o rutas diferentes).
 *
 * Uso:
 * - Este script está pensado para incluirse en la vista administrativa y
 *   depender de que existan los elementos DOM mencionados (tabla con clase
 *   "admin-table", selectores de filtros, modales con ids adecuados).
 *
 * Notas:
 * - Los modales son gestionados mediante show/hide (display style) y se asume
 *   que existen inputs con ids formateados como `${campo}_${tipo}` (ej. name_view).
 * - La paginación es simple y muestra hasta las primeras 5 páginas, con una
 *   elipsis y la última página si hay más.
 */
// admin-expertos.js
// Render simple de la lista de expertos en la vista de admin.
(function () {
  "use strict";

  // ===== UTILIDADES =====
  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  // Mitigación temprana para problemas de autofill/placeholder dentro del modal de ver perfil del experto.
  // (movido desde un script inline en adminExpertos.ejs)
  (function () {
    try {
      var m = document.getElementById("verPerfilExperto");
      if (!m) return;
      var email = m.querySelector && m.querySelector("#email");
      if (!email) return;
      try {
        email.value = "";
        email.setAttribute("autocomplete", "off");
        email.setAttribute("autocorrect", "off");
        email.setAttribute("autocapitalize", "off");
        email.setAttribute("spellcheck", "false");
        email.readOnly = true;
        var sec =
          getComputedStyle(document.documentElement).getPropertyValue(
            "--admin-text-secondary"
          ) || "#8892a6";
        try {
          email.style.setProperty("color", sec, "important");
        } catch (e) {}
        try {
          email.style.setProperty("-webkit-text-fill-color", sec, "important");
        } catch (e) {}
        setTimeout(function () {
          try {
            email.readOnly = false;
          } catch (e) {}
        }, 80);
      } catch (e) {}
    } catch (e) {}
  })();

  // Inicializar datos del usuario autenticado de forma segura
  // (movido desde un script inline en adminExpertos.ejs)
  (function () {
    try {
      var raw =
        (document.getElementById("current-user-data") &&
          document.getElementById("current-user-data").textContent) ||
        "{}";
      window.currentUser = JSON.parse(raw);
      window.authToken =
        window.currentUser && window.currentUser.token
          ? window.currentUser.token
          : "";
    } catch (e) {
      window.currentUser = {};
      window.authToken = "";
    }
  })();

  function $$(sel, ctx) {
    return Array.from((ctx || document).querySelectorAll(sel));
  }
  // Mitigar posibles problemas de autofill en el input email justo antes de mostrar
  try {
    mitigateAutofillForModal("verPerfilExperto");
  } catch (e) {}

  function parseJsonId(id) {
    try {
      const el = document.getElementById(id);
      return el ? JSON.parse(el.textContent || "[]") : [];
    } catch (e) {
      console.warn("parseJsonId error", id, e);
      return [];
    }
  }

  function escapeHtml(s) {
    if (s === undefined || s === null) return "";
    return String(s).replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[m])
    );
  }

  function formatDate(d) {
    if (!d) return "-";
    const dt = new Date(d);
    return isNaN(dt) ? "-" : dt.toLocaleDateString();
  }

  // Mitigación para evitar autofill en inputs email dentro de modales.
  // Se define en el ámbito superior para poder invocarla desde openModal cuando se abre
  // un modal en particular (por ejemplo el modal de ver perfil). Esto es más fiable
  // que ejecutarlo en DOMContentLoaded porque garantiza que el modal exista al aplicar los cambios.
  function mitigateAutofillForModal(modalId) {
    try {
      const m = document.getElementById(modalId);
      if (!m) return;
      // Buscar el input email dentro del modal de forma robusta
      const email =
        m.querySelector('input[type="email"]') ||
        m.querySelector('[id*="email"]');
      if (!email) return;
      try {
        email.value = "";
        email.setAttribute("autocomplete", "off");
        email.setAttribute("autocorrect", "off");
        email.setAttribute("autocapitalize", "off");
        email.setAttribute("spellcheck", "false");
        email.readOnly = true;
        const sec =
          getComputedStyle(document.documentElement).getPropertyValue(
            "--admin-text-secondary"
          ) || "#8892a6";
        try {
          email.style.setProperty("color", sec, "important");
        } catch (e) {}
        try {
          email.style.setProperty("-webkit-text-fill-color", sec, "important");
        } catch (e) {}
        setTimeout(function () {
          try {
            email.readOnly = false;
          } catch (e) {}
        }, 80);
      } catch (e) {}
    } catch (e) {}
  }

  // UTILIDADES COMPARTIDAS ADICIONALES
  function normalizeValue(v) {
    if (v === undefined || v === null) return null;
    if (typeof v === "object") {
      return (
        v.name || v.nombre || v.value || String(v.id || v._id || "") || null
      );
    }
    return String(v);
  }

  function stripAccents(str) {
    try {
      return String(str)
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim();
    } catch (e) {
      return String(str)
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim();
    }
  }

  function setSelectValue(selectEl, val) {
    if (!selectEl || val === null || val === undefined || val === "")
      return false;
    try {
      selectEl.value = val;
      if (String(selectEl.value) === String(val)) return true;

      const normalizedVal = stripAccents(String(val));
      const opt = Array.from(selectEl.options).find(
        (o) => stripAccents(o.textContent || "") === normalizedVal
      );
      if (opt) {
        selectEl.value = opt.value;
        return true;
      }

      const opt2 = Array.from(selectEl.options).find((o) =>
        stripAccents(o.textContent || "").includes(normalizedVal)
      );
      if (opt2) {
        selectEl.value = opt2.value;
        return true;
      }
    } catch (e) {}
    return false;
  }

  function isElementVisible(el) {
    try {
      if (!el) return false;
      const cs = getComputedStyle(el);
      if (!cs) return true;
      if (
        cs.display === "none" ||
        cs.visibility === "hidden" ||
        cs.opacity === "0"
      )
        return false;
      try {
        const rects = el.getClientRects();
        return rects && rects.length > 0;
      } catch (e) {
        return true;
      }
    } catch (e) {
      return true;
    }
  }

  function mapDocumentType(v) {
    if (v === null || v === undefined) return v;
    try {
      var s = String(v || "").toLowerCase();
      s = s
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9\s]/g, "")
        .trim();
    } catch (e) {
      var s = String(v || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .trim();
    }
    if (!s) return v;
    if (s === "cc" || s === "c_c" || s.indexOf("cedula") >= 0) return "cedula";
    if (s.indexOf("extranjer") >= 0 || s.indexOf("extran") >= 0)
      return "extranjeria";
    return v;
  }

  // Devuelve un array de nombres de categorías para un experto soportando
  // varias formas de datos: ['id1','id2'], [{_id:'', nombre:''}], ['Nombre'], etc.
  function getCategoryNamesForExpert(e, categoriesMap) {
    // revisar varias rutas comunes, incluyendo infoExperto.categorias (backend usa esta ruta)
    var raw =
      (e && e.categorias) ||
      (e && e.categoriasIds) ||
      (e && e.categories) ||
      (e && e.categoryIds) ||
      (e && e.infoExperto && e.infoExperto.categorias) ||
      (e && e.info && e.info.categorias) ||
      [];
    if (!Array.isArray(raw)) {
      if (raw === null || raw === undefined) raw = [];
      else raw = [raw];
    }
    var names = raw
      .map(function (item) {
        if (!item && item !== 0) return null;
        if (typeof item === "object") {
          // si el item es un objeto categoría, preferir su nombre
          return (
            item.nombre ||
            item.name ||
            item.label ||
            item._id ||
            item.id ||
            null
          );
        }
        // si el item es string/número: intentar resolver mediante categoriesMap primero
        var key = String(item);
        // ocultar categorías inactivas si conocemos su estado
        try {
          if (
            window.__categoriesStateMap &&
            window.__categoriesStateMap[key] &&
            window.__categoriesStateMap[key] !== "active"
          ) {
            return null;
          }
        } catch (e) {}
        return (
          (categoriesMap && (categoriesMap[key] || categoriesMap[item])) ||
          String(item)
        );
      })
      .filter(Boolean);
    return names;
  }

  // Devuelve un array de ids de categorías (strings) para un experto,
  // soportando estructuras variadas (objetos categoria o ids directos)
  function getCategoryIdsForExpert(e) {
    var raw =
      (e && e.categorias) ||
      (e && e.categoriasIds) ||
      (e && e.categories) ||
      (e && e.categoryIds) ||
      (e && e.infoExperto && e.infoExperto.categorias) ||
      (e && e.info && e.info.categorias) ||
      [];
    if (!Array.isArray(raw)) {
      if (raw === null || raw === undefined) raw = [];
      else raw = [raw];
    }
    return raw
      .map(function (item) {
        if (!item && item !== 0) return null;
        if (typeof item === "object") {
          return String(item._id || item.id || item.value || item);
        }
        return String(item);
      })
      .filter(Boolean);
  }

  // ===== GESTIÓN DE DATOS =====
  function getExpertField(expert, field) {
    const fieldMap = {
      id: ["_id", "id"],
      name: ["nombre", "name", "user.name"],
      email: ["email", "user.email"],
      price: ["precio", "price"],
      bio: ["bio", "descripcion"],
      categories: ["categorias", "categoriasIds"],
      status: ["estado", "status"],
      avatar: ["avatar", "profileImage", "avatarUrl"],
      sessions: ["sesiones", "sessions"],
      createdAt: ["createdAt", "registro", "created_at"],
    };

    const paths = fieldMap[field];
    if (!paths) return "";

    for (const path of paths) {
      if (path.includes(".")) {
        const [first, second] = path.split(".");
        if (expert[first] && expert[first][second])
          return expert[first][second];
      } else if (expert[path] !== undefined) {
        return expert[path];
      }
    }

    return field === "status" ? "inactive" : "";
  }

  function getStatusBadgeClass(status) {
    const statusClasses = {
      activo: "badge--active",
      "pendiente-verificacion": "badge--pending",
      inactivo: "badge--inactive",
      // Mantener compatibilidad con valores en inglés
      active: "badge--active",
      pending: "badge--pending",
      inactive: "badge--inactive",
    };
    return statusClasses[status] || "badge--inactive";
  }

  // ===== RENDERIZADO =====
  function renderRows(list, categoriesMap, page = 1, pageSize = 10) {
    const tbody = $("table.admin-table--expertos tbody");
    if (!tbody) return;

    const start = (page - 1) * pageSize;
    const slice = list.slice(start, start + pageSize);

    if (slice.length === 0) {
      tbody.innerHTML =
        '<tr class="placeholder-row"><td colspan="6" style="text-align:center;padding:24px;color:var(--admin-text-secondary);">No hay expertos para mostrar.</td></tr>';
      updatePagination(list.length, page, pageSize);
      return;
    }

    tbody.innerHTML = slice
      .map((expert) => createExpertRow(expert, categoriesMap))
      .join("");
    bindRowActions(tbody.closest("table"));
    // bind keyboard handlers for badges (accesibilidad)
    bindBadgeKeyboard(tbody.closest("table"));
    updatePagination(list.length, page, pageSize);
  }

  function createExpertRow(expert, categoriesMap) {
    const id = getExpertField(expert, "id");
    const name = escapeHtml(getExpertField(expert, "name") || "Sin nombre");
    // keep a raw email value for data attributes / API calls and an escaped one for display
    const rawEmail = getExpertField(expert, "email") || "";
    const email = escapeHtml(rawEmail);
    const status = getExpertField(expert, "status") || "inactive";
    const badgeClass = getStatusBadgeClass(status);
    const avatar =
      getExpertField(expert, "avatar") || "/assets/img/default-avatar.png";

    // Obtener nombres de categorías de forma robusta
    var cats = getCategoryNamesForExpert(expert, categoriesMap)
      .map((n) => escapeHtml(n))
      .join(", ");

    // Si no se resolvieron nombres, intentar resolver a partir de ids y usar como fallback
    if (!cats || cats.trim() === "") {
      const ids = getCategoryIdsForExpert(expert);
      if (ids && ids.length) {
        const namesFromMap = ids
          .map((id) => {
            const k = String(id);
            return (
              (categoriesMap && (categoriesMap[k] || categoriesMap[id])) || null
            );
          })
          .filter(Boolean)
          .map((n) => escapeHtml(n));

        if (namesFromMap.length) {
          cats = namesFromMap.join(", ");
        } else {
          // mostrar ids crudos si no hay nombres, para facilitar diagnóstico
          cats = ids.map((i) => escapeHtml(i)).join(", ");
        }
      }
    }
    // Si aún no hay nada, mostrar un texto claro para el usuario
    if (!cats || cats.trim() === "") cats = "Sin categorías";

    const registro = formatDate(getExpertField(expert, "createdAt"));
    const sesiones = getExpertField(expert, "sessions") || 0;

    // Generar botones de acción según el estado
    let actionButtons = "";
    if (status === "pendiente-verificacion") {
      actionButtons = `
        <div class="action-buttons" role="group" aria-label="Acciones experto">
          <button class="btn-success btn-approve" data-id="${id}" data-email="${email}" title="Aprobar solicitud">
            <i class="fas fa-check"></i> Aprobar
          </button>
          <button class="btn-danger btn-reject" data-id="${id}" data-email="${email}" title="Rechazar solicitud">
            <i class="fas fa-times"></i> Rechazar
          </button>
          <button class="btn-outline btn-view" data-id="${id}">Ver</button>
        </div>
      `;
    } else {
      actionButtons = `
        <div class="action-buttons" role="group" aria-label="Acciones experto">
          <button class="btn-outline btn-view" data-id="${id}">Ver</button>
          <button class="btn-outline btn-edit" data-id="${id}">Editar</button>
          ${
            status === "activo"
              ? `<button class="btn-warning btn-inactivate" data-id="${id}" data-email="${rawEmail}">Inactivar</button>`
              : `<button class="btn-success btn-activate" data-id="${id}" data-email="${rawEmail}">Activar</button>`
          }
        </div>
      `;
    }

    return `
      <tr data-id="${id}" data-status="${status}">
        <td>
          <div style="display:flex;gap:.6rem;align-items:center">
            <img src="${avatar}" alt="avatar" style="width:40px;height:40px;border-radius:999px;object-fit:cover"/>
            <div>
              <div style="font-weight:600">${name}</div>
              <div style="font-size:.85rem;color:var(--admin-text-secondary)">${email}</div>
            </div>
          </div>
        </td>
        <td>${cats}</td>
        <td>${registro}</td>
        <td>${sesiones}</td>
  <td><span class="badge ${badgeClass} badge-as-btn" role="button" tabindex="0">${escapeHtml(
      status
    )}</span></td>
        <td class="expertos-actions-cell">
          ${actionButtons}
        </td>
      </tr>
    `;
  }

  function updatePagination(total, page, pageSize) {
    const info = $("#expertos-pagination-info");
    if (info) {
      const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
      const to = Math.min(total, page * pageSize);
      info.textContent = `Mostrando ${from}-${to} de ${total} expertos`;
    }

    const controls = $("#expertos-pagination-controls");
    if (!controls) return;

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    let html = "";

    // Botón Anterior
    html += createPaginationButton(
      page - 1,
      '<i class="fas fa-chevron-left"></i>',
      page <= 1
    );

    // Lógica de botones de página (ej. 1 ... 4 5 6 ... 10)
    const maxButtons = 5;
    let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
      html += createPaginationButton(1, "1");
      if (startPage > 2) {
        html += '<span class="admin-pagination__ellipsis">…</span>';
      }
    }

    for (let p = startPage; p <= endPage; p++) {
      html += createPaginationButton(p, p.toString(), false, p === page);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        html += '<span class="admin-pagination__ellipsis">…</span>';
      }
      html += createPaginationButton(totalPages, totalPages.toString());
    }

    // Botón Siguiente
    html += createPaginationButton(
      page + 1,
      '<i class="fas fa-chevron-right"></i>',
      page >= totalPages
    );

    controls.innerHTML = html;
    bindPaginationEvents();
  }

  function createPaginationButton(
    page,
    content,
    disabled = false,
    active = false
  ) {
    const disabledAttr = disabled ? 'disabled aria-disabled="true"' : "";
    const activeClass = active ? "active" : "";
    return `<button class="admin-pagination__btn ${activeClass}" data-page="${page}" ${disabledAttr}>${content}</button>`;
  }

  function bindPaginationEvents() {
    $$("#expertos-pagination-controls .admin-pagination__btn").forEach(
      (btn) => {
        btn.addEventListener("click", function () {
          const page = parseInt(this.getAttribute("data-page") || "1", 10);
          currentPage = page;
          applyFilters();
        });
      }
    );
  }

  // ===== MANEJO DE EVENTOS =====
  function bindRowActions(tableEl) {
    // tableEl puede ser el <table> o null; si no se proporciona, buscar la tabla de expertos
    const root =
      tableEl || document.querySelector("table.admin-table--expertos");

    // bindRowActions initialized

    if (!root) {
      console.error("No table element found for binding actions!");
      return;
    }

    // binding action buttons
    bindActionToButtons(root, ".btn-view", openModalView);
    bindActionToButtons(root, ".btn-edit", openModalEdit);
    bindActionToButtons(root, ".btn-inactivate", inactivateExpert);
    bindActionToButtons(root, ".btn-activate", activateExpert);
    bindActionToButtons(root, ".btn-approve", approveExpert);
    bindActionToButtons(root, ".btn-reject", rejectExpert);

    // action buttons bound
  }

  function bindActionToButtons(root, selector, handler) {
    // root: elemento contenedor donde buscar los botones (table o tbody)
    // selector: selector relativo para los botones dentro del root
    const mount = root || document;
    const buttons = Array.from(mount.querySelectorAll(selector));

    // cantidad de botones: ${buttons.length}

    buttons.forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        const id = this.getAttribute("data-id");
        // botón pulsado: ${selector}, id: ${id}

        if (!id) {
          console.error("No data-id found on button", this);
          return;
        }

        // Pasar el elemento del botón pulsado como segundo argumento para que los manejadores puedan acceder a data-email de forma fiable
        try {
          handler(id, this);
        } catch (err) {
          // fallback para manejadores que solo aceptan un argumento
          try {
            handler(id);
          } catch (e) {
            console.error("Handler invocation error", e);
          }
        }
      });
    });
  }

  // Añade soporte de teclado y click accesible a badges con clase badge-as-btn
  function bindBadgeKeyboard(root) {
    const mount = root || document;
    if (!mount) return;
    const badges = Array.from(mount.querySelectorAll(".badge-as-btn"));
    badges.forEach((badge) => {
      // evitar ligar múltiples veces
      if (badge.dataset.keybound === "1") return;
      try {
        if (!badge.hasAttribute("role")) badge.setAttribute("role", "button");
        if (!badge.hasAttribute("tabindex"))
          badge.setAttribute("tabindex", "0");
      } catch (e) {}
      const handler = function (e) {
        const key = e.key || "";
        if (
          key === "Enter" ||
          key === " " ||
          e.keyCode === 13 ||
          e.keyCode === 32
        ) {
          e.preventDefault();
          e.stopPropagation();
          const row = badge.closest("tr");
          if (!row) return;
          const viewBtn = row.querySelector(".btn-view");
          if (viewBtn) viewBtn.click();
        }
      };
      const clickHandler = function (e) {
        const row = badge.closest("tr");
        if (!row) return;
        const viewBtn = row.querySelector(".btn-view");
        if (viewBtn) viewBtn.click();
      };
      badge.addEventListener("keydown", handler);
      badge.addEventListener("click", clickHandler);
      badge.dataset.keybound = "1";
    });
  }

  async function toggleExpertStatus(id, newStatus, clickedButton) {
    // Buscar email de forma robusta
    let btn = clickedButton;
    if (!btn) {
      btn = document.querySelector(`button[data-id="${id}"]`);
    }
    if (!btn) {
      const row = document.querySelector(`tr[data-id="${id}"]`);
      if (row) {
        btn = row.querySelector(`button[data-id="${id}"]`);
      }
    }
    let email = null;
    try {
      if (btn) {
        email = btn.getAttribute("data-email") || btn.dataset.email || null;
      }
    } catch (e) {
      email = null;
    }
    // Si no hay email, buscar en la fila o en el dataset global
    if (!email) {
      const row = document.querySelector(`tr[data-id="${id}"]`);
      if (row) {
        // Buscar en celdas de la fila
        const emailCell = row.querySelector("[data-email]");
        if (emailCell) email = emailCell.getAttribute("data-email");
        // Buscar en el texto de la fila
        if (!email) {
          const possible = Array.from(row.querySelectorAll("td,span,div"))
            .map((e) => e.textContent)
            .find((t) => t && t.includes("@"));
          if (possible) email = possible.trim();
        }
      }
      // Buscar en el array global allExperts
      if (!email && typeof allExperts !== "undefined") {
        const found = allExperts.find((x) => getExpertField(x, "id") == id);
        if (found) email = getExpertField(found, "email");
      }
    }
    if (!email) {
      alert(
        "Error: No se pudo obtener el email del experto. Intenta recargar la página."
      );
      return;
    }

    const action = newStatus ? "activar" : "inactivar";
    if (!confirm(`¿Estás seguro de que deseas ${action} este experto?`)) {
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
      // Construir headers
      const headers = { "Content-Type": "application/json" };
      if (typeof window !== "undefined" && window.API_KEY) {
        headers["x-api-key"] = window.API_KEY;
        headers["Authorization"] = `Bearer ${window.authToken || ""}`;
      }
      let response,
        result = {};
      let triedById = false;
      let lastTriedEmail = email;
      let lastError = null;
      // Función para hacer la petición (por email o por id)
      async function doRequest(identifier, isId) {
        const url = isId
          ? `/api/expertos/id/${encodeURIComponent(identifier)}/activo`
          : `/api/expertos/${encodeURIComponent(identifier)}/activo`;
        return await fetch(url, {
          method: "PUT",
          credentials: "same-origin",
          headers,
          body: JSON.stringify({ activo: newStatus }),
        });
      }
      // Primer intento: por email
      response = await doRequest(email, false);
      try {
        result = await response.json();
      } catch (e) {
        result = { mensaje: await response.text() };
      }
      // Si falla por correo no encontrado, reintentar por id
      if (
        !response.ok &&
        result &&
        typeof result.mensaje === "string" &&
        result.mensaje.toLowerCase().includes("correo") &&
        !triedById
      ) {
        triedById = true;
        response = await doRequest(id, true);
        try {
          result = await response.json();
        } catch (e) {
          result = { mensaje: await response.text() };
        }
      }
      if (response.ok) {
        const row = document.querySelector(
          `table.admin-table--expertos tr[data-id="${id}"]`
        );
        if (row) {
          const badge = row.querySelector(".badge");
          const actionsCell = row.querySelector(".expertos-actions-cell");
          const expert = result.experto || {
            estado: newStatus ? "activo" : "inactivo",
          };
          if (badge) {
            badge.className = `badge ${getStatusBadgeClass(
              expert.estado
            )} badge-as-btn`;
            badge.textContent = expert.estado;
            if (!badge.hasAttribute("role"))
              badge.setAttribute("role", "button");
            if (!badge.hasAttribute("tabindex"))
              badge.setAttribute("tabindex", "0");
          }
          if (actionsCell) {
            const newButtons = `
              <div class="action-buttons" role="group" aria-label="Acciones experto">
                <button class="btn-outline btn-view" data-id="${id}">Ver</button>
                <button class="btn-outline btn-edit" data-id="${id}">Editar</button>
                ${
                  expert.estado === "activo"
                    ? `<button class="btn-warning btn-inactivate" data-id="${id}" data-email="${email}">Inactivar</button>`
                    : `<button class="btn-success btn-activate" data-id="${id}" data-email="${email}">Activar</button>`
                }
              </div>
            `;
            actionsCell.innerHTML = newButtons;
            bindRowActions(row.closest("table"));
            bindBadgeKeyboard(row.closest("table"));
          }
          row.setAttribute("data-status", expert.estado);
        }
        alert(
          `Experto ${
            action === "activar" ? "activado" : "inactivado"
          } exitosamente`
        );
      } else {
        const msg =
          result && result.mensaje
            ? result.mensaje
            : `HTTP ${response.status} ${response.statusText}`;
        throw new Error(msg || `Error al ${action} experto`);
      }
    } catch (error) {
      console.error(`Error al ${action} experto:`, error);
      alert(`Error al ${action} experto: ` + error.message);
      btn.disabled = false;
      btn.innerHTML = action === "activar" ? "Activar" : "Inactivar";
    }
  }

  function inactivateExpert(id) {
    // aceptar un parámetro opcional clickedButton (el botón pulsado) reenviado por el enlazador de eventos
    const clickedButton = arguments.length > 1 ? arguments[1] : null;
    toggleExpertStatus(id, false, clickedButton);
  }

  function activateExpert(id) {
    const clickedButton = arguments.length > 1 ? arguments[1] : null;
    toggleExpertStatus(id, true, clickedButton);
  }

  async function approveExpert(id) {
    const btn = document.querySelector(`.btn-approve[data-id="${id}"]`);
    const email = btn?.getAttribute("data-email");

    if (!email) {
      alert("Error: No se pudo obtener el email del experto");
      return;
    }

    if (!confirm("¿Estás seguro de que deseas aprobar este experto?")) {
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aprobando...';

      // Construir headers y anexar API key si fue inyectada por el servidor para sesiones admin
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${window.authToken || ""}`,
      };
      if (typeof window !== "undefined" && window.API_KEY) {
        headers["x-api-key"] = window.API_KEY;
      }

      // DEBUG: mostrar en consola qué headers se enviarán (ayuda para diagnosticar 403)
      try {
        console.debug(
          "[admin-expertos] aprobar headers:",
          headers,
          "window.API_KEY:",
          window.API_KEY
        );
      } catch (e) {}
      // Si el servidor no inyectó window.API_KEY (por ejemplo sesión no-admin o prod),
      // enviar la petición al proxy en el servidor que añadirá la API_KEY desde env.
      let response;
      if (typeof window !== "undefined" && window.API_KEY) {
        response = await fetch(
          `/api/expertos/aprobar/${encodeURIComponent(email)}`,
          {
            method: "PUT",
            credentials: "same-origin",
            headers,
          }
        );
      } else {
        // llamar al proxy en el servidor (requiere sesión admin activa)
        response = await fetch(
          `/admin/proxy/expertos/aprobar/${encodeURIComponent(email)}`,
          {
            method: "PUT",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      let result = {};
      try {
        result = await response.json();
      } catch (e) {
        // fallback: intentar como texto si el parseo JSON falla
        try {
          const txt = await response.text();
          result = { mensaje: txt };
        } catch (ee) {
          result = { mensaje: "HTTP " + response.status };
        }
      }

      if (response.ok) {
        // Actualizar la fila para mostrar estado activo
        const row = document.querySelector(
          `table.admin-table--expertos tr[data-id="${id}"]`
        );
        if (row) {
          const badge = row.querySelector(".badge");
          if (badge) {
            badge.className = "badge badge--active badge-as-btn";
            badge.textContent = "activo";
            if (!badge.hasAttribute("role"))
              badge.setAttribute("role", "button");
            if (!badge.hasAttribute("tabindex"))
              badge.setAttribute("tabindex", "0");
          }

          // Actualizar botones de acción
          const actionsCell = row.querySelector(".expertos-actions-cell");
          if (actionsCell) {
            actionsCell.innerHTML = `
              <div class="action-buttons" role="group" aria-label="Acciones experto">
                <button class="btn-outline btn-view" data-id="${id}">Ver</button>
                <button class="btn-outline btn-edit" data-id="${id}">Editar</button>
                <button class="btn-warning btn-inactivate" data-id="${id}">Inactivar</button>
              </div>
            `;
            bindRowActions(row.closest("table"));
            // asegurar bindings de teclado para badges en la fila
            bindBadgeKeyboard(row.closest("table"));
          }

          row.setAttribute("data-status", "activo");
        }

        alert("Experto aprobado exitosamente");
      } else {
        const msg =
          result && result.mensaje
            ? result.mensaje
            : "HTTP " + response.status + " " + response.statusText;
        throw new Error(msg || "Error al aprobar experto");
      }
    } catch (error) {
      console.error("Error al aprobar experto:", error);
      alert("Error al aprobar experto: " + error.message);
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> Aprobar';
    }
  }

  async function rejectExpert(id) {
    const btn = document.querySelector(`.btn-reject[data-id="${id}"]`);
    const email = btn?.getAttribute("data-email");

    if (!email) {
      alert("Error: No se pudo obtener el email del experto");
      return;
    }

    const motivo = prompt("Motivo del rechazo (opcional):");
    if (motivo === null) {
      return; // Usuario canceló
    }

    if (!confirm("¿Estás seguro de que deseas rechazar este experto?")) {
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rechazando...';

      // Construir headers y anexar API key si está disponible
      const rheaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${window.authToken || ""}`,
      };

      if (typeof window !== "undefined" && window.API_KEY) {
        rheaders["x-api-key"] = window.API_KEY;
      }

      // DEBUG: mostrar en consola qué headers se enviarán en rechazar
      try {
        console.debug(
          "[admin-expertos] rechazar headers:",
          rheaders,
          "window.API_KEY:",
          window.API_KEY
        );
      } catch (e) {}

      let response;
      if (typeof window !== "undefined" && window.API_KEY) {
        response = await fetch(
          `/api/expertos/rechazar/${encodeURIComponent(email)}`,
          {
            method: "PUT",
            credentials: "same-origin",
            headers: rheaders,
            body: JSON.stringify({
              motivo: motivo || "Sin motivo especificado",
            }),
          }
        );
      } else {
        response = await fetch(
          `/admin/proxy/expertos/rechazar/${encodeURIComponent(email)}`,
          {
            method: "PUT",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              motivo: motivo || "Sin motivo especificado",
            }),
          }
        );
      }

      const result = await response.json();

      if (response.ok) {
        // Remover la fila de la tabla ya que el usuario ya no es experto
        const row = document.querySelector(
          `table.admin-table--expertos tr[data-id="${id}"]`
        );
        if (row) {
          row.remove();
        }

        alert("Solicitud de experto rechazada exitosamente");

        // Actualizar la paginación
        const remainingRows = document.querySelectorAll(
          "table.admin-table--expertos tbody tr:not(.placeholder-row)"
        );
        if (remainingRows.length === 0) {
          const tbody = document.querySelector(
            "table.admin-table--expertos tbody"
          );
          tbody.innerHTML =
            '<tr class="placeholder-row"><td colspan="6" style="text-align:center;padding:24px;color:var(--admin-text-secondary);">No hay expertos para mostrar.</td></tr>';
        }
      } else {
        throw new Error(result.mensaje || "Error al rechazar experto");
      }
    } catch (error) {
      console.error("Error al rechazar experto:", error);
      alert("Error al rechazar experto: " + error.message);
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-times"></i> Rechazar';
    }
  }

  function openModal(type, id) {
    // openModal called

    const expert = allExperts.find((x) => getExpertField(x, "id") == id);
    // expert resolved

    if (!expert) {
      console.warn("Expert not found with id:", id);
      alert(`Experto no encontrado con ID: ${id}`);
      return;
    }

    let modal;
    if (type === "view") {
      modal = $("#verPerfilExperto");
    } else {
      modal = $(`#${type}ExpertModal`);
    }

    if (!modal) {
      console.error("Modal not found for type:", type);
      alert(`Modal no encontrado para tipo: ${type}`);
      return;
    }

    try {
      // Mapear campos según el tipo de modal
      if (type === "view") {
        // Para el modal de ver: buscar los inputs dentro del modal actual
        const nameField =
          modal.querySelector("#name") || modal.querySelector('[id*="name"]');
        const emailField =
          modal.querySelector("#email") || modal.querySelector('[id*="email"]');
        const precioField =
          modal.querySelector("#precio") ||
          modal.querySelector('[id*="precio"]');
        const bioField =
          modal.querySelector("#bio") || modal.querySelector('[id*="bio"]');
        const statusField =
          modal.querySelector("#statusInput") ||
          modal.querySelector("#status") ||
          modal.querySelector('[id*="status"]');

        // Rellenar valores (name/email/price/bio/status)
        if (nameField) nameField.value = getExpertField(expert, "name") || "";
        if (emailField)
          emailField.value = getExpertField(expert, "email") || "";

        const precio = getExpertField(expert, "price") || "";
        if (precioField) {
          const precioFromInfo =
            expert.infoExperto?.precioPorHora || expert.precioPorHora || precio;
          precioField.value = precioFromInfo || "";
        }

        const bio =
          getExpertField(expert, "bio") ||
          expert.infoExperto?.descripcion ||
          expert.descripcion ||
          "";
        if (bioField) bioField.value = bio;

        const estado =
          getExpertField(expert, "status") || expert.estado || "inactivo";
        if (statusField) {
          try {
            // si statusField es el hidden input original
            if (statusField.tagName === "INPUT") {
              statusField.value = estado;
            } else {
              const hidden =
                statusField.querySelector('input[type="hidden"]') ||
                modal.querySelector("#statusInput");
              if (hidden) hidden.value = estado;
            }
          } catch (e) {}
        }

        // Actualizar display sólo lectura para estado (nuevo elemento)
        try {
          let statusDisplay = modal.querySelector("#status_display");
          let statusHidden = modal.querySelector("#statusInput");

          // si no existe el display, crear uno después del label asociado
          if (!statusDisplay) {
            try {
              const label =
                modal.querySelector('label[for="status_display"]') ||
                modal.querySelector('label[for="statusInput"]');
              statusDisplay = document.createElement("div");
              statusDisplay.id = "status_display";
              statusDisplay.className = "modal-readonly-field";
              statusDisplay.setAttribute("aria-hidden", "false");
              statusDisplay.style.display = "block";
              statusDisplay.textContent = estado || "-";
              if (label && label.parentNode)
                label.parentNode.insertBefore(statusDisplay, label.nextSibling);
              else modal.insertBefore(statusDisplay, modal.firstChild);
            } catch (e) {}
          }

          if (statusDisplay) {
            try {
              statusDisplay.textContent = estado || "-";
              // forzar el color primario para que los temas no lo oculten
              const primary =
                getComputedStyle(document.documentElement).getPropertyValue(
                  "--admin-text-primary"
                ) || "";
              if (primary) {
                statusDisplay.style.color = primary;
                try {
                  statusDisplay.style.setProperty(
                    "-webkit-text-fill-color",
                    primary,
                    "important"
                  );
                } catch (e) {}
              }
              statusDisplay.style.display = "block";
            } catch (e) {}
          }

          // asegurar que exista el input oculto y establecer su valor
          if (!statusHidden) {
            try {
              statusHidden = document.createElement("input");
              statusHidden.type = "hidden";
              statusHidden.id = "statusInput";
              statusHidden.name = "status";
              modal.appendChild(statusHidden);
            } catch (e) {}
          }
          if (statusHidden) statusHidden.value = estado || "";
        } catch (e) {}

        // Hacer campos de solo lectura
        [nameField, emailField, precioField, bioField].forEach((field) => {
          if (field) {
            field.readOnly = true;
            field.style.backgroundColor = "#f8f9fa";
            field.style.cursor = "default";
          }
        });

        // categorias hidden dentro del modal
        const categoriasHiddenView =
          modal.querySelector("#categorias-values") ||
          modal.querySelector('[id*="categorias-values"]');
        try {
          const cats =
            (expert.infoExperto && expert.infoExperto.categorias) ||
            expert.categorias ||
            [];
          const catIds = getCategoryIdsForExpert({ categorias: cats });
          if (categoriasHiddenView)
            categoriasHiddenView.value = Array.isArray(catIds)
              ? catIds.join(",")
              : catIds || "";

          // Renderizar visualmente las categorías como 'chips' dentro del modal de ver
          try {
            const chipsContainer = modal.querySelector(".categorias-chips");
            const optionsContainer = modal.querySelector(".categorias-options");
            // Preferir resolver nombres a partir de los ids calculados (catIds)
            const catsNames = Array.isArray(catIds)
              ? catIds
                  .map(function (id) {
                    const k = String(id);
                    return (
                      (categoriesMap &&
                        (categoriesMap[k] || categoriesMap[id])) ||
                      String(id)
                    );
                  })
                  .filter(Boolean)
              : [];

            if (chipsContainer) {
              // limpiar contenido previo
              chipsContainer.innerHTML = "";
              if (!catsNames || catsNames.length === 0) {
                // mostrar placeholder
                const span = document.createElement("span");
                span.className = "categorias-empty";
                span.textContent = "No hay categorías seleccionadas";
                chipsContainer.appendChild(span);
              } else {
                catsNames.forEach(function (name) {
                  try {
                    const chip = document.createElement("div");
                    chip.className = "categoria-chip";
                    chip.textContent = name;
                    chipsContainer.appendChild(chip);
                  } catch (e) {}
                });
              }
            }

            // Si existe el panel de opciones, marcar las opciones seleccionadas visualmente
            if (optionsContainer && Array.isArray(catIds)) {
              try {
                Array.from(
                  optionsContainer.querySelectorAll(".categoria-option")
                ).forEach(function (optEl) {
                  try {
                    const id =
                      optEl.getAttribute("data-id") ||
                      optEl.getAttribute("data-value") ||
                      optEl.dataset.id;
                    if (
                      id &&
                      Array.from(catIds).map(String).includes(String(id))
                    )
                      optEl.classList.add("selected");
                    else optEl.classList.remove("selected");
                  } catch (e) {}
                });
              } catch (e) {}
            }
          } catch (e) {}
        } catch (e) {}

        // dias disponibles: setear hidden y marcar botones dentro del modal
        try {
          const dias = expert.infoExperto?.diasDisponibles || [];
          const diasHiddenView = modal.querySelector("#diasDisponibles");
          if (diasHiddenView)
            diasHiddenView.value = Array.isArray(dias)
              ? dias.join(",")
              : dias || "";

          if (Array.isArray(dias) && dias.length) {
            dias.forEach(function (d) {
              const btn = modal.querySelector(
                `.day-button[data-day="${d.toLowerCase()}"]`
              );
              if (btn) {
                // agregar estado activo visual aunque el botón esté deshabilitado
                btn.classList.add("active");
                try {
                  btn.setAttribute("aria-pressed", "true");
                } catch (e) {}
              }
            });
            const display = modal.querySelector(".days-display");
            if (display)
              display.textContent = Array.isArray(dias)
                ? dias.join(", ")
                : dias || "";
          }
        } catch (e) {}

        // bancarios dentro del modal de ver: resolver múltiples formas/paths y seleccionar por value o por texto
        try {
          // Debug: imprimir expert y paths relevantes para entender por qué faltan campos
          try {
            // diagnostic group removed in production build
          } catch (e) {}
          // En el modal de ver, usamos elementos de sólo lectura (display) y campos hidden
          // Crear elementos de visualización dinámicamente si no existen
          const bancoHidden = modal.querySelector("#banco_hidden_view");
          const tipoCuentaHidden = modal.querySelector(
            "#tipoCuenta_hidden_view"
          );
          const tipoDocumentoHidden = modal.querySelector(
            "#tipoDocumento_hidden_view"
          );
          const numeroCuentaField = modal.querySelector("#numeroCuenta");
          const titularField = modal.querySelector("#titular");
          const numeroDocumentoField = modal.querySelector("#numeroDocumento");
          const telefonoField = modal.querySelector('input[type="tel"]');

          // Función para crear o encontrar elemento de visualización
          function getOrCreateDisplayElement(fieldId, labelText) {
            let display = modal.querySelector("#" + fieldId + "_display");
            if (!display) {
              // Buscar el label padre para insertar después
              const label = modal.querySelector(`label[for="${fieldId}"]`);
              if (label && label.parentNode) {
                display = document.createElement("div");
                display.id = fieldId + "_display";
                display.className = "modal-readonly-field";
                display.style.marginTop = "6px";
                display.style.color = "var(--admin-text-secondary)";
                display.style.fontSize = "14px";
                display.style.padding = "8px 12px";
                display.style.backgroundColor =
                  "var(--admin-input-bg, #f8f9fa)";
                display.style.border =
                  "1px solid var(--admin-border-color, #e0e0e0)";
                display.style.borderRadius = "4px";
                label.parentNode.appendChild(display);
              }
            }
            return display;
          }

          const bancoDisplay = getOrCreateDisplayElement("banco", "Banco");
          const tipoCuentaDisplay = getOrCreateDisplayElement(
            "tipoCuenta",
            "Tipo de cuenta"
          );
          const tipoDocumentoDisplay = getOrCreateDisplayElement(
            "tipoDocumento",
            "Tipo de documento"
          );

          // resolver posibles shapes
          // Resolver valores bancarios/documento desde varias rutas posibles
          const bancoRaw =
            expert.infoExperto?.banco ||
            expert.infoExperto?.bancoNombre ||
            expert.infoExperto?.bank ||
            expert.banco ||
            expert.bank ||
            null;

          const tipoCuentaRaw =
            expert.infoExperto?.tipoCuenta ||
            expert.tipoCuenta ||
            expert.infoExperto?.accountType ||
            null;

          const tipoDocumentoRaw =
            expert.infoExperto?.tipoDocumento ||
            expert.tipoDocumento ||
            expert.infoExperto?.documentType ||
            null;

          // Debug temporal: ver qué datos bancarios tenemos
          console.log("[DEBUG] Banking data for expert:", {
            expertId: expert._id || expert.id,
            expertEmail: expert.email,
            bancoRaw,
            tipoCuentaRaw,
            tipoDocumentoRaw,
            infoExperto: expert.infoExperto,
          });

          const bancoVal = normalizeValue(bancoRaw) || "";
          let tipoCuentaVal = normalizeValue(tipoCuentaRaw) || "";
          let tipoDocumentoVal = normalizeValue(tipoDocumentoRaw) || "";

          // Mapear valores a texto legible
          if (tipoCuentaVal === "ahorros") tipoCuentaVal = "Ahorros";
          else if (tipoCuentaVal === "corriente") tipoCuentaVal = "Corriente";

          if (tipoDocumentoVal === "cedula") tipoDocumentoVal = "Cédula";
          else if (tipoDocumentoVal === "extranjeria")
            tipoDocumentoVal = "Cédula de Extranjería";

          // Rellenar campos de sólo lectura (display) y hidden inputs
          try {
            if (bancoDisplay) {
              bancoDisplay.textContent = bancoVal || "No especificado";
              bancoDisplay.style.display = "block";
            }
            if (bancoHidden) {
              bancoHidden.value = bancoVal || "";
            }
          } catch (e) {}

          try {
            if (tipoCuentaDisplay) {
              tipoCuentaDisplay.textContent =
                tipoCuentaVal || "No especificado";
              tipoCuentaDisplay.style.display = "block";
            }
            if (tipoCuentaHidden) {
              tipoCuentaHidden.value = tipoCuentaRaw || "";
            }
          } catch (e) {}

          try {
            if (tipoDocumentoDisplay) {
              tipoDocumentoDisplay.textContent =
                tipoDocumentoVal || "No especificado";
              tipoDocumentoDisplay.style.display = "block";
            }
            if (tipoDocumentoHidden) {
              tipoDocumentoHidden.value = tipoDocumentoRaw || "";
            }
          } catch (e) {}

          try {
            if (
              numeroCuentaField &&
              (expert.infoExperto?.numeroCuenta || expert.numeroCuenta)
            )
              numeroCuentaField.value =
                expert.infoExperto?.numeroCuenta || expert.numeroCuenta;
            if (titularField && (expert.infoExperto?.titular || expert.titular))
              titularField.value =
                expert.infoExperto?.titular || expert.titular;
            if (
              numeroDocumentoField &&
              (expert.infoExperto?.numeroDocumento || expert.numeroDocumento)
            )
              numeroDocumentoField.value =
                expert.infoExperto?.numeroDocumento || expert.numeroDocumento;
            if (
              telefonoField &&
              (expert.infoExperto?.telefonoContacto || expert.telefono)
            )
              telefonoField.value =
                expert.infoExperto?.telefonoContacto || expert.telefono;
          } catch (e) {}
        } catch (e) {}

        // Asegurar visualización en modo 'view': crear / actualizar un elemento legible con el texto seleccionado
        try {
          function ensureReadonlyDisplayFor(selectEl) {
            if (!selectEl) return;
            var displayId = selectEl.id + "_display";
            var txt = "";
            try {
              var opt = selectEl.options[selectEl.selectedIndex];
              txt =
                (opt && (opt.textContent || opt.innerText)) ||
                selectEl.value ||
                "";
            } catch (e) {
              txt = selectEl.value || "";
            }
            var existing = modal.querySelector("#" + displayId);
            // Si existe, actualizar texto. Mostrar el display SOLO cuando el select nativo
            // no esté visible (p. ej. ha sido ocultado por temas CSS). Esto evita duplicados.
            var selectVisible = isElementVisible(selectEl);

            if (existing) {
              existing.textContent = txt;
              try {
                // forzar sólo un modo visible: ocultar siempre el select en modo vista
                try {
                  selectEl.style.display = "none";
                } catch (e) {}
                existing.style.display = txt ? "block" : "none";
              } catch (e) {}
            } else {
              var el = document.createElement("div");
              el.id = displayId;
              el.className = "modal-readonly-field";
              el.style.marginTop = "6px";
              el.style.color = "var(--admin-text-secondary)";
              el.textContent = txt;
              try {
                // ocultar siempre el select en modo vista y mostrar el texto
                try {
                  selectEl.style.display = "none";
                } catch (e) {}
                el.style.display = txt ? "block" : "none";
                selectEl.parentNode.insertBefore(el, selectEl.nextSibling);
              } catch (e) {
                // alternativa: anexar al cuerpo del modal
                modal.appendChild(el);
              }
            }
          }

          // En modal de vista, sólo crear display si el select no es visible para evitar duplicados
          ensureReadonlyDisplayFor(bancoField);
          ensureReadonlyDisplayFor(tipoCuentaField);
          ensureReadonlyDisplayFor(tipoDocumentoField);
        } catch (e) {}
      } else {
        // rellenando otros campos del modal (editar, etc.)
        // recordar id del experto en edición al abrir el modal de edición
        try {
          if (type === "edit") {
            currentEditingExpertId = getExpertField(expert, "id");
          }
        } catch (e) {}

        // Ayudante: intenta el selector dentro del modal actual primero, luego recurrir a selectores globales como fallback
        function fieldSelector(base) {
          const suff = `#${base}_${type}`;
          // prefer modal-scoped selectors
          try {
            const elSuff = modal.querySelector(suff);
            if (elSuff) return elSuff;
            const elBase = modal.querySelector(`#${base}`);
            if (elBase) return elBase;
          } catch (e) {}

          // fallback to global selectors for backwards compatibility
          try {
            const elSuffGlobal = document.querySelector(suff);
            if (elSuffGlobal) return elSuffGlobal;
            return document.querySelector(`#${base}`);
          } catch (e) {
            return null;
          }
        }

        const nameField = fieldSelector("name");
        const emailField = fieldSelector("email");
        const precioField = fieldSelector("precio");
        const bioField = fieldSelector("bio");
        const statusField =
          fieldSelector("statusInput") || fieldSelector("status");
        const categoriasHidden = fieldSelector("categorias-values");
        const diasHidden = fieldSelector("diasDisponibles");
        const bancoField = fieldSelector("banco");
        const tipoCuentaField = fieldSelector("tipoCuenta");
        const numeroCuentaField = fieldSelector("numeroCuenta");
        const titularField = fieldSelector("titular");
        const tipoDocumentoField = fieldSelector("tipoDocumento");
        const numeroDocumentoField = fieldSelector("numeroDocumento");
        const telefonoField =
          fieldSelector("telefonoContacto") ||
          modal.querySelector('input[type="tel"]') ||
          document.querySelector('input[type="tel"]');

        if (nameField) nameField.value = getExpertField(expert, "name") || "";
        if (emailField)
          emailField.value = getExpertField(expert, "email") || "";

        // precio: preferir infoExperto.precioPorHora
        const precioVal =
          expert.infoExperto?.precioPorHora ||
          getExpertField(expert, "price") ||
          "";
        if (precioField) precioField.value = precioVal;

        // bio/descripcion
        const bioVal =
          expert.infoExperto?.descripcion ||
          getExpertField(expert, "bio") ||
          "";
        if (bioField) bioField.value = bioVal;

        // estado
        const estadoVal =
          expert.estado ||
          (expert.infoExperto && expert.infoExperto.activo === false
            ? "inactivo"
            : "activo");
        try {
          if (statusField) {
            // statusField puede ser un input oculto
            if (
              statusField.tagName === "INPUT" ||
              statusField.tagName === "SELECT"
            ) {
              statusField.value = estadoVal;
            } else {
              // trigger de select personalizado
              const hidden =
                statusField.querySelector('input[type="hidden"]') ||
                document.getElementById("statusInput");
              if (hidden) hidden.value = estadoVal;
            }
          }
        } catch (e) {}

        // categorías: guardar ids en input hidden si está disponible
        try {
          const cats =
            (expert.infoExperto && expert.infoExperto.categorias) ||
            expert.categorias ||
            [];
          const catIds = getCategoryIdsForExpert({ categorias: cats });
          if (categoriasHidden)
            categoriasHidden.value = Array.isArray(catIds)
              ? catIds.join(",")
              : catIds || "";

          // Asegurar que el modal tenga .categorias-options poblado y manejadores interactivos
          try {
            function ensureModalCategoriasOptions(modal) {
              try {
                const optionsContainer = modal.querySelector(
                  ".categorias-options"
                );
                const chipsContainer = modal.querySelector(".categorias-chips");
                if (!optionsContainer) return;
                // Si ya está poblado, no sobrescribir
                if (
                  optionsContainer.children &&
                  optionsContainer.children.length
                ) {
                  // ensure modal-scoped search is wired even if already populated
                  wireModalCategoriasSearch(modal);
                  return;
                }

                // Construir opciones desde el array global 'categorias' (fallback seguro)
                optionsContainer.innerHTML = (categorias || [])
                  .map(function (cat) {
                    const id = String(cat.id || cat._id || "");
                    const name = escapeHtml(
                      cat.name || cat.nombre || "Sin nombre"
                    );
                    const icon = cat.icon
                      ? `<i class="fas ${escapeHtml(
                          cat.icon
                        )}" aria-hidden="true"></i>`
                      : "";
                    return `\n      <div class="categoria-option" data-id="${id}">\n        <div class="categoria-option-checkbox"></div>\n        ${icon}\n        <span>${name}</span>\n      </div>`;
                  })
                  .join("");

                // Adjuntar manejadores de click para alternar selección y actualizar chips/input oculto
                Array.from(
                  optionsContainer.querySelectorAll(".categoria-option")
                ).forEach(function (optEl) {
                  optEl.addEventListener("click", function () {
                    try {
                      const id = optEl.getAttribute("data-id") || "";
                      const label =
                        (optEl.querySelector("span") &&
                          optEl.querySelector("span").textContent) ||
                        id;
                      const hidden =
                        modal.querySelector("#categorias-values_edit") ||
                        modal.querySelector("#categorias-values");

                      // alternar visual
                      const isSelected = optEl.classList.toggle("selected");

                      // actualizar chips (preservar orden de inserción: añadir nuevas selecciones al final)
                      if (isSelected) {
                        // evitar chip duplicado
                        try {
                          if (
                            chipsContainer &&
                            !chipsContainer.querySelector(
                              `.categoria-chip[data-id="${id}"]`
                            )
                          ) {
                            const chip = document.createElement("div");
                            chip.className = "categoria-chip";
                            chip.dataset.id = id;
                            chip.innerHTML = `<span>${escapeHtml(
                              label
                            )}</span><button type="button" class="categoria-chip-remove" aria-label="Remover categoría"><i class="fas fa-times"></i></button>`;
                            if (chipsContainer)
                              chipsContainer.appendChild(chip);
                            // enlazar remover
                            const rem = chip.querySelector(
                              ".categoria-chip-remove"
                            );
                            if (rem)
                              rem.addEventListener("click", function (ev) {
                                try {
                                  ev.stopPropagation();
                                } catch (e) {}
                                try {
                                  optEl.classList.remove("selected");
                                } catch (e) {}
                                try {
                                  chip.remove();
                                } catch (e) {}
                                updateHidden();
                              });
                          }
                        } catch (e) {}
                      } else {
                        // eliminar chip si existe
                        try {
                          const existing =
                            chipsContainer &&
                            chipsContainer.querySelector(
                              `.categoria-chip[data-id="${id}"]`
                            );
                          if (existing) existing.remove();
                        } catch (e) {}
                      }

                      function updateHidden() {
                        try {
                          const selected = Array.from(
                            optionsContainer.querySelectorAll(
                              ".categoria-option.selected"
                            )
                          )
                            .map(function (o) {
                              return o.getAttribute("data-id");
                            })
                            .filter(Boolean);
                          if (hidden) hidden.value = selected.join(",");
                        } catch (e) {}
                      }

                      updateHidden();
                    } catch (e) {}
                  });
                });

                // Enlazar el input de búsqueda del modal para filtrar opciones
                wireModalCategoriasSearch(modal);
              } catch (e) {}
            }

            function wireModalCategoriasSearch(modal) {
              try {
                const input = modal.querySelector("#categorias-input");
                const optionsContainer = modal.querySelector(
                  ".categorias-options"
                );
                if (!input || !optionsContainer) return;
                // anti-rebote
                let t = null;
                const handler = function (e) {
                  const term = stripAccents(
                    (e.target.value || "").toLowerCase()
                  );
                  Array.from(
                    optionsContainer.querySelectorAll(".categoria-option")
                  ).forEach(function (opt) {
                    try {
                      const text = stripAccents(
                        (opt.querySelector("span") &&
                          opt.querySelector("span").textContent) ||
                          ""
                      ).toLowerCase();
                      opt.style.display = text.includes(term) ? "flex" : "none";
                    } catch (err) {}
                  });
                };
                try {
                  input.removeEventListener(
                    "input",
                    input._modalCategoriasSearchHandler
                  );
                } catch (e) {}
                input._modalCategoriasSearchHandler = function (e) {
                  if (t) clearTimeout(t);
                  t = setTimeout(() => handler(e), 100);
                };
                input.addEventListener(
                  "input",
                  input._modalCategoriasSearchHandler
                );
              } catch (e) {}
            }

            ensureModalCategoriasOptions(modal);
          } catch (e) {}

          // Renderizar chips y marcar opciones dentro del modal de edición (ámbito modal)
          try {
            const chipsContainer = modal.querySelector(".categorias-chips");
            const optionsContainer = modal.querySelector(".categorias-options");
            if (chipsContainer) {
              chipsContainer.innerHTML = "";
              const catsNames = Array.isArray(catIds)
                ? catIds
                    .map(function (id) {
                      const k = String(id);
                      return (
                        (categoriesMap &&
                          (categoriesMap[k] || categoriesMap[id])) ||
                        String(id)
                      );
                    })
                    .filter(Boolean)
                : [];
              if (!catsNames || catsNames.length === 0) {
                const span = document.createElement("span");
                span.className = "categorias-empty";
                span.textContent = "No hay categorías seleccionadas";
                chipsContainer.appendChild(span);
              } else {
                catsNames.forEach(function (name) {
                  try {
                    const chip = document.createElement("div");
                    chip.className = "categoria-chip";
                    chip.textContent = name;
                    chipsContainer.appendChild(chip);
                  } catch (e) {}
                });
              }
            }

            if (optionsContainer && Array.isArray(catIds)) {
              try {
                Array.from(
                  optionsContainer.querySelectorAll(".categoria-option")
                ).forEach(function (optEl) {
                  try {
                    const id =
                      optEl.getAttribute("data-id") || optEl.dataset.id;
                    if (
                      id &&
                      Array.from(catIds).map(String).includes(String(id))
                    )
                      optEl.classList.add("selected");
                    else optEl.classList.remove("selected");
                  } catch (e) {}
                });
              } catch (e) {}
            }

            // También reflejar ids seleccionados en el input oculto del modal de edición (ámbito modal)
            try {
              const categoriasHiddenEdit = modal.querySelector(
                "#categorias-values_edit"
              );
              if (categoriasHiddenEdit)
                categoriasHiddenEdit.value = Array.isArray(catIds)
                  ? catIds.join(",")
                  : catIds || "";
            } catch (e) {}
          } catch (e) {}
        } catch (e) {}

        // días disponibles
        try {
          const dias = expert.infoExperto?.diasDisponibles || [];
          if (diasHidden)
            diasHidden.value = Array.isArray(dias)
              ? dias.join(",")
              : dias || "";
          // también establecer hidden de ámbito modal para el modal de edición
          try {
            const diasHiddenEdit = modal.querySelector("#diasDisponibles_edit");
            if (diasHiddenEdit)
              diasHiddenEdit.value = Array.isArray(dias)
                ? dias.join(",")
                : dias || "";
          } catch (e) {}
          // actualizar botones de UI si están presentes (ámbito modal)
          if (Array.isArray(dias) && dias.length) {
            dias.forEach(function (d) {
              const btn = modal.querySelector(
                `.day-button[data-day="${d.toLowerCase()}"]`
              );
              if (btn) {
                btn.classList.add("active");
                try {
                  btn.setAttribute("aria-pressed", "true");
                } catch (e) {}
              }
            });
            const display = modal.querySelector(".days-display");
            if (display) display.textContent = dias.join(", ");
          } else {
            const display = modal.querySelector(".days-display");
            if (display) display.textContent = "Ningún día seleccionado";
          }
        } catch (e) {}

        // bancarios
        try {
          // bancoField / tipoCuentaField pueden ser selects o inputs; usar setSelectValue para selects
          const bancoVal =
            expert.infoExperto?.banco || expert.banco || expert.bank || "";
          const tipoCuentaVal =
            expert.infoExperto?.tipoCuenta || expert.tipoCuenta || "";
          try {
            if (bancoField) {
              if (bancoField.tagName === "SELECT")
                setSelectValue(bancoField, bancoVal);
              else bancoField.value = bancoVal;
            }
          } catch (e) {}
          try {
            if (tipoCuentaField) {
              if (tipoCuentaField.tagName === "SELECT")
                setSelectValue(tipoCuentaField, tipoCuentaVal);
              else tipoCuentaField.value = tipoCuentaVal;
            }
          } catch (e) {}

          // asegurar que inputs específicos del modal de edición (si existen) reciban valores
          try {
            const bancoEdit = modal.querySelector("#banco_edit");
            if (bancoEdit) bancoEdit.value = bancoVal || "";
          } catch (e) {}
          try {
            const tipoCuentaEdit = modal.querySelector("#tipoCuenta_edit");
            if (tipoCuentaEdit) {
              try {
                tipoCuentaEdit.setAttribute(
                  "data-initial-value",
                  tipoCuentaVal || ""
                );
              } catch (e) {}
              setSelectValue(tipoCuentaEdit, tipoCuentaVal || "");
            }
          } catch (e) {}
          try {
            const numeroCuentaEdit = modal.querySelector("#numeroCuenta_edit");
            if (numeroCuentaEdit)
              numeroCuentaEdit.value =
                expert.infoExperto?.numeroCuenta || expert.numeroCuenta || "";
          } catch (e) {}
          try {
            const titularEdit = modal.querySelector("#titular_edit");
            if (titularEdit)
              titularEdit.value =
                expert.infoExperto?.titular || expert.titular || "";
          } catch (e) {}
          try {
            const tipoDocumentoEdit = modal.querySelector(
              "#tipoDocumento_edit"
            );
            if (tipoDocumentoEdit) {
              try {
                const rawDoc =
                  expert.infoExperto?.tipoDocumento ||
                  expert.tipoDocumento ||
                  "";
                const mappedDoc = mapDocumentType(rawDoc) || rawDoc || "";
                try {
                  tipoDocumentoEdit.setAttribute(
                    "data-initial-value",
                    mappedDoc
                  );
                } catch (e) {}
                setSelectValue(tipoDocumentoEdit, mappedDoc);
              } catch (e) {}
            }
          } catch (e) {}
          try {
            const numeroDocumentoEdit = modal.querySelector(
              "#numeroDocumento_edit"
            );
            if (numeroDocumentoEdit)
              numeroDocumentoEdit.value =
                expert.infoExperto?.numeroDocumento ||
                expert.numeroDocumento ||
                "";
          } catch (e) {}
          try {
            const telefonoEdit = modal.querySelector("#telefonoContacto_edit");
            if (telefonoEdit)
              telefonoEdit.value =
                expert.infoExperto?.telefonoContacto || expert.telefono || "";
          } catch (e) {}
        } catch (e) {}
        try {
          if (tipoCuentaField && expert.infoExperto?.tipoCuenta)
            tipoCuentaField.value = expert.infoExperto.tipoCuenta;
        } catch (e) {}
        try {
          if (numeroCuentaField && expert.infoExperto?.numeroCuenta)
            numeroCuentaField.value = expert.infoExperto.numeroCuenta;
        } catch (e) {}
        try {
          if (titularField && expert.infoExperto?.titular)
            titularField.value = expert.infoExperto.titular;
        } catch (e) {}
        try {
          if (tipoDocumentoField && expert.infoExperto?.tipoDocumento)
            tipoDocumentoField.value = expert.infoExperto.tipoDocumento;
        } catch (e) {}
        try {
          if (numeroDocumentoField && expert.infoExperto?.numeroDocumento)
            numeroDocumentoField.value = expert.infoExperto.numeroDocumento;
        } catch (e) {}
        try {
          if (telefonoField && expert.infoExperto?.telefonoContacto)
            telefonoField.value = expert.infoExperto.telefonoContacto;
        } catch (e) {}
        // Asegurar que selects del modal de edición sean visibles (temas oscuros pueden ocultar texto)
        try {
          function ensureSelectVisible(selectEl) {
            if (!selectEl) return;
            try {
              const primary =
                getComputedStyle(document.documentElement).getPropertyValue(
                  "--admin-text-primary"
                ) || "";
              if (primary) {
                try {
                  selectEl.style.setProperty("color", primary, "important");
                } catch (e) {
                  selectEl.style.color = primary;
                }
              }
              // asegurar fondo/transparencia para no tapar el texto
              try {
                selectEl.style.setProperty(
                  "background-color",
                  "transparent",
                  "important"
                );
              } catch (e) {
                selectEl.style.backgroundColor = "transparent";
              }

              // crear un fallback display justo después del select con el texto amigable si el select aún no muestra texto
              try {
                const dispId = selectEl.id + "_display";
                let disp = modal.querySelector("#" + dispId);
                const opt = selectEl.options[selectEl.selectedIndex];
                const txt =
                  (opt && (opt.textContent || opt.innerText)) ||
                  selectEl.value ||
                  "";

                // Determinar si el select nativo está visible en el layout
                let selectVisible = isElementVisible(selectEl);

                // Si el select es visible, eliminar/ocultar cualquier display fallback para evitar duplicados
                if (selectVisible) {
                  if (disp)
                    try {
                      disp.style.display = "none";
                    } catch (e) {}
                  // Asegurar que el select nativo esté interactivo
                  try {
                    selectEl.style.position = null;
                    selectEl.style.opacity = null;
                    selectEl.style.pointerEvents = null;
                    selectEl.style.display = null;
                  } catch (e) {}
                  return;
                }

                // Si el select no es visible, crear o actualizar el display fallback
                if (!disp) {
                  disp = document.createElement("div");
                  disp.id = dispId;
                  disp.className = "modal-readonly-field";
                  disp.style.marginTop = "6px";
                  disp.style.color =
                    getComputedStyle(document.documentElement).getPropertyValue(
                      "--admin-text-secondary"
                    ) || "";
                  try {
                    selectEl.parentNode.insertBefore(
                      disp,
                      selectEl.nextSibling
                    );
                  } catch (e) {
                    selectEl.parentNode.appendChild(disp);
                  }
                }

                disp.textContent = txt || "-";
                disp.style.display = txt ? "block" : "none";

                // Ocultar el select original para evitar duplicación visual
                try {
                  selectEl.style.position = "absolute";
                  selectEl.style.opacity = "0";
                  selectEl.style.pointerEvents = "none";
                  selectEl.style.width = "1px";
                } catch (e) {}
              } catch (e) {}
            } catch (e) {}
          }

          // Edit mode: no crear fallbacks _display para selects; usaremos sólo el reemplazo robusto (_replacement)
          // Limpiar cualquier _display residual antes de construir el reemplazo
          try {
            ["#tipoCuenta_edit", "#tipoDocumento_edit"].forEach(function (sel) {
              try {
                var s = modal.querySelector(sel);
                if (!s) return;
                var disp = modal.querySelector("#" + s.id + "_display");
                if (disp) disp.remove();
              } catch (e) {}
            });
          } catch (e) {}

          // Si los selects siguen siendo invisibles por CSS del tema, crear un reemplazo personalizado robusto
          try {
            function createSelectReplacement(modal, selectEl) {
              if (!selectEl || !modal) return;
              const id =
                selectEl.id || (selectEl.name ? selectEl.name + "_sel" : null);
              if (!id) return;
              const replacementId = id + "_replacement";
              // if already created, update text and return
              // si ya fue creado, actualizar texto y retornar
              let existing = modal.querySelector("#" + replacementId);
              const buildText = () => {
                try {
                  // prefer explicit initial value provided via data-initial-value
                  const initial =
                    selectEl.getAttribute &&
                    selectEl.getAttribute("data-initial-value");
                  if (initial) {
                    // try to match option by value first
                    let optMatch = Array.from(selectEl.options).find(function (
                      o
                    ) {
                      return String(o.value) === String(initial);
                    });
                    if (!optMatch) {
                      // try match by normalized text
                      optMatch = Array.from(selectEl.options).find(function (
                        o
                      ) {
                        return stripAccents(
                          o.textContent || o.innerText || ""
                        ).includes(stripAccents(initial));
                      });
                    }
                    if (optMatch)
                      return (
                        optMatch.textContent ||
                        optMatch.innerText ||
                        optMatch.value ||
                        initial
                      );
                  }
                  const opt = selectEl.options[selectEl.selectedIndex];
                  return (
                    (opt && (opt.textContent || opt.innerText)) ||
                    selectEl.value ||
                    ""
                  );
                } catch (e) {
                  return selectEl.value || "";
                }
              };

              if (existing) {
                existing.querySelector(".replacement-value").textContent =
                  buildText() || "-";
                return;
              }

              // crear contenedor
              const wrap = document.createElement("div");
              wrap.id = replacementId;
              wrap.className = "select-replacement";
              // estilos inline básicos para asegurar visibilidad incluso con reglas del tema
              wrap.style.display = "inline-block";
              wrap.style.minWidth = "220px";
              wrap.style.padding = "8px 10px";
              wrap.style.border = "1px solid var(--admin-border-color, #ccc)";
              wrap.style.borderRadius = "6px";
              wrap.style.background = "var(--admin-card-bg, #fff)";
              wrap.style.color =
                getComputedStyle(document.documentElement).getPropertyValue(
                  "--admin-text-primary"
                ) || "#111";
              wrap.style.cursor = "pointer";
              wrap.style.position = "relative";

              const span = document.createElement("span");
              span.className = "replacement-value";
              span.textContent = buildText() || "-";
              wrap.appendChild(span);

              const caret = document.createElement("span");
              caret.className = "replacement-caret";
              caret.innerHTML = "▾";
              caret.style.float = "right";
              caret.style.marginLeft = "8px";
              wrap.appendChild(caret);

              // construir panel de opciones
              const panel = document.createElement("div");
              panel.className = "replacement-panel";
              panel.style.position = "absolute";
              panel.style.left = "0";
              panel.style.top = "calc(100% + 6px)";
              panel.style.minWidth = "100%";
              panel.style.maxHeight = "200px";
              panel.style.overflow = "auto";
              panel.style.border = "1px solid var(--admin-border-color, #ccc)";
              panel.style.background = "var(--admin-card-bg, #fff)";
              panel.style.boxShadow = "0 6px 18px rgba(0,0,0,0.12)";
              panel.style.zIndex = "100000";
              panel.style.display = "none";
              panel.style.borderRadius = "6px";

              Array.from(selectEl.options).forEach(function (o) {
                const item = document.createElement("div");
                item.className = "replacement-item";
                item.dataset.value = o.value;
                item.textContent = o.textContent || o.innerText || o.value;
                item.style.padding = "8px 10px";
                item.style.cursor = "pointer";
                item.style.borderBottom = "1px solid rgba(0,0,0,0.04)";
                item.addEventListener("click", function (ev) {
                  try {
                    const v = this.dataset.value;
                    // set native select and dispatch change
                    selectEl.value = v;
                    try {
                      selectEl.dispatchEvent(
                        new Event("change", { bubbles: true })
                      );
                    } catch (e) {}
                    span.textContent = this.textContent || v;
                    panel.style.display = "none";
                  } catch (e) {}
                });
                panel.appendChild(item);
              });

              wrap.appendChild(panel);

              // interacciones
              wrap.addEventListener("click", function (e) {
                e.stopPropagation();
                // toggle
                panel.style.display =
                  panel.style.display === "block" ? "none" : "block";
              });

              // cerrar al clicar fuera
              const docHandler = function (ev) {
                if (!wrap.contains(ev.target)) panel.style.display = "none";
              };
              setTimeout(function () {
                document.addEventListener("click", docHandler);
              }, 10);

              // colocar reemplazo justo después del select para preservar layout
              try {
                // eliminar cualquier display fallback residuo (id*_display)
                try {
                  const disp = modal.querySelector(
                    "#" + (selectEl.id || "") + "_display"
                  );
                  if (disp) disp.remove();
                } catch (e) {}
                selectEl.parentNode.insertBefore(wrap, selectEl.nextSibling);
              } catch (e) {
                selectEl.parentNode.appendChild(wrap);
              }

              // mantener texto del reemplazo sincronizado si el select nativo cambia en otro lugar
              selectEl.addEventListener("change", function () {
                try {
                  const opt = selectEl.options[selectEl.selectedIndex];
                  span.textContent =
                    (opt && (opt.textContent || opt.innerText)) ||
                    selectEl.value ||
                    "-";
                } catch (e) {}
              });

              // ocultar visualmente el select nativo pero conservarlo en el DOM para envío de formulario
              try {
                selectEl.style.display = "none";
              } catch (e) {}

              // accesibilidad: hacer el reemplazo enfocadle y role=listbox
              try {
                wrap.setAttribute("tabindex", "0");
                wrap.setAttribute("role", "listbox");
              } catch (e) {}

              // cerrar panel con Escape cuando el reemplazo esté enfocado
              wrap.addEventListener("keydown", function (ev) {
                try {
                  if (ev.key === "Escape" || ev.key === "Esc") {
                    panel.style.display = "none";
                    wrap.blur();
                  }
                } catch (e) {}
              });
            }

            // Aplicar reemplazos para los selects problemáticos conocidos en el modal de edición
            try {
              createSelectReplacement(
                modal,
                modal.querySelector("#tipoCuenta_edit") ||
                  modal.querySelector("#tipoCuenta")
              );
            } catch (e) {}
            try {
              createSelectReplacement(
                modal,
                modal.querySelector("#tipoDocumento_edit") ||
                  modal.querySelector("#tipoDocumento")
              );
            } catch (e) {}
          } catch (e) {}
        } catch (e) {}
      }

      // Mover modal a document.body para evitar problemas de contexto de apilamiento / ocultamiento por overflow
      try {
        if (
          modal &&
          modal.parentElement &&
          modal.parentElement !== document.body
        ) {
          // store original parent and nextSibling to restore later
          modal._originalParent = modal.parentElement;
          modal._originalNextSibling = modal.nextSibling;
          document.body.appendChild(modal);
        }
      } catch (e) {
        console.warn("Could not move modal to body:", e);
      }

      // a punto de mostrar el modal

      // Limpiar displays fallback duplicados si los selects nativos están visibles
      try {
        Array.from(modal.querySelectorAll('[id$="_display"]')).forEach(
          function (d) {
            try {
              // obtener el posible select relacionado
              var selId = d.id.replace(/_display$/, "");
              var sel =
                modal.querySelector("#" + selId) ||
                document.querySelector("#" + selId);
              if (sel && isElementVisible(sel)) {
                // si el select es visible, eliminar el display fallback
                d.remove();
              }
            } catch (e) {}
          }
        );
      } catch (e) {}

      // Forzar visibilidad usando estilos inline para evitar conflictos CSS / problemas de contexto de apilamiento
      try {
        modal.style.display = "flex";
        // hacer que el modal cubra la ventana y esté por encima de otros contextos
        modal.style.position = "fixed";
        modal.style.top = "0";
        modal.style.left = "0";
        modal.style.right = "0";
        modal.style.bottom = "0";
        modal.style.zIndex = "99999";
        // color del backdrop (inline para asegurar visibilidad)
        modal.style.backgroundColor =
          modal.style.backgroundColor || "rgba(0,0,0,0.45)";

        modal.classList.add("show", "modal-open", "is-open");
        document.body.classList.add("modal-open");
      } catch (e) {
        console.warn("Unable to force inline modal styles:", e);
      }

      // Accesibilidad: enfocar el control principal de cierre dentro del modal si existe
      try {
        var focusCandidate =
          modal.querySelector('[data-action="close-modal"]') ||
          modal.querySelector(".modal-expert .btn-close") ||
          modal.querySelector(".modal-expert__header .btn-close");
        if (focusCandidate && typeof focusCandidate.focus === "function") {
          // pequeño timeout para permitir que el navegador renderice y para lectores de pantalla
          setTimeout(function () {
            try {
              focusCandidate.focus();
            } catch (e) {}
          }, 60);
        }
      } catch (e) {}

      // Si este modal es solo de visualización, asegurar que los custom selects dentro sean totalmente no interactivos
      try {
        if (type === "view") {
          Array.from(modal.querySelectorAll(".custom-select")).forEach(
            function (cs) {
              try {
                cs.classList.add("disabled");
                cs.setAttribute("aria-disabled", "true");
                // eliminar del orden de tabulación
                try {
                  cs.setAttribute("tabindex", "-1");
                } catch (e) {}
                // deshabilitar eventos de puntero en el trigger y opciones para que los clics no lo abran
                var trigger = cs.querySelector(".custom-select__trigger");
                if (trigger) {
                  trigger.style.pointerEvents = "none";
                  trigger.style.cursor = "default";
                }
                var opts = cs.querySelector(".custom-select__options");
                if (opts) opts.style.pointerEvents = "none";
                // también marcar los elementos de opción como aria-disabled
                Array.from(
                  cs.querySelectorAll(
                    ".custom-select__options li, .custom-select__option"
                  )
                ).forEach(function (li) {
                  try {
                    li.setAttribute("aria-disabled", "true");
                    li.style.pointerEvents = "none";
                  } catch (e) {}
                });
              } catch (e) {}
            }
          );

          // Para el modo 'view' mostramos los días pero NO permitimos que el
          // usuario los modifique desde este modal. Deshabilitamos los
          // botones y prevenimos clicks (captura) para evitar que listeners
          // delegados o accidentalmente enlazados cambien su estado.
          try {
            Array.from(modal.querySelectorAll(".day-button")).forEach(function (
              db
            ) {
              try {
                // Deshabilitación nativa para botones
                db.disabled = true;
                db.classList.add("disabled");
                db.setAttribute("aria-disabled", "true");
                // eliminar del orden de tabulación
                try {
                  db.setAttribute("tabindex", "-1");
                } catch (e) {}
                // prevenir interacciones de puntero
                db.style.pointerEvents = "none";
                db.style.cursor = "default";
                // Interceptar clicks en fase de captura para bloquear delegados
                db.addEventListener(
                  "click",
                  function (ev) {
                    try {
                      ev.preventDefault();
                      ev.stopImmediatePropagation();
                    } catch (e) {}
                  },
                  true
                );
              } catch (e) {}
            });
          } catch (e) {}
        }
      } catch (e) {}

      // visibilidad del modal forzada mediante estilos inline
    } catch (e) {
      console.error(`Error opening ${type} modal:`, e);
      alert(`Error al abrir modal: ${e.message}`);
    }
  }

  function openModalView(id) {
    openModal("view", id);
  }
  function openModalEdit(id) {
    openModal("edit", id);
  }

  // ===== FILTRADO =====
  function applyFilters() {
    // Filtrado por estado, categoría y búsqueda de texto (headerSearch)
    const estado = $("#estadoFilter")?.value || "";
    const categoria = $("#filterCategoria")?.value || "";
    const term = (headerSearch?.value || "").trim().toLowerCase();

    try {
      filteredExperts = allExperts.filter(function (ex) {
        if (estado && estado !== "all") {
          const st = (getExpertField(ex, "status") || "").toString();
          if (st !== estado) return false;
        }
        if (categoria) {
          const ids = getCategoryIdsForExpert(ex) || [];
          if (!ids.map(String).includes(String(categoria))) return false;
        }
        if (term) {
          const haystack = (
            (getExpertField(ex, "name") || "") +
            " " +
            (getExpertField(ex, "email") || "") +
            " " +
            (getCategoryNamesForExpert(ex, categoriesMap) || []).join(" ")
          ).toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        return true;
      });
    } catch (e) {
      console.warn("applyFilters error", e);
      filteredExperts = [...allExperts];
    }

    // Asegurar página dentro de rango
    if (!currentPage || currentPage < 1) currentPage = 1;
    renderRows(filteredExperts, categoriesMap, currentPage, pageSize);
  }

  function initSelectAll() {
    $("#selectAll")?.addEventListener("change", function () {
      const isChecked = this.checked;
      $$(".expertos-checkbox-row").forEach((cb) => {
        cb.checked = isChecked;
      });
    });
  }

  function initModalClose() {
    const closeSelectors = [
      ".modal-expert .btn-close",
      '.modal-expert [data-dismiss="modal"]',
      '.modal-expert [data-action="close-modal"]',
    ];

    closeSelectors.forEach((selector) => {
      $$(selector).forEach((btn) => {
        btn.addEventListener("click", function () {
          const modal = this.closest(".modal-expert");
          if (modal) {
            // ocultar y eliminar estilos en línea forzados
            modal.style.display = "none";
            try {
              modal.style.position = null;
              modal.style.top = null;
              modal.style.left = null;
              modal.style.right = null;
              modal.style.bottom = null;
              modal.style.zIndex = null;
              modal.style.backgroundColor = null;
            } catch (e) {}
            modal.classList.remove("show", "modal-open", "is-open");
            try {
              document.body.classList.remove("modal-open");
            } catch (e) {}

            // Si movimos el modal al body anteriormente, restaurar la posición original
            try {
              if (modal._originalParent) {
                if (modal._originalNextSibling) {
                  modal._originalParent.insertBefore(
                    modal,
                    modal._originalNextSibling
                  );
                } else {
                  modal._originalParent.appendChild(modal);
                }
                modal._originalParent = null;
                modal._originalNextSibling = null;
              }
            } catch (e) {
              console.warn("Could not restore modal original parent:", e);
            }

            // Limpiar contenido del modal para evitar que valores persistan entre aperturas
            try {
              if (typeof clearModalInputs === "function") {
                clearModalInputs(modal);
              }
              // limpieza agresiva específica para el modal de creación
              try {
                if (
                  modal &&
                  modal.id === "expertModal" &&
                  typeof clearAddExpertModal === "function"
                ) {
                  clearAddExpertModal(modal);
                }
              } catch (e) {}
            } catch (e) {}
          }
        });
      });
    });

    // Cerrar con la tecla Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" || e.key === "Esc") {
        const openModal = document.querySelector(
          ".modal-expert.is-open, .modal-expert.show, .modal-expert[style*='display: flex']"
        );
        if (openModal) {
          try {
            openModal.style.display = "none";
            openModal.classList.remove("show", "modal-open", "is-open");
            openModal.style.position = null;
            openModal.style.top = null;
            openModal.style.left = null;
            openModal.style.right = null;
            openModal.style.bottom = null;
            openModal.style.zIndex = null;
            openModal.style.backgroundColor = null;
          } catch (e) {}
          try {
            document.body.classList.remove("modal-open");
          } catch (e) {}

          try {
            if (openModal._originalParent) {
              if (openModal._originalNextSibling) {
                openModal._originalParent.insertBefore(
                  openModal,
                  openModal._originalNextSibling
                );
              } else {
                openModal._originalParent.appendChild(openModal);
              }
              openModal._originalParent = null;
              openModal._originalNextSibling = null;
            }
          } catch (e) {
            console.warn(
              "Could not restore modal original parent after Escape:",
              e
            );
          }
          // Limpiar contenido del modal para evitar que valores persistan entre aperturas
          try {
            clearModalInputs(openModal);
            try {
              if (
                openModal &&
                openModal.id === "expertModal" &&
                typeof clearAddExpertModal === "function"
              ) {
                clearAddExpertModal(openModal);
              }
            } catch (e) {}
          } catch (e) {}
        }
      }
    });
  }

  // ===== ESTADO DE LA APLICACIÓN =====
  const allExperts = parseJsonId("initial-expertos") || [];
  // Categorias: el backend ahora devuelve objetos normalizados {id,name,icon,...}
  const categorias = parseJsonId("categorias-data") || [];

  const categoriesMap = categorias.reduce((map, c) => {
    map[c.id || ""] = c.name || "";
    return map;
  }, {});

  let filteredExperts = [...allExperts];
  let currentPage = 1;
  const pageSize = 10;
  let headerSearch = null;
  // Id del experto actualmente en edición (si se abrió el modal de editar)
  let currentEditingExpertId = null;

  // Inicializador principal que deja la UI lista: pobla filtros, renderiza filas y enlaza controles
  function init() {
    try {
      // Poblar select de categorias si existe
      const catSelect = document.getElementById("filterCategoria");
      if (catSelect) {
        try {
          catSelect.innerHTML =
            "<option value=''>Todas</option>" +
            (categorias || [])
              .map(function (c) {
                return (
                  '<option value="' +
                  (c.id || "") +
                  '">' +
                  escapeHtml(c.name || c.label || "") +
                  "</option>"
                );
              })
              .join("");
        } catch (e) {}
      }

      // Render inicial
      filteredExperts = Array.isArray(allExperts) ? allExperts.slice() : [];
      renderRows(filteredExperts, categoriesMap, currentPage, pageSize);

      // Inicializaciones auxiliares
      try {
        initModalClose();
      } catch (e) {}

      // Enlazar cambios de filtros
      try {
        const estadoSel = document.getElementById("filterEstado");
        if (estadoSel)
          estadoSel.addEventListener("change", function () {
            currentPage = 1;
            applyFilters();
          });
        const categoriaSel = document.getElementById("filterCategoria");
        if (categoriaSel)
          categoriaSel.addEventListener("change", function () {
            currentPage = 1;
            applyFilters();
          });
      } catch (e) {}
    } catch (e) {
      console.warn("init error", e);
    }
  }

  // ===== EXPORTACIONES GLOBALES PARA DEBUGGING =====
  // Hacer funciones disponibles globalmente para debugging
  window.openModalView = openModalView;
  window.openModalEdit = openModalEdit;
  window.openModal = openModal;
  window.allExperts = allExperts;

  // ===== CategoriasSelector (migrated from inline EJS) =====
  class CategoriasSelector {
    constructor() {
      this.selectedCategories = new Set();
      this._categoriesCache = null;
      this._optionsById = {};
      this.init();
    }

    init() {
      this.input = document.getElementById("categorias-input");
      this.chipsContainer = document.getElementById("categorias-chips");
      this.optionsContainer = document.getElementById("categorias-options");
      this.hiddenInput = document.getElementById("categorias-values");

      this.loadCategories();
      this.bindEvents();
    }

    loadCategories() {
      const script = document.getElementById("categorias-data");

      const tryInline = () => {
        if (!script) return false;
        try {
          const payload = JSON.parse(
            script.textContent || script.innerText || "[]"
          );
          if (Array.isArray(payload) && payload.length) {
            const normalizedPayload = payload.map((c) => ({
              id: String(c._id || c.id || ""),
              name: String(c.nombre || c.name || c.label || ""),
              icon: String(c.icon || c.icono || ""),
              slug: String(c.slug || ""),
              parent:
                String(
                  (c.parent && (c.parent.nombre || c.parent)) || c.parent || "-"
                ) || "-",
              estado: String(
                c.estado ||
                  (c.active === false
                    ? "inactive"
                    : c.active === true
                    ? "active"
                    : "Activa")
              ),
              publicacionesCount:
                Number(c.publicacionesCount || c.postsCount || 0) || 0,
              expertosCount:
                Number(c.expertosCount || c.expertsCount || 0) || 0,
              descripcion: String(c.descripcion || c.description || ""),
            }));
            this.renderOptions(normalizedPayload);
            this._categoriesCache = normalizedPayload;
            try {
              sessionStorage.setItem(
                "categoriasCache",
                JSON.stringify(normalizedPayload)
              );
            } catch (e) {}
            // update global variables used by admin-expertos
            categorias.splice(
              0,
              categorias.length,
              ...normalizedPayload.map(function (x) {
                return { id: x.id, name: x.name, icon: x.icon };
              })
            );
            Object.keys(categoriesMap).forEach((k) => delete categoriesMap[k]);
            normalizedPayload.forEach(function (x) {
              categoriesMap[x.id] = x.name;
            });
            return true;
          }
        } catch (e) {
          console.warn("categorias-data malformado:", e);
        }
        return false;
      };

      if (tryInline()) return;

      try {
        const cached = sessionStorage.getItem("categoriasCache");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length) {
            this.renderOptions(parsed);
            this._categoriesCache = parsed;
            categorias.splice(
              0,
              categorias.length,
              ...parsed.map(function (x) {
                return { id: x.id, name: x.name, icon: x.icon };
              })
            );
            Object.keys(categoriesMap).forEach((k) => delete categoriesMap[k]);
            parsed.forEach(function (x) {
              categoriesMap[x.id] = x.name;
            });
          }
        }
      } catch (e) {}

      const fetchAndRender = async (nombreFiltro = "") => {
        try {
          const url =
            "/api/categorias" +
            (nombreFiltro ? "?nombre=" + encodeURIComponent(nombreFiltro) : "");
          const res = await fetch(url, { credentials: "same-origin" });
          if (!res.ok) throw new Error("HTTP " + res.status);
          const data = await res.json();
          if (Array.isArray(data)) {
            const normalized = data.map((c) => ({
              id: String(c._id || c.id || ""),
              name: String(c.nombre || c.name || c.label || ""),
              icon: String(c.icon || c.icono || ""),
              slug: String(c.slug || ""),
              parent:
                String(
                  (c.parent && (c.parent.nombre || c.parent)) || c.parent || "-"
                ) || "-",
              estado: String(
                c.estado ||
                  (c.active === false
                    ? "inactive"
                    : c.active === true
                    ? "active"
                    : "Activa")
              ),
              publicacionesCount:
                Number(c.publicacionesCount || c.postsCount || 0) || 0,
              expertosCount:
                Number(c.expertosCount || c.expertsCount || 0) || 0,
              descripcion: String(c.descripcion || c.description || ""),
            }));
            this.renderOptions(normalized);
            this._categoriesCache = normalized;
            try {
              sessionStorage.setItem(
                "categoriasCache",
                JSON.stringify(normalized)
              );
            } catch (e) {}
            categorias.splice(
              0,
              categorias.length,
              ...normalized.map(function (x) {
                return { id: x.id, name: x.name, icon: x.icon };
              })
            );
            Object.keys(categoriesMap).forEach((k) => delete categoriesMap[k]);
            normalized.forEach(function (x) {
              categoriesMap[x.id] = x.name;
            });
          } else {
            this.renderOptions([]);
          }
        } catch (err) {
          console.error(
            "No se pudieron cargar las categorías desde la API:",
            err
          );
          this.optionsContainer.innerHTML =
            '<div class="categorias-error" style="display:block">No se pudieron cargar las categorías.</div>';
        }
      };

      fetchAndRender();

      if (this.input) {
        this._debounceTimer = null;
        this._serverSearchListener = (e) => {
          const term = (e.target.value || "").trim();
          if (this._debounceTimer) clearTimeout(this._debounceTimer);
          this._debounceTimer = setTimeout(() => {
            if (!term) {
              if (this._categoriesCache) {
                this.renderOptions(this._categoriesCache);
              } else {
                fetchAndRender();
              }
            } else {
              fetchAndRender(term);
            }
          }, 300);
        };

        try {
          this.input.removeEventListener("input", this._serverSearchListener);
        } catch (e) {}
        this.input.addEventListener("input", this._serverSearchListener);
      }
    }

    renderOptions(categories) {
      const list = categories || [];
      this._optionsById = {};
      list.forEach((c) => {
        const id = String(c.id || c._id || "");
        const name = String(c.name || c.nombre || "Sin nombre");
        this._optionsById[id] = name;
      });

      this.optionsContainer.innerHTML = list
        .map(
          (cat) =>
            `\n      <div class="categoria-option" data-id="${String(
              cat.id || cat._id || ""
            )}">
        <div class="categoria-option-checkbox"></div>\n        ${
          cat.icon ? `<i class="fas ${cat.icon}" aria-hidden="true"></i>` : ""
        }\n        <span>${String(
              cat.name || cat.nombre || "Sin nombre"
            )}</span>\n      </div>\n    `
        )
        .join("");

      if (this.selectedCategories && this.selectedCategories.size) {
        this.selectedCategories.forEach((id) => {
          const opt = this.optionsContainer.querySelector(`[data-id="${id}"]`);
          if (opt) opt.classList.add("selected");
        });
      }
    }

    bindEvents() {
      if (this.input)
        this.input.addEventListener("input", (e) => {
          this.filterOptions(e.target.value);
        });
      if (this.optionsContainer) {
        this.optionsContainer.addEventListener("click", (e) => {
          const option = e.target.closest(".categoria-option");
          if (option) this.toggleCategory(option);
        });
      }
      if (this.chipsContainer) {
        this.chipsContainer.addEventListener("click", (e) => {
          if (e.target.closest(".categoria-chip-remove")) {
            const chip = e.target.closest(".categoria-chip");
            const categoryId = chip.dataset.id;
            this.removeCategory(categoryId);
          }
        });
      }
    }

    toggleCategory(optionElement) {
      const categoryId = optionElement.dataset.id;
      const categoryName = optionElement.querySelector("span").textContent;

      if (this.selectedCategories.has(categoryId)) {
        this.removeCategory(categoryId);
      } else {
        this.addCategory(categoryId, categoryName);
      }

      optionElement.classList.toggle("selected");
      this.updateHiddenInput();
      this.validate();
    }

    addCategory(id, name) {
      this.selectedCategories.add(id);
      this.renderChips();
    }
    removeCategory(id) {
      this.selectedCategories.delete(id);
      this.renderChips();
      const option = this.optionsContainer.querySelector(`[data-id="${id}"]`);
      if (option) option.classList.remove("selected");
    }

    renderChips() {
      if (this.selectedCategories.size === 0) {
        this.chipsContainer.innerHTML =
          '<span class="categorias-empty">No hay categorías seleccionadas</span>';
        return;
      }

      const chipsHTML = Array.from(this.selectedCategories)
        .map((id) => {
          const name =
            (this._optionsById && this._optionsById[id]) || "Categoría";
          return `\n        <div class="categoria-chip" data-id="${id}">\n          <span>${name}</span>\n          <button type="button" class="categoria-chip-remove" aria-label="Remover categoría">
            <i class="fas fa-times"></i>
          </button>
        </div>\n      `;
        })
        .join("");

      this.chipsContainer.innerHTML = chipsHTML;
      if (this.hiddenInput) {
        this.hiddenInput.value = Array.from(this.selectedCategories).join(",");
      }
    }

    filterOptions(searchTerm) {
      const options =
        this.optionsContainer.querySelectorAll(".categoria-option");
      const term = (searchTerm || "").toLowerCase();
      options.forEach((option) => {
        const text = (
          (option.querySelector("span") &&
            option.querySelector("span").textContent) ||
          ""
        ).toLowerCase();
        option.style.display = text.includes(term) ? "flex" : "none";
      });
    }

    updateHiddenInput() {
      if (this.hiddenInput)
        this.hiddenInput.value = Array.from(this.selectedCategories).join(",");
    }
    validate() {
      const isValid = this.selectedCategories.size > 0;
      this.chipsContainer.classList.toggle("error", !isValid);
      return isValid;
    }
    getSelectedCategories() {
      return Array.from(this.selectedCategories);
    }
  }

  // ===== LISTO AL CARGAR EL DOM =====
  // Se añaden listeners para búsqueda en la cabecera, botón de filtros e inicialización de la UI
  document.addEventListener("DOMContentLoaded", function () {
    // Helper global para limpiar inputs y estado visual dentro de un modal
    function clearModalInputs(modal) {
      if (!modal) return;
      try {
        Array.from(modal.querySelectorAll("form")).forEach(function (f) {
          try {
            if (typeof f.reset === "function") f.reset();
          } catch (e) {}
        });
        Array.from(
          modal.querySelectorAll(".field-error, .field-status")
        ).forEach(function (el) {
          try {
            el.parentNode && el.parentNode.removeChild(el);
          } catch (e) {}
        });
        Array.from(modal.querySelectorAll(".input-error")).forEach(function (
          el
        ) {
          try {
            el.classList.remove("input-error");
          } catch (e) {}
        });
        Array.from(modal.querySelectorAll('[aria-invalid="true"]')).forEach(
          function (el) {
            try {
              el.removeAttribute("aria-invalid");
            } catch (e) {}
          }
        );
        Array.from(modal.querySelectorAll(".day-button.active")).forEach(
          function (b) {
            try {
              b.classList.remove("active");
              try {
                b.setAttribute("aria-pressed", "false");
              } catch (e) {}
            } catch (e) {}
          }
        );
        Array.from(
          modal.querySelectorAll('input[id*="diasDisponibles"]')
        ).forEach(function (h) {
          try {
            h.value = "";
          } catch (e) {}
        });
        try {
          var defaultAvatar = "/uploads/avatar_1757538342469.jpg";
          Array.from(
            modal.querySelectorAll(
              'img[id^="profilePreview"], .preview-container img'
            )
          ).forEach(function (img) {
            try {
              if (img) img.src = defaultAvatar;
            } catch (e) {}
          });
        } catch (e) {}
        Array.from(modal.querySelectorAll('[id$="_display"]')).forEach(
          function (d) {
            try {
              d.style.display = "none";
            } catch (e) {}
          }
        );
      } catch (e) {
        console.warn("clearModalInputs error", e);
      }
    }

    // Limpieza específica para el modal 'Agregar nuevo experto' (agresiva)
    function clearAddExpertModal(modal) {
      if (!modal) return;
      try {
        // campos simples
        [
          "name",
          "email",
          "precio",
          "bio",
          "numeroCuenta",
          "titular",
          "numeroDocumento",
        ].forEach(function (id) {
          try {
            var el = modal.querySelector("#" + id);
            if (!el) return;
            if (
              el.tagName === "INPUT" ||
              el.tagName === "TEXTAREA" ||
              el.tagName === "SELECT"
            ) {
              el.value = "";
              try {
                if (el.options) el.selectedIndex = 0;
              } catch (e) {}
            }
          } catch (e) {}
        });

        // bancos / tipos
        try {
          var b = modal.querySelector("#banco_hidden_view");
          if (b) b.value = "";
          var t = modal.querySelector("#tipoCuenta_hidden_view");
          if (t) t.value = "";
        } catch (e) {}

        // categorias: limpiar chips y hidden
        try {
          var chips = modal.querySelector("#categorias-chips");
          if (chips)
            chips.innerHTML =
              '<span class="categorias-empty">No hay categorías seleccionadas</span>';
          var catsHidden = modal.querySelector("#categorias-values");
          if (catsHidden) catsHidden.value = "";
        } catch (e) {}

        // dias
        try {
          var daysDisplay = modal.querySelector(".days-display");
          if (daysDisplay) daysDisplay.textContent = "Ningún día seleccionado";
          Array.from(modal.querySelectorAll(".day-button.active")).forEach(
            function (b) {
              try {
                b.classList.remove("active");
                b.setAttribute("aria-pressed", "false");
              } catch (e) {}
            }
          );
          Array.from(
            modal.querySelectorAll('input[id*="diasDisponibles"]')
          ).forEach(function (h) {
            try {
              h.value = "";
            } catch (e) {}
          });
        } catch (e) {}

        // previews / file inputs
        try {
          Array.from(modal.querySelectorAll('input[type="file"]')).forEach(
            function (fi) {
              try {
                fi.value = "";
              } catch (e) {}
            }
          );
          Array.from(
            modal.querySelectorAll(
              'img[id^="profilePreview"], .preview-container img'
            )
          ).forEach(function (img) {
            try {
              img.src = "/uploads/avatar_1757538342469.jpg";
            } catch (e) {}
          });
        } catch (e) {}

        // limpiar errores y estados
        try {
          Array.from(
            modal.querySelectorAll(".field-error, .field-status")
          ).forEach(function (el) {
            try {
              el.remove();
            } catch (e) {}
          });
        } catch (e) {}
        try {
          Array.from(modal.querySelectorAll(".input-error")).forEach(function (
            el
          ) {
            try {
              el.classList.remove("input-error");
            } catch (e) {}
          });
        } catch (e) {}
      } catch (e) {
        console.warn("clearAddExpertModal error", e);
      }
    }
    // Por precaución: asegurar que los modales estén ocultos al cargar inicialmente a menos que se hayan abierto explícitamente
    try {
      document.querySelectorAll(".modal-expert").forEach(function (modal) {
        if (modal.classList.contains("is-open")) {
          modal.style.display = "flex";
        } else {
          modal.style.display = "none";
        }
      });
    } catch (e) {}
    headerSearch = $(".header-search input");
    headerSearch?.addEventListener("input", () => {
      currentPage = 1;
      applyFilters();
    });

    // Agregar listener para el filtro de estado
    $("#estadoFilter")?.addEventListener("change", () => {
      currentPage = 1;
      applyFilters();
    });

    $("#applyFiltersBtn")?.addEventListener("click", () => {
      currentPage = 1;
      applyFilters();
    });

    // Diagnostic log: imprime datos iniciales para depuración en consola
    try {
      // initial diagnostics removed for cleaner console output
    } catch (e) {
      console.warn("admin-expertos diagnóstico: error al imprimir datos", e);
    }

    // Escuchar actualizaciones de categorías desde el panel de categorías
    try {
      document.addEventListener("categorias:updated", function (ev) {
        try {
          const updated = (ev && ev.detail && ev.detail.categories) || [];
          if (Array.isArray(updated) && updated.length) {
            // actualizar array local 'categorias' usado por este módulo
            categorias.splice(
              0,
              categorias.length,
              ...updated.map(function (c) {
                return {
                  id: String(c._id || c.id || c.id),
                  name: String(c.nombre || c.name || c.label || c.name),
                  icon: c.icon || "",
                };
              })
            );

            // reconstruir mapa
            Object.keys(categoriesMap).forEach(function (k) {
              delete categoriesMap[k];
            });
            (updated || []).forEach(function (c) {
              const id = String(c._id || c.id || "");
              const name = String(c.nombre || c.name || c.label || "");
              categoriesMap[id] = name;
            });

            // construir mapa de estado de categorias para uso global
            try {
              window.__categoriesStateMap = window.__categoriesStateMap || {};
              (updated || []).forEach(function (c) {
                const id = String(c._id || c.id || "");
                const estado = String(
                  c.estado || c.active || "inactive"
                ).toLowerCase();
                window.__categoriesStateMap[id] = estado;
              });
            } catch (e) {}

            // actualizar filtro de categoría
            try {
              const catSelect = document.getElementById("filterCategoria");
              if (catSelect) {
                const prev = catSelect.value;
                catSelect.innerHTML =
                  "<option value=''>Todas</option>" +
                  (categorias || [])
                    .map(function (c) {
                      return (
                        '<option value="' +
                        (c.id || "") +
                        '">' +
                        escapeHtml(c.name || "") +
                        "</option>"
                      );
                    })
                    .join("");
                try {
                  catSelect.value = prev;
                } catch (e) {}
              }
            } catch (e) {}

            // actualizar select multiple dentro del modal editar experto
            try {
              const multi = document.getElementById("categorias_edit");
              if (multi) {
                const prev = Array.from(multi.selectedOptions || []).map(
                  function (o) {
                    return o.value;
                  }
                );
                multi.innerHTML = (categorias || [])
                  .map(function (c) {
                    return (
                      '<option value="' +
                      (c.id || "") +
                      '">' +
                      escapeHtml(c.name || "") +
                      "</option>"
                    );
                  })
                  .join("");
                // restaurar selección previa si es posible
                prev.forEach(function (v) {
                  try {
                    const opt = multi.querySelector(
                      'option[value="' + v + '"]'
                    );
                    if (opt) opt.selected = true;
                  } catch (e) {}
                });
              }
            } catch (e) {}

            // actualizar el selector de categorías (widget) si existe
            try {
              if (
                window._categoriasSelector &&
                typeof window._categoriasSelector.renderOptions === "function"
              ) {
                window._categoriasSelector.renderOptions(
                  updated.map(function (c) {
                    return {
                      id: String(c._id || c.id || ""),
                      name: String(c.nombre || c.name || c.label || ""),
                      icon: c.icon || "",
                      slug: c.slug || "",
                      parent: c.parent || "",
                      estado: (c.estado || "inactive").toLowerCase(),
                    };
                  })
                );
              }
            } catch (e) {}
          }
          // Forzar re-render de la tabla de expertos para que refleje categorías inactivas
          try {
            currentPage = 1;
            applyFilters();
          } catch (e) {}
        } catch (err) {
          console.warn("Error procesando categorias:updated", err);
        }
      });
    } catch (e) {}

    // ===== MOVED FROM INLINE SCRIPTS IN EJS =====
    // ...existing code...

    // Inicializador del botón "Nuevo experto": abre modal y coloca avatar por defecto
    function initAddExpertButton() {
      try {
        const defaultAvatar = "/uploads/avatar_1757538342469.jpg";

        // Asegurar vista previa por defecto en los distintos contenedores si están vacíos
        Array.from(
          document.querySelectorAll(
            "#profilePreview img, #profilePreview_edit img, #profilePreview_view img"
          )
        ).forEach(function (img) {
          try {
            if (
              img &&
              (!img.getAttribute("src") ||
                img.getAttribute("src").trim() === "")
            ) {
              img.src = defaultAvatar;
              img.alt = "Avatar por defecto";
            }
          } catch (e) {}
        });

        // Intentar enlazar al botón y modal directamente
        const btn = document.getElementById("btnAddExpert");
        const modal = document.getElementById("expertModal");

        function showExpertModal(modalEl) {
          try {
            // Asegurar limpieza previa para evitar que queden valores entre aperturas
            try {
              if (modalEl && modalEl.id === "expertModal") {
                if (typeof clearAddExpertModal === "function")
                  clearAddExpertModal(modalEl);
                try {
                  var f = modalEl.querySelector("form");
                  if (f && typeof f.reset === "function") f.reset();
                } catch (e) {}
              }
            } catch (e) {}
            if (!modalEl) return;
            // Move modal to document.body to avoid stacking context / overflow hiding issues
            try {
              if (
                modalEl.parentElement &&
                modalEl.parentElement !== document.body
              ) {
                modalEl._originalParent = modalEl.parentElement;
                modalEl._originalNextSibling = modalEl.nextSibling;
                document.body.appendChild(modalEl);
              }
            } catch (e) {
              console.warn("Could not move modal to body:", e);
            }

            // Mostrar con estilos en línea para evitar conflictos de CSS externos
            modalEl.style.display = "flex";
            modalEl.style.position = "fixed";
            modalEl.style.top = "0";
            modalEl.style.left = "0";
            modalEl.style.right = "0";
            modalEl.style.bottom = "0";
            modalEl.style.zIndex = "99999";
            modalEl.style.backgroundColor =
              modalEl.style.backgroundColor || "rgba(0,0,0,0.45)";

            modalEl.classList.add("show", "modal-open", "is-open");
            try {
              document.body.classList.add("modal-open");
            } catch (e) {}

            try {
              const firstInput = modalEl.querySelector(
                'input[type="text"], input:not([type]), textarea'
              );
              if (firstInput) firstInput.focus();
            } catch (e) {}

            // Evitar que el autofill del navegador vuelva a rellenar los campos
            try {
              const nameInput = modalEl.querySelector("#name");
              const emailInput = modalEl.querySelector("#email");
              [nameInput, emailInput].forEach(function (inp) {
                try {
                  if (!inp) return;
                  // borrar valor y deshabilitar atributos de autocompletado
                  try {
                    inp.value = "";
                  } catch (e) {}
                  try {
                    inp.setAttribute("autocomplete", "off");
                  } catch (e) {}
                  try {
                    inp.setAttribute("autocorrect", "off");
                  } catch (e) {}
                  try {
                    inp.setAttribute("autocapitalize", "off");
                  } catch (e) {}
                  try {
                    inp.setAttribute("spellcheck", "false");
                  } catch (e) {}
                  // truco: marcar como readonly brevemente para bloquear autofill en algunos navegadores
                  try {
                    inp.readOnly = true;
                  } catch (e) {}
                  try {
                    setTimeout(function () {
                      inp.readOnly = false;
                    }, 80);
                  } catch (e) {}
                } catch (e) {}
              });
              // Repetir una limpieza breve después para contrarrestar rellenados tardíos
              try {
                setTimeout(function () {
                  try {
                    const n = modalEl.querySelector("#name");
                    const em = modalEl.querySelector("#email");
                    if (n && (n.value || "").trim() === "")
                      try {
                        n.value = "";
                      } catch (e) {}
                    if (em && (em.value || "").trim() === "")
                      try {
                        em.value = "";
                      } catch (e) {}
                  } catch (e) {}
                }, 160);
              } catch (e) {}
            } catch (e) {}

            // Asegurar que los botones de días dentro del modal estén activados y enlazados
            try {
              const dayButtonsInModal = Array.from(
                modalEl.querySelectorAll(".day-button")
              );
              dayButtonsInModal.forEach(function (btn) {
                try {
                  // Revertir cualquier deshabilitación previa
                  btn.disabled = false;
                  btn.removeAttribute("aria-disabled");
                  try {
                    btn.removeAttribute("tabindex");
                  } catch (e) {}
                  btn.style.pointerEvents = "auto";
                  btn.style.cursor = "pointer";

                  // Evitar múltiples bindings
                  if (!btn.dataset._dayHandlerBound) {
                    btn.addEventListener("click", function (ev) {
                      try {
                        // si está deshabilitado por otro motivo, no hacer nada
                        if (
                          btn.disabled ||
                          btn.getAttribute("aria-disabled") === "true"
                        ) {
                          ev.preventDefault();
                          ev.stopPropagation();
                          return;
                        }
                        const modal =
                          btn.closest(".modal-expert") || modalEl || document;
                        btn.classList.toggle("active");
                        try {
                          btn.setAttribute(
                            "aria-pressed",
                            btn.classList.contains("active") ? "true" : "false"
                          );
                        } catch (e) {}

                        const activeDays = Array.from(
                          modal.querySelectorAll(".day-button.active")
                        ).map((b) => b.getAttribute("data-day"));
                        const daysDisplay =
                          modal.querySelector(".days-display");
                        if (daysDisplay)
                          daysDisplay.textContent =
                            activeDays.length === 0
                              ? "Ningún día seleccionado"
                              : activeDays.join(", ");

                        try {
                          const diasHiddenEdit = modal.querySelector(
                            "#diasDisponibles_edit"
                          );
                          const diasHidden =
                            modal.querySelector("#diasDisponibles");
                          const targetHidden = diasHiddenEdit || diasHidden;
                          if (targetHidden)
                            targetHidden.value = Array.isArray(activeDays)
                              ? activeDays.join(",")
                              : activeDays || "";
                        } catch (e) {}
                      } catch (e) {}
                    });
                    btn.dataset._dayHandlerBound = "true";
                  }
                } catch (e) {}
              });
            } catch (e) {}

            // expert modal shown (log suppressed)
          } catch (e) {
            console.warn("showExpertModal error", e);
          }
        }

        if (btn) {
          try {
            btn.addEventListener("click", function (e) {
              e.preventDefault();
              // Preferir el modal referenciado actualmente en DOM (puede cambiar)
              const m = document.getElementById("expertModal");
              showExpertModal(m);
            });
            return;
          } catch (e) {
            console.warn("initAddExpertButton: error al enlazar btn click", e);
          }
        }

        // Fallback: delegación si el botón o modal no estaban presentes al enlazar
        document.addEventListener("click", function (e) {
          try {
            const target =
              e.target && e.target.closest && e.target.closest("#btnAddExpert");
            if (!target) return;
            e.preventDefault();
            const m = document.getElementById("expertModal");
            showExpertModal(m);
          } catch (err) {}
        });
      } catch (e) {
        console.warn("initAddExpertButton error", e);
      }
    }

    // ...existing code...
    initAddExpertButton();

    // Handler para formularios de experto (soporta múltiples modales con el mismo form id)
    function initExpertForm() {
      try {
        const forms = Array.from(
          document.querySelectorAll("form#expertForm, form#expertForm_edit")
        );
        if (!forms.length) return;

        // helper: mostrar toast simple
        function showToast(msg, type = "success") {
          try {
            let container = document.getElementById("toast-container");
            if (!container) {
              container = document.createElement("div");
              container.id = "toast-container";
              container.style.position = "fixed";
              container.style.right = "20px";
              container.style.top = "20px";
              container.style.zIndex = "9999";
              document.body.appendChild(container);
            }
            const el = document.createElement("div");
            el.textContent = msg;
            el.style.background = type === "error" ? "#e53e3e" : "#2f855a";
            el.style.color = "white";
            el.style.padding = "10px 14px";
            el.style.borderRadius = "6px";
            el.style.marginTop = "8px";
            el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
            container.appendChild(el);
            setTimeout(() => {
              try {
                el.remove();
              } catch (e) {}
            }, 3500);
          } catch (e) {}
        }

        async function uploadImage(file) {
          if (!file) return null;
          try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/uploads", {
              method: "POST",
              body: fd,
              credentials: "same-origin",
            });
            if (!res.ok) throw new Error("upload failed: " + res.status);
            const json = await res.json();
            return json && (json.url || json.path || json.fileUrl)
              ? json.url || json.path || json.fileUrl
              : null;
          } catch (e) {
            console.warn("uploadImage error", e);
            return null;
          }
        }

        // Adjuntar manejador de envío para cada instancia de formulario/modal
        forms.forEach((form) => {
          try {
            const modal = form.closest(".modal-expert");

            // enlazar el botón de enviar del pie de página dentro de este modal para activar el formulario correcto
            try {
              const footerSubmit =
                modal &&
                modal.querySelector(
                  '.modal-expert__footer button[type="submit"]'
                );
              if (footerSubmit) {
                footerSubmit.addEventListener("click", function () {
                  try {
                    if (typeof form.requestSubmit === "function")
                      form.requestSubmit();
                    else
                      form.dispatchEvent(
                        new Event("submit", { bubbles: true, cancelable: true })
                      );
                  } catch (e) {
                    console.warn("footer submit click error", e);
                  }
                });
              }
            } catch (e) {}

            form.addEventListener("submit", async function (ev) {
              ev.preventDefault();
              try {
                // determinar el botón de envío para este modal/formulario
                const submitBtn =
                  (modal &&
                    modal.querySelector(
                      '.modal-expert__footer button[type="submit"]'
                    )) ||
                  form.querySelector('button[type="submit"]');
                if (submitBtn) {
                  submitBtn.disabled = true;
                  submitBtn.dataset.origText = submitBtn.textContent;
                  submitBtn.textContent = "Guardando...";
                }

                // selectores de campos con ámbito modal (soporta ids con sufijos _edit / _view)
                const qs = (sel) => {
                  try {
                    return (
                      (modal && modal.querySelector(sel)) ||
                      form.querySelector(sel) ||
                      null
                    );
                  } catch (e) {
                    return null;
                  }
                };

                const nameInput = qs("#name");
                const emailInput = qs("#email");
                const precioInput = qs("#precio");
                const statusInput =
                  qs("#statusInput") || qs('input[name="status"]');
                const categoriasHidden =
                  qs('[id*="categorias-values"]') ||
                  qs('input[name="categorias"]');
                const fileInput =
                  qs("#profileImage") ||
                  qs("#profileImage_edit") ||
                  qs("#profileImage_view");
                const tipoDocumentoEl =
                  qs('[id*="tipoDocumento"]') || qs('[name="tipoDocumento"]');
                const diasHidden =
                  qs('[id*="diasDisponibles"]') ||
                  qs('input[name="diasDisponibles"]');

                const name = (nameInput?.value || "").trim();
                const email = (emailInput?.value || "").trim();
                const precio = Number(precioInput?.value || 0) || 0;
                const status = (statusInput?.value || "active").trim();
                // categorias: preferir input oculto, fallback a chips u opciones seleccionadas en el modal
                let categoriasValues = (categoriasHidden?.value || "")
                  .split(",")
                  .filter(Boolean);
                if (!categoriasValues.length) {
                  try {
                    // chips con data-id (preservar orden visual)
                    const chips = Array.from(
                      (modal &&
                        modal.querySelectorAll(".categoria-chip[data-id]")) ||
                        []
                    );
                    if (chips.length) {
                      categoriasValues = chips
                        .map((c) => c.dataset.id)
                        .filter(Boolean);
                    } else {
                      // o buscar opciones seleccionadas en el panel de opciones
                      const opts = Array.from(
                        (modal &&
                          modal.querySelectorAll(
                            ".categoria-option.selected"
                          )) ||
                          []
                      );
                      if (opts.length)
                        categoriasValues = opts
                          .map((o) => o.getAttribute("data-id"))
                          .filter(Boolean);
                    }
                  } catch (e) {}
                }

                // tipoCuenta: tomar del select dentro del modal (ej. #tipoCuenta_edit)
                let tipoCuentaVal = "";
                try {
                  const tipoCuentaEl =
                    (modal && modal.querySelector('[id*="tipoCuenta"]')) ||
                    form.querySelector('[id*="tipoCuenta"]') ||
                    form.querySelector('[name="tipoCuenta"]');
                  if (tipoCuentaEl)
                    tipoCuentaVal = (
                      tipoCuentaEl.value ||
                      tipoCuentaEl.textContent ||
                      ""
                    ).trim();
                } catch (e) {}

                // tipoDocumento: preferir select/hidden dentro del modal
                let tipoDocumentoVal = "";
                try {
                  if (tipoDocumentoEl)
                    tipoDocumentoVal = (
                      tipoDocumentoEl.value ||
                      tipoDocumentoEl.textContent ||
                      ""
                    ).trim();
                } catch (e) {}

                // diasDisponibles: preferir hidden, en caso contrario leer botones de días activos dentro del modal
                let diasValues =
                  diasHidden && diasHidden.value
                    ? String(diasHidden.value).split(",").filter(Boolean)
                    : [];
                if (!diasValues.length) {
                  try {
                    const activeBtns = Array.from(
                      (modal && modal.querySelectorAll(".day-button.active")) ||
                        []
                    );
                    if (activeBtns.length)
                      diasValues = activeBtns
                        .map((b) => (b.getAttribute("data-day") || "").trim())
                        .filter(Boolean);
                  } catch (e) {}
                }

                // Validación cliente modal-scoped
                let hasError = false;
                try {
                  [nameInput, emailInput, precioInput].forEach((i) => {
                    if (!i) return;
                    const errEl =
                      (modal && modal.querySelector("#" + i.id + "-error")) ||
                      document.getElementById(i.id + "-error");
                    if (errEl) errEl.style.display = "none";
                    i.classList.remove("input-error");
                  });
                } catch (e) {}

                if (!name) {
                  const el =
                    (modal && modal.querySelector("#name-error")) ||
                    document.getElementById("name-error");
                  if (el) {
                    el.textContent = "El nombre es obligatorio.";
                    el.style.display = "block";
                  }
                  if (nameInput) nameInput.classList.add("input-error");
                  hasError = true;
                }
                if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
                  const el =
                    (modal && modal.querySelector("#email-error")) ||
                    document.getElementById("email-error");
                  if (el) {
                    el.textContent = "Email inválido.";
                    el.style.display = "block";
                  }
                  if (emailInput) emailInput.classList.add("input-error");
                  hasError = true;
                }
                if (!precio || precio <= 0) {
                  const el =
                    (modal && modal.querySelector("#precio-error")) ||
                    document.getElementById("precio-error");
                  if (el) {
                    el.textContent = "Precio inválido.";
                    el.style.display = "block";
                  }
                  if (precioInput) precioInput.classList.add("input-error");
                  hasError = true;
                }

                // categorias
                if (!categoriasValues.length) {
                  try {
                    if (modal)
                      modal
                        .querySelector(".categorias-chips")
                        ?.classList.add("error");
                  } catch (e) {}
                  hasError = true;
                  const err =
                    (modal && modal.querySelector(".categorias-error")) ||
                    document.querySelector(".categorias-error");
                  if (err) err.style.display = "block";
                }

                // tipoDocumento
                if (!tipoDocumentoVal) {
                  // intentar marcar el select si está presente
                  try {
                    if (tipoDocumentoEl && tipoDocumentoEl.classList)
                      tipoDocumentoEl.classList.add("input-error");
                  } catch (e) {}
                  hasError = true;
                }

                // diasDisponibles
                if (!diasValues.length) {
                  try {
                    if (modal)
                      modal
                        .querySelector(".days-display")
                        ?.classList.add("input-error");
                  } catch (e) {}
                  hasError = true;
                }

                if (hasError) {
                  if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent =
                      submitBtn.dataset.origText || "Guardar experto";
                  }
                  return;
                }

                // subir avatar si está presente
                let avatarUrl = null;
                try {
                  const file =
                    fileInput && fileInput.files && fileInput.files[0];
                  if (file) avatarUrl = await uploadImage(file);
                  else {
                    const avatarEl =
                      modal && modal.querySelector("#profilePreviewImage");
                    avatarUrl = avatarEl ? avatarEl.src : null;
                  }
                } catch (e) {
                  console.warn("image upload fallback", e);
                }

                // Mapeos para cumplir enums del backend
                function _mapEstado(v) {
                  if (!v) return undefined;
                  const s = String(v).toLowerCase();
                  if (s === "active" || s === "activo") return "activo";
                  if (s === "pending" || s === "pendiente")
                    return "pendiente-verificacion";
                  if (s === "inactive" || s === "inactivo") return "inactivo";
                  return v;
                }
                function _mapTipoCuenta(v) {
                  if (!v) return undefined;
                  const s = String(v).toLowerCase();
                  if (s === "ahorros") return "Ahorros";
                  if (s === "corriente") return "Corriente";
                  if (s === "nequi") return "Nequi";
                  return v;
                }
                function _mapTipoDocumento(v) {
                  if (!v) return undefined;
                  const s = String(v).toLowerCase();
                  if (s === "cedula" || s === "cc") return "CC";
                  if (s === "extranjeria" || s === "ce") return "CE";
                  if (s === "nit") return "NIT";
                  return v;
                }

                const mappedEstado = _mapEstado(status);
                const mappedTipoCuenta = _mapTipoCuenta(
                  qs("#tipoCuenta_edit")?.value
                );
                const mappedTipoDocumento = _mapTipoDocumento(tipoDocumentoVal);

                // Preparar payload
                const payload = {
                  nombre: name,
                  apellido: qs("#apellido_edit")?.value || undefined,
                  email: email,
                  precioPorHora: precio,
                  estado: mappedEstado,
                  categorias: categoriasValues,
                  descripcion: qs("#bio")?.value || undefined,
                  banco: qs("#banco_edit")?.value || undefined,
                  tipoCuenta: mappedTipoCuenta,
                  numeroCuenta: qs("#numeroCuenta_edit")?.value || undefined,
                  titular: qs("#titular_edit")?.value || undefined,
                  tipoDocumento: mappedTipoDocumento,
                  numeroDocumento:
                    qs("#numeroDocumento_edit")?.value || undefined,
                  telefonoContacto:
                    qs("#telefonoContacto_edit")?.value || undefined,
                  diasDisponibles: diasValues,
                  avatar: avatarUrl || undefined,
                };

                // Decidir endpoint/método: editar vs crear
                try {
                  let res;
                  if (
                    modal &&
                    modal.id === "editExpertModal" &&
                    typeof currentEditingExpertId !== "undefined" &&
                    currentEditingExpertId
                  ) {
                    // actualizar
                    // construir headers reutilizables y añadir x-api-key si está expuesta
                    try {
                      var _headers = { "Content-Type": "application/json" };
                      if (typeof window !== "undefined" && window.API_KEY)
                        _headers["x-api-key"] = window.API_KEY;
                      if (typeof window !== "undefined" && window.authToken)
                        _headers["Authorization"] =
                          "Bearer " + window.authToken;
                    } catch (e) {
                      var _headers = { "Content-Type": "application/json" };
                    }
                    // enviar al proxy del frontend que inyecta x-api-key desde el servidor
                    res = await fetch(
                      "/admin/proxy/expertos/" +
                        encodeURIComponent(currentEditingExpertId),
                      {
                        method: "PUT",
                        credentials: "same-origin",
                        headers: _headers,
                        body: JSON.stringify(payload),
                      }
                    );
                  } else {
                    // crear
                    try {
                      var _headers2 = { "Content-Type": "application/json" };
                      if (typeof window !== "undefined" && window.API_KEY)
                        _headers2["x-api-key"] = window.API_KEY;
                      if (typeof window !== "undefined" && window.authToken)
                        _headers2["Authorization"] =
                          "Bearer " + window.authToken;
                    } catch (e) {
                      var _headers2 = { "Content-Type": "application/json" };
                    }
                    // usar proxy seguro en el servidor frontend
                    res = await fetch("/admin/proxy/expertos", {
                      method: "POST",
                      credentials: "same-origin",
                      headers: _headers2,
                      body: JSON.stringify(payload),
                    });
                  }

                  if (!res || !res.ok) {
                    const json = await (res
                      ? res.json().catch(() => ({}))
                      : Promise.resolve({}));
                    const msg =
                      (json && (json.message || json.mensaje)) ||
                      "Error al guardar cambios";
                    showToast(msg, "error");
                    throw new Error(msg);
                  }

                  const json = await res.json();
                  // Actualizar lista local o refrescar
                  try {
                    if (modal && modal.id === "editExpertModal") {
                      // reemplazar experto en allExperts si el id coincide
                      const updated = json;
                      const id = currentEditingExpertId;
                      if (id && updated) {
                        const idx = allExperts.findIndex(
                          (e) => (e._id || e.id) == id
                        );
                        if (idx >= 0) allExperts[idx] = updated;
                        applyFilters();
                      }
                      showToast("Cambios guardados", "success");
                    } else {
                      allExperts.unshift(json);
                      currentPage = 1;
                      applyFilters();
                      showToast("Experto creado correctamente", "success");
                    }
                  } catch (e) {
                    console.warn("post-save update error", e);
                  }

                  try {
                    if (modal) modal.style.display = "none";
                  } catch (e) {}
                  try {
                    form.reset();
                  } catch (e) {}
                } catch (err) {
                  console.warn("error saving expert", err);
                }

                if (submitBtn) {
                  submitBtn.disabled = false;
                  submitBtn.textContent =
                    submitBtn.dataset.origText || "Guardar experto";
                }
              } catch (e) {
                console.warn("error al procesar expertForm submit", e);
                try {
                  const submitBtn =
                    (modal &&
                      modal.querySelector(
                        '.modal-expert__footer button[type="submit"]'
                      )) ||
                    form.querySelector('button[type="submit"]');
                  if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent =
                      submitBtn.dataset.origText || "Guardar experto";
                  }
                } catch (ee) {}
              }
            });
          } catch (e) {
            console.warn("initExpertForm: form attach error", e);
          }
        });
      } catch (e) {
        console.warn("initExpertForm error", e);
      }
    }

    // Handler específico para el formulario de "Agregar nuevo experto" (id addExpertForm)
    // Valida que el email exista como usuario activo llamando a GET /api/usuarios/buscar?email=
    // Si el usuario no existe, muestra error y evita la creación.
    function initAddExpertFormValidator() {
      try {
        const form = document.getElementById("addExpertForm");
        if (!form) return;

        form.addEventListener("submit", async function (ev) {
          ev.preventDefault();
          try {
            const submitBtn =
              form.querySelector('button[type="submit"]') || null;
            if (submitBtn) {
              submitBtn.disabled = true;
              submitBtn.dataset.origText = submitBtn.textContent || "";
              submitBtn.textContent = "Verificando...";
            }

            // Obtener campos mínimos
            const emailEl = form.querySelector("#email");
            const nameEl = form.querySelector("#name");
            const precioEl = form.querySelector("#precio");

            const email = emailEl ? (emailEl.value || "").trim() : "";
            const name = nameEl ? (nameEl.value || "").trim() : "";
            const precio = precioEl ? Number(precioEl.value) : 0;

            // Limpieza de errores previos
            try {
              form
                .querySelectorAll(".input-error")
                .forEach((i) => i.classList.remove("input-error"));
              const errs = form.querySelectorAll(".field-error");
              errs.forEach((e) => e.parentNode && e.parentNode.removeChild(e));
            } catch (e) {}

            if (!name) {
              const err = document.createElement("div");
              err.className = "field-error";
              err.style.color = "#e53e3e";
              err.textContent = "El nombre es obligatorio.";
              nameEl && nameEl.parentNode && nameEl.parentNode.appendChild(err);
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent =
                  submitBtn.dataset.origText || "Guardar experto";
              }
              return;
            }

            if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
              const err = document.createElement("div");
              err.className = "field-error";
              err.style.color = "#e53e3e";
              err.textContent = "Email inválido.";
              emailEl &&
                emailEl.parentNode &&
                emailEl.parentNode.appendChild(err);
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent =
                  submitBtn.dataset.origText || "Guardar experto";
              }
              return;
            }

            // Verificar existencia del usuario por email
            let exists = false;
            try {
              const resp = await fetch(
                "/api/usuarios/buscar?email=" + encodeURIComponent(email),
                {
                  method: "GET",
                  credentials: "same-origin",
                  headers: { Accept: "application/json" },
                }
              );
              if (resp && resp.ok) {
                exists = true;
              } else {
                // 404 o error -> no existe
                exists = false;
              }
            } catch (e) {
              exists = false;
            }

            if (!exists) {
              const err = document.createElement("div");
              err.className = "field-error";
              err.style.color = "#e53e3e";
              err.textContent =
                "El correo no está registrado como usuario activo. Crea primero el usuario en Administrar Usuarios.";
              emailEl &&
                emailEl.parentNode &&
                emailEl.parentNode.appendChild(err);
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent =
                  submitBtn.dataset.origText || "Guardar experto";
              }
              return;
            }

            // Si existe, construir payload similar al handler general y enviarlo
            // Reusar algunos campos del formulario
            // Mapear valores del formulario al formato esperado por el backend
            function mapEstado(v) {
              if (!v) return undefined;
              const s = String(v).toLowerCase();
              if (s === "active" || s === "activo") return "activo";
              if (s === "pending" || s === "pendiente")
                return "pendiente-verificacion";
              if (s === "inactive" || s === "inactivo") return "inactivo";
              return v;
            }

            function mapTipoCuenta(v) {
              if (!v) return undefined;
              const s = String(v).toLowerCase();
              if (s === "ahorros") return "Ahorros";
              if (s === "corriente") return "Corriente";
              if (s === "nequi") return "Nequi";
              return v;
            }

            function mapTipoDocumento(v) {
              if (!v) return undefined;
              const s = String(v).toLowerCase();
              if (s === "cedula" || s === "cc") return "CC";
              if (s === "extranjeria" || s === "ce") return "CE";
              if (s === "nit") return "NIT";
              return v;
            }

            const rawEstado = form.querySelector("#statusInput")
              ? form.querySelector("#statusInput").value
              : undefined;

            const mappedEstado = mapEstado(rawEstado);

            const rawTipoCuenta = form.querySelector("#tipoCuenta_hidden_view")
              ? form.querySelector("#tipoCuenta_hidden_view").value
              : undefined;
            const mappedTipoCuenta = mapTipoCuenta(rawTipoCuenta);

            const rawTipoDocumento = form.querySelector("#tipoDocumento")
              ? form.querySelector("#tipoDocumento").value
              : undefined;
            const mappedTipoDocumento = mapTipoDocumento(rawTipoDocumento);

            const payload = {
              nombre: name,
              apellido: form.querySelector("#apellido")
                ? form.querySelector("#apellido").value
                : undefined,
              email: email,
              precioPorHora: precio || undefined,
              estado: mappedEstado,
              categorias: form.querySelector("#categorias-values")
                ? (form.querySelector("#categorias-values").value || "")
                    .split(",")
                    .filter(Boolean)
                : [],
              descripcion: form.querySelector("#bio")
                ? form.querySelector("#bio").value
                : undefined,
              banco: form.querySelector("#banco_hidden_view")
                ? form.querySelector("#banco_hidden_view").value
                : undefined,
              tipoCuenta: mappedTipoCuenta,
              numeroCuenta: form.querySelector("#numeroCuenta")
                ? form.querySelector("#numeroCuenta").value
                : undefined,
              titular: form.querySelector("#titular")
                ? form.querySelector("#titular").value
                : undefined,
              tipoDocumento: mappedTipoDocumento,
              numeroDocumento: form.querySelector("#numeroDocumento")
                ? form.querySelector("#numeroDocumento").value
                : undefined,
              telefonoContacto: form.querySelector("#telefonoContacto")
                ? form.querySelector("#telefonoContacto").value
                : undefined,
              diasDisponibles: form.querySelector("#diasDisponibles")
                ? (form.querySelector("#diasDisponibles").value || "")
                    .split(",")
                    .filter(Boolean)
                : [],
              avatar: null,
            };

            // POST a /api/expertos
            try {
              let res;
              if (typeof window !== "undefined" && window.API_KEY) {
                res = await fetch("/api/expertos", {
                  method: "POST",
                  credentials: "same-origin",
                  headers: {
                    "Content-Type": "application/json",
                    "x-api-key": window.API_KEY,
                    Authorization: `Bearer ${window.authToken || ""}`,
                  },
                  body: JSON.stringify(payload),
                });
              } else {
                res = await fetch("/admin/proxy/expertos", {
                  method: "POST",
                  credentials: "same-origin",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });
              }
              if (!res || !res.ok) {
                const json = await (res
                  ? res.json().catch(() => ({}))
                  : Promise.resolve({}));
                const msg =
                  (json && (json.message || json.mensaje)) ||
                  "Error al crear experto";
                const err = document.createElement("div");
                err.className = "field-error";
                err.style.color = "#e53e3e";
                err.textContent = msg;
                form.appendChild(err);
                if (submitBtn) {
                  submitBtn.disabled = false;
                  submitBtn.textContent =
                    submitBtn.dataset.origText || "Guardar experto";
                }
                return;
              }

              const created = await res.json();
              // Se agregó correctamente: cerrar modal y resetear
              try {
                const modal = document.getElementById("expertModal");
                if (modal) modal.style.display = "none";
              } catch (e) {}
              try {
                form.reset();
              } catch (e) {}
              // Agregar al listado local si existe la variable allExperts
              try {
                if (window.allExperts && Array.isArray(window.allExperts)) {
                  window.allExperts.unshift(created);
                }
              } catch (e) {}
            } catch (e) {
              const err = document.createElement("div");
              err.className = "field-error";
              err.style.color = "#e53e3e";
              err.textContent = "Error de red al crear el experto.";
              form.appendChild(err);
            }

            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent =
                submitBtn.dataset.origText || "Guardar experto";
            }
          } catch (e) {
            console.warn("addExpertForm submit error", e);
          }
        });
      } catch (e) {
        console.warn("initAddExpertFormValidator error", e);
      }
    }

    initAddExpertFormValidator();

    // Añadir verificación onBlur en el campo email para mejor UX
    function initEmailBlurCheck() {
      try {
        const form = document.getElementById("addExpertForm");
        if (!form) return;
        const emailEl = form.querySelector("#email");
        if (!emailEl) return;

        let timer = null;
        const debounce = (fn, wait) => {
          return function () {
            const ctx = this,
              args = arguments;
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(ctx, args), wait);
          };
        };

        async function checkEmailAndPopulate() {
          try {
            // limpiar mensajes previos (.field-error y .field-status) para evitar duplicados
            try {
              if (emailEl && emailEl.parentNode) {
                const prevErr =
                  emailEl.parentNode.querySelector(".field-error");
                if (prevErr)
                  prevErr.parentNode && prevErr.parentNode.removeChild(prevErr);
                const prevStatus =
                  emailEl.parentNode.querySelector(".field-status");
                if (prevStatus)
                  prevStatus.parentNode &&
                    prevStatus.parentNode.removeChild(prevStatus);
              }
            } catch (e) {}

            const email = (emailEl.value || "").trim();
            if (!email || !/^\S+@\S+\.\S+$/.test(email)) return;

            // Indicar verificación breve (reusar elemento si ya existe)
            let statusEl = null;
            try {
              if (emailEl && emailEl.parentNode) {
                statusEl = emailEl.parentNode.querySelector(".field-status");
              }
            } catch (e) {}
            if (!statusEl) {
              statusEl = document.createElement("div");
              statusEl.className = "field-status";
              statusEl.style.color = "#666";
              statusEl.style.fontSize = "0.9em";
            }
            try {
              statusEl.textContent = "Verificando correo...";
              emailEl.parentNode && emailEl.parentNode.appendChild(statusEl);
            } catch (e) {}

            try {
              const resp = await fetch(
                "/api/usuarios/buscar?email=" + encodeURIComponent(email),
                {
                  method: "GET",
                  credentials: "same-origin",
                  headers: { Accept: "application/json" },
                }
              );

              // eliminar status previo (siempre que exista) antes de mostrar resultado
              try {
                if (statusEl && statusEl.parentNode)
                  statusEl.parentNode.removeChild(statusEl);
                else if (emailEl && emailEl.parentNode) {
                  const tmp = emailEl.parentNode.querySelector(".field-status");
                  if (tmp) tmp.parentNode && tmp.parentNode.removeChild(tmp);
                }
              } catch (e) {}

              if (resp && resp.ok) {
                // usuario existe: autocompletar campos si están vacíos
                const json = await resp.json().catch(() => ({}));
                const nombre = json.nombre || json.name || "";
                const apellido = json.apellido || json.lastName || "";
                const avatar = json.avatarUrl || json.avatar || null;

                try {
                  const nameEl = form.querySelector("#name");
                  if (nameEl && (!nameEl.value || nameEl.value.trim() === "")) {
                    nameEl.value = (
                      nombre + (apellido ? " " + apellido : "")
                    ).trim();
                    // Disparar evento input para que los validadores y handlers locales
                    // detecten el cambio y oculten mensajes de error (p. ej. "El nombre no puede estar vacío.")
                    try {
                      nameEl.dispatchEvent(
                        new Event("input", { bubbles: true })
                      );
                      nameEl.removeAttribute("aria-invalid");
                      nameEl.classList.remove("input-error");
                      const nameErr =
                        (form && form.querySelector("#name-error")) ||
                        document.getElementById("name-error");
                      if (nameErr) nameErr.style.display = "none";
                    } catch (e) {}
                  }
                  const apellidoEl = form.querySelector("#apellido");
                  if (
                    apellidoEl &&
                    (!apellidoEl.value || apellidoEl.value.trim() === "")
                  ) {
                    apellidoEl.value = apellido;
                    try {
                      apellidoEl.dispatchEvent(
                        new Event("input", { bubbles: true })
                      );
                      apellidoEl.removeAttribute("aria-invalid");
                      apellidoEl.classList.remove("input-error");
                      const apeErr =
                        (form && form.querySelector("#apellido-error")) ||
                        document.getElementById("apellido-error");
                      if (apeErr) apeErr.style.display = "none";
                    } catch (e) {}
                  }
                  // preview avatar si existe
                  try {
                    const preview = document.getElementById(
                      "profilePreviewImage"
                    );
                    if (preview && avatar) preview.src = avatar;
                  } catch (e) {}
                } catch (e) {}

                // mostrar indicación positiva temporal (reusar o crear)
                let ok = null;
                try {
                  ok =
                    emailEl.parentNode &&
                    emailEl.parentNode.querySelector(".field-status");
                } catch (e) {}
                if (!ok) {
                  ok = document.createElement("div");
                  ok.className = "field-status";
                  ok.style.color = "#2f855a";
                  ok.style.fontSize = "0.9em";
                }
                try {
                  ok.textContent = "Usuario encontrado.";
                  emailEl.parentNode && emailEl.parentNode.appendChild(ok);
                  setTimeout(() => {
                    try {
                      ok.parentNode && ok.parentNode.removeChild(ok);
                    } catch (e) {}
                  }, 2500);
                } catch (e) {}
                return;
              }

              if (resp && resp.status === 404) {
                // mostrar error 404 (eliminar anteriores antes)
                try {
                  if (emailEl && emailEl.parentNode) {
                    const prev =
                      emailEl.parentNode.querySelector(".field-error");
                    if (prev)
                      prev.parentNode && prev.parentNode.removeChild(prev);
                  }
                } catch (e) {}
                const err = document.createElement("div");
                err.className = "field-error";
                err.style.color = "#e53e3e";
                err.textContent = "No existe un usuario activo con ese correo.";
                emailEl &&
                  emailEl.parentNode &&
                  emailEl.parentNode.appendChild(err);
                return;
              }

              // otros códigos de error
              // otros códigos de error
              try {
                if (emailEl && emailEl.parentNode) {
                  const prev = emailEl.parentNode.querySelector(".field-error");
                  if (prev)
                    prev.parentNode && prev.parentNode.removeChild(prev);
                }
              } catch (e) {}
              const err = document.createElement("div");
              err.className = "field-error";
              err.style.color = "#e53e3e";
              err.textContent =
                "Error al verificar el correo. Intenta de nuevo.";
              emailEl &&
                emailEl.parentNode &&
                emailEl.parentNode.appendChild(err);
            } catch (e) {
              try {
                if (statusEl && statusEl.parentNode)
                  statusEl.parentNode.removeChild(statusEl);
                else if (emailEl && emailEl.parentNode) {
                  const tmp = emailEl.parentNode.querySelector(".field-status");
                  if (tmp) tmp.parentNode && tmp.parentNode.removeChild(tmp);
                }
              } catch (ee) {}
              const err = document.createElement("div");
              err.className = "field-error";
              err.style.color = "#e53e3e";
              err.textContent =
                "Error de red al verificar. Comprueba tu conexión.";
              emailEl &&
                emailEl.parentNode &&
                emailEl.parentNode.appendChild(err);
            }
          } catch (e) {
            console.warn("checkEmailAndPopulate error", e);
          }
        }

        const handler = debounce(checkEmailAndPopulate, 400);
        emailEl.addEventListener("blur", handler);
        // también verificar si el usuario pega el email y sale rápido
        emailEl.addEventListener("paste", function () {
          setTimeout(handler, 250);
        });
      } catch (e) {
        console.warn("initEmailBlurCheck error", e);
      }
    }

    initEmailBlurCheck();

    // Inicializar selector de categorías (migrated from inline EJS)
    try {
      if (!window._categoriasSelector)
        window._categoriasSelector = new CategoriasSelector();
    } catch (e) {
      console.warn("Error inicializando CategoriasSelector", e);
    }

    // Inicializar preview de imagen de perfil y toggle de número de cuenta
    function initProfileImagePreview() {
      const maxSize = 2 * 1024 * 1024; // 2MB

      // Se buscan inputs clásicos por id y también inputs genericos con clase .file-input
      const inputs = Array.from(
        document.querySelectorAll(
          "#profileImage, #profileImage_edit, #profileImage_view"
        )
      ).concat(Array.from(document.querySelectorAll(".file-input")));

      // evitar duplicados (mismo elemento puede coincidir con selector id y con clase)
      const uniqueInputs = Array.from(new Set(inputs));

      uniqueInputs.forEach((input) => {
        if (!input || input.tagName !== "INPUT" || input.type !== "file")
          return;

        // Determinar el contenedor donde buscar preview/remove
        // preferir una estructura cercana: .upload-wrapper o .modal-expert
        const uploadWrapper = input.closest(".upload-wrapper");
        const modal = input.closest(".modal-expert");
        const searchRoot = uploadWrapper || modal || document;

        const preview =
          searchRoot.querySelector(".preview-container") ||
          searchRoot.querySelector('[id^="profilePreview"]');
        const img = preview
          ? preview.querySelector(".preview-image, img")
          : null;
        const removeBtn =
          searchRoot.querySelector(".remove-preview") ||
          searchRoot.querySelector('[id^="removeProfileBtn"]');
        const meta =
          searchRoot.querySelector(".upload-meta") ||
          searchRoot.querySelector('[id^="uploadMeta"]');
        const err =
          searchRoot.querySelector(".upload-error") ||
          searchRoot.querySelector('[id^="profileImageError"]');

        function clearPreview() {
          try {
            input.value = "";
            if (img) img.src = "";
            if (removeBtn) removeBtn.style.display = "none";
            if (meta) meta.style.display = "none";
            if (err) {
              err.style.display = "none";
              err.textContent = "";
            }
            if (preview) preview.style.display = "none";
          } catch (e) {}
        }

        function showError(message) {
          if (err) {
            err.textContent = message;
            err.style.display = "block";
          } else {
            console.warn("profile image error:", message);
          }
        }

        input.addEventListener("change", function () {
          try {
            const file = this.files && this.files[0];
            if (!file) {
              clearPreview();
              return;
            }

            if (!file.type.startsWith("image/")) {
              showError("Archivo no válido. Selecciona una imagen (png, jpg).");
              return;
            }

            if (file.size > maxSize) {
              showError("La imagen supera el tamaño máximo permitido (2MB).");
              return;
            }

            const reader = new FileReader();
            reader.onload = function (e) {
              try {
                if (img) img.src = e.target.result;
                if (removeBtn) removeBtn.style.display = "inline-flex";
                if (meta) {
                  meta.textContent = `${file.name} · ${(
                    file.size / 1024
                  ).toFixed(0)} KB`;
                  meta.style.display = "block";
                }
                if (err) {
                  err.style.display = "none";
                  err.textContent = "";
                }
                if (preview) preview.style.display = "block";
              } catch (e) {}
            };
            reader.readAsDataURL(file);
          } catch (e) {
            console.warn("profile image change error", e);
          }
        });

        if (removeBtn) {
          removeBtn.addEventListener("click", function () {
            try {
              clearPreview();
            } catch (e) {}
          });
        }
      });
    }

    // Restringe y sanea los inputs de nombre para que solo acepten letras
    // Unicode, espacios, guiones y apóstrofes. Protege también contra pegados
    // y realiza una validación simple al perder foco. Crea mensajes inline.
    function initNameInputRestrictions() {
      try {
        const selectors = ["#name", "#name_edit", "#name_view"];
        // Permitimos letras Unicode (incluye acentos), espacios, guiones y apóstrofes
        // Nota: requiere soporte de Unicode property escapes en el motor JS.
        const forbiddenRe = /[^\p{L}\s'\-]/gu;

        selectors.forEach((sel) => {
          const input = document.querySelector(sel);
          if (!input) return;

          // Crear/obtener elemento de error inline asociado al input
          let errorEl = document.getElementById(`${input.id}-error`);
          if (!errorEl) {
            errorEl = document.createElement("small");
            errorEl.id = `${input.id}-error`;
            errorEl.className = "field-error";
            errorEl.style.display = "none";
            errorEl.style.color = "#e53e3e";
            errorEl.style.fontSize = "0.85rem";
            errorEl.style.marginTop = "0.25rem";
            try {
              input.insertAdjacentElement("afterend", errorEl);
            } catch (e) {
              // fallback si insertAdjacentElement falla
              input.parentNode && input.parentNode.appendChild(errorEl);
            }
          }

          // Normalizar valor eliminando caracteres no permitidos
          const sanitize = (val) => (val || "").replace(forbiddenRe, "");

          // Mantener caret de forma conservadora y marcar cuando se eliminaron caracteres
          const onInput = (e) => {
            try {
              const orig = input.value;
              const cleaned = sanitize(orig);
              if (cleaned !== orig) {
                input.dataset.cleaned = "true";
                const pos = input.selectionStart || cleaned.length;
                input.value = cleaned;
                try {
                  input.setSelectionRange(
                    Math.max(0, pos - 1),
                    Math.max(0, pos - 1)
                  );
                } catch (err) {}
              } else {
                delete input.dataset.cleaned;
              }
              // ocultar mensaje mientras el usuario escribe
              errorEl.style.display = "none";
              input.removeAttribute("aria-invalid");
              input.classList.remove("input-error");
            } catch (e) {}
          };

          input.addEventListener("input", onInput);

          // Manejar pegado para sanear el contenido pegado
          input.addEventListener("paste", function (ev) {
            try {
              ev.preventDefault();
              const paste =
                (ev.clipboardData || window.clipboardData).getData("text") ||
                "";
              const cleaned = sanitize(paste);
              const start = input.selectionStart || 0;
              const end = input.selectionEnd || 0;
              const newVal =
                input.value.slice(0, start) + cleaned + input.value.slice(end);
              input.value = newVal;
              const caret = start + cleaned.length;
              try {
                input.setSelectionRange(caret, caret);
              } catch (e) {}
              // disparar input manualmente para que otros listeners reaccionen
              input.dispatchEvent(new Event("input", { bubbles: true }));
            } catch (e) {}
          });

          // Validación en blur: mostrar mensajes específicos y marcar aria-invalid
          input.addEventListener("blur", function () {
            try {
              const val = input.value || "";
              const cleaned = sanitize(val);
              if (!cleaned.trim()) {
                input.setAttribute("aria-invalid", "true");
                input.classList.add("input-error");
                errorEl.textContent = "El nombre no puede estar vacío.";
                errorEl.style.display = "block";
              } else if (input.dataset.cleaned === "true") {
                input.setAttribute("aria-invalid", "true");
                input.classList.add("input-error");
                errorEl.textContent =
                  "Se han eliminado caracteres no permitidos.";
                errorEl.style.display = "block";
                delete input.dataset.cleaned;
              } else {
                input.removeAttribute("aria-invalid");
                input.classList.remove("input-error");
                errorEl.style.display = "none";
              }
            } catch (e) {}
          });
        });
      } catch (e) {
        console.warn("initNameInputRestrictions error", e);
      }
    }

    function initAccountToggle() {
      const toggles = document.querySelectorAll("#toggleAccountNumber");
      toggles.forEach((btn) => {
        const modal = btn.closest(".modal-expert");
        if (!modal) return;
        const input = modal.querySelector("#numeroCuenta");
        const icon = btn.querySelector("i");
        if (!input) return;

        btn.addEventListener("click", function () {
          try {
            if (input.type === "password") {
              input.type = "text";
              btn.setAttribute("aria-label", "Ocultar número de cuenta");
              btn.setAttribute("aria-pressed", "true");
              if (icon) {
                icon.classList.remove("fa-eye");
                icon.classList.add("fa-eye-slash");
              }
            } else {
              input.type = "password";
              btn.setAttribute("aria-label", "Mostrar número de cuenta");
              btn.setAttribute("aria-pressed", "false");
              if (icon) {
                icon.classList.remove("fa-eye-slash");
                icon.classList.add("fa-eye");
              }
            }
          } catch (e) {
            console.warn("toggle account number error", e);
          }
        });
      });
    }

    // Inicializar behaviors adicionales
    initProfileImagePreview();
    initAccountToggle();

    // Inicializar handler para guardar cambios desde el modal de edición
    try {
      initEditModalSave();
    } catch (e) {}

    // Inicializar custom selects (accesible, keyboard-friendly)
    function initCustomSelects() {
      const customSelects = document.querySelectorAll(".custom-select");
      customSelects.forEach((cs) => {
        const trigger = cs.querySelector(".custom-select__trigger");
        const options = Array.from(
          cs.querySelectorAll(".custom-select__options li")
        );
        const hidden = cs.querySelector('input[type="hidden"]');

        function close() {
          cs.classList.remove("open");
          cs.setAttribute("aria-expanded", "false");
        }

        function open() {
          cs.classList.add("open");
          cs.setAttribute("aria-expanded", "true");
        }

        function setValue(value, label) {
          if (hidden) hidden.value = value;
          const valueSpan = cs.querySelector(".custom-select__value");
          if (valueSpan) valueSpan.textContent = label;
          options.forEach((o) =>
            o.setAttribute(
              "aria-selected",
              o.getAttribute("data-value") === value ? "true" : "false"
            )
          );
        }

        // click en trigger
        trigger.addEventListener("click", function (ev) {
          ev.stopPropagation();
          if (cs.classList.contains("open")) close();
          else open();
        });

        // seleccionar opción
        options.forEach((opt) => {
          opt.addEventListener("click", function (ev) {
            ev.stopPropagation();
            const v = this.getAttribute("data-value");
            const label = this.textContent.trim();
            setValue(v, label);
            close();
          });
        });

        // keyboard support
        cs.addEventListener("keydown", function (ev) {
          const openNow = cs.classList.contains("open");
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            openNow ? close() : open();
            return;
          }
          if (ev.key === "ArrowDown") {
            ev.preventDefault();
            if (!openNow) {
              open();
              return;
            }
            // focus next option
            const selIndex = options.findIndex(
              (o) => o.getAttribute("aria-selected") === "true"
            );
            const next =
              options[
                Math.min(options.length - 1, Math.max(0, selIndex + 1))
              ] || options[0];
            next.focus();
            return;
          }
          if (ev.key === "ArrowUp") {
            ev.preventDefault();
            if (!openNow) {
              open();
              return;
            }
            const selIndex = options.findIndex(
              (o) => o.getAttribute("aria-selected") === "true"
            );
            const prev =
              options[Math.max(0, selIndex - 1)] || options[options.length - 1];
            prev.focus();
            return;
          }
          if (ev.key === "Escape") {
            close();
            return;
          }
        });

        // cerrar al hacer clic fuera
        document.addEventListener("click", function (ev) {
          if (!cs.contains(ev.target)) close();
        });
      });
    }

    initCustomSelects();

    // Fallback: asegurar que clicar la caja .upload-box abra el input file
    function initUploadBoxFallback() {
      try {
        document.querySelectorAll(".upload-box").forEach(function (box) {
          box.addEventListener("click", function (ev) {
            try {
              // Si el click viene desde el propio input (o un elemento dentro del input), no doble-disparar
              if (
                ev.target &&
                ev.target.closest &&
                ev.target.closest('input[type="file"]')
              )
                return;
              // Si el click viene desde el botón eliminar dentro de la misma área, no abrir el picker
              if (
                ev.target &&
                ev.target.closest &&
                ev.target.closest(".remove-preview")
              )
                return;
              const input = box.querySelector('input[type="file"]');
              if (input) {
                input.focus();
                // Algunos navegadores requieren un evento del usuario: .click() desde el handler es válido
                input.click();
              }
            } catch (e) {}
          });
        });
      } catch (e) {
        console.warn("initUploadBoxFallback error", e);
      }
    }

    initUploadBoxFallback();
    // Guardar cambios desde el modal de edición: envía PUT /api/expertos/perfil
    function initEditModalSave() {
      try {
        const modal = document.getElementById("editExpertModal");
        if (!modal) return;
        const footerBtn = modal.querySelector(
          ".modal-expert__footer .btn-primary"
        );
        if (!footerBtn) return;

        footerBtn.addEventListener("click", async function (ev) {
          ev.preventDefault();
          const btn = this;
          try {
            btn.disabled = true;
            if (!btn.dataset.origText) btn.dataset.origText = btn.textContent;
            btn.textContent = "Guardando...";

            const m = modal;
            const nombreCompleto = (
              m.querySelector("#name")?.value || ""
            ).trim();
            const email = (m.querySelector("#email")?.value || "").trim();
            const estado = (
              m.querySelector("#statusInput")?.value || ""
            ).trim();

            const nombreParts = nombreCompleto.split(" ");
            const nombre = nombreParts.shift() || "";
            const apellido = nombreParts.join(" ") || "";

            const descripcion = (m.querySelector("#bio")?.value || "").trim();
            const precioPorHora =
              Number(m.querySelector("#precio")?.value || 0) || 0;
            const categoriasRaw =
              m.querySelector("#categorias-values")?.value || "";
            let categorias = categoriasRaw
              ? categoriasRaw
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [];
            const banco = (m.querySelector("#banco_edit")?.value || "").trim();
            let tipoCuenta = (
              m.querySelector("#tipoCuenta_edit")?.value || ""
            ).trim();
            const numeroCuenta = (
              m.querySelector("#numeroCuenta_edit")?.value || ""
            ).trim();
            const titular = (
              m.querySelector("#titular_edit")?.value || ""
            ).trim();
            let tipoDocumento = (
              m.querySelector("#tipoDocumento_edit")?.value || ""
            ).trim();
            const numeroDocumento = (
              m.querySelector("#numeroDocumento_edit")?.value || ""
            ).trim();
            const telefonoContacto = (
              m.querySelector("#telefonoContacto_edit")?.value || ""
            ).trim();
            const diasRaw = m.querySelector("#diasDisponibles")?.value || "";
            const diasArr = diasRaw
              ? diasRaw
                  .split(",")
                  .map((s) => s.trim().toLowerCase())
                  .filter(Boolean)
              : [];
            const dayMap = {
              lunes: "Lunes",
              martes: "Martes",
              miercoles: "Miércoles",
              jueves: "Jueves",
              viernes: "Viernes",
              sabado: "Sábado",
              domingo: "Domingo",
            };
            let diasDisponibles = diasArr.map((d) => dayMap[d] || d);

            // Normalizar/mapeos para cumplir con los enums esperados por el backend
            function mapEstado(v) {
              if (!v) return undefined;
              const s = String(v).toLowerCase();
              if (s === "active" || s === "activo") return "activo";
              if (s === "pending" || s === "pendiente")
                return "pendiente-verificacion";
              if (s === "inactive" || s === "inactivo") return "inactivo";
              return v;
            }
            function mapTipoCuenta(v) {
              if (!v) return undefined;
              const s = String(v).toLowerCase();
              if (s === "ahorros") return "Ahorros";
              if (s === "corriente") return "Corriente";
              if (s === "nequi") return "Nequi";
              return v;
            }
            function mapTipoDocumento(v) {
              if (!v) return undefined;
              const s = String(v).toLowerCase();
              if (s === "cedula" || s === "cc") return "CC";
              if (s === "extranjeria" || s === "ce") return "CE";
              if (s === "nit") return "NIT";
              return v;
            }

            const mappedEstado = mapEstado(estado);
            const mappedTipoCuenta = mapTipoCuenta(tipoCuenta);
            const mappedTipoDocumento = mapTipoDocumento(tipoDocumento);

            // Fallbacks...

            const payload = {
              nombre,
              apellido,
              email,
              estado: mappedEstado,
              descripcion,
              precioPorHora,
              categorias,
              banco,
              tipoCuenta: mappedTipoCuenta,
              numeroCuenta,
              titular,
              tipoDocumento: mappedTipoDocumento,
              numeroDocumento,
              telefonoContacto,
              diasDisponibles,
            };

            if (!currentEditingExpertId) {
              alert("Error: No se ha identificado al experto para editar.");
              btn.disabled = false;
              btn.textContent =
                btn.dataset.origText || "Guardar cambios experto";
              return;
            }

            let res;
            if (typeof window !== "undefined" && window.API_KEY) {
              res = await fetch(
                `/api/expertos/admin/${currentEditingExpertId}`,
                {
                  method: "PUT",
                  credentials: "same-origin",
                  headers: {
                    "Content-Type": "application/json",
                    "x-api-key": window.API_KEY,
                    Authorization: `Bearer ${window.authToken || ""}`,
                  },
                  body: JSON.stringify(payload),
                }
              );
            } else {
              res = await fetch(
                `/admin/proxy/expertos/${encodeURIComponent(
                  currentEditingExpertId
                )}`,
                {
                  method: "PUT",
                  credentials: "same-origin",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                }
              );
            }

            let json = {};
            try {
              json = await res.json();
            } catch (e) {}

            if (res.ok) {
              try {
                if (currentEditingExpertId) {
                  const idx = allExperts.findIndex(
                    (x) => getExpertField(x, "id") == currentEditingExpertId
                  );
                  if (idx >= 0) {
                    allExperts[idx] = json.usuario;
                  }
                }
              } catch (e) {
                console.warn("Error actualizando cache local de expertos:", e);
              }

              try {
                currentPage = 1;
                applyFilters();
              } catch (e) {}

              alert(json.mensaje || "Perfil actualizado correctamente.");

              try {
                modal.style.display = "none";
                modal.classList.remove("show", "modal-open", "is-open");
                document.body.classList.remove("modal-open");
              } catch (e) {}
            } else {
              alert(
                (json && (json.mensaje || json.message)) ||
                  "Error al actualizar perfil: " + res.status
              );
            }
          } catch (err) {
            console.error("Error guardando perfil de experto:", err);
            alert("Error guardando perfil: " + (err.message || err));
          } finally {
            try {
              btn.disabled = false;
              btn.textContent =
                btn.dataset.origText || "Guardar cambios experto";
            } catch (e) {}
          }
        });
      } catch (e) {
        console.warn("initEditModalSave error", e);
      }
    }
    // ===== Comportamiento: selector de días y mostrar/ocultar número de cuenta (migrado desde EJS inline) =====
    try {
      // Selector de días: comportamiento modal-scoped
      try {
        // NOTE: removed global per-button click binding to avoid duplicate
        // handlers and double-toggle behavior. Per-modal handlers are
        // attached when a modal is shown (see showExpertModal). The
        // delegated document-level listener below remains as a fallback
        // for dynamically created buttons.
      } catch (e) {
        // ignore
      }
      // Delegated fallback: si por cualquier razón los botones no tienen listeners (p.ej. render dinámico),
      // manejar clicks a nivel de documento y delegar en .day-button
      try {
        document.addEventListener("click", function (ev) {
          try {
            const btn =
              ev.target &&
              ev.target.closest &&
              ev.target.closest(".day-button");
            if (!btn) return;
            // si ya fue manejado por el listener propio, salir cedo
            // Si el botón ya tiene un listener directo enlazado, saltar la
            // lógica delegada para evitar que se ejecute dos veces (doble
            // toggle que cancela el cambio). El listener directo marca
            // dataset._dayHandlerBound cuando se enlaza.
            if (btn.dataset._dayHandlerBound === "true") return;

            // si está deshabilitado, ignorar
            if (btn.disabled || btn.getAttribute("aria-disabled") === "true") {
              try {
                ev.preventDefault();
                ev.stopPropagation();
              } catch (e) {}
              return;
            }

            // Emular la lógica del handler directo
            const modal = btn.closest(".modal-expert") || document;
            btn.classList.toggle("active");
            try {
              btn.setAttribute(
                "aria-pressed",
                btn.classList.contains("active") ? "true" : "false"
              );
            } catch (e) {}

            const activeDays = Array.from(
              modal.querySelectorAll(".day-button.active")
            ).map((b) => b.getAttribute("data-day"));
            const daysDisplay = modal.querySelector(".days-display");
            if (daysDisplay) {
              daysDisplay.textContent =
                activeDays.length === 0
                  ? "Ningún día seleccionado"
                  : activeDays.join(", ");
            }

            try {
              const diasHiddenEdit = modal.querySelector(
                "#diasDisponibles_edit"
              );
              const diasHidden = modal.querySelector("#diasDisponibles");
              const targetHidden = diasHiddenEdit || diasHidden;
              if (targetHidden)
                targetHidden.value = Array.isArray(activeDays)
                  ? activeDays.join(",")
                  : activeDays || "";
            } catch (e) {}
          } catch (e) {}
        });
      } catch (e) {}

      // Toggle visibilidad de número de cuenta (botón con clase .toggle-password y input #numeroCuenta)
      const togglePasswordBtns = document.querySelectorAll(".toggle-password");
      togglePasswordBtns.forEach((togglePassword) => {
        const modal = togglePassword.closest(".modal-expert") || document;
        const accountInput =
          modal.querySelector("#numeroCuenta") ||
          document.getElementById("numeroCuenta");
        if (!accountInput) return;
        togglePassword.addEventListener("click", function () {
          try {
            const type =
              accountInput.getAttribute("type") === "password"
                ? "text"
                : "password";
            accountInput.setAttribute("type", type);
            const icon = this.querySelector("i");
            if (icon) icon.classList.toggle("fa-eye-slash");
          } catch (e) {}
        });
      });
    } catch (e) {
      console.warn("migrated inline script error", e);
    }

    // Inicializaciones adicionales
    try {
      initNameInputRestrictions();
    } catch (e) {
      console.warn("initNameInputRestrictions failed", e);
    }
    init();
  });
})();
