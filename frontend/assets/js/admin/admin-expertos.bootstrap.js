// Bootstrap ligero: inyecta datos provistos por la vista (initial-expertos y categorias-data)
try {
  (function () {
    try {
      var node = document.getElementById("initial-expertos");
      if (node && node.textContent) {
        try {
          var parsed = JSON.parse(node.textContent);
          if (Array.isArray(parsed)) window._adminExpertos = parsed;
        } catch (e) {
          console.warn(
            "admin-expertos.bootstrap: initial-expertos parse failed",
            e
          );
        }
      }
    } catch (e) {}
    try {
      var cnode = document.getElementById("categorias-data");
      if (cnode && cnode.textContent) {
        try {
          var parsedCats = JSON.parse(cnode.textContent);
          if (Array.isArray(parsedCats)) {
            // If backend already provided normalized objects (id/name), use as-is.
            if (
              parsedCats.length > 0 &&
              parsedCats[0].id &&
              parsedCats[0].name
            ) {
              window._adminCategorias = parsedCats;
            } else {
              // legacy fallback: map older shapes into normalized minimal form
              var normalized = parsedCats.map(function (c) {
                return {
                  id: String(c._id || c.id || c.value || ""),
                  name: String(c.nombre || c.name || c.label || ""),
                  icon: String(c.icon || c.icono || ""),
                };
              });
              window._adminCategorias = normalized;
            }
          }
        } catch (e) {
          console.warn(
            "admin-expertos.bootstrap: categorias-data parse failed",
            e
          );
        }
      }
    } catch (e) {}
  })();
} catch (e) {}
console.log("admin-expertos.bootstrap.js cargado");
