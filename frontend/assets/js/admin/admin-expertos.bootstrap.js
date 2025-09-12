/*
 * Bootstrap para admin-expertos: ejecuta los handlers registrados mediante
 * onDomReady(...) cuando el DOM esté listo. Esto permite mantener el
 * fichero principal `admin-expertos.js` testable (sin efectos secundarios al
 * importarlo) y realizar el arranque explícito en producción incluyendo
 * este archivo.
 */

(function () {
  try {
    var mod = null;
    try {
      // intentar require para entornos CommonJS (build/SSR)
      mod =
        require && typeof require === "function"
          ? require("./admin-expertos.js")
          : null;
    } catch (e) {
      // ignore: en navegador la importación se hace por <script>
    }

    var deferred = null;
    if (mod && Array.isArray(mod.__adminExpertsDeferredDOMContentLoaded)) {
      deferred = mod.__adminExpertsDeferredDOMContentLoaded;
    } else if (
      typeof window !== "undefined" &&
      Array.isArray(window.__adminExpertsDeferredDOMContentLoaded)
    ) {
      deferred = window.__adminExpertsDeferredDOMContentLoaded;
    }

    if (Array.isArray(deferred) && deferred.length > 0) {
      var runDeferred = function () {
        try {
          deferred.forEach(function (fn) {
            try {
              if (typeof fn === "function") fn();
            } catch (e) {}
          });
        } catch (e) {}
      };

      if (
        typeof document !== "undefined" &&
        document.readyState &&
        document.readyState !== "loading"
      ) {
        runDeferred();
      } else if (typeof document !== "undefined") {
        document.addEventListener("DOMContentLoaded", runDeferred);
      } else {
        // No DOM available, try to run anyway
        runDeferred();
      }
    }
  } catch (e) {}
})();
