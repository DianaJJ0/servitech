/**
 * Archivo: assets/js/admin-common.js
 * Propósito: Helpers y utilidades compartidas por las páginas del panel de administración (CSRF hooks, toggles, inicializadores).
 * Uso: Incluido por el layout admin (adminLayout.ejs). Requiere que exista el elemento #initial-csrf con el token.
 * Notas de seguridad: No exponer API keys en este archivo; usa res.locals en el servidor para inyectar datos necesarios.
 */

// Utilidades comunes de administración (exposición de CSRF e inyección en formularios)
(function () {
  function injectCsrf(token) {
    if (!token) return;
    window._csrfToken = token;
    document.addEventListener("DOMContentLoaded", function () {
      try {
        var forms = document.querySelectorAll('form[method="post"], form');
        forms.forEach(function (f) {
          if (!f.querySelector('input[name="_csrf"]')) {
            var input = document.createElement("input");
            input.type = "hidden";
            input.name = "_csrf";
            input.value = token;
            f.appendChild(input);
          }
        });
      } catch (e) {
        // ignore
      }
    });
  }

  // Proporcionar un inicializador seguro para que el servidor lo invoque mediante inyección JSON
  window.__adminCommon = {
    initCsrf: injectCsrf,
  };
})();
