// Validación y feedback para tarifa en COP
document.addEventListener("DOMContentLoaded", function () {
  var precioInput = document.getElementById("precio");
  var feedback = document.getElementById("precio-feedback");
  if (precioInput && feedback) {
    precioInput.addEventListener("input", function () {
      var valor = parseInt(precioInput.value, 10);
      if (isNaN(valor) || valor < 10000) {
        feedback.textContent = "La tarifa mínima es $10.000 COP.";
        precioInput.style.borderColor = "#ff5252";
      } else if (valor > 500000) {
        feedback.textContent = "La tarifa máxima recomendada es $500.000 COP.";
        precioInput.style.borderColor = "#ff5252";
      } else if (valor < 30000) {
        feedback.textContent =
          "Sugerencia: La mayoría de expertos cobran más de $30.000 COP/hora.";
        precioInput.style.borderColor = "#ffb300";
      } else if (valor > 200000) {
        feedback.textContent =
          "Sugerencia: Tarifas superiores a $200.000 COP/hora suelen ser para expertos muy especializados.";
        precioInput.style.borderColor = "#ffb300";
      } else {
        feedback.textContent = "";
        precioInput.style.borderColor = "var(--accent-color)";
      }
    });
  }
});
// Choices.js CDN
var script = document.createElement("script");
script.src =
  "https://cdn.jsdelivr.net/npm/choices.js/public/assets/scripts/choices.min.js";
script.onload = function () {
  var categoriasSelect = document.getElementById("categorias");
  if (categoriasSelect) {
    new Choices(categoriasSelect, {
      removeItemButton: true,
      searchEnabled: true,
      placeholder: true,
      placeholderValue: "Selecciona categorías",
      noResultsText: "No hay resultados",
      noChoicesText: "No hay opciones",
      itemSelectText: "Seleccionar",
      classNames: {
        containerInner: "choices-container",
        input: "choices-input",
      },
    });
  }
  var skillsSelect = document.getElementById("skills");
  if (skillsSelect) {
    new Choices(skillsSelect, {
      removeItemButton: true,
      searchEnabled: true,
      placeholder: true,
      placeholderValue: "Selecciona habilidades",
      noResultsText: "No hay resultados",
      noChoicesText: "No hay opciones",
      itemSelectText: "Seleccionar",
      classNames: {
        containerInner: "choices-container",
        input: "choices-input",
      },
    });
  }
};
document.head.appendChild(script);
