// JS para registro de experto - validaciones inmediatas en el navegador y feedback visual por campo

document.addEventListener("DOMContentLoaded", function () {
  if (window.__registroExpertoInitialized) return;
  window.__registroExpertoInitialized = true;

  const form = document.getElementById("registroExpertoForm");
  const alerta = document.getElementById("registroAlerta");
  const categoriasSelect = document.getElementById("categorias");
  const errorCategorias = document.getElementById("errorCategorias");

  // CATEGORÍAS: Fetch dinámico y Choices.js
  fetch("/api/categorias")
    .then((r) => r.json())
    .then((categorias) => {
      categoriasSelect.innerHTML = "";
      (categorias || []).forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat._id || cat.id || cat.nombre;
        opt.textContent = cat.nombre;
        categoriasSelect.appendChild(opt);
      });
      if (typeof Choices !== "undefined") {
        if (categoriasSelect.choicesInstance) {
          categoriasSelect.choicesInstance.destroy();
        }
        categoriasSelect.choicesInstance = new Choices(categoriasSelect, {
          removeItemButton: true,
          searchPlaceholderValue: "Buscar categoría...",
          noResultsText: "Sin resultados",
        });
      }
    });

  categoriasSelect.addEventListener("change", function () {
    if (categoriasSelect.selectedOptions.length === 0) {
      errorCategorias.textContent = "Selecciona al menos una categoría.";
      categoriasSelect.classList.add("invalid");
    } else {
      errorCategorias.textContent = "";
      categoriasSelect.classList.remove("invalid");
    }
  });

  // Utilidades de error por campo
  function setError(campo, mensaje) {
    const input = form[campo];
    const errorDiv = document.getElementById("error" + capitalize(campo));
    if (input) input.classList.add("invalid");
    if (errorDiv) errorDiv.textContent = mensaje || "Campo obligatorio.";
  }
  function clearError(campo) {
    const input = form[campo];
    const errorDiv = document.getElementById("error" + capitalize(campo));
    if (input) input.classList.remove("invalid");
    if (errorDiv) errorDiv.textContent = "";
  }
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Validar precio por hora
  form.precio.addEventListener("input", function () {
    clearError("precio");
    const val = form.precio.value;
    if (!val || isNaN(val) || val < 10000 || val > 120000) {
      setError(
        "precio",
        "El precio es obligatorio y debe estar entre $10.000 y $120.000."
      );
    }
  });

  // Validar teléfono de contacto (solo números y longitud)
  form.telefonoContacto.addEventListener("input", function () {
    clearError("telefonoContacto");
    const val = form.telefonoContacto.value;
    if (!/^[0-9]{7,10}$/.test(val)) {
      setError(
        "telefonoContacto",
        "El teléfono debe tener entre 7 y 10 dígitos."
      );
    }
  });

  // Validar descripción profesional
  form.descripcion.addEventListener("input", function () {
    clearError("descripcion");
    const val = form.descripcion.value;
    document.getElementById("descContador").textContent = val.length;
    if (!val.trim()) {
      setError("descripcion", "Describe tu experiencia profesional.");
    } else if (val.length > 400) {
      setError("descripcion", "Máximo 400 caracteres.");
    }
  });

  // DÍAS DISPONIBLES: validación y feedback
  const diasDisponiblesInput = document.getElementById("diasDisponibles");
  const diasSelector = document.querySelector(".days-selector");
  const diasDisplay = document.getElementById("diasDisplay");

  function updateDias() {
    const seleccionados = Array.from(
      document.querySelectorAll(".day-option.selected")
    ).map((d) => d.getAttribute("data-day"));
    diasDisponiblesInput.value = seleccionados.length
      ? seleccionados.join(",")
      : "";
    if (diasDisplay) {
      diasDisplay.textContent =
        seleccionados.length > 0
          ? seleccionados.join(", ")
          : "Selecciona tus días disponibles";
    }
    clearError("diasDisponibles");
    if (seleccionados.length === 0) {
      setError("diasDisponibles", "Elige al menos un día disponible.");
    }
  }
  if (diasSelector) {
    diasSelector.addEventListener("click", function (e) {
      const btn = e.target.closest(".day-option");
      if (!btn) return;
      e.preventDefault();
      btn.classList.toggle("selected");
      btn.setAttribute(
        "aria-pressed",
        btn.classList.contains("selected") ? "true" : "false"
      );
      updateDias();
    });
    Array.from(diasSelector.querySelectorAll(".day-option")).forEach((b) => {
      b.setAttribute(
        "aria-pressed",
        b.classList.contains("selected") ? "true" : "false"
      );
      if (b.tagName.toLowerCase() === "button") b.type = "button";
    });
  }
  updateDias();

  // Validar banco
  form.banco.addEventListener("change", function () {
    clearError("banco");
    if (!form.banco.value) setError("banco", "Selecciona tu banco.");
  });

  // Validar tipo de cuenta
  form.tipoCuenta.addEventListener("change", function () {
    clearError("tipoCuenta");
    if (!form.tipoCuenta.value)
      setError("tipoCuenta", "Selecciona tipo de cuenta.");
  });

  // Validar número de cuenta
  form.numeroCuenta.addEventListener("input", function () {
    clearError("numeroCuenta");
    const val = form.numeroCuenta.value;
    if (!/^[0-9]{6,20}$/.test(val))
      setError("numeroCuenta", "Número de cuenta: 6 a 20 dígitos.");
  });

  // Validar titular
  form.titular.addEventListener("input", function () {
    clearError("titular");
    if (!form.titular.value.trim()) setError("titular", "Titular obligatorio.");
  });

  // Validar tipo de documento
  form.tipoDocumento.addEventListener("change", function () {
    clearError("tipoDocumento");
    if (!form.tipoDocumento.value)
      setError("tipoDocumento", "Selecciona tipo de documento.");
  });

  // Validar número de documento
  form.numeroDocumento.addEventListener("input", function () {
    clearError("numeroDocumento");
    const val = form.numeroDocumento.value.trim();
    if (!/^[0-9a-zA-Z]{5,15}$/.test(val))
      setError("numeroDocumento", "Número de documento: 5 a 15 caracteres.");
  });

  // Submit global
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    alerta.textContent = "";
    alerta.className = "";

    // Limpia errores previos
    [
      "precio",
      "telefonoContacto",
      "descripcion",
      "categorias",
      "diasDisponibles",
      "banco",
      "tipoCuenta",
      "numeroCuenta",
      "titular",
      "tipoDocumento",
      "numeroDocumento",
    ].forEach(clearError);

    let errores = [];

    if (
      !form.precio.value ||
      isNaN(form.precio.value) ||
      form.precio.value < 10000 ||
      form.precio.value > 120000
    ) {
      setError(
        "precio",
        "El precio es obligatorio y debe estar entre $10.000 y $120.000."
      );
      errores.push("precio");
    }
    if (
      !form.telefonoContacto.value ||
      !/^[0-9]{7,10}$/.test(form.telefonoContacto.value)
    ) {
      setError(
        "telefonoContacto",
        "El teléfono debe tener entre 7 y 10 dígitos."
      );
      errores.push("telefonoContacto");
    }
    if (!form.descripcion.value.trim()) {
      setError("descripcion", "Describe tu experiencia profesional.");
      errores.push("descripcion");
    } else if (form.descripcion.value.length > 400) {
      setError("descripcion", "Máximo 400 caracteres.");
      errores.push("descripcion");
    }
    if (
      !form.categorias.selectedOptions ||
      form.categorias.selectedOptions.length === 0
    ) {
      setError("categorias", "Selecciona al menos una categoría.");
      errores.push("categorias");
    }
    if (!form.diasDisponibles.value) {
      setError("diasDisponibles", "Elige al menos un día disponible.");
      errores.push("diasDisponibles");
    }
    if (!form.banco.value) {
      setError("banco", "Selecciona tu banco.");
      errores.push("banco");
    }
    if (!form.tipoCuenta.value) {
      setError("tipoCuenta", "Selecciona tipo de cuenta.");
      errores.push("tipoCuenta");
    }
    if (
      !form.numeroCuenta.value ||
      !/^[0-9]{6,20}$/.test(form.numeroCuenta.value)
    ) {
      setError("numeroCuenta", "Número de cuenta: 6 a 20 dígitos.");
      errores.push("numeroCuenta");
    }
    if (!form.titular.value.trim()) {
      setError("titular", "Titular obligatorio.");
      errores.push("titular");
    }
    if (!form.tipoDocumento.value) {
      setError("tipoDocumento", "Selecciona tipo de documento.");
      errores.push("tipoDocumento");
    }
    if (
      !form.numeroDocumento.value.trim() ||
      !/^[0-9a-zA-Z]{5,15}$/.test(form.numeroDocumento.value.trim())
    ) {
      setError("numeroDocumento", "Número de documento: 5 a 15 caracteres.");
      errores.push("numeroDocumento");
    }

    if (errores.length > 0) {
      alerta.textContent =
        "Por favor, completa correctamente los campos marcados.";
      alerta.className = "registro-alerta alert-danger";
      if (form[errores[0]]) form[errores[0]].focus();
      return;
    }

    // Arma payload SOLO para experto (no registro)
    const payload = {
      descripcion: form.descripcion.value.trim(),
      precioPorHora: Number(form.precio.value),
      categorias: Array.from(form.categorias.selectedOptions).map(
        (opt) => opt.value
      ),
      banco: form.banco.value,
      tipoCuenta: form.tipoCuenta.value,
      numeroCuenta: form.numeroCuenta.value,
      titular: form.titular.value.trim(),
      tipoDocumento: form.tipoDocumento.value,
      numeroDocumento: form.numeroDocumento.value.trim(),
      telefonoContacto: form.telefonoContacto.value.trim(),
      diasDisponibles: form.diasDisponibles.value
        ? form.diasDisponibles.value.split(",")
        : [],
    };

    try {
      const resp = await fetch("/api/expertos/perfil", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + (localStorage.getItem("token") || ""),
        },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (resp.ok) {
        alerta.className = "registro-alerta alert-success";
        alerta.textContent =
          "¡Solicitud enviada! Revisaremos tu perfil y activaremos tu cuenta de experto.";
        setTimeout(() => {
          window.location.href = "/perfil";
        }, 2300);
      } else {
        if (data.camposFaltantes && Array.isArray(data.camposFaltantes)) {
          data.camposFaltantes.forEach((campo) =>
            setError(campo, "Campo obligatorio.")
          );
          alerta.textContent = "Por favor, completa los campos marcados.";
        } else if (data.mensaje) {
          alerta.textContent = data.mensaje;
        } else {
          alerta.textContent =
            "Error al enviar solicitud. Revisa el formulario.";
        }
        alerta.className = "registro-alerta alert-danger";
      }
    } catch (err) {
      alerta.className = "registro-alerta alert-danger";
      alerta.textContent = "Error de red. Intenta de nuevo.";
    }
  });

  // Bloqueo de letras en teléfono (solo números)
  const telefono = form.telefonoContacto;
  telefono.addEventListener("keydown", function (e) {
    if (
      !(
        (e.key >= "0" && e.key <= "9") ||
        ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(
          e.key
        )
      )
    ) {
      e.preventDefault();
    }
  });
  telefono.addEventListener("paste", function (e) {
    e.preventDefault();
    let paste = (e.clipboardData || window.clipboardData)
      .getData("text")
      .replace(/\D/g, "");
    const start = telefono.selectionStart;
    const end = telefono.selectionEnd;
    const current = telefono.value;
    telefono.value = current.slice(0, start) + paste + current.slice(end);
    telefono.setSelectionRange(start + paste.length, start + paste.length);
    telefono.dispatchEvent(new Event("input"));
  });
  telefono.addEventListener("input", function () {
    let cleaned = telefono.value.replace(/\D/g, "");
    if (telefono.value !== cleaned) {
      telefono.value = cleaned;
    }
  });
});
