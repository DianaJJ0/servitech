document.addEventListener("DOMContentLoaded", function () {
  // Sincroniza el token entre la sesión y localStorage si está disponible en window.user
  if (window.user && window.user.token) {
    localStorage.setItem("token", window.user.token);
  }
  // Si no hay token, redirige al login
  const token = localStorage.getItem("token");
  if (!token || token === "null") {
    window.location.href = "/login.html?next=/editarExperto";
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

document.addEventListener("DOMContentLoaded", function () {
  const btnShowAccount = document.querySelector(".btn-show-account");
  if (btnShowAccount) {
    btnShowAccount.addEventListener("click", function () {
      const accountElement = this.closest(".account-number");
      const realNumber = accountElement.getAttribute("data-number");

      if (accountElement.textContent.includes("••••")) {
        accountElement.innerHTML =
          realNumber +
          ' <button class="btn-show-account"><i class="fas fa-eye-slash"></i></button>';
      } else {
        accountElement.innerHTML =
          "••••••••••••••••" +
          ' <button class="btn-show-account"><i class="fas fa-eye"></i></button>';
      }
    });
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const btnEditarPerfil = document.getElementById("btnEditarPerfil");
  if (btnEditarPerfil) {
    btnEditarPerfil.addEventListener("click", async function (e) {
      e.preventDefault();
      // Sincroniza sesión si hay token en localStorage pero no en window.user
      const token = localStorage.getItem("token");
      const usuario = localStorage.getItem("usuario");
      if (token && usuario) {
        try {
          await fetch("/set-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              usuario: { ...JSON.parse(usuario), token },
            }),
          });
        } catch (err) {
          // Si falla, igual redirige
        }
      }
      window.location.href = "/editarExperto";
    });
  }
});
