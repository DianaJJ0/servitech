/**
 * @fileoverview
 * Funcionalidad del panel de administración para la gestión de categorías en Servitech.
 * Permite listar, agregar, editar y eliminar categorías desde la interfaz de administrador.
 *
 * Autor: Diana Carolina Jimenez
 * Fecha: 2025-06-04
 */

/**
 * Deepwiki: metadata
 * - propósito: gestión CRUD de categorías en Admin
 * - variables DOM esperadas: .categorias-grid__tabla, #categoryModal, #modalEliminarCategoria
 * - dependencias: admin-common.js
 */

/**
 * Funcionalidad específica para la página de gestión de categorías
 */

/**
 * Inicialización principal al cargar la página.
 * Mantener esta sección ligera y delegar funciones específicas a helpers.
 */
document.addEventListener("DOMContentLoaded", function () {
  // Asegurar contenedor para mensajes (para showMessage)
  ensureAdminMessageContainer();

  // Inicializar modales y acciones
  setupCategoryModal();
  setupCategoryActions();
  setupFilters(); // <-- Conectar los filtros

  // Cargar categorías en la tabla si existe el tbody
  const tbody = document.querySelector(
    ".categorias-grid__tabla .admin-table tbody"
  );
  if (tbody) loadCategorias(); // <-- Esto iniciará el proceso de carga y renderizado

  // Delegación para los botones de acción dentro de la tabla (Editar / Ver / Eliminar)
  if (tbody) {
    tbody.addEventListener("click", function (e) {
      const btn = e.target.closest(".btn-icon");
      if (!btn) return;
      const row = btn.closest("tr");
      const title = (btn.getAttribute("title") || "").toLowerCase();

      // EDITAR
      if (title.includes("editar")) {
        const catId = btn.getAttribute("data-id") || (row && row.dataset.id);
        if (catId) abrirModalEditarCategoria(catId);
        return;
      }

      // VER
      if (title.includes("ver")) {
        if (!row) return;
        const modalVer = document.getElementById("modalVerCategoria");
        if (!modalVer) return;

        const catId = btn.getAttribute("data-id") || (row && row.dataset.id);
        if (!catId) return;

        const categoriasCache = window._adminCategorias || [];
        const cat = categoriasCache.find((x) => String(x.id) === String(catId));

        if (!cat) {
          // Alternativa: leer desde la tabla si no se encuentra en caché
          console.warn(
            `Categoría con ID ${catId} no encontrada en caché. Leyendo de la tabla.`
          );
          const name =
            row
              .querySelector(".categorias-table__icon-row span")
              ?.textContent.trim() || "";
          const slug = row.children[2]?.textContent.trim() || "";
          const parent = row.children[3]?.textContent.trim() || "";
          const estado = row.querySelector(".status")?.textContent.trim() || "";

          modalVer.querySelector("#verNombreCategoria").value = name;
          modalVer.querySelector("#verSlugCategoria").value = slug;
          modalVer.querySelector("#verPadreCategoria").value = parent;
          modalVer.querySelector("#verEstadoCategoria").value = estado;
          modalVer.querySelector("#verDescripcionCategoria").value =
            "Descripción no disponible en caché.";
        } else {
          // Poblar desde el objeto en caché
          modalVer.querySelector("#verNombreCategoria").value = cat.name || "";
          modalVer.querySelector("#verSlugCategoria").value = cat.slug || "";
          modalVer.querySelector("#verPadreCategoria").value =
            cat.parent || "-";
          modalVer.querySelector("#verEstadoCategoria").value =
            cat.estado === "active" ? "Activa" : "Inactiva";
          modalVer.querySelector("#verDescripcionCategoria").value =
            cat.descripcion || "";
        }

        modalVer.style.display = "flex";
        document.body.style.overflow = "hidden";
        return;
      }

      // ELIMINAR
      if (title.includes("eliminar")) {
        if (!row) return;
        const modalEliminar = document.getElementById("modalEliminarCategoria");
        if (!modalEliminar) return;
        const name = row.querySelector(".categorias-table__icon-row span")
          ? row
              .querySelector(".categorias-table__icon-row span")
              .textContent.trim()
          : "";
        const id = btn.getAttribute("data-id") || (row && row.dataset.id) || "";
        const nameEl = document.getElementById("modalEliminarCategoriaNombre");
        if (nameEl) nameEl.textContent = name;
        modalEliminar.dataset.targetId = id;
        modalEliminar.style.display = "flex";
        document.body.style.overflow = "hidden";
        return;
      }
    });
  }

  // Confirmar eliminación desde el modal
  const modalEliminar = document.getElementById("modalEliminarCategoria");
  const confirmarEliminar = modalEliminar
    ? modalEliminar.querySelector(".modal-categoria-eliminar-confirmar")
    : null;
  if (confirmarEliminar) {
    confirmarEliminar.addEventListener("click", async () => {
      const id = modalEliminar.dataset.targetId;
      if (id) await eliminarCategoria(id);
      modalEliminar.style.display = "none";
      document.body.style.overflow = "";
    });
  }
});
// Autogenerar slug desde el nombre mientras el usuario escribe
document.addEventListener("DOMContentLoaded", () => {
  const nameInput = document.getElementById("categoryName");
  const slugInput = document.getElementById("categorySlug");
  if (!nameInput || !slugInput) return;

  let lastAuto = "";
  nameInput.addEventListener("input", (e) => {
    const suggested = normalizeSlug(e.target.value || "");
    // Sólo sobreescribir si el usuario no editó manualmente el slug
    if (!slugInput.value || slugInput.value === lastAuto) {
      slugInput.value = suggested;
      lastAuto = suggested;
    }
    clearFieldErrors(slugInput);
    clearFieldErrors(nameInput);
  });
});

// Validación en tiempo real: campo Nombre (crear) y Nombre (editar)
document.addEventListener("DOMContentLoaded", () => {
  const nameCrear = document.getElementById("categoryName");
  const nameEditar = document.getElementById("editarNombreCategoria");

  function validarNombreEnVacio(el) {
    if (!el) return;
    const val = String(el.value || "").trim();
    clearFieldErrors(el);
    if (!val) {
      markFieldInvalid(el, "El nombre es obligatorio.");
      showMessage("El nombre es obligatorio.", "error");
      return false;
    }
    return true;
  }

  if (nameCrear) {
    nameCrear.addEventListener("blur", () => validarNombreEnVacio(nameCrear));
    nameCrear.addEventListener("input", () => clearFieldErrors(nameCrear));
  }

  if (nameEditar) {
    nameEditar.addEventListener("blur", () => validarNombreEnVacio(nameEditar));
    nameEditar.addEventListener("input", () => clearFieldErrors(nameEditar));
  }
});

/**
 * Configura la funcionalidad del modal para agregar/editar categorías
 */
function setupCategoryModal() {
  const modal = document.getElementById("categoryModal");
  let btnAddCategory = document.getElementById("btnAddCategory");
  const btnCloseModal = modal ? modal.querySelector(".btn-close") : null;
  const btnCancel = modal
    ? modal.querySelector('[data-dismiss="modal"]')
    : null;

  if (!modal) {
    console.warn(
      "setupCategoryModal: modal #categoryModal no encontrado en el DOM"
    );
    return;
  }

  // Fallback: buscar botón por otras rutas comunes si no se encuentra por id
  if (!btnAddCategory) {
    btnAddCategory =
      document.querySelector("#btnAddCategory") ||
      document.querySelector(".page-actions .btn-primary");
    if (!btnAddCategory) {
      console.warn(
        "setupCategoryModal: btnAddCategory no encontrado. Se usará un listener delegado como respaldo."
      );
    }
  }

  const openModal = () => {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    modal.style.display = "none";
    document.body.style.overflow = "";
    const form = document.getElementById("categoryForm");
    if (form) form.reset();
  };

  if (btnAddCategory) {
    // Asegurar que no actúe como submit por accidente
    try {
      btnAddCategory.setAttribute("type", "button");
    } catch (e) {}
    btnAddCategory.addEventListener("click", openModal);
    console.log("setupCategoryModal: eventListener añadido a btnAddCategory");
  } else {
    // Delegated listener: cubre casos donde el botón se inyecta después
    document.body.addEventListener("click", function delegated(e) {
      if (e.target && e.target.closest && e.target.closest("#btnAddCategory")) {
        openModal();
      }
    });
    console.log(
      "setupCategoryModal: listener delegado añadido para btnAddCategory"
    );
  }

  if (btnCloseModal) btnCloseModal.addEventListener("click", closeModal);
  if (btnCancel) btnCancel.addEventListener("click", closeModal);

  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Cerrar con Escape
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal.style.display === "flex") closeModal();
  });
}

/**
 * Configura las acciones para la gestión de categorías
 */
function setupCategoryActions() {
  const editButtons = document.querySelectorAll(".category-edit");
  editButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      const categoryId = this.getAttribute("data-id");
      const categoryName = this.getAttribute("data-name");
      console.log(`Editar categoría: ${categoryName} (ID: ${categoryId})`);
    });
  });

  const deleteButtons = document.querySelectorAll(".category-delete");
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      const categoryId = this.getAttribute("data-id");
      const categoryName = this.getAttribute("data-name");

      if (
        confirm(
          `¿Estás seguro de que deseas eliminar la categoría "${categoryName}"?`
        )
      ) {
        console.log(`Categoría eliminada: ${categoryName} (ID: ${categoryId})`);
      }
    });
  });
}

/**
 * Abre el modal para agregar una nueva categoría.
 */
function abrirModalAgregarCategoria() {
  const modal = document.getElementById("categoryModal");
  if (modal) {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}

/**
 * Agrega una fila de categoría a la tabla en la interfaz.
 * @param {object} formData - Los datos del formulario de la categoría.
 * @param {object} responseData - Los datos de la respuesta de la API, que incluyen el nuevo ID.
 */
function addCategoryToTable(formData, responseData) {
  const tbody = document.querySelector(
    ".categorias-grid__tabla .admin-table tbody"
  );
  if (!tbody) return;

  const tr = document.createElement("tr");
  tr.dataset.id = responseData.id || Date.now();

  const parentSelect = document.getElementById("parentCategory");
  const parentOption = parentSelect.options[parentSelect.selectedIndex];
  const parentName = parentOption.value ? parentOption.text : "-";

  // Estandarizar a minúsculas para el caché
  const estadoNormalizado = formData.estado.toLowerCase();

  // 1. Checkbox
  const tdCheckbox = document.createElement("td");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "categorias-checkbox";
  tdCheckbox.appendChild(checkbox);
  tr.appendChild(tdCheckbox);

  // 2. Category Name + Icon
  const tdName = document.createElement("td");
  tdName.innerHTML = `<div class="categorias-table__icon-row">
      <div class="categorias-table__icon" style="color: ${escapeHtml(
        formData.color || "#3a8eff"
      )};">
        <i class="fas fa-${escapeHtml(formData.icon || "tags")}"></i>
      </div>
      <span>${escapeHtml(formData.nombre || "")}</span>
    </div>`;
  tr.appendChild(tdName);

  // 3. Slug
  const tdSlug = document.createElement("td");
  tdSlug.textContent = formData.slug || "";
  tr.appendChild(tdSlug);

  // 4. Parent Category
  const tdParent = document.createElement("td");
  tdParent.textContent = parentName;
  tr.appendChild(tdParent);

  // 5. Publicaciones
  const tdPublicaciones = document.createElement("td");
  tdPublicaciones.textContent = "0";
  tr.appendChild(tdPublicaciones);

  // 6. Expertos
  const tdExpertos = document.createElement("td");
  tdExpertos.textContent = "0";
  tr.appendChild(tdExpertos);

  // 7. Estado
  const tdStatus = document.createElement("td");
  const statusSpan = document.createElement("span");
  statusSpan.className = `status ${estadoNormalizado}`;
  statusSpan.textContent =
    estadoNormalizado === "active" ? "Activa" : "Inactiva";
  tdStatus.appendChild(statusSpan);
  tr.appendChild(tdStatus);

  // 8. Acciones
  const tdActions = document.createElement("td");
  tdActions.innerHTML = `<div class="action-buttons">
      <button class="btn-icon" title="Editar" data-id="${tr.dataset.id}"><i class="fas fa-edit"></i></button>
      <button class="btn-icon" title="Ver detalles" data-id="${tr.dataset.id}"><i class="fas fa-eye"></i></button>
  <button class="btn-icon" title="Inactivar" data-id="${tr.dataset.id}"><i class="fas fa-toggle-off"></i></button>
    </div>`;
  tr.appendChild(tdActions);

  // Agregar la nueva fila al principio de la tabla para mayor visibilidad
  tbody.prepend(tr);

  // Actualizar el caché interno para que la edición funcione sin recargar
  if (window._adminCategorias) {
    const newCacheItem = {
      id: tr.dataset.id,
      name: formData.nombre,
      slug: formData.slug,
      parent: parentName,
      parent_id: formData.parent,
      estado: estadoNormalizado, // Usar el estado normalizado en minúsculas
      descripcion: formData.descripcion,
      icon: formData.icon,
      color: formData.color,
      publicacionesCount: 0,
      expertosCount: 0,
    };
    window._adminCategorias.unshift(newCacheItem);
    try {
      document.dispatchEvent(
        new CustomEvent("categorias:updated", {
          detail: { categories: window._adminCategorias },
        })
      );
    } catch (e) {}
    // Después de agregar una nueva categoría, podría ser una categoría padre, así que actualizamos los menús.
    populateAllParentDropdowns();
  }
}

/**
 * Envía los datos de la nueva categoría al backend y actualiza la tabla.
 */
async function agregarCategoria(datosCategoria) {
  try {
    console.log("agregarCategoria: enviando a /api/categorias", datosCategoria);
    try {
      console.log("agregarCategoria: headers=", getHeaders());
    } catch (e) {}
    const response = await fetch("/api/categorias", {
      method: "POST",
      headers: {
        ...getHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(datosCategoria),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err.mensaje || err.message || "Error al agregar categoría";
      throw new Error(msg);
    }

    const nuevaCategoria = await response.json();
    console.log("Categoría agregada:", nuevaCategoria);

    // Añadir directamente a la tabla en lugar de recargar todo
    addCategoryToTable(datosCategoria, nuevaCategoria);

    // Cerrar modal
    const modal = document.getElementById("categoryModal");
    if (modal) {
      modal.style.display = "none";
      document.body.style.overflow = "";
    }

    return nuevaCategoria;
  } catch (error) {
    console.error("Error:", error);
    showMessage(error.message || "Error al agregar categoría.", "error");
    throw error;
  }
}

/**
 * Abre el modal para editar una categoría existente.
 */
function abrirModalEditarCategoria(categoriaId) {
  const modal = document.getElementById("modalEditarCategoria");
  if (modal) {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
    // Cargar datos desde cache
    const categoriasCache = window._adminCategorias || [];
    const cat = categoriasCache.find(
      (x) => String(x.id) === String(categoriaId)
    );
    if (cat) {
      // El objeto 'cat' tiene la forma: {id, name, icon, slug, parent, parent_id, estado, ..., descripcion, color}
      document.getElementById("editarNombreCategoria").value = cat.name || "";
      document.getElementById("editarSlugCategoria").value = cat.slug || "";
      document.getElementById("editarPadreCategoria").value =
        cat.parent_id || "";
      document.getElementById("editarEstadoCategoria").value = cat.estado; // Ya está en minúsculas
      document.getElementById("editarDescripcionCategoria").value =
        cat.descripcion || "";
      document.getElementById("editarIconoCategoria").value = cat.icon || "";
      document.getElementById("editarColorCategoria").value =
        cat.color || "#3a8eff";

      // almacenar id en el formulario
      const form = document.getElementById("formEditarCategoria");
      if (form) form.dataset.editId = cat.id;

      // Sincronizar slug con nombre si el usuario edita el nombre
      const nameInput = document.getElementById("editarNombreCategoria");
      const slugInput = document.getElementById("editarSlugCategoria");
      if (nameInput && slugInput) {
        nameInput.addEventListener(
          "input",
          () => (slugInput.value = normalizeSlug(nameInput.value))
        );
      }
    }
  }
}

/**
 * Elimina una categoría de la base de datos.
 */
async function eliminarCategoria(categoriaId) {
  // Nota: esta función ahora inactiva la categoría en lugar de eliminarla permanentemente.
  try {
    const payload = { estado: "inactive" };
    const response = await fetch(`/api/categorias/${categoriaId}`, {
      method: "PUT",
      headers: Object.assign(
        { "Content-Type": "application/json" },
        getHeaders()
      ),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      const msg =
        (json && (json.message || json.mensaje)) ||
        "Error al inactivar categoría";
      throw new Error(msg);
    }

    console.log(`Categoría inactivada: ID ${categoriaId}`);
    // Refrescar tabla
    await loadCategorias();
    showMessage("Categoría inactivada correctamente.", "success");
  } catch (error) {
    console.error("Error inactivar categoría:", error);
    showMessage("Error al inactivar categoría.", "error");
  }
}

/**
 * Devuelve headers comunes incluyendo Authorization (token) y x-api-key si existen.
 */
function getHeaders() {
  const headers = {};
  const token = localStorage.getItem("token");
  if (token) headers["Authorization"] = "Bearer " + token;
  // API key puede estar expuesta globalmente desde plantilla EJS como window.API_KEY
  if (window.API_KEY) headers["x-api-key"] = window.API_KEY;
  return headers;
}

/**
 * Configura los listeners para los filtros de categoría.
 */
function setupFilters() {
  const filterContainer = document.querySelector(".categorias-filtros");
  if (!filterContainer) return;

  const applyBtn = filterContainer.querySelector(".categorias-filtros__btn");
  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      // Al aplicar filtros, renderizar desde la página 1
      displayCategorias(1);
    });
  }
}

/**
 * Renderiza la tabla de categorías basándose en los filtros y paginación.
 * @param {number} page - El número de página a mostrar.
 * @param {number} pageSize - El número de items por página.
 */
function displayCategorias(page = 1, pageSize = 7) {
  const allCategorias = window._adminCategorias || [];

  // Mostrar todas las categorías sin filtrar por estado
  const selects = document.querySelectorAll(".categorias-filtros__select");
  const padreVal = selects.length > 1 ? selects[1].value : "";

  const filtered = allCategorias.filter((cat) => {
    let padreMatch = true;
    if (padreVal) {
      if (padreVal === "none") {
        padreMatch = !cat.parent_id;
      } else {
        padreMatch = String(cat.parent_id || "") === String(padreVal);
      }
    }
    return padreMatch;
  });

  const tbody = document.querySelector(
    ".categorias-grid__tabla .admin-table tbody"
  );
  if (!tbody) return;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  page = Math.max(1, Math.min(page, totalPages));
  window._adminCategoriasPage = page;
  window._adminCategoriasPageSize = pageSize;

  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const paginas = filtered.slice(start, end);

  tbody.innerHTML = "";

  if (paginas.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" style="text-align: center; padding: 20px;">No se encontraron categorías con los filtros seleccionados.</td></tr>';
  } else {
    paginas.forEach((c) => {
      const tr = document.createElement("tr");
      tr.dataset.id = c.id;
      // El estado en el caché ya está normalizado a minúsculas.
      const statusClass = c.estado;
      const statusText = c.estado === "active" ? "Activa" : "Inactiva";
      tr.innerHTML = `
                <td><input type="checkbox" class="categorias-checkbox" /></td>
                <td>
                  <div class="categorias-table__icon-row">
                    <div class="categorias-table__icon" style="color: ${escapeHtml(
                      c.color || "#3a8eff"
                    )}"><i class="fas fa-${escapeHtml(
        c.icon || "tags"
      )}"></i></div>
                    <span>${escapeHtml(c.name || "")}</span>
                  </div>
                </td>
                <td>${escapeHtml(c.slug || "")}</td>
                <td>${escapeHtml(c.parent || "-")}</td>
                <td>${c.publicacionesCount || 0}</td>
                <td>${c.expertosCount || 0}</td>
                <td><span class="status ${statusClass}">${escapeHtml(
        statusText
      )}</span></td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-icon" title="Editar" data-id="${
                      c.id
                    }"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon" title="Ver detalles" data-id="${
                      c.id
                    }"><i class="fas fa-eye"></i></button>
                    <button class="btn-icon" title="Inactivar" data-id="${
                      c.id
                    }"><i class="fas fa-toggle-off"></i></button>
                  </div>
                </td>
            `;
      tbody.appendChild(tr);
    });
  }

  renderPagination(total, page, pageSize);
}

/**
 * Rellena dinámicamente todos los menús desplegables de categorías padre.
 */
function populateAllParentDropdowns() {
  const allCategorias = window._adminCategorias || [];
  // Preset parent categories que siempre deben aparecer en los selects
  const presetParentCategories = [
    { id: "desarrollo-software", name: "Desarrollo de Software" },
    { id: "infraestructura-y-redes", name: "Infraestructura y Redes" },
    { id: "ciberseguridad", name: "Ciberseguridad" },
    {
      id: "ciencia-datos-ia",
      name: "Ciencia de Datos e Inteligencia Artificial",
    },
    { id: "bases-de-datos", name: "Bases de Datos" },
    { id: "diseno-ux-ui", name: "Diseño y UX/UI" },
    { id: "tecnologias-emergentes", name: "Tecnologías Emergentes" },
    {
      id: "ecommerce-marketing-digital",
      name: "E-commerce y Marketing Digital",
    },
    { id: "soporte-ti", name: "Soporte Técnico y TI" },
    { id: "transformacion-digital", name: "Transformación Digital" },
    {
      id: "carrera-educacion-tecnologica",
      name: "Carrera y Educación Tecnológica",
    },
  ];

  // Solo las categorías activas y que no tengan padre pueden ser una categoría padre.
  const parentCategories = allCategorias.filter(
    (c) => !c.parent_id && c.estado === "active"
  );

  const selectsToPopulate = [
    {
      id: "parentCategory",
      default: '<option value="">Sin categoría padre</option>',
    },
    {
      id: "editarPadreCategoria",
      default: '<option value="">Sin categoría padre</option>',
    },
    {
      selector: ".categorias-filtros__select",
      index: 1,
      default:
        '<option value="">Todas</option><option value="none">Sin categoría padre</option>',
    },
  ];

  // Rellenar cada select según la política: presets para creación/edición, dinámicas para filtros.
  selectsToPopulate.forEach((item) => {
    let selectEl;
    if (item.id) selectEl = document.getElementById(item.id);
    else if (item.selector)
      selectEl = document.querySelectorAll(item.selector)[item.index];
    if (!selectEl) return;

    const currentVal = selectEl.value;

    // Si es el select de creación/edición, mostrar sólo presets
    if (item.id === "parentCategory" || item.id === "editarPadreCategoria") {
      const options = [
        item.default || '<option value="">Sin categoría padre</option>',
      ];
      presetParentCategories.forEach((p) => {
        options.push(
          `<option value="${escapeHtml(String(p.id))}">${escapeHtml(
            p.name
          )}</option>`
        );
      });
      try {
        selectEl.innerHTML = options.join("");
      } catch (e) {
        // Fallback manual
        while (selectEl.firstChild) selectEl.removeChild(selectEl.firstChild);
        options.forEach((optHtml) => {
          const tmp = document.createElement("div");
          tmp.innerHTML = optHtml;
          const opt = tmp.firstChild;
          if (opt) selectEl.appendChild(opt);
        });
      }
      try {
        selectEl.value = currentVal;
      } catch (e) {
        const first = selectEl.querySelector("option");
        if (first) first.selected = true;
      }
      return;
    }

    // Para selects de filtro, mostrar default + dinámicas (padres reales)
    const options = [item.default || '<option value="">Todas</option>'];
    parentCategories.forEach((c) => {
      options.push(
        `<option value="${escapeHtml(String(c.id || ""))}">${escapeHtml(
          c.name || c.id || ""
        )}</option>`
      );
    });
    try {
      selectEl.innerHTML = options.join("");
    } catch (e) {}
    try {
      selectEl.value = currentVal;
    } catch (e) {}
  });
}

/**
 * Carga las categorías desde el backend, normaliza los datos y las muestra.
 */
async function loadCategorias() {
  try {
    // Pedimos explícitamente todas las categorías para el panel admin
    const res = await fetch("/api/categorias?all=true", {
      headers: getHeaders(),
    });
    if (!res.ok) {
      console.error("Error al obtener categorías", res.status);
      return;
    }
    const rawCategorias = await res.json();

    // Normalizar datos al momento de cargarlos para asegurar consistencia.
    const categoriasNormalizadas = (
      Array.isArray(rawCategorias) ? rawCategorias : []
    ).map((cat) => ({
      ...cat,
      estado: (cat.estado || "inactive").toLowerCase(),
    }));

    window._adminCategorias = categoriasNormalizadas;

    // Emitir un evento global para notificar a otras partes del frontend
    try {
      document.dispatchEvent(
        new CustomEvent("categorias:updated", {
          detail: { categories: categoriasNormalizadas },
        })
      );
    } catch (e) {}

    // Poblar todos los menús de categorías padre.
    populateAllParentDropdowns();
    // Mostrar la tabla inicial.
    // Asegurarnos de que la página actual esté definida antes de llamar a displayCategorias
    if (typeof window._adminCategoriasPage === "undefined") {
      window._adminCategoriasPage = 1;
    }
    displayCategorias(1);

    showMessage("Categorías cargadas.", "info", 800);
  } catch (err) {
    console.error("Error cargando categorías:", err);
    showMessage("Error al cargar categorías.", "error");
  }
}

/**
 * Renderiza el bloque de paginación y añade listeners que funcionan con los filtros.
 */
function renderPagination(totalItems, currentPage, pageSize) {
  const pagContainer = document.querySelector(".categorias-paginacion");
  if (!pagContainer) return;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const infoEl = pagContainer.querySelector(".categorias-paginacion__info");
  if (infoEl)
    infoEl.textContent = `Mostrando ${start}-${end} de ${totalItems} categorías`;

  const controls = pagContainer.querySelector(
    ".categorias-paginacion__controles"
  );
  if (!controls) return;

  const maxVisible = 5;
  let html = "";
  html += `<button class="categorias-paginacion__btn ${
    currentPage === 1 ? "categorias-paginacion__btn--disabled" : ""
  }" data-page="${
    currentPage - 1
  }"><i class="fas fa-chevron-left"></i></button>`;

  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  for (let p = startPage; p <= endPage; p++) {
    html += `<button class="categorias-paginacion__btn ${
      p === currentPage ? "categorias-paginacion__btn--active" : ""
    }" data-page="${p}">${p}</button>`;
  }

  html += `<button class="categorias-paginacion__btn ${
    currentPage === totalPages ? "categorias-paginacion__btn--disabled" : ""
  }" data-page="${
    currentPage + 1
  }"><i class="fas fa-chevron-right"></i></button>`;

  controls.innerHTML = html;

  const btns = controls.querySelectorAll("button[data-page]");
  btns.forEach((b) => {
    b.addEventListener("click", (e) => {
      const p = Number(b.getAttribute("data-page"));
      if (
        p === currentPage ||
        b.classList.contains("categorias-paginacion__btn--disabled")
      )
        return;
      displayCategorias(p, pageSize);
    });
  });
}

function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Asegura que exista un contenedor en el DOM para mostrar mensajes administrables.
 * Usado por showMessage().
 */
function ensureAdminMessageContainer() {
  let adminMessageContainer = document.getElementById("adminMessageContainer");
  if (!adminMessageContainer) {
    adminMessageContainer = document.createElement("div");
    adminMessageContainer.id = "adminMessageContainer";
    adminMessageContainer.style.position = "fixed";
    adminMessageContainer.style.top = "16px";
    adminMessageContainer.style.right = "16px";
    adminMessageContainer.style.zIndex = "9999";
    document.body.appendChild(adminMessageContainer);
  }
  return adminMessageContainer;
}

/**
 * Normaliza un texto para convertirlo en slug (url amigable).
 * Reemplaza espacios por guiones, quita acentos y caracteres inválidos.
 */
function normalizeSlug(text) {
  if (!text) return "";
  // Normalizar acentos
  const from = "ÁÀÂÄáàâäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÖóòôöÚÙÛÜúùûüÑñÇç";
  const to = "AAAAaaaaEEEEeeeeIIIIiiiiOOOOooooUUUUuuuuNnCc";
  let s = String(text);
  for (let i = 0; i < from.length; i++) {
    s = s.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
  }
  s = s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // eliminar caracteres inválidos
    .replace(/\s+/g, "-") // espacios a guiones
    .replace(/-+/g, "-") // múltiples guiones a uno
    .replace(/^-|-$/g, ""); // quitar guiones al inicio/fin
  return s;
}

/**
 * Normaliza un texto para comparaciones (quita tildes y pasa a minúsculas).
 * Mantiene espacios y palabras, pero facilita comparaciones insensibles a acentos y mayúsculas.
 */
function normalizeForCompare(text) {
  if (!text) return "";
  // Reutilizar la lógica de quitar acentos pero mantener espacios
  const from = "ÁÀÂÄáàâäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÖóòôöÚÙÛÜúùûüÑñÇç";
  const to = "AAAAaaaaEEEEeeeeIIIIiiiiOOOOooooUUUUuuuuNnCc";
  let s = String(text);
  for (let i = 0; i < from.length; i++) {
    s = s.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
  }
  return s.toLowerCase().trim();
}

/**
 * Marca un campo de formulario como inválido y muestra un mensaje inline.
 * fieldId puede ser el id del input/select/textarea o el propio elemento.
 */
function markFieldInvalid(fieldIdOrEl, message) {
  const el =
    typeof fieldIdOrEl === "string"
      ? document.getElementById(fieldIdOrEl)
      : fieldIdOrEl;
  if (!el) return;
  el.classList && el.classList.add("input--invalid");
  // Aplicar estilo inline para asegurar visibilidad aunque falte CSS
  try {
    el.style.border = "1px solid #dc3545";
    el.style.boxShadow = "0 0 0 3px rgba(220,53,69,0.06)";
  } catch (e) {}
  // Crear/actualizar elemento de error
  let err = el.parentNode.querySelector(".field-error-msg");
  if (!err) {
    err = document.createElement("div");
    err.className = "field-error-msg";
    err.style.color = "#dc3545";
    err.style.fontSize = "12px";
    err.style.marginTop = "6px";
    el.parentNode.appendChild(err);
  }
  err.textContent = message || "Campo inválido";
}

/**
 * Limpia los errores visuales asociados a un campo (id o elemento).
 */
function clearFieldErrors(fieldIdOrEl) {
  const el =
    typeof fieldIdOrEl === "string"
      ? document.getElementById(fieldIdOrEl)
      : fieldIdOrEl;
  if (!el) return;
  try {
    el.classList && el.classList.remove("input--invalid");
    el.style.border = "";
    el.style.boxShadow = "";
    const err =
      el.parentNode && el.parentNode.querySelector(".field-error-msg");
    if (err) err.remove();
  } catch (e) {
    // ignore
  }
}

/**
 * Valida el formulario de categoría. Devuelve {valid: boolean, errors: Array<{field,message}>}
 */
function validateCategoryForm(values) {
  const errors = [];
  const MIN_LEN = 2;
  const MAX_LEN = 80;
  const DESC_MAX = 300; // permitir descripciones más largas

  // nombre: obligatorio y longitud práctica
  if (!values.nombre || String(values.nombre).trim().length === 0) {
    errors.push({
      field: "categoryName",
      message: "El nombre es obligatorio.",
    });
  } else {
    const ln = String(values.nombre).trim().length;
    if (ln < MIN_LEN || ln > MAX_LEN) {
      errors.push({
        field: "categoryName",
        message: `El nombre debe tener entre ${MIN_LEN} y ${MAX_LEN} caracteres.`,
      });
    }
  }

  // slug: obligatorio, formato y longitud
  const slugVal = String(values.slug || "").trim();
  if (!slugVal) {
    errors.push({ field: "categorySlug", message: "El slug es obligatorio." });
  } else {
    const normalized = normalizeSlug(slugVal);
    if (normalized !== slugVal) {
      errors.push({
        field: "categorySlug",
        message: `Slug inválido. Sugerido: ${normalized}`,
      });
    }
    const sl = slugVal.length;
    if (sl < MIN_LEN || sl > MAX_LEN) {
      errors.push({
        field: "categorySlug",
        message: `El slug debe tener entre ${MIN_LEN} y ${MAX_LEN} caracteres.`,
      });
    }
  }

  // parent: requerimiento: debe estar definido (puede quedar vacío para 'sin padre')
  if (values.parent === undefined || values.parent === null) {
    errors.push({
      field: "parentCategory",
      message: "Selecciona la categoría padre (si aplica).",
    });
  }

  // estado: obligatorio
  if (!values.estado) {
    errors.push({ field: "categoryStatus", message: "Selecciona el estado." });
  }

  // descripcion: obligatorio y longitud práctica
  if (!values.descripcion || String(values.descripcion).trim().length === 0) {
    errors.push({
      field: "categoryDescription",
      message: "La descripción es obligatoria.",
    });
  } else {
    const ld = String(values.descripcion).trim().length;
    if (ld < MIN_LEN || ld > DESC_MAX) {
      errors.push({
        field: "categoryDescription",
        message: `La descripción debe tener entre ${MIN_LEN} y ${DESC_MAX} caracteres.`,
      });
    }
  }

  // icon: obligatorio y longitud práctica
  if (!values.icon || String(values.icon).trim().length === 0) {
    errors.push({ field: "categoryIcon", message: "El icono es obligatorio." });
  } else {
    const li = String(values.icon).trim().length;
    if (li < MIN_LEN || li > MAX_LEN) {
      errors.push({
        field: "categoryIcon",
        message: `El nombre del icono debe tener entre ${MIN_LEN} y ${MAX_LEN} caracteres.`,
      });
    }
  }

  // color: obligatorio
  if (!values.color) {
    errors.push({
      field: "iconColor",
      message: "Selecciona un color para el icono.",
    });
  }

  return { valid: errors.length === 0, errors };
}

/** Mensajes UI simples */
function showMessage(text, type = "info", timeout = 2000) {
  const container = document.getElementById("adminMessageContainer");
  if (!container) return;
  const el = document.createElement("div");
  el.textContent = text;
  el.style.padding = "10px 14px";
  el.style.marginTop = "8px";
  el.style.borderRadius = "6px";
  el.style.color = "#fff";
  el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.12)";
  if (type === "success") el.style.background = "#28a745";
  else if (type === "error") el.style.background = "#dc3545";
  else el.style.background = "#007bff";
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }, timeout);
}

// Manejo del envío del formulario de edición
document.addEventListener("DOMContentLoaded", () => {
  const formEditar = document.getElementById("formEditarCategoria");
  if (formEditar) {
    formEditar.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = formEditar.dataset.editId;
      const nombre = document
        .getElementById("editarNombreCategoria")
        .value.trim();
      const slug = document.getElementById("editarSlugCategoria").value.trim();
      const parent = document.getElementById("editarPadreCategoria").value;
      const estado = document.getElementById("editarEstadoCategoria").value;
      const descripcion = document
        .getElementById("editarDescripcionCategoria")
        .value.trim();
      const icon = document.getElementById("editarIconoCategoria").value.trim();
      const color = document.getElementById("editarColorCategoria").value;

      if (!nombre) {
        showMessage("El nombre es obligatorio.", "error");
        return;
      }
      try {
        const payload = {
          nombre,
          nombreNormalized: normalizeForCompare(nombre),
          slug: slug,
          slugNormalized: normalizeForCompare(slug),
          descripcion,
          parent,
          estado,
          icon,
          color,
        };

        const res = await fetch(`/api/categorias/${id}`, {
          method: "PUT",
          headers: Object.assign(
            { "Content-Type": "application/json" },
            getHeaders()
          ),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          showMessage(err.mensaje || "Error al actualizar categoría.", "error");
          return;
        }
        showMessage("Categoría actualizada.", "success");
        // cerrar modal y recargar
        const modal = document.getElementById("modalEditarCategoria");
        if (modal) modal.style.display = "none";
        await loadCategorias();
        try {
          // loadCategorias ya dispara el evento, pero reproducimos por compatibilidad
          document.dispatchEvent(
            new CustomEvent("categorias:updated:afterPut", {
              detail: { timestamp: Date.now() },
            })
          );
        } catch (e) {}
      } catch (err) {
        console.error(err);
        showMessage("Error al actualizar categoría.", "error");
      }
    });
  }
});

/**
 * Cierra todos los modales de categoría abiertos.
 */
function closeAllCategoryModals() {
  document.querySelectorAll(".modal-categoria").forEach((modal) => {
    modal.style.display = "none";
  });
  document.body.style.overflow = "";
}

document.addEventListener("DOMContentLoaded", () => {
  // Añadir listeners para cerrar modales de edición/ver/eliminar
  [
    "modalEditarCategoria",
    "modalVerCategoria",
    "modalEliminarCategoria",
  ].forEach((modalId) => {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const btnClose = modal.querySelector(".btn-close");
    const btnCancel = modal.querySelector(".btn-outline");
    if (btnClose) btnClose.addEventListener("click", closeAllCategoryModals);
    if (btnCancel) btnCancel.addEventListener("click", closeAllCategoryModals);
  });
});

// Handler para crear nueva categoría (botón Guardar en modal de creación)
document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = document.getElementById("saveCategory");
  if (!saveBtn) return;

  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    // Recolectar valores del formulario de creación
    const nombre = (
      document.getElementById("categoryName")?.value || ""
    ).trim();
    const slug = (document.getElementById("categorySlug")?.value || "").trim();
    const parent = document.getElementById("parentCategory")?.value || "";
    const estado = document.getElementById("categoryStatus")?.value || "active";
    const descripcion = (
      document.getElementById("categoryDescription")?.value || ""
    ).trim();
    const icon = (document.getElementById("categoryIcon")?.value || "").trim();
    const color = document.getElementById("iconColor")?.value || "#3a8eff";

    const payload = {
      nombre,
      nombreNormalized: normalizeForCompare(nombre),
      slug: slug || normalizeSlug(nombre),
      slugNormalized: normalizeForCompare(slug || normalizeSlug(nombre)),
      parent,
      estado,
      descripcion,
      icon,
      color,
    };

    // Validar antes de enviar
    clearFieldErrors(document.getElementById("categoryName"));
    clearFieldErrors(document.getElementById("categorySlug"));
    clearFieldErrors(document.getElementById("categoryDescription"));
    clearFieldErrors(document.getElementById("categoryIcon"));

    const validation = validateCategoryForm(payload);
    if (!validation.valid) {
      // Mostrar y marcar los primeros errores
      validation.errors.slice(0, 5).forEach((err) => {
        try {
          markFieldInvalid(err.field, err.message);
        } catch (e) {}
      });
      showMessage(
        "Corrige los errores del formulario antes de guardar.",
        "error"
      );
      return;
    }

    try {
      await agregarCategoria(payload);
      showMessage("Categoría creada correctamente.", "success");
      // cerrar modal y resetear formulario
      const modal = document.getElementById("categoryModal");
      if (modal) modal.style.display = "none";
      const form = document.getElementById("categoryForm");
      if (form) form.reset();
      // Actualizar listas si es necesario
      populateAllParentDropdowns();
    } catch (err) {
      // agregarCategoria ya muestra mensaje en caso de error
      console.error("Error creando categoría:", err);
    }
  });
});
