// Control simple para colapsar/expandir el panel de filtros en adminCategorias
document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector(".categorias-filters-toggle");
  var panel = document.getElementById("categoriasFiltersPanel");
  if (!toggle || !panel) return;

  // Inicial estado: si la pantalla es pequeña, colapsar
  function isSmall() {
    return window.matchMedia("(max-width: 992px)").matches;
  }

  function setExpanded(expanded) {
    toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    panel.style.display = expanded ? "block" : "none";
    document.documentElement.classList.toggle("filters-collapsed", !expanded);
  }

  // Inicializar
  setExpanded(!isSmall());

  toggle.addEventListener("click", function (e) {
    var cur = toggle.getAttribute("aria-expanded") === "true";
    setExpanded(!cur);
  });

  // Ajustar al redimensionar
  var resizeTimeout;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
      setExpanded(!isSmall());
    }, 120);
  });
});
