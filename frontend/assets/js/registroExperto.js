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

  // Add native tooltip with full email and keep it updated if content changes
  try {
    const emailField = document.querySelector(".email-field");
    if (emailField) {
      const setTitle = () => {
        const txt = emailField.textContent && emailField.textContent.trim();
        if (txt) emailField.setAttribute("title", txt);
      };
      setTitle();
      // Observe changes to keep title in sync if email is updated dynamically
      const mo = new MutationObserver(setTitle);
      mo.observe(emailField, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  } catch (e) {
    console.warn("Failed to set email tooltip", e);
  }
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

// Evitar entrada de letras en el campo precio: bloquear teclas no numéricas, sanear pegado y normalizar
(function preventNonNumericPrecio() {
  var input = document.getElementById("precio");
  if (!input) return;

  // Permitir teclas de control, flechas, backspace, delete y números
  input.addEventListener("keydown", function (e) {
    // Allow: backspace, delete, tab, escape, enter, arrows
    if (
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "Tab" ||
      e.key === "Escape" ||
      e.key === "Enter" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "Home" ||
      e.key === "End"
    ) {
      return;
    }

    // Allow Ctrl/Cmd combinations (copy/paste/select all)
    if (e.ctrlKey || e.metaKey) return;

    // Only allow digits
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  });

  // Sanear texto pegado: dejar solo dígitos
  input.addEventListener("paste", function (e) {
    e.preventDefault();
    var text = (e.clipboardData || window.clipboardData).getData("text") || "";
    var digits = text.replace(/[^0-9]/g, "");
    // Insert at caret position
    var start = input.selectionStart;
    var end = input.selectionEnd;
    var value = input.value;
    input.value = value.slice(0, start) + digits + value.slice(end);
    // move caret
    var pos = start + digits.length;
    input.setSelectionRange(pos, pos);
    // trigger input handlers
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  // On blur, strip non-digits and ensure integer
  input.addEventListener("blur", function () {
    var v = (input.value || "").toString();
    var digits = v.replace(/[^0-9]/g, "");
    if (digits === "") {
      input.value = "";
    } else {
      input.value = parseInt(digits, 10);
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
})();

// Validación para número de cuenta: sólo dígitos y guiones
(function preventInvalidAccountChars() {
  var acc = document.getElementById("numeroCuenta");
  if (!acc) return;

  acc.addEventListener("keydown", function (e) {
    // allow control keys
    if (
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "Tab" ||
      e.key === "Escape" ||
      e.key === "Enter" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "Home" ||
      e.key === "End"
    )
      return;

    if (e.ctrlKey || e.metaKey) return;

    // allow digits and hyphen
    if (!/^[0-9-]$/.test(e.key)) {
      e.preventDefault();
    }
  });

  acc.addEventListener("paste", function (e) {
    e.preventDefault();
    var text = (e.clipboardData || window.clipboardData).getData("text") || "";
    var cleaned = text.replace(/[^0-9-]/g, "");
    var start = acc.selectionStart,
      end = acc.selectionEnd;
    var val = acc.value;
    acc.value = val.slice(0, start) + cleaned + val.slice(end);
    var pos = start + cleaned.length;
    acc.setSelectionRange(pos, pos);
  });

  acc.addEventListener("blur", function () {
    // remove accidental spaces and letters
    var cleaned = (acc.value || "").toString().replace(/[^0-9-]/g, "");
    acc.value = cleaned;
  });
})();

// Validación para número de documento: sólo dígitos y guiones
(function preventInvalidDocumentoChars() {
  var doc = document.getElementById("numeroDocumento");
  if (!doc) return;

  doc.addEventListener("keydown", function (e) {
    // allow control keys
    if (
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "Tab" ||
      e.key === "Escape" ||
      e.key === "Enter" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "Home" ||
      e.key === "End"
    )
      return;

    if (e.ctrlKey || e.metaKey) return;

    // allow digits and hyphen
    if (!/^[0-9-]$/.test(e.key)) {
      e.preventDefault();
    }
  });

  doc.addEventListener("paste", function (e) {
    e.preventDefault();
    var text = (e.clipboardData || window.clipboardData).getData("text") || "";
    var cleaned = text.replace(/[^0-9-]/g, "");
    var start = doc.selectionStart,
      end = doc.selectionEnd;
    var val = doc.value;
    doc.value = val.slice(0, start) + cleaned + val.slice(end);
    var pos = start + cleaned.length;
    doc.setSelectionRange(pos, pos);
  });

  doc.addEventListener("blur", function () {
    // remove accidental spaces and letters
    var cleaned = (doc.value || "").toString().replace(/[^0-9-]/g, "");
    doc.value = cleaned;
  });
})();

// Validación para teléfono de contacto: permitir dígitos, espacios, +, paréntesis y guiones
(function preventInvalidTelefonoChars() {
  var tel = document.getElementById("telefonoContacto");
  if (!tel) return;

  tel.addEventListener("keydown", function (e) {
    // allow control keys
    if (
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "Tab" ||
      e.key === "Escape" ||
      e.key === "Enter" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "Home" ||
      e.key === "End"
    )
      return;

    if (e.ctrlKey || e.metaKey) return;

    // allow digits, plus, hyphen, spaces and parentheses
    if (!/^[0-9+\-()\s]$/.test(e.key)) {
      e.preventDefault();
    }
  });

  tel.addEventListener("paste", function (e) {
    e.preventDefault();
    var text = (e.clipboardData || window.clipboardData).getData("text") || "";
    var cleaned = text.replace(/[^0-9+\-()\s]/g, "");
    var start = tel.selectionStart,
      end = tel.selectionEnd;
    var val = tel.value;
    tel.value = val.slice(0, start) + cleaned + val.slice(end);
    var pos = start + cleaned.length;
    tel.setSelectionRange(pos, pos);
  });

  tel.addEventListener("blur", function () {
    // normalize multiple spaces and trim
    var v = (tel.value || "").toString();
    var cleaned = v
      .replace(/[^0-9+\-()\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    tel.value = cleaned;
  });
})();

// Formateo ligero de teléfono: agrupa dígitos y mantiene prefijo +pais
(function formatTelefonoContacto() {
  var tel = document.getElementById("telefonoContacto");
  if (!tel) return;

  function formatValue(raw) {
    if (!raw) return "";
    // detect leading + and separate digits
    var leadingPlus = raw.trim().charAt(0) === "+";
    var onlyDigits = raw.replace(/[^0-9]/g, "");

    if (leadingPlus) {
      // country code up to 3 digits
      var m = onlyDigits.match(/^(\d{1,3})(\d*)$/);
      if (!m) return "+" + onlyDigits;
      var country = m[1];
      var rest = m[2] || "";
      var groups = [];
      while (rest.length > 0) {
        if (rest.length > 4) {
          groups.push(rest.slice(0, 3));
          rest = rest.slice(3);
        } else {
          groups.push(rest);
          rest = "";
        }
      }
      return "+" + country + (groups.length ? " " + groups.join(" ") : "");
    } else {
      // local formatting: groups of 3 until last group <=4
      var rest = onlyDigits;
      var groups = [];
      while (rest.length > 0) {
        if (rest.length > 4) {
          groups.push(rest.slice(0, 3));
          rest = rest.slice(3);
        } else {
          groups.push(rest);
          rest = "";
        }
      }
      return groups.join(" ");
    }
  }

  var composing = false;
  tel.addEventListener("compositionstart", function () {
    composing = true;
  });
  tel.addEventListener("compositionend", function () {
    composing = false;
    tel.dispatchEvent(new Event("input"));
  });

  tel.addEventListener("input", function (e) {
    if (composing) return;
    var start = tel.selectionStart;
    var old = tel.value;
    var formatted = formatValue(old);
    tel.value = formatted;
    // move caret to end to avoid complex caret-preserving logic
    tel.setSelectionRange(tel.value.length, tel.value.length);
  });

  tel.addEventListener("blur", function () {
    tel.value = formatValue(tel.value);
  });
})();

// Validación para titular: impedir números, permitir letras y espacios
(function preventDigitsInTitular() {
  var t = document.getElementById("titular");
  if (!t) return;

  t.addEventListener("keydown", function (e) {
    // allow control keys
    if (
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "Tab" ||
      e.key === "Escape" ||
      e.key === "Enter" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "Home" ||
      e.key === "End"
    )
      return;

    if (e.ctrlKey || e.metaKey) return;

    // Block digits
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  });

  t.addEventListener("paste", function (e) {
    e.preventDefault();
    var text = (e.clipboardData || window.clipboardData).getData("text") || "";
    var cleaned = text.replace(/[0-9]/g, "");
    var start = t.selectionStart,
      end = t.selectionEnd;
    var val = t.value;
    t.value = val.slice(0, start) + cleaned + val.slice(end);
    var pos = start + cleaned.length;
    t.setSelectionRange(pos, pos);
  });

  t.addEventListener("blur", function () {
    // remove digits accidentally entered
    t.value = (t.value || "").toString().replace(/[0-9]/g, "");
  });
})();

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
          // ensure dropdown is appended inside the page container so scoped CSS applies
          var categoriasAppendTarget =
            categoriasSelect.closest(".registroExperto-main") || document.body;
          new Choices(categoriasSelect, {
            removeItemButton: true,
            searchEnabled: true,
            placeholder: true,
            placeholderValue: "Selecciona categorías",
            noResultsText: "No hay resultados",
            noChoicesText: "No hay opciones",
            itemSelectText: "Seleccionar",
            appendTo: categoriasAppendTarget,
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
          // append inside page container so scoped CSS (under .registroExperto-main) reaches the dropdown
          var skillsAppendTarget =
            skillsSelect.closest(".registroExperto-main") || document.body;
          new Choices(skillsSelect, {
            removeItemButton: true,
            searchEnabled: true,
            placeholder: true,
            placeholderValue: "Selecciona habilidades",
            noResultsText: "No hay resultados",
            noChoicesText: "No hay opciones",
            itemSelectText: "Seleccionar",
            appendTo: skillsAppendTarget,
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
