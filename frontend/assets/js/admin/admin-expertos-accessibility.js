/**
 * @file admin-expertos-accessibility.js
 * @description Mejoras de accesibilidad para la página admin-expertos (focus management, ARIA attributes)
 */

// Accessibility helper para la tabla de Expertos
// Añade title/aria-label a botones de acción generados dinámicamente y observa
// nuevas filas para mantener los atributos.
(function () {
  "use strict";

  function enhanceButtons(root) {
    root = root || document;
    var btns = root.querySelectorAll(".action-buttons .btn-icon");
    btns.forEach(function (b) {
      if (!b.getAttribute("title")) {
        var icon = b.querySelector("i");
        var text =
          b.getAttribute("data-title") ||
          (icon ? icon.className.replace("fa-", "") : null) ||
          "Acción";
        b.setAttribute("title", text);
        b.setAttribute("aria-label", text);
      }
    });
  }

  // Inicial
  document.addEventListener("DOMContentLoaded", function () {
    enhanceButtons(document);

    // Observer para tbody de expertos
    var tbody = document.querySelector(".admin-table--expertos tbody");
    if (!tbody) return;

    var mo = new MutationObserver(function (mutList) {
      mutList.forEach(function (m) {
        if (m.addedNodes && m.addedNodes.length) {
          m.addedNodes.forEach(function (n) {
            if (n.nodeType === 1) enhanceButtons(n);
          });
        }
      });
    });

    mo.observe(tbody, { childList: true, subtree: true });
  });
})();
