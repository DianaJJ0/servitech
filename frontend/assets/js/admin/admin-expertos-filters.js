// Alternar filtros para la página de Expertos (adaptado de admin-categorias-filters.js)
(function () {
  "use strict";

  var toggle = document.querySelector(".clientes-filters-toggle");
  var panel = document.getElementById("expertosFiltersPanel");

  if (!toggle || !panel) return;

  function isNarrowOrTablet() {
    return window.matchMedia("(max-width: 1024px)").matches;
  }

  function setExpanded(expanded) {
    toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (expanded) {
      panel.style.display = "block";
      panel.style.maxHeight = panel.scrollHeight + "px";
      panel.style.opacity = "1";
    } else {
      panel.style.maxHeight = "0px";
      panel.style.opacity = "0";
      // pequeño retardo para permitir la animación antes de ocultar por completo
      setTimeout(function () {
        if (!expanded) panel.style.display = "none";
      }, 200);
    }
  }

  // Inicializar según ancho
  setExpanded(!isNarrowOrTablet());

  toggle.addEventListener("click", function (e) {
    var expanded = toggle.getAttribute("aria-expanded") === "true";
    setExpanded(!expanded);
  });

  // Al cambiar tamaño, forzar estado expandido en pantallas anchas
  var resizeTimeout;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
      setExpanded(!isNarrowOrTablet());
    }, 120);
  });
})();
