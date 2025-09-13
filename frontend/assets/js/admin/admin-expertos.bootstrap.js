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
          // Allow UI code to open modals automatically after initial deferred
          // initialization completes. Some handlers rely on this to function
          // when called during user interaction.
          try {
            if (typeof window !== "undefined")
              window.__ADMIN_EXPERTS_PREVENT_AUTO_OPEN = false;
          } catch (e) {}
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
    // Ensure the prevent-auto-open flag is cleared eventually even if there
    // are no deferred callbacks or they failed to run. This guarantees UI
    // interactions can open modals after startup.
    try {
      if (typeof window !== "undefined") {
        // clear after a short timeout to allow any synchronous init to finish
        setTimeout(function () {
          try {
            window.__ADMIN_EXPERTS_PREVENT_AUTO_OPEN = false;
          } catch (e) {}
        }, 50);
      }
    } catch (e) {}
  } catch (e) {}
})();
