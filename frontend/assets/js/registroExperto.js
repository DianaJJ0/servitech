// Mostrar/ocultar número de cuenta bancaria (ejemplo de bloque correcto)
document.addEventListener("DOMContentLoaded", function () {
  // Mostrar/ocultar número de cuenta bancaria
  const toggleBtn = document.getElementById("toggleNumeroCuenta");
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

  // --- Lógica de selección de días disponibles ---
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

// Nueva lógica para estructura anidada
const especialidadSelect = document.getElementById("especialidad");
const categoriasSelect = document.getElementById("categorias");
const skillsSelect = document.getElementById("skills");
let categoriasData = [];

// Envío del formulario
const form = document.getElementById("registroExpertoForm");
const submitBtn = document.getElementById("submitExperto");
const diasDisponiblesSelect = document.getElementById("diasDisponibles");
if (form && submitBtn) {
  submitBtn.addEventListener("click", async function () {
    console.log("Botón de envío clickeado");
    const testMsg = document.createElement("div");
    testMsg.className = "alert alert-info";
    testMsg.textContent = "Evento de envío detectado. JS activo.";
    document.body.appendChild(testMsg);
    // Validar campos requeridos de datos bancarios
    const requiredBankFields = [
      "banco",
      "tipoCuenta",
      "numeroCuenta",
      "titular",
      "tipoDocumento",
      "numeroDocumento",
    ];
    let missingFields = [];

    // Validar campos requeridos como el banco y el número de cuenta
    requiredBankFields.forEach((fieldName) => {
      const field = document.getElementById(fieldName);
      if (!field.value.trim()) {
        missingFields.push(
          field.previousElementSibling.textContent.replace("*", "")
        );
      }
    });

    // Mostrar alerta si faltan campos
    if (missingFields.length > 0) {
      alert(
        "Por favor completa los siguientes campos obligatorios:\n\n• " +
          missingFields.join("\n• ")
      );
      return;
    }

    // Convertir selects múltiples a string separados por coma
    Array.from(categoriasSelect.options).forEach((opt) => {
      if (opt.selected) opt.setAttribute("selected", "selected");
      else opt.removeAttribute("selected");
    });
    // Habilidades
    Array.from(skillsSelect.options).forEach((opt) => {
      if (opt.selected) opt.setAttribute("selected", "selected");
      else opt.removeAttribute("selected");
    });
    // Días disponibles: tomar el valor del input oculto actualizado
    const diasDisponiblesValue =
      document.getElementById("diasDisponibles").value;

    // Crear objeto FormData que es una representación de los datos del formulario
    const formData = new FormData(form);

    // Unir seleccionados en string para backend legacy que es sensible a comas
    formData.set(
      "categorias",
      Array.from(categoriasSelect.selectedOptions)
        .map((o) => o.value)
        .join(",")
    );
    // Habilidades
    formData.set(
      "skills",
      Array.from(skillsSelect.selectedOptions)
        .map((o) => o.value)
        .join(",")
    );
    // Habilidades
    formData.set("diasDisponibles", diasDisponiblesValue);

    // Estructurar datos bancarios como JSON
    /**
     * Objeto que contiene los datos bancarios ingresados por el usuario.
     * @typedef {Object} DatosBancarios
     * @property {string} banco - Nombre del banco seleccionado por el usuario.
     * @property {string} tipoCuenta - Tipo de cuenta bancaria (ejemplo: ahorro, corriente).
     * @property {string} numeroCuenta - Número de cuenta bancaria.
     * @property {string} titular - Nombre del titular de la cuenta.
     * @property {string} tipoDocumento - Tipo de documento de identificación del titular.
     * @property {string} numeroDocumento - Número de documento de identificación del titular.
     * @property {string} [telefonoContacto] - Teléfono de contacto del titular (opcional).
     * @property {boolean} verificado - Indica si los datos bancarios han sido verificados.
     */
    /**
     * Objeto que contiene los datos bancarios ingresados por el usuario desde el formulario.
     * @property {string} banco - Nombre del banco seleccionado.
     * @property {string} tipoCuenta - Tipo de cuenta bancaria (ejemplo: ahorro, corriente).
     * @property {string} numeroCuenta - Número de cuenta bancaria.
     * @property {string} titular - Nombre del titular de la cuenta.
     * @property {string} tipoDocumento - Tipo de documento de identificación del titular.
     * @property {string} numeroDocumento - Número de documento de identificación del titular.
     * @property {string} telefonoContacto - Teléfono de contacto del titular (opcional).
     * @property {boolean} verificado - Indica si los datos bancarios han sido verificados.
     */
    const datosBancarios = {
      banco: formData.get("banco"),
      tipoCuenta: formData.get("tipoCuenta"),
      numeroCuenta: formData.get("numeroCuenta"),
      titular: formData.get("titular"),
      tipoDocumento: formData.get("tipoDocumento"),
      numeroDocumento: formData.get("numeroDocumento"),
      telefonoContacto: formData.get("telefonoContacto") || "",
      verificado: false,
    };

    formData.set("datosBancarios", JSON.stringify(datosBancarios));

    // Enviar formulario
    try {
      // Unificar lógica de días disponibles y envío de formulario
      const diasDisponiblesInput = document.getElementById("diasDisponibles");
      const dayOptions = document.querySelectorAll(".day-option");
      const daysDisplay = document.querySelector(".days-selected-display");

      function updateSelectedDays() {
        const selectedDays = Array.from(
          document.querySelectorAll(".day-option.selected")
        ).map((day) => day.getAttribute("data-day"));
        diasDisponiblesInput.value = selectedDays.join(",");
        daysDisplay.textContent =
          selectedDays.length > 0
            ? `Días seleccionados: ${selectedDays.join(", ")}`
            : "Selecciona tus días disponibles";
      }

      dayOptions.forEach((day) => {
        day.addEventListener("click", function () {
          this.classList.toggle("selected");
          updateSelectedDays();
        });
      });

      updateSelectedDays();

      // Enviar solicitud POST al endpoint "/registro-experto" con los datos del formulario.
      const response = await fetch("/api/registro-experto", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const alertContainer = document.createElement("div");
      alertContainer.className = "alert-container";
      document.body.appendChild(alertContainer);
      if (response.ok) {
        const result = await response.json().catch(() => null);
        alertContainer.innerHTML = `<div class='alert alert-success'>Registro exitoso. Serás redirigido a tu perfil de experto.</div>`;
        setTimeout(() => {
          window.location.href = "/perfil";
        }, 2000);
      } else {
        const errorText = await response.text();
        alertContainer.innerHTML = `<div class='alert alert-danger'>Error al registrar: ${errorText}</div>`;
      }
    } catch (error) {
      alert("Error al enviar el formulario: " + error.message);
    }
  });
}
