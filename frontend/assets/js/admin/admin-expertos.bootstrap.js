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
          if (Array.isArray(parsedCats)) window._adminCategorias = parsedCats;
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
