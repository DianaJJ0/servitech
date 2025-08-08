/**
 * LÓGICA DEL FRONTEND PARA LA PÁGINA DE EXPERTOS
 * Maneja la interacción con el formulario de filtros.
 */
document.addEventListener("DOMContentLoaded", () => {
  const filterForm = document.getElementById("filterForm");

  if (filterForm) {
    filterForm.addEventListener("submit", (event) => {
      // Prevenimos el envío normal del formulario.
      event.preventDefault();

      // Construimos la nueva URL con los parámetros del formulario.
      const formData = new FormData(filterForm);
      const params = new URLSearchParams();

      // Iteramos sobre los datos del formulario para construir los parámetros.
      for (const [key, value] of formData.entries()) {
        // Solo añadimos el parámetro si tiene un valor.
        if (value) {
          params.append(key, value);
        }
      }

      // Recargamos la página con la nueva URL que contiene los filtros.
      window.location.href = `/expertos.html?${params.toString()}`;
    });
  }
});
