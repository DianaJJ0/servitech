console.log("registroExperto.js cargado correctamente");

// Mostrar/ocultar número de cuenta bancaria
document.addEventListener("DOMContentLoaded", function () {
  // Verificar autenticación
  if (window.user && window.user.token) {
    localStorage.setItem("token", window.user.token);
  }

  const token = localStorage.getItem("token");
  console.log("Token encontrado:", token);

  if (!token || token === "null") {
    console.log("No hay token, redirigiendo a login");
    window.location.href = "/login.html?next=/registroExperto";
    return;
  }

  console.log("Usuario autenticado, mostrando formulario");
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

    // Validar campos obligatorios del formulario
    const requiredFields = [
      "precio",
      "descripcion",
      "banco",
      "tipoCuenta",
      "numeroCuenta",
      "titular",
      "tipoDocumento",
      "numeroDocumento",
    ];

    let missingFields = [];
    requiredFields.forEach((fieldName) => {
      const field = document.getElementById(fieldName);
      if (!field || !field.value.trim()) {
        missingFields.push(fieldName);
      }
    });

    // Validar selecciones múltiples
    if (!categoriasSelect || categoriasSelect.selectedOptions.length === 0) {
      missingFields.push("categorias");
    }

    if (!especialidadSelect || !especialidadSelect.value) {
      missingFields.push("especialidad");
    }

    if (!skillsSelect || skillsSelect.selectedOptions.length === 0) {
      missingFields.push("skills");
    }

    // Validar días disponibles
    const diasDisponibles = document.getElementById("diasDisponibles").value;
    if (
      !diasDisponibles ||
      diasDisponibles.split(",").filter((day) => day.trim() !== "").length === 0
    ) {
      missingFields.push("días disponibles");
    }

    if (missingFields.length > 0) {
      alert(
        "Por favor completa los siguientes campos obligatorios:\n\n• " +
          missingFields.join("\n• ")
      );
      return;
    }

    // Construir payload en formato JSON
    const payload = {
      precioPorHora: parseInt(document.getElementById("precio").value),
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
        .value.split(",")
        .filter((day) => day.trim() !== ""),
    };

    try {
      const token = localStorage.getItem("token");
      if (!token || token === "null") {
        alert("Debes iniciar sesión para registrar como experto.");
        window.location.href = "/login.html?next=/registroExperto";
        return;
      }

      // Debug: mostrar payload
      console.log("Payload a enviar:", payload);
      console.log("Token:", token);

      // Elimina alertas previas
      const prevAlert = document.querySelector(".alert-container");
      if (prevAlert) prevAlert.remove();

      // Enviar datos al backend usando la ruta correcta y método PUT
      console.log("Enviando petición a:", "/api/usuarios/perfil");
      console.log("Método:", "PUT");
      console.log("Headers:", {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      });

      // Crear un AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

      let response;
      try {
        response = await fetch("/api/usuarios/perfil", {
          method: "PUT",
          body: JSON.stringify(payload),
          credentials: "include",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        clearTimeout(timeoutId);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
          throw new Error("La petición tardó demasiado tiempo");
        }
        throw error;
      }

      console.log(
        "Respuesta del servidor:",
        response.status,
        response.statusText
      );

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

// Choices.js: preferir assets locales y caer al CDN si es necesario
(function loadChoicesLocalFirst() {
  const localCss = "/assets/vendor/choices/choices.min.css";
  const localJs = "/assets/vendor/choices/choices.min.js";
  const cdnCss =
    "https://cdn.jsdelivr.net/npm/choices.js/public/assets/styles/choices.min.css";
  const cdnJs =
    "https://cdn.jsdelivr.net/npm/choices.js/public/assets/scripts/choices.min.js";

  function injectCss(href) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function tryLoadScript(href) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = href;
      s.onload = () => setTimeout(() => res(), 30);
      s.onerror = (e) => rej(e || new Error("failed to load script"));
      document.head.appendChild(s);
    });
  }

  try {
    const exists = Array.from(document.getElementsByTagName("link")).some(
      (l) => l.href && l.href.indexOf("choices.min.css") !== -1
    );
    if (!exists) {
      try {
        injectCss(localCss);
      } catch (e) {
        injectCss(cdnCss);
      }
    }
  } catch (e) {}

  tryLoadScript(localJs)
    .catch(() => tryLoadScript(cdnJs))
    .then(() => {
      var categoriasSelect = document.getElementById("categorias");
      if (categoriasSelect) {
        try {
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
        } catch (e) {
          console.error("Choices init failed for categorias", e);
        }
      }
      var skillsSelect = document.getElementById("skills");
      if (skillsSelect) {
        try {
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
        } catch (e) {
          console.error("Choices init failed for skills", e);
        }
      }
    })
    .catch((err) => console.error("Failed loading Choices assets", err));
})();
