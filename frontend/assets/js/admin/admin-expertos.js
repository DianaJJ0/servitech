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

  function $$(sel, ctx) {
    return Array.from((ctx || document).querySelectorAll(sel));
  }

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
      "activo": "badge--active",
      "pendiente-verificacion": "badge--pending",
      "inactivo": "badge--inactive",
      // Mantener compatibilidad con valores en inglés
      "active": "badge--active",
      "pending": "badge--pending", 
      "inactive": "badge--inactive",
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
    updatePagination(list.length, page, pageSize);
  }

  function createExpertRow(expert, categoriesMap) {
    const id = getExpertField(expert, "id");
    const name = escapeHtml(getExpertField(expert, "name") || "Sin nombre");
    const email = escapeHtml(getExpertField(expert, "email"));
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
            return (categoriesMap && categoriesMap[k]) || null;
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
    let actionButtons = '';
    if (status === 'pendiente-verificacion') {
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
          ${status === 'activo' ? 
            `<button class="btn-warning btn-inactivate" data-id="${id}">Inactivar</button>` :
            `<button class="btn-success btn-activate" data-id="${id}">Activar</button>`
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
        <td><span class="badge ${badgeClass}">${escapeHtml(status)}</span></td>
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
    html += createPaginationButton(page - 1, '<i class="fas fa-chevron-left"></i>', page <= 1);

    // Lógica de botones de página (ej. 1 ... 4 5 6 ... 10)
    const maxButtons = 5;
    let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
      html += createPaginationButton(1, '1');
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
    html += createPaginationButton(page + 1, '<i class="fas fa-chevron-right"></i>', page >= totalPages);

    controls.innerHTML = html;
    bindPaginationEvents();
  }

  function createPaginationButton(page, content, disabled = false, active = false) {
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
    
    console.log('bindRowActions called with:', tableEl);
    console.log('Root element found:', root);
    
    if (!root) {
      console.error('No table element found for binding actions!');
      return;
    }
    
    console.log('Binding action buttons...');
    bindActionToButtons(root, ".btn-view", openModalView);
    bindActionToButtons(root, ".btn-edit", openModalEdit);
    bindActionToButtons(root, ".btn-inactivate", inactivateExpert);
    bindActionToButtons(root, ".btn-activate", activateExpert);
    bindActionToButtons(root, ".btn-approve", approveExpert);
    bindActionToButtons(root, ".btn-reject", rejectExpert);
    
    console.log('All action buttons bound successfully');
  }

  function bindActionToButtons(root, selector, handler) {
    // root: elemento contenedor donde buscar los botones (table o tbody)
    // selector: selector relativo para los botones dentro del root
    const mount = root || document;
    const buttons = Array.from(mount.querySelectorAll(selector));
    
    console.log(`Binding ${buttons.length} buttons for selector "${selector}"`);
    
    buttons.forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        
        const id = this.getAttribute("data-id");
        console.log(`Button clicked: ${selector}, ID: ${id}`);
        
        if (!id) {
          console.error('No data-id found on button', this);
          return;
        }
        
        handler(id);
      });
    });
  }

  function inactivateExpert(id) {
    const row = document.querySelector(
      `table.admin-table--expertos tr[data-id="${id}"]`
    );
    if (!row) return;

    const badge = row.querySelector(".badge");
    if (badge) {
      badge.className = "badge badge--inactive";
      badge.textContent = "inactivo";
    }
  }

  function activateExpert(id) {
    const row = document.querySelector(
      `table.admin-table--expertos tr[data-id="${id}"]`
    );
    if (!row) return;

    const badge = row.querySelector(".badge");
    if (badge) {
      badge.className = "badge badge--active";
      badge.textContent = "activo";
    }
  }

  async function approveExpert(id) {
    const btn = document.querySelector(`.btn-approve[data-id="${id}"]`);
    const email = btn?.getAttribute('data-email');
    
    if (!email) {
      alert('Error: No se pudo obtener el email del experto');
      return;
    }

    if (!confirm('¿Estás seguro de que deseas aprobar este experto?')) {
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aprobando...';

      const response = await fetch(`/api/expertos/aprobar/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.authToken || ''}`,
          'X-API-Key': 'servitech-api-key-2024'
        }
      });

      const result = await response.json();

      if (response.ok) {
        // Actualizar la fila para mostrar estado activo
        const row = document.querySelector(`table.admin-table--expertos tr[data-id="${id}"]`);
        if (row) {
          const badge = row.querySelector(".badge");
          if (badge) {
            badge.className = "badge badge--active";
            badge.textContent = "activo";
          }
          
          // Actualizar botones de acción
          const actionsCell = row.querySelector('.expertos-actions-cell');
          if (actionsCell) {
            actionsCell.innerHTML = `
              <div class="action-buttons" role="group" aria-label="Acciones experto">
                <button class="btn-outline btn-view" data-id="${id}">Ver</button>
                <button class="btn-outline btn-edit" data-id="${id}">Editar</button>
                <button class="btn-warning btn-inactivate" data-id="${id}">Inactivar</button>
              </div>
            `;
            bindRowActions(row.closest('table'));
          }
          
          row.setAttribute('data-status', 'activo');
        }
        
        alert('Experto aprobado exitosamente');
      } else {
        throw new Error(result.mensaje || 'Error al aprobar experto');
      }
    } catch (error) {
      console.error('Error al aprobar experto:', error);
      alert('Error al aprobar experto: ' + error.message);
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> Aprobar';
    }
  }

  async function rejectExpert(id) {
    const btn = document.querySelector(`.btn-reject[data-id="${id}"]`);
    const email = btn?.getAttribute('data-email');
    
    if (!email) {
      alert('Error: No se pudo obtener el email del experto');
      return;
    }

    const motivo = prompt('Motivo del rechazo (opcional):');
    if (motivo === null) {
      return; // Usuario canceló
    }

    if (!confirm('¿Estás seguro de que deseas rechazar este experto?')) {
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rechazando...';

      const response = await fetch(`/api/expertos/rechazar/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.authToken || ''}`,
          'X-API-Key': 'servitech-api-key-2024'
        },
        body: JSON.stringify({ motivo: motivo || 'Sin motivo especificado' })
      });

      const result = await response.json();

      if (response.ok) {
        // Remover la fila de la tabla ya que el usuario ya no es experto
        const row = document.querySelector(`table.admin-table--expertos tr[data-id="${id}"]`);
        if (row) {
          row.remove();
        }
        
        alert('Solicitud de experto rechazada exitosamente');
        
        // Actualizar la paginación
        const remainingRows = document.querySelectorAll('table.admin-table--expertos tbody tr:not(.placeholder-row)');
        if (remainingRows.length === 0) {
          const tbody = document.querySelector('table.admin-table--expertos tbody');
          tbody.innerHTML = '<tr class="placeholder-row"><td colspan="6" style="text-align:center;padding:24px;color:var(--admin-text-secondary);">No hay expertos para mostrar.</td></tr>';
        }
      } else {
        throw new Error(result.mensaje || 'Error al rechazar experto');
      }
    } catch (error) {
      console.error('Error al rechazar experto:', error);
      alert('Error al rechazar experto: ' + error.message);
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-times"></i> Rechazar';
    }
  }

  function openModal(type, id) {
    console.log(`openModal called with type: ${type}, id: ${id}`);
    console.log(`Total experts in allExperts: ${allExperts.length}`);
    
    const expert = allExperts.find((x) => getExpertField(x, "id") == id);
    console.log(`Expert found:`, expert);
    
    if (!expert) {
      console.warn('Expert not found with id:', id);
      alert(`Experto no encontrado con ID: ${id}`);
      return;
    }

    let modal;
    if (type === "view") {
      modal = $("#verPerfilExperto");
      console.log('Looking for modal #verPerfilExperto:', modal);
    } else {
      modal = $(`#${type}ExpertModal`);
      console.log(`Looking for modal #${type}ExpertModal:`, modal);
    }
    
    if (!modal) {
      console.error('Modal not found for type:', type);
      alert(`Modal no encontrado para tipo: ${type}`);
      return;
    }

    try {
      // Mapear campos según el tipo de modal
      if (type === "view") {
        console.log('Filling view modal fields...');
        
        // Para el modal de ver
        const nameField = $("#name_view");
        const emailField = $("#email_view");
        const precioField = $("#precio_view");
        const bioField = $("#bio_view");
        const statusField = $("#status_view");
        
        console.log('Fields found:', {
          nameField: !!nameField,
          emailField: !!emailField,
          precioField: !!precioField,
          bioField: !!bioField,
          statusField: !!statusField
        });
        
        if (nameField) nameField.value = getExpertField(expert, "name") || "";
        if (emailField) emailField.value = getExpertField(expert, "email") || "";
        
        // Formatear precio
        const precio = getExpertField(expert, "price") || "";
        if (precioField) {
          // Buscar precio en infoExperto si no está en el nivel superior
          const precioFromInfo = expert.infoExperto?.precioPorHora || expert.precioPorHora || precio;
          precioField.value = precioFromInfo || "";
        }
        
        // Buscar bio en diferentes ubicaciones posibles
        const bio = getExpertField(expert, "bio") || expert.infoExperto?.descripcion || expert.descripcion || "";
        if (bioField) bioField.value = bio;
        
        // Estado
        const estado = getExpertField(expert, "status") || expert.estado || "inactivo";
        if (statusField) statusField.value = estado;
        
        // Hacer campos de solo lectura
        [nameField, emailField, precioField, bioField].forEach(field => {
          if (field) {
            field.readOnly = true;
            field.style.backgroundColor = "#f8f9fa";
            field.style.cursor = "default";
          }
        });
        
        // El select de estado también debe ser disabled
        if (statusField) {
          statusField.disabled = true;
          statusField.style.backgroundColor = "#f8f9fa";
          statusField.style.cursor = "default";
        }
        
      } else {
        console.log(`Filling ${type} modal fields...`);
        
        // Para otros modales (edit, etc.)
        const nameField = $(`#name_${type}`);
        const emailField = $(`#email_${type}`);
        const precioField = $(`#precio_${type}`);
        const bioField = $(`#bio_${type}`);
        
        if (nameField) nameField.value = getExpertField(expert, "name") || "";
        if (emailField) emailField.value = getExpertField(expert, "email") || "";
        if (precioField) precioField.value = getExpertField(expert, "price") || "";
        if (bioField) bioField.value = getExpertField(expert, "bio") || "";
      }
      
      console.log('About to show modal...');
      modal.style.display = "block";
      modal.classList.add('show');
      document.body.classList.add('modal-open');
      
      console.log('Modal should now be visible. Modal display:', modal.style.display);
      console.log('Modal classes:', modal.className);
      console.log('Body classes:', document.body.className);
      
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
    ];

    closeSelectors.forEach((selector) => {
      $$(selector).forEach((btn) => {
        btn.addEventListener("click", function () {
          const modal = this.closest(".modal-expert");
          if (modal) modal.style.display = "none";
        });
      });
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
      try {
        initExpertForm();
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
            )}">\n        <div class="categoria-option-checkbox"></div>\n        ${
              cat.icon
                ? `<i class="fas ${cat.icon}" aria-hidden="true"></i>`
                : ""
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
          return `\n        <div class="categoria-chip" data-id="${id}">\n          <span>${name}</span>\n          <button type="button" class="categoria-chip-remove" aria-label="Remover categoría">\n            <i class="fas fa-times"></i>\n          </button>\n        </div>\n      `;
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
    // Defensive: ensure modals are hidden on initial load unless explicitly opened
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
      console.groupCollapsed &&
        console.groupCollapsed("admin-expertos: diagnóstico inicial");
      console.log(
        "allExperts (count):",
        Array.isArray(allExperts) ? allExperts.length : typeof allExperts,
        allExperts.slice ? allExperts.slice(0, 5) : allExperts
      );
      console.log(
        "categorias (count):",
        Object.keys(categoriesMap).length,
        categoriesMap
      );
      console.groupEnd && console.groupEnd();
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
    // Mitigaciones para evitar autofill en inputs email dentro de modales.
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
            email.style.setProperty(
              "-webkit-text-fill-color",
              sec,
              "important"
            );
          } catch (e) {}
          setTimeout(function () {
            try {
              email.readOnly = false;
            } catch (e) {}
          }, 80);
        } catch (e) {}
      } catch (e) {}
    }

    // Inicializador del botón "Nuevo experto": abre modal y coloca avatar por defecto
    function initAddExpertButton() {
      try {
        const btn = document.getElementById("btnAddExpert");
        const modal = document.getElementById("expertModal");
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

        if (btn && modal) {
          btn.addEventListener("click", function (e) {
            e.preventDefault();
            modal.style.display = "flex";
            try {
              const firstInput = modal.querySelector(
                'input[type="text"], input:not([type]), textarea'
              );
              if (firstInput) firstInput.focus();
            } catch (e) {}
          });
        }
      } catch (e) {
        console.warn("initAddExpertButton error", e);
      }
    }

    // Ejecutar mitigaciones para los modales conocidos
    ["editExpertModal", "expertModal", "verPerfilExperto"].forEach(
      mitigateAutofillForModal
    );
    initAddExpertButton();

    // Handler para el formulario de agregar experto: valida, sube imagen y persiste via API
    function initExpertForm() {
      try {
        const form = document.getElementById("expertForm");
        const modal = document.getElementById("expertModal");
        if (!form) return;

        console.log("initExpertForm: initializing");
        // El botón de submit está en el footer del modal (fuera del <form>),
        // enlazamos ese botón para que dispare el submit del formulario.
        try {
          const footerSubmit =
            modal &&
            modal.querySelector('.modal-expert__footer button[type="submit"]');
          if (footerSubmit) {
            console.log(
              "initExpertForm: found footer submit button, attaching click"
            );
            footerSubmit.addEventListener("click", function (ev) {
              console.log("footer submit clicked");
              try {
                // Preferir requestSubmit para disparar listeners y validación nativa
                if (typeof form.requestSubmit === "function") {
                  form.requestSubmit();
                } else {
                  form.dispatchEvent(
                    new Event("submit", { bubbles: true, cancelable: true })
                  );
                }
              } catch (e) {
                console.warn("footer submit click error", e);
              }
            });
          }
        } catch (e) {}

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
            // asumir { url: '...' }
            return json && (json.url || json.path || json.fileUrl)
              ? json.url || json.path || json.fileUrl
              : null;
          } catch (e) {
            console.warn("uploadImage error", e);
            return null;
          }
        }

        form.addEventListener("submit", async function (ev) {
          console.log("expertForm submit handler invoked");
          ev.preventDefault();
          try {
            // Bloquear submit
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
              submitBtn.disabled = true;
              submitBtn.dataset.origText = submitBtn.textContent;
              submitBtn.textContent = "Guardando...";
            }

            // Leer campos básicos
            const nameInput = form.querySelector("#name");
            const emailInput = form.querySelector("#email");
            const precioInput = form.querySelector("#precio");
            const statusInput = form.querySelector("#statusInput");
            const categoriasHidden = form.querySelector("#categorias-values");
            const fileInput = form.querySelector("#profileImage");

            const name = (nameInput?.value || "").trim();
            const email = (emailInput?.value || "").trim();
            const precio = Number(precioInput?.value || 0) || 0;
            const status = (statusInput?.value || "active").trim();
            const categoriasValues = (categoriasHidden?.value || "")
              .split(",")
              .filter(Boolean);

            // Validación cliente
            let hasError = false;
            try {
              // limpiar errores previos
              [nameInput, emailInput, precioInput].forEach((i) => {
                if (!i) return;
                const errEl = document.getElementById(i.id + "-error");
                if (errEl) errEl.style.display = "none";
                i.classList.remove("input-error");
              });
            } catch (e) {}

            if (!name) {
              const el = document.getElementById("name-error");
              if (el) {
                el.textContent = "El nombre es obligatorio.";
                el.style.display = "block";
              }
              if (nameInput) nameInput.classList.add("input-error");
              hasError = true;
            }
            if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
              const el = document.getElementById("email-error");
              if (el) {
                el.textContent = "Email inválido.";
                el.style.display = "block";
              }
              if (emailInput) emailInput.classList.add("input-error");
              hasError = true;
            }
            if (!precio || precio <= 0) {
              const el = document.getElementById("precio-error");
              if (el) {
                el.textContent = "Precio inválido.";
                el.style.display = "block";
              }
              if (precioInput) precioInput.classList.add("input-error");
              hasError = true;
            }
            if (!categoriasValues.length) {
              const chips = document.getElementById("categorias-chips");
              if (chips) chips.classList.add("error");
              hasError = true;
              // mostrar hint si existe
              const err = document.querySelector(".categorias-error");
              if (err) err.style.display = "block";
            }

            if (hasError) {
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent =
                  submitBtn.dataset.origText || "Guardar experto";
              }
              return;
            }

            // Si hay archivo seleccionado, intentar subir primero
            let avatarUrl = null;
            try {
              const file = fileInput && fileInput.files && fileInput.files[0];
              if (file) {
                avatarUrl = await uploadImage(file);
              } else {
                const avatarEl = document.getElementById("profilePreviewImage");
                avatarUrl = avatarEl ? avatarEl.src : null;
              }
            } catch (e) {
              console.warn("image upload fallback", e);
            }

            // Enviar al backend
            try {
              const payload = {
                nombre: name,
                email: email,
                precio: precio,
                estado: status,
                categorias: categoriasValues,
                avatar: avatarUrl || undefined,
              };

              const res = await fetch("/api/expertos", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });

              if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                const msg = (json && json.message) || "Error al crear experto";
                showToast(msg, "error");
                throw new Error(msg);
              }

              const created = await res.json();

              // Insertar en allExperts usando el objeto devuelto por el servidor
              allExperts.unshift(created);
              currentPage = 1;
              applyFilters();

              showToast("Experto creado correctamente", "success");

              try {
                if (modal) modal.style.display = "none";
              } catch (e) {}
              try {
                form.reset();
              } catch (e) {}
            } catch (err) {
              console.warn("error creating expert", err);
            }

            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent =
                submitBtn.dataset.origText || "Guardar experto";
            }
          } catch (e) {
            console.warn("error al procesar expertForm submit", e);
            try {
              const submitBtn = form.querySelector('button[type="submit"]');
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent =
                  submitBtn.dataset.origText || "Guardar experto";
              }
            } catch (ee) {}
          }
        });
      } catch (e) {
        console.warn("initExpertForm error", e);
      }
    }

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

        // close when clicking outside
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
    // ===== Comportamiento: selector de días y mostrar/ocultar número de cuenta (migrado desde EJS inline) =====
    try {
      // Selector de días (botones con clase .day-button y display en .days-display)
      const dayButtons = document.querySelectorAll(".day-button");
      const daysDisplay = document.querySelector(".days-display");

      function updateDaysDisplay() {
        const activeDays = Array.from(
          document.querySelectorAll(".day-button.active")
        ).map((btn) => btn.getAttribute("data-day"));
        if (!daysDisplay) return;
        daysDisplay.textContent =
          activeDays.length === 0
            ? "Ningún día seleccionado"
            : activeDays.join(", ");
      }

      dayButtons.forEach((button) => {
        button.addEventListener("click", function () {
          this.classList.toggle("active");
          updateDaysDisplay();
        });
      });

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
