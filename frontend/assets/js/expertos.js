/**
 * LÓGICA DEL FRONTEND PARA LA PÁGINA DE EXPERTOS
 * Maneja la interacción con el formulario de filtros.
 */
document.addEventListener("DOMContentLoaded", () => {
  const filterForm = document.getElementById("filterForm");

  if (filterForm) {
    filterForm.addEventListener("submit", (event) => {
      // Prevenimos el envío normal del formulario.
      event.preventDefault();

      // Construimos la nueva URL con los parámetros del formulario.
      const formData = new FormData(filterForm);
      const params = new URLSearchParams();

      // Iteramos sobre los datos del formulario para construir los parámetros.
      for (const [key, value] of formData.entries()) {
        // Solo añadimos el parámetro si tiene un valor.
        if (value) {
          params.append(key, value);
        }
      }

      // Recargamos la página con la nueva URL que contiene los filtros.
      window.location.href = `/expertos.html?${params.toString()}`;
    });
  }
});

// Paginación: manejar clicks en botones .pag-btn
document.addEventListener("DOMContentLoaded", () => {
  const pagContainer = document.querySelector(".pagination");
  if (!pagContainer) return;

  // Parámetros iniciales que la plantilla inyecta en data-attributes
  const pageEl = pagContainer.querySelector(".pag-info");

  function buildUrl(newPage) {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    params.set("page", String(newPage));
    // mantener limit si existe
    return `${url.pathname}?${params.toString()}`;
  }

  pagContainer.addEventListener("click", function (e) {
    const btn = e.target.closest(".pag-btn");
    if (!btn) return;
    if (btn.classList.contains("disabled")) return;

    // prev / next / page
    if (btn.classList.contains("prev")) {
      // calcular página actual
      const url = new URL(window.location.href);
      const cur = parseInt(url.searchParams.get("page") || "1", 10);
      const next = Math.max(1, cur - 1);
      window.location.href = buildUrl(next);
      return;
    }
    if (btn.classList.contains("next")) {
      const url = new URL(window.location.href);
      const cur = parseInt(url.searchParams.get("page") || "1", 10);
      const next = cur + 1;
      window.location.href = buildUrl(next);
      return;
    }
    if (btn.classList.contains("page")) {
      const targetPage = parseInt(
        btn.textContent.trim().replace(/[^0-9]/g, ""),
        10
      );
      if (!isNaN(targetPage)) {
        window.location.href = buildUrl(targetPage);
      }
      return;
    }
  });
});
