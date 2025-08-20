document.addEventListener("DOMContentLoaded", function () {
  // Sincroniza el token entre la sesión y localStorage si está disponible en window.user
  if (window.user && window.user.token) {
    localStorage.setItem("token", window.user.token);
  }
  // Si no hay token, redirige al login
  const token = localStorage.getItem("token");
  if (!token || token === "null") {
    window.location.href = "/login?next=/editar-perfil-experto";
    return;
  }
  const dayOptions = document.querySelectorAll(".days-selector .day-option");
  const diasInput = document.getElementById("diasDisponibles");
  const daysDisplay = document.querySelector(".days-selected-display");

  // Marcar días seleccionados según el valor inicial del input oculto
  if (diasInput && diasInput.value) {
    const diasSeleccionados = diasInput.value.split(",").map((d) => d.trim());
    dayOptions.forEach((opt) => {
      if (diasSeleccionados.includes(opt.getAttribute("data-day"))) {
        opt.classList.add("selected");
      } else {
        opt.classList.remove("selected");
      }
    });
  }

  function updateSelectedDays() {
    const selectedDays = Array.from(dayOptions)
      .filter((opt) => opt.classList.contains("selected"))
      .map((opt) => opt.getAttribute("data-day"));
    diasInput.value = selectedDays.join(",");
    daysDisplay.textContent =
      selectedDays.length > 0
        ? `Días seleccionados: ${selectedDays.join(", ")}`
        : "Ningún día seleccionado";
  }

  dayOptions.forEach((option) => {
    option.addEventListener("click", function () {
      this.classList.toggle("selected");
      updateSelectedDays();
    });
  });

  updateSelectedDays();
});
