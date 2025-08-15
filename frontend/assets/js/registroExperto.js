// Mostrar fecha actual
document.addEventListener("DOMContentLoaded", function () {
  const currentDateSpan = document.getElementById("currentDate");
  if (currentDateSpan) {
    currentDateSpan.textContent = new Date().toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
});

document.addEventListener("DOMContentLoaded", async function () {
  // Validaciones en tiempo real para datos bancarios
  const numeroCuentaInput = document.getElementById("numeroCuenta");
  const numeroDocumentoInput = document.getElementById("numeroDocumento");
  const telefonoInput = document.getElementById("telefonoContacto");
  const titularInput = document.getElementById("titular");

  // Validar solo números en número de cuenta
  numeroCuentaInput.addEventListener("input", function (e) {
    this.value = this.value.replace(/[^0-9\-]/g, "");
    if (this.value.length < 10) {
      this.style.borderColor = "#ffc107";
    } else {
      this.style.borderColor = "var(--primary-color)";
    }
  });

  // Validar solo números en documento
  numeroDocumentoInput.addEventListener("input", function (e) {
    this.value = this.value.replace(/[^0-9\-]/g, "");
  });

  // Validar formato de teléfono
  telefonoInput.addEventListener("input", function (e) {
    this.value = this.value.replace(/[^0-9+\-\s]/g, "");
  });

  // Capitalizar nombre del titular
  titularInput.addEventListener("input", function (e) {
    this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
    // Capitalizar primera letra de cada palabra
    this.value = this.value
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  });

  // Funcionalidad para mostrar/ocultar número de cuenta
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

  // Nueva lógica para estructura anidada
  const especialidadSelect = document.getElementById("especialidad");
  const categoriasSelect = document.getElementById("categorias");
  const skillsSelect = document.getElementById("skills");
  let categoriasData = [];

  fetch("http://localhost:3000/api/categorias")
    .then((res) => res.json())
    .then((data) => {
      console.log("Categorías recibidas:", data);
      categoriasData = data;
      // Poblar categorías, manteniendo la opción por defecto
      categoriasSelect.innerHTML =
        '<option value="">Selecciona una categoría</option>';
      data.forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat.nombre;
        opt.textContent = cat.nombre;
        categoriasSelect.appendChild(opt);
      });
      especialidadSelect.innerHTML =
        '<option value="">Selecciona una especialidad</option>';
      skillsSelect.innerHTML = "";
      // Asegurar que no haya ninguna categoría seleccionada por defecto
      categoriasSelect.selectedIndex = 0;
    });

  // Al cambiar categorías, poblar especialidades de todas las seleccionadas
  categoriasSelect.addEventListener("change", function () {
    const selectedCats = Array.from(categoriasSelect.selectedOptions).map(
      (opt) => opt.value
    );
    console.log("Categorías seleccionadas:", selectedCats);
    especialidadSelect.innerHTML =
      '<option value="">Selecciona una especialidad</option>';
    skillsSelect.innerHTML = "";
    // Juntar todas las especialidades de las categorías seleccionadas
    let especialidades = [];
    selectedCats.forEach((catNombre) => {
      const cat = categoriasData.find((c) => c.nombre === catNombre);
      if (cat && Array.isArray(cat.especialidades)) {
        especialidades = especialidades.concat(cat.especialidades);
      }
    });
    console.log("Especialidades encontradas:", especialidades);
    // Eliminar duplicados por nombre
    const nombresUnicos = new Set();
    let count = 0;
    especialidades.forEach((esp) => {
      if (!nombresUnicos.has(esp.nombre)) {
        nombresUnicos.add(esp.nombre);
        const opt = document.createElement("option");
        opt.value = esp.nombre;
        opt.textContent = esp.nombre;
        especialidadSelect.appendChild(opt);
        count++;
      }
    });
    if (count === 0) {
      especialidadSelect.innerHTML +=
        "<option disabled>No hay especialidades disponibles</option>";
    }
  });

  // Al cambiar especialidad, poblar habilidades (de todas las categorías seleccionadas)
  especialidadSelect.addEventListener("change", function () {
    const selectedCats = Array.from(categoriasSelect.selectedOptions).map(
      (opt) => opt.value
    );
    console.log("Especialidad seleccionada:", especialidadSelect.value);
    let habilidadesPorEspecialidad = {};
    selectedCats.forEach((catNombre) => {
      const cat = categoriasData.find((c) => c.nombre === catNombre);
      if (cat && Array.isArray(cat.especialidades)) {
        cat.especialidades.forEach((esp) => {
          if (
            esp.nombre === especialidadSelect.value &&
            Array.isArray(esp.habilidades)
          ) {
            habilidadesPorEspecialidad[esp.nombre] = esp.habilidades;
          }
        });
      }
    });
    // Agrupar habilidades por especialidad
    console.log("Habilidades agrupadas:", habilidadesPorEspecialidad);
    skillsSelect.innerHTML = "";
    let totalHabs = 0;
    Object.keys(habilidadesPorEspecialidad).forEach((espNombre) => {
      const grupo = habilidadesPorEspecialidad[espNombre];
      if (grupo.length > 0) {
        grupo.forEach((hab) => {
          const opt = document.createElement("option");
          opt.value = hab.nombre;
          opt.textContent = `${hab.nombre} (${hab.nivel || ""})`;
          skillsSelect.appendChild(opt);
          totalHabs++;
        });
      }
    });
    if (totalHabs === 0) {
      skillsSelect.innerHTML =
        "<option disabled>No hay habilidades disponibles</option>";
    }
  });

  // Permitir agregar nuevas habilidades
  const nuevaSkillInput = document.getElementById("nuevaSkill");
  nuevaSkillInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && this.value.trim()) {
      e.preventDefault();
      const val = this.value.trim();
      let exists = false;
      Array.from(skillsSelect.options).forEach((opt) => {
        if (opt.value.toLowerCase() === val.toLowerCase()) exists = true;
      });
      // Si no existe, agregar nueva opción
      if (!exists) {
        const opt = document.createElement("option");
        opt.value = val;
        opt.textContent = val;
        opt.selected = true;
        skillsSelect.appendChild(opt);
      } else {
        // Si ya existe, solo selecciona
        Array.from(skillsSelect.options).forEach((opt) => {
          if (opt.value.toLowerCase() === val.toLowerCase())
            opt.selected = true;
        });
      }
      this.value = "";
    }
  });

  // Envío del formulario
  const form = document.getElementById("registroExpertoForm");
  const submitBtn = document.getElementById("submitExperto");
  const diasDisponiblesSelect = document.getElementById("diasDisponibles");
  if (form && submitBtn) {
    submitBtn.addEventListener("click", async function () {
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
      // Días disponibles
      Array.from(diasDisponiblesSelect.options).forEach((opt) => {
        if (opt.selected) opt.setAttribute("selected", "selected");
        else opt.removeAttribute("selected");
      });

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
      formData.set(
        "diasDisponibles",
        Array.from(diasDisponiblesSelect.selectedOptions)
          .map((o) => o.value)
          .join(",")
      );

      // Estructurar datos bancarios como JSON
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
        const response = await fetch("/registro-experto", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (response.redirected) {
          window.location.href = response.url;
        } else {
          const result = await response.text();
          document.open();
          document.write(result);
          document.close();
        }
      } catch (error) {
        alert("Error al enviar el formulario: " + error.message);
      }
    });
  }
});

// Script para manejar la adición y eliminación de horarios
document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("horarios-container");
  const addButton = document.getElementById("add-horario");
  const template = document.getElementById("horario-template")
    ? document.getElementById("horario-template").innerHTML
    : "";
  let horarioCount = 1;

  // Clonar el template para nuevos horarios
  if (addButton && container && template) {
    // Añadir nuevo horario
    addButton.addEventListener("click", function () {
      const newHorario = template.replace(/\{\{index\}\}/g, horarioCount);
      const div = document.createElement("div");
      div.innerHTML = newHorario;
      container.appendChild(div.firstElementChild);
      horarioCount++;
      // Habilitar botones de eliminar en todos menos el primero
      document.querySelectorAll(".btn-remove-horario").forEach((btn, index) => {
        btn.disabled = index === 0;
      });
    });

    // Eliminar horario
    container.addEventListener("click", function (e) {
      if (e.target.closest(".btn-remove-horario")) {
        const item = e.target.closest(".horario-item");
        item.remove();
        // Si solo queda uno, deshabilitar su botón de eliminar
        const removeButtons = document.querySelectorAll(".btn-remove-horario");
        if (removeButtons.length === 1) {
          removeButtons[0].disabled = true;
        }
      }
    });

    // Validación de horas (opcional)
    container.addEventListener("change", function (e) {
      if (e.target.name && e.target.name.includes("[inicio]")) {
        const inicioSelect = e.target;
        const finSelect = inicioSelect
          .closest(".form-row")
          .querySelector('select[name$="[fin]"]');
        const inicioValue = inicioSelect.value;
        Array.from(finSelect.options).forEach((option) => {
          option.disabled = option.value && option.value <= inicioValue;
        });
        if (finSelect.value && finSelect.value <= inicioValue) {
          finSelect.value = "";
        }
      }
    });
  }
});

// Redirección automática tras registro exitoso
document.addEventListener("DOMContentLoaded", function () {
  const successAlert = document.querySelector(".alert-success");
  if (successAlert) {
    setTimeout(function () {
      window.location.href = "/perfil-experto";
    }, 3000);
  }
});
