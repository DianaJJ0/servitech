console.log("registroExperto.js cargado correctamente");

// Mostrar/ocultar número de cuenta bancaria
document.addEventListener("DOMContentLoaded", function () {
  if (window.user && window.user.token) {
    localStorage.setItem("token", window.user.token);
  }
  const token = localStorage.getItem("token");
  if (!token || token === "null") {
    window.location.href = "/login.html?next=/registroExperto";
    return;
  }
  const toggleBtn = document.getElementById("toggleAccountNumber");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      const input = document.getElementById("numeroCuenta");
      const icon = this.querySelector("i");
      if (input.type === "password") {
        input.type = "text";
        icon.className = "fas fa-eye-slash";
      } else {
        input.type = "password";
        icon.className = "fas fa-eye";
      }
    });
  }

  // Selección de días disponibles
  const diasDisponiblesInput = document.getElementById("diasDisponibles");
  const dayOptions = document.querySelectorAll(".day-option");
  const daysDisplay = document.querySelector(".days-selected-display");

  function updateSelectedDays() {
    const selectedDays = Array.from(
      document.querySelectorAll(".day-option.selected")
    ).map((day) => day.getAttribute("data-day"));
    diasDisponiblesInput.value = selectedDays.join(",");
    if (daysDisplay) {
      daysDisplay.textContent =
        selectedDays.length > 0
          ? `Días seleccionados: ${selectedDays.join(", ")}`
          : "Selecciona tus días disponibles";
    }
  }
  dayOptions.forEach((day) => {
    day.addEventListener("click", function () {
      this.classList.toggle("selected");
      updateSelectedDays();
    });
  });
  updateSelectedDays();
});

// Elementos del formulario
const especialidadSelect = document.getElementById("especialidad");
const categoriasSelect = document.getElementById("categorias");
const skillsSelect = document.getElementById("skills");

// Envío del formulario experto
const form = document.getElementById("registroExpertoForm");
if (form) {
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Validar campos obligatorios de datos bancarios
    const requiredBankFields = [
      "banco",
      "tipoCuenta",
      "numeroCuenta",
      "titular",
      "tipoDocumento",
      "numeroDocumento",
    ];
    let missingFields = [];
    requiredBankFields.forEach((fieldName) => {
      const field = document.getElementById(fieldName);
      if (!field.value.trim()) {
        missingFields.push(
          field.previousElementSibling.textContent.replace("*", "")
        );
      }
    });
    if (missingFields.length > 0) {
      alert(
        "Por favor completa los siguientes campos obligatorios:\n\n• " +
          missingFields.join("\n• ")
      );
      return;
    }

    // Construir payload en formato JSON
    const payload = {
      precioPorHora: document.getElementById("precio").value,
      descripcion: document.getElementById("descripcion").value,
      categorias: Array.from(categoriasSelect.selectedOptions).map(
        (o) => o.value
      ),
      especialidad: especialidadSelect.value,
      skills: Array.from(skillsSelect.selectedOptions).map((o) => o.value),
      banco: document.getElementById("banco").value,
      tipoCuenta: document.getElementById("tipoCuenta").value,
      numeroCuenta: document.getElementById("numeroCuenta").value,
      titular: document.getElementById("titular").value,
      tipoDocumento: document.getElementById("tipoDocumento").value,
      numeroDocumento: document.getElementById("numeroDocumento").value,
      telefonoContacto: document.getElementById("telefonoContacto").value,
      diasDisponibles: document
        .getElementById("diasDisponibles")
        .value.split(","),
    };

    try {
      const token = localStorage.getItem("token");
      if (!token || token === "null") {
        alert("Debes iniciar sesión para registrar como experto.");
        window.location.href = "/login.html?next=/registroExperto";
        return;
      }
      // Elimina alertas previas
      const prevAlert = document.querySelector(".alert-container");
      if (prevAlert) prevAlert.remove();

      // Enviar datos al backend usando la ruta correcta y método PUT
      const response = await fetch("/api/usuarios/perfil", {
        method: "PUT",
        body: JSON.stringify(payload),
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const nuevaAlerta = document.createElement("div");
      nuevaAlerta.className = "alert-container";
      document.body.appendChild(nuevaAlerta);

      // Lee SIEMPRE el JSON de la respuesta
      let result = null;
      try {
        result = await response.json();
      } catch (e) {
        result = null;
      }
      let mensaje =
        result && result.mensaje
          ? result.mensaje
          : "No se pudo obtener el mensaje del servidor.";

      if (response.ok) {
        nuevaAlerta.innerHTML = `<div class='alert alert-success'>${mensaje}</div>`;
        setTimeout(() => {
          window.location.href = "/perfil";
        }, 1200);
      } else {
        nuevaAlerta.innerHTML = `<div class='alert alert-danger'>${mensaje}</div>`;
      }
    } catch (error) {
      alert("Error al enviar el formulario: " + error.message);
    }
  });
}

// Validación y feedback para tarifa COP
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

// Choices.js para selects múltiples
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
