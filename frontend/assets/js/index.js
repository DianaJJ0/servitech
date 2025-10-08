document.addEventListener("DOMContentLoaded", function () {});

// FAQ Accordion Functionality
// Se registra dentro de DOMContentLoaded para asegurar que los elementos existan
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".faq-question").forEach((button) => {
    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      // Usar strings 'true'/'false' para que el CSS pueda leer el atributo correctamente
      button.setAttribute("aria-expanded", (!expanded).toString());

      // Cierra otros ítems abiertos para mantener solo uno expandido
      if (!expanded) {
        document.querySelectorAll(".faq-question").forEach((otherButton) => {
          if (otherButton !== button) {
            otherButton.setAttribute("aria-expanded", "false");
          }
        });
      }
    });
  });
});
