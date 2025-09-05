/**
 * @fileoverview
 * Funcionalidad del panel de administración para la gestión de categorías en Servitech.
 * Permite listar, agregar, editar y eliminar categorías desde la interfaz de administrador.
 *
 * Autor: Diana Carolina Jimenez
 * Fecha: 2025-06-04
 */

/**
 * Funcionalidad específica para la página de gestión de categorías
 */

document.addEventListener("DOMContentLoaded", function () {
  setupCategoryModal();
  setupCategoryActions();

  // MODAL EDITAR CATEGORÍA
  const modalEditar = document.getElementById("modalEditarCategoria");
  const closeEditar = modalEditar.querySelector(".btn-close");
  const cancelarEditar = modalEditar.querySelector(
    ".modal-categoria-editar-cancelar"
  );
  const formEditar = document.getElementById("formEditarCategoria");

  // MODAL VER CATEGORÍA
  const modalVer = document.getElementById("modalVerCategoria");
  const closeVer = modalVer.querySelector(".btn-close");
  const cerrarVer = modalVer.querySelector(".modal-categoria-ver-cerrar");

  // MODAL ELIMINAR CATEGORÍA
  const modalEliminar = document.getElementById("modalEliminarCategoria");
  const closeEliminar = modalEliminar.querySelector(".btn-close");
  const cancelarEliminar = modalEliminar.querySelector(
    ".modal-categoria-eliminar-cancelar"
  );
  const confirmarEliminar = modalEliminar.querySelector(
    ".modal-categoria-eliminar-confirmar"
  );
  let rowEliminar = null;
  let rowEliminarId = null;

  // Contenedor para mensajes rápidos
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

  // Delegación de eventos para los íconos de acción en la tabla de categorías
  const tbody = document.querySelector(
    ".categorias-grid__tabla .admin-table tbody"
  );
  // Cargar categorias inicialmente
  if (tbody) {
    loadCategorias();
  }
  if (tbody) {
    tbody.addEventListener("click", function (e) {
      const btn = e.target.closest(".btn-icon");
      if (!btn) return;
      const row = btn.closest("tr");
      if (!row) return;

      // EDITAR
      if (btn.title === "Editar") {
        const catId = btn.getAttribute("data-id") || row.dataset.id;
        abrirModalEditarCategoria(catId);
        return;
      }
      // VER
      if (btn.title === "Ver detalles") {
        document.getElementById("verNombreCategoria").value = row
          .querySelector(".categorias-table__icon-row span")
          .textContent.trim();
        document.getElementById("verSlugCategoria").value =
          row.children[2].textContent.trim();
        document.getElementById("verPadreCategoria").value =
          row.children[3].textContent.trim();
        document.getElementById("verEstadoCategoria").value = row
          .querySelector(".status")
          .textContent.trim();
        document.getElementById("verDescripcionCategoria").value = ""; // Si tienes descripción, ponla aquí
        modalVer.style.display = "flex";
        return;
      }
      // ELIMINAR
      if (btn.title === "Eliminar") {
        document.getElementById("modalEliminarCategoriaNombre").textContent =
          row
            .querySelector(".categorias-table__icon-row span")
            .textContent.trim();
        rowEliminar = row;
        rowEliminarId = btn.getAttribute("data-id") || row.dataset.id;
        modalEliminar.style.display = "flex";
        return;
      }
    });
  }

  // Cerrar modales editar
  closeEditar.addEventListener(
    "click",
    () => (modalEditar.style.display = "none")
  );
  cancelarEditar.addEventListener(
    "click",
    () => (modalEditar.style.display = "none")
  );
  window.addEventListener("click", (e) => {
    if (e.target === modalEditar) modalEditar.style.display = "none";
  });
  formEditar.addEventListener("submit", function (e) {
    e.preventDefault();
    modalEditar.style.display = "none";
  });

  // Cerrar modales ver
  closeVer.addEventListener("click", () => (modalVer.style.display = "none"));
  cerrarVer.addEventListener("click", () => (modalVer.style.display = "none"));
  window.addEventListener("click", (e) => {
    if (e.target === modalVer) modalVer.style.display = "none";
  });

  // Cerrar/eliminar modales eliminar
  closeEliminar.addEventListener(
    "click",
    () => (modalEliminar.style.display = "none")
  );
  cancelarEliminar.addEventListener(
    "click",
    () => (modalEliminar.style.display = "none")
  );
  window.addEventListener("click", (e) => {
    if (e.target === modalEliminar) modalEliminar.style.display = "none";
  });
  confirmarEliminar.addEventListener("click", () => {
    if (rowEliminarId) {
      // Llamar al backend para eliminar
      eliminarCategoria(rowEliminarId).then(() => {
        if (rowEliminar) rowEliminar.remove();
      });
    } else if (rowEliminar) {
      rowEliminar.remove();
    }
    rowEliminar = null;
    rowEliminarId = null;
    modalEliminar.style.display = "none";
  });
});

// Bind crear categoría: toma los valores del modal y llama a agregarCategoria
document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = document.getElementById("saveCategory");
  const form = document.getElementById("categoryForm");
  if (!saveBtn || !form) return;

  // prevenir submit tradicional
  form.addEventListener("submit", (e) => e.preventDefault());

  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const nombre = document.getElementById("categoryName").value.trim();
    const slug = document.getElementById("categorySlug").value.trim();
    const parent = document.getElementById("parentCategory").value;
    const estado = document.getElementById("categoryStatus").value;
    const descripcion = document
      .getElementById("categoryDescription")
      .value.trim();
    const icon = document.getElementById("categoryIcon").value.trim();
    const color = document.getElementById("iconColor").value;

    if (!nombre) {
      showMessage("El nombre es obligatorio.", "error");
      return;
    }

    saveBtn.disabled = true;
    saveBtn.classList && saveBtn.classList.add("btn--loading");
    try {
      await agregarCategoria({
        nombre,
        slug,
        parent,
        estado,
        descripcion,
        icon,
        color,
      });
      showMessage("Categoría creada correctamente.", "success");
    } catch (err) {
      console.error("Error guardando categoría:", err);
      showMessage("Error al crear categoría.", "error");
    } finally {
      saveBtn.disabled = false;
      saveBtn.classList && saveBtn.classList.remove("btn--loading");
      // reset form
      form.reset();
    }
  });
});

/**
 * Configura la funcionalidad del modal para agregar/editar categorías
 */
function setupCategoryModal() {
  const modal = document.getElementById("categoryModal");
  const btnAddCategory = document.getElementById("btnAddCategory");
  const btnCloseModal = modal ? modal.querySelector(".btn-close") : null;
  const btnCancel = modal
    ? modal.querySelector('[data-dismiss="modal"]')
    : null;

  if (!modal || !btnAddCategory) return;

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

  btnAddCategory.addEventListener("click", openModal);

  if (btnCloseModal) {
    btnCloseModal.addEventListener("click", closeModal);
  }

  if (btnCancel) {
    btnCancel.addEventListener("click", closeModal);
  }

  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      closeModal();
    }
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
 * Envía los datos de la nueva categoría al backend y actualiza la tabla.
 */
async function agregarCategoria(datosCategoria) {
  try {
    const response = await fetch("/api/categorias", {
      method: "POST",
      headers: {
        ...getHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(datosCategoria),
    });

    if (!response.ok) {
      // intentar leer mensaje de error del servidor
      const err = await response.json().catch(() => ({}));
      const msg = err.mensaje || err.message || "Error al agregar categoría";
      throw new Error(msg);
    }

    const nuevaCategoria = await response.json();
    console.log("Categoría agregada:", nuevaCategoria);
    // Cerrar modal si está abierto y recargar tabla
    const modal = document.getElementById("categoryModal");
    if (modal) modal.style.display = "none";
    await loadCategorias();
    return nuevaCategoria;
  } catch (error) {
    console.error("Error:", error);
    showMessage(error.message || "Error al agregar categoría.", "error");
    // Propagar para que el caller pueda manejarlo
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
      (x) => String(x._id) === String(categoriaId)
    );
    if (cat) {
      document.getElementById("editarNombreCategoria").value = cat.nombre || "";
      document.getElementById("editarDescripcionCategoria").value =
        cat.descripcion || "";
      // almacenar id en el formulario
      const form = document.getElementById("formEditarCategoria");
      if (form) form.dataset.editId = cat._id;
    }
  }
}

/**
 * Elimina una categoría de la base de datos.
 */
async function eliminarCategoria(categoriaId) {
  try {
    const response = await fetch(`/api/categorias/${categoriaId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error("Error al eliminar categoría");
    }

    console.log(`Categoría eliminada: ID ${categoriaId}`);
    // Refrescar tabla
    await loadCategorias();
    showMessage("Categoría eliminada correctamente.", "success");
  } catch (error) {
    console.error("Error:", error);
    showMessage("Error al eliminar categoría.", "error");
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
 * Carga las categorías desde el backend y renderiza la tabla.
 */
async function loadCategorias() {
  try {
    const res = await fetch("/api/categorias", { headers: getHeaders() });
    if (!res.ok) {
      console.error("Error al obtener categorías", res.status);
      return;
    }
    const categorias = await res.json();
    // cache global para uso en edición
    window._adminCategorias = categorias;
    const tbody = document.querySelector(
      ".categorias-grid__tabla .admin-table tbody"
    );
    if (!tbody) return;
    tbody.innerHTML = "";
    categorias.forEach((c) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="checkbox" class="categorias-checkbox" /></td>
        <td>
          <div class="categorias-table__icon-row">
            <div class="categorias-table__icon categorias-table__icon--web">
              <i class="fas fa-tags"></i>
            </div>
            <span>${escapeHtml(c.nombre)}</span>
          </div>
        </td>
        <td>${escapeHtml(c.slug || "")}</td>
        <td>${escapeHtml(c.parent || "-")}</td>
        <td>${c.publicacionesCount || 0}</td>
        <td>${c.expertosCount || 0}</td>
        <td><span class="status ${
          c.estado === "inactive" ? "inactive" : "active"
        }">${escapeHtml(c.estado || "Activa")}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon" title="Editar" data-id="${
              c._id
            }"><i class="fas fa-edit"></i></button>
            <button class="btn-icon" title="Ver detalles" data-id="${
              c._id
            }"><i class="fas fa-eye"></i></button>
            <button class="btn-icon" title="Eliminar" data-id="${
              c._id
            }"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
    showMessage("Categorías cargadas.", "info", 800);
  } catch (err) {
    console.error("Error cargando categorías:", err);
    showMessage("Error al cargar categorías.", "error");
  }
}

function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
      const descripcion = document
        .getElementById("editarDescripcionCategoria")
        .value.trim();
      if (!nombre) {
        showMessage("El nombre es obligatorio.", "error");
        return;
      }
      try {
        const res = await fetch(`/api/categorias/${id}`, {
          method: "PUT",
          headers: Object.assign(
            { "Content-Type": "application/json" },
            getHeaders()
          ),
          body: JSON.stringify({ nombre, descripcion }),
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
      } catch (err) {
        console.error(err);
        showMessage("Error al actualizar categoría.", "error");
      }
    });
  }
});
