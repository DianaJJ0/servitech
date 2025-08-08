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

  // Delegación de eventos para los íconos de acción en la tabla de categorías
  const tbody = document.querySelector(
    ".categorias-grid__tabla .admin-table tbody"
  );
  if (tbody) {
    tbody.addEventListener("click", function (e) {
      const btn = e.target.closest(".btn-icon");
      if (!btn) return;
      const row = btn.closest("tr");
      if (!row) return;

      // EDITAR
      if (btn.title === "Editar") {
        document.getElementById("editarNombreCategoria").value = row
          .querySelector(".categorias-table__icon-row span")
          .textContent.trim();
        document.getElementById("editarSlugCategoria").value =
          row.children[2].textContent.trim();
        document.getElementById("editarPadreCategoria").value =
          row.children[3].textContent.trim();
        document.getElementById("editarEstadoCategoria").value = row
          .querySelector(".status")
          .textContent.trim();
        document.getElementById("editarDescripcionCategoria").value = ""; // Si tienes descripción, ponla aquí
        modalEditar.style.display = "flex";
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
    if (rowEliminar) {
      rowEliminar.remove();
    }
    modalEliminar.style.display = "none";
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
        "Content-Type": "application/json",
      },
      body: JSON.stringify(datosCategoria),
    });

    if (!response.ok) {
      throw new Error("Error al agregar categoría");
    }

    const nuevaCategoria = await response.json();
    console.log("Categoría agregada:", nuevaCategoria);

    // Aquí puedes agregar código para actualizar la tabla de categorías si es necesario
  } catch (error) {
    console.error("Error:", error);
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

    // Aquí puedes agregar código para cargar los datos de la categoría a editar
  }
}

/**
 * Elimina una categoría de la base de datos.
 */
async function eliminarCategoria(categoriaId) {
  try {
    const response = await fetch(`/api/categorias/${categoriaId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Error al eliminar categoría");
    }

    console.log(`Categoría eliminada: ID ${categoriaId}`);

    // Aquí puedes agregar código para actualizar la tabla de categorías si es necesario
  } catch (error) {
    console.error("Error:", error);
  }
}
