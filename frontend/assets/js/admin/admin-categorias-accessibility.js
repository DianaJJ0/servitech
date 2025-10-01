// Accesibilidad y ajustes menores para admin-categorias
document.addEventListener("DOMContentLoaded", function () {
  function enhanceButtons(root) {
    root = root || document;
    const btns = root.querySelectorAll(".action-buttons .btn-icon");
    btns.forEach((b) => {
      // If the button already has a title/aria-label, skip
      const hasTitle = b.getAttribute("title");
      const hasAria = b.getAttribute("aria-label");
      if (!hasTitle && !hasAria) {
        // Guess role by icon class
        const icon = b.querySelector("i");
        let label = "Acción";
        if (icon) {
          const cls = (icon.className || "").toLowerCase();
          if (cls.includes("fa-edit")) label = "Editar";
          else if (cls.includes("fa-eye")) label = "Ver detalles";
          else if (cls.includes("fa-trash")) label = "Eliminar";
        }
        b.setAttribute("title", label);
        b.setAttribute("aria-label", label);
      } else if (!hasAria && hasTitle) {
        b.setAttribute("aria-label", b.getAttribute("title"));
      }
    });
  }

  // Enhance existing rows
  enhanceButtons(document);

  // Observe tbody for dynamically added rows and enhance new buttons
  const tbody = document.querySelector(
    ".categorias-grid__tabla .admin-table tbody"
  );
  if (tbody && window.MutationObserver) {
    const mo = new MutationObserver(function (mutations) {
      mutations.forEach((m) => {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 1) {
            enhanceButtons(n);
          }
        });
      });
    });
    mo.observe(tbody, { childList: true, subtree: true });
  }
});
