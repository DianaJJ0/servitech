console.log("registroExperto.js cargado correctamente");
// Mostrar/ocultar número de cuenta bancaria (ejemplo de bloque correcto)
document.addEventListener("DOMContentLoaded", function () {
  // Mostrar/ocultar número de cuenta bancaria (id corregido)
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
const diasDisponiblesSelect = document.getElementById("diasDisponibles");
if (form) {
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
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

    Array.from(categoriasSelect.options).forEach((opt) => {
      if (opt.selected) opt.setAttribute("selected", "selected");
      else opt.removeAttribute("selected");
    });
    Array.from(skillsSelect.options).forEach((opt) => {
      if (opt.selected) opt.setAttribute("selected", "selected");
      else opt.removeAttribute("selected");
    });
    const diasDisponiblesValue =
      document.getElementById("diasDisponibles").value;
    const formData = new FormData(form);
    formData.set(
      "categorias",
      Array.from(categoriasSelect.selectedOptions)
        .map((o) => o.value)
        .join(",")
    );
    formData.set(
      "skills",
      Array.from(skillsSelect.selectedOptions)
        .map((o) => o.value)
        .join(",")
    );
    formData.set("diasDisponibles", diasDisponiblesValue);

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

    try {
      const token = localStorage.getItem("token");
      if (!token || token === "null") {
        alert("Debes iniciar sesión para registrar como experto.");
        window.location.href = "/login.html?next=/registro-experto";
        return;
      }
      const response = await fetch("/api/registro-experto", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const alertContainer = document.createElement("div");
      alertContainer.className = "alert-container";
      document.body.appendChild(alertContainer);
      if (response.ok) {
        const result = await response.json().catch(() => null);
        alertContainer.innerHTML = `<div class='alert alert-success'>Registro exitoso. Actualizando perfil...`;
        // Obtiene el perfil actualizado del backend
        const perfilRes = await fetch("/api/usuarios/perfil", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        if (perfilRes.ok) {
          const usuarioActualizado = await perfilRes.json();
          // Actualiza la sesión en el servidor frontend
          await fetch("/set-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario: usuarioActualizado }),
            credentials: "include",
          });
        }
        setTimeout(() => {
          window.location.href = "/perfil";
        }, 1200);
      } else {
        const errorText = await response.text();
        alertContainer.innerHTML = `<div class='alert alert-danger'>Error al registrar: ${errorText}</div>`;
      }
    } catch (error) {
      alert("Error al enviar el formulario: " + error.message);
    }
  });
}
