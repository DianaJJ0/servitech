// JS para editar perfil de experto, igual lógica y validaciones que registro
document.addEventListener("DOMContentLoaded", function () {
  // Evita inicializar dos veces si el script se carga más de una vez
  if (window.__editarExpertoInitialized) return;
  window.__editarExpertoInitialized = true;

  const form = document.getElementById("editarExpertoForm");
  const alerta = document.getElementById("alertasExpertos");

  // Bloquear letras en teléfono (solo números)
  const telefono = form.telefonoContacto;
  // Reglas mejoradas para teléfono
  // Objetivo: aceptar números colombianos (ej: 3001234567) o E.164 con +57 (ej: +573001234567)
  const normalizePhone = (v) => {
    if (!v) return "";
    // Eliminar espacios, guiones y paréntesis
    let s = String(v)
      .trim()
      .replace(/[\s\-()\.]/g, "");
    // Si comienza con 0057 o 57 eliminar prefijo regional opcional para normalizar
    if (/^00?57/.test(s)) {
      s = s.replace(/^00?/, "");
    }
    // Mantener +57 si viene así
    if (s.startsWith("+")) {
      // quitar caracteres no numéricos excepto el +
      s = "+" + s.slice(1).replace(/\D/g, "");
    } else {
      s = s.replace(/\D/g, "");
    }
    return s;
  };

  telefono.addEventListener("keydown", function (e) {
    const allowed = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "Tab",
      "Home",
      "End",
    ];
    if (allowed.includes(e.key)) return;
    if (
      e.key === "+" &&
      telefono.selectionStart === 0 &&
      !telefono.value.includes("+")
    )
      return;
    if (!(e.key >= "0" && e.key <= "9")) {
      e.preventDefault();
    }
  });

  telefono.addEventListener("paste", function (e) {
    e.preventDefault();
    let paste = (e.clipboardData || window.clipboardData).getData("text") || "";
    paste = normalizePhone(paste).replace(/^\+/, "");
    const maxLen = parseInt(telefono.getAttribute("data-maxlength")) || 13;
    paste = paste.slice(0, maxLen);
    // Insertar en la posición actual
    const start = telefono.selectionStart;
    const end = telefono.selectionEnd;
    const current = telefono.value || "";
    telefono.value = current.slice(0, start) + paste + current.slice(end);
    telefono.setSelectionRange(start + paste.length, start + paste.length);
    telefono.dispatchEvent(new Event("input"));
  });

  telefono.addEventListener("input", function () {
    const before = telefono.value;
    let cleaned = normalizePhone(before);
    // Si empieza con +57 mantener +57, sino mantener solo dígitos
    if (cleaned.startsWith("+57")) {
      // permitido
    } else if (cleaned.startsWith("+")) {
      // otros códigos no permitidos -> quitar +
      cleaned = cleaned.replace(/\D/g, "");
    }
    // Limitar a 13 caracteres por seguridad
    const maxLen = parseInt(telefono.getAttribute("data-maxlength")) || 13;
    if (cleaned.length > maxLen) cleaned = cleaned.slice(0, maxLen);
    if (before !== cleaned) telefono.value = cleaned;
  });

  // Validación inmediata teléfono
  const errorTelefono = document.getElementById("errorTelefono");
  if (telefono && errorTelefono) {
    telefono.addEventListener("input", function () {
      const raw = telefono.value;
      if (!raw) {
        errorTelefono.textContent = "Teléfono requerido.";
        telefono.classList.add("invalid");
        return;
      }
      const norm = normalizePhone(raw);
      // Validar +57 con 10 dígitos o 7-10 dígitos locales
      const validIntl = /^\+57[0-9]{10}$/.test(norm);
      const validLocal = /^[0-9]{7,10}$/.test(norm);
      if (!validIntl && !validLocal) {
        errorTelefono.textContent =
          "Formato inválido. Ej: 3001234567 o +573001234567.";
        telefono.classList.add("invalid");
      } else {
        errorTelefono.textContent = "";
        telefono.classList.remove("invalid");
      }
    });
  }

  // Precio: validación inmediata
  const precio = form.precio;
  const errorPrecio = document.getElementById("errorPrecio");
  if (precio && errorPrecio) {
    // Bloquea caracteres no numéricos (permite navegación y edición)
    precio.addEventListener("keydown", function (e) {
      const permitidos = [
        "Backspace",
        "Delete",
        "ArrowLeft",
        "ArrowRight",
        "Tab",
        "Home",
        "End",
      ];
      if (permitidos.includes(e.key)) return;
      if (e.key === "Enter") {
        e.preventDefault();
        precio.blur();
        return;
      }
      if (!(e.key >= "0" && e.key <= "9")) {
        e.preventDefault();
        return;
      }
      // Previsualizar valor resultante y bloquear si supera 100000
      const selStart = precio.selectionStart;
      const selEnd = precio.selectionEnd;
      const current = precio.value;
      const next = current.slice(0, selStart) + e.key + current.slice(selEnd);
      const numeric = parseInt(next, 10);
      if (!isNaN(numeric) && numeric > 100000) {
        e.preventDefault();
        // Feedback rápido (sin alterar valor) - solo si aún no hay mensaje específico
        if (
          !errorPrecio.textContent ||
          /máximo/i.test(errorPrecio.textContent) === false
        ) {
          errorPrecio.textContent = "El máximo es $100.000 COP.";
          precio.classList.add("invalid");
        }
      }
    });

    // Pegado: solo dígitos y recorta longitud
    precio.addEventListener("paste", function (e) {
      e.preventDefault();
      const maxLen = parseInt(precio.getAttribute("data-maxlength")) || 6;
      let paste = (e.clipboardData || window.clipboardData)
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, maxLen);
      if (paste) {
        let num = parseInt(paste, 10);
        if (!isNaN(num) && num > 100000) num = 100000;
        paste = String(num);
      }
      precio.value = paste;
      precio.dispatchEvent(new Event("input"));
    });

    precio.addEventListener("input", function () {
      // Limpia no dígitos y corta longitud
      const maxLen = parseInt(precio.getAttribute("data-maxlength")) || 6;
      let val = precio.value.replace(/\D/g, "").slice(0, maxLen);
      if (precio.value !== val) precio.value = val;

      if (val === "") {
        errorPrecio.textContent = "Precio requerido.";
        precio.classList.add("invalid");
        return;
      }
      const num = parseInt(val, 10);
      if (isNaN(num)) {
        errorPrecio.textContent = "Valor inválido.";
        precio.classList.add("invalid");
        return;
      }
      if (num < 10000) {
        errorPrecio.textContent = "El mínimo es $10.000 COP.";
        precio.classList.add("invalid");
        return;
      }
      if (num > 100000) {
        errorPrecio.textContent = "El máximo es $100.000 COP.";
        precio.classList.add("invalid");
        return;
      }
      if (num % 100 !== 0) {
        errorPrecio.textContent = "Debe ser múltiplo de 100.";
        precio.classList.add("invalid");
        return;
      }
      errorPrecio.textContent = "";
      precio.classList.remove("invalid");
    });
  }

  // Descripción: validación inmediata y contador
  const descripcion = form.descripcion;
  const errorDescripcion = document.getElementById("errorDescripcion");
  const descContador = document.getElementById("descContador");

  // Inicializa contador si el valor ya está lleno y el elemento existe
  if (descContador && descripcion) {
    descContador.textContent = descripcion.value.length;
  }

  if (descripcion) {
    const autoResize = (el) => {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    };

    // Saneamiento y reglas para la descripción
    const sanitizeDescription = (s) => {
      if (!s) return "";
      // Eliminar etiquetas HTML
      let t = String(s).replace(/<[^>]*>/g, "");
      // Colapsar espacios y saltos de línea a un solo espacio
      t = t.replace(/\s+/g, " ").trim();
      return t;
    };

    const containsURL = (s) => /https?:\/\/|www\./i.test(s);
    const hasLongRepeated = (s) => /(.)\1{6,}/.test(s);
    const MIN_DESC = 30;
    const MAX_DESC = 400;

    // Ajuste inicial
    autoResize(descripcion);
    if (descContador) descContador.textContent = descripcion.value.length;

    descripcion.addEventListener("input", function () {
      // Actualizar contador visual (caracteres actuales)
      if (descContador) {
        descContador.textContent = descripcion.value.length;
      }
      autoResize(descripcion);

      const raw = descripcion.value || "";
      const clean = sanitizeDescription(raw);

      // Calcular mensaje de error sin interrumpir la escritura
      let errorMsg = "";
      if (!clean) {
        errorMsg = "Descripción requerida.";
      } else if (clean.length < MIN_DESC) {
        errorMsg = `Describe tu experiencia en al menos ${MIN_DESC} caracteres.`;
      } else if (raw.length > MAX_DESC || clean.length > MAX_DESC) {
        errorMsg = `Máximo ${MAX_DESC} caracteres.`;
      } else if (containsURL(raw)) {
        errorMsg = "No incluyas enlaces o direcciones web en la descripción.";
      } else if (hasLongRepeated(raw)) {
        errorMsg = "Evita secuencias repetidas de caracteres.";
      }

      if (errorMsg) {
        errorDescripcion.textContent = errorMsg;
        descripcion.classList.add("invalid");
      } else {
        errorDescripcion.textContent = "";
        descripcion.classList.remove("invalid");
      }
      // Nota: no hacemos `return` aquí para no impedir la escritura del usuario;
      // los errores solo informan, el campo sigue editable.
    });
  }

  // CATEGORÍAS Choices.js y validación
  const categoriasSelect = document.getElementById("selectCategorias");
  const errorCategorias = document.getElementById("errorCategorias");
  let categoriasChoices = null;

  const getCategoriasSeleccionadas = () => {
    if (!categoriasSelect) return [];
    if (categoriasChoices) {
      // true => devuelve arreglo con solo los valores
      const values = categoriasChoices.getValue(true);
      return Array.isArray(values) ? values : values ? [values] : [];
    }
    return Array.from(categoriasSelect.selectedOptions).map((opt) => opt.value);
  };

  const marcarCategoriasInvalid = (isInvalid) => {
    if (!categoriasSelect) return;
    const container = categoriasSelect.closest(".especializacion-container");
    const choicesContainer = container
      ? container.querySelector(".choices")
      : null;
    if (isInvalid) {
      categoriasSelect.classList.add("invalid");
      if (choicesContainer) choicesContainer.classList.add("invalid");
    } else {
      categoriasSelect.classList.remove("invalid");
      if (choicesContainer) choicesContainer.classList.remove("invalid");
    }
  };

  const validarCategorias = () => {
    const seleccionadas = getCategoriasSeleccionadas();
    if (!seleccionadas.length) {
      if (errorCategorias) {
        errorCategorias.textContent = "Selecciona al menos una categoría.";
      }
      marcarCategoriasInvalid(true);
      return false;
    }
    if (errorCategorias) {
      errorCategorias.textContent = "";
    }
    marcarCategoriasInvalid(false);
    return true;
  };

  if (categoriasSelect && errorCategorias) {
    if (window.Choices) {
      categoriasChoices = new Choices(categoriasSelect, {
        removeItemButton: true,
        shouldSort: false,
        placeholder: true,
        placeholderValue: "Selecciona tus categorías",
        searchPlaceholderValue: "Buscar categoría...",
        noResultsText: "No se encontraron categorías",
        noChoicesText: "No hay categorías disponibles",
        itemSelectText: "Pulsa para seleccionar",
      });

      // Parche: si alguna opción viene sin label visible, forzamos su textContent usando value
      const originalSetChoices =
        categoriasChoices.setChoices.bind(categoriasChoices);
      categoriasChoices.setChoices = function () {
        const r = originalSetChoices.apply(this, arguments);
        fixChoiceLabels();
        return r;
      };

      function fixChoiceLabels() {
        const items = categoriasSelect.querySelectorAll("option");
        items.forEach((opt) => {
          if (!opt.textContent || !opt.textContent.trim()) {
            opt.textContent = opt.value;
          }
        });
        const rendered = categoriasSelect
          .closest(".choices")
          ?.querySelectorAll(".choices__list--dropdown .choices__item");
        if (rendered) {
          rendered.forEach((el) => {
            if (!el.textContent.trim()) {
              const val = el.getAttribute("data-value");
              if (val) el.textContent = val;
            }
          });
        }
      }
      // Ejecutar al inicio
      fixChoiceLabels();

      categoriasSelect.addEventListener("showDropdown", () => {
        marcarCategoriasInvalid(false);
      });

      categoriasSelect.addEventListener("addItem", validarCategorias);
      categoriasSelect.addEventListener("removeItem", validarCategorias);
    } else {
      // Fallback para navegadores donde Choices no cargue
      categoriasSelect.setAttribute(
        "size",
        Math.min(6, categoriasSelect.options.length || 6)
      );
    }

    categoriasSelect.addEventListener("change", validarCategorias);
    validarCategorias();
  }

  // DÍAS DISPONIBLES: validación y feedback
  const diasDisponiblesInput = document.getElementById("diasDisponibles");
  const diasSelector = document.querySelector(".days-selector");
  const diasDisplay = document.getElementById("diasDisplay");
  const errorDias = document.getElementById("errorDias");

  function updateDias() {
    const seleccionados = Array.from(
      document.querySelectorAll(".day-option.selected")
    ).map((d) => d.getAttribute("data-day"));
    diasDisponiblesInput.value = seleccionados.length
      ? seleccionados.join(",")
      : "";
    if (seleccionados.length > 0) {
      diasDisplay.textContent = seleccionados.join(", ");
      diasDisplay.classList.add("days-selected-display");
      diasDisplay.style.color = "";
      errorDias.textContent = "";
    } else {
      diasDisplay.textContent = "Selecciona tus días disponibles";
      diasDisplay.classList.remove("days-selected-display");
      errorDias.textContent = "Selecciona al menos un día.";
    }
  }
  if (diasSelector) {
    diasSelector.addEventListener("click", function (e) {
      const btn = e.target.closest(".day-option");
      if (!btn) return;
      e.preventDefault();
      const isSelected = btn.classList.toggle("selected");
      btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
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
  // inicializa visual
  updateDias();

  // DATOS BANCARIOS: validación inmediata
  const bancoHidden = form.banco; // input hidden
  const errorBanco = document.getElementById("errorBanco");
  const bankTrigger = document.getElementById("bank-trigger");
  const bankOptionsContainer = document.getElementById(
    "bank-options-container"
  );
  const bankOptionsList = document.getElementById("bank-options-list");
  const bankSearchInput = document.getElementById("bank-search");
  const selectedBankNameSpan = document.getElementById("selected-bank-name");
  const otherBankWrapper = document.getElementById("other-bank-wrapper");
  const otherBankInput = document.getElementById("other-bank-input");
  const errorOtherBank = document.getElementById("errorOtherBank");

  function abrirCerrarBanco(force) {
    const root = bankTrigger?.closest(".bank-selector");
    const expanded = root?.getAttribute("aria-expanded") === "true";
    const willOpen = force === undefined ? !expanded : force;
    bankOptionsContainer.setAttribute(
      "aria-hidden",
      willOpen ? "false" : "true"
    );
    bankTrigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
    if (root) root.setAttribute("aria-expanded", willOpen ? "true" : "false");
    if (willOpen) {
      if (bankSearchInput) bankSearchInput.value = "";
      mostrarTodasOpcionesBanco();
      filtrarOpcionesBanco();
      setTimeout(() => bankSearchInput?.focus(), 0);
    }
  }

  function validarBanco() {
    if (!bancoHidden.value) {
      errorBanco.textContent = "Selecciona tu banco.";
      return false;
    }
    if (bancoHidden.value === "Other") {
      if (!otherBankInput.value.trim()) {
        errorOtherBank.textContent = "Escribe el nombre de tu banco.";
        return false;
      }
      errorOtherBank.textContent = "";
    }
    errorBanco.textContent = "";
    return true;
  }

  function filtrarOpcionesBanco() {
    const term = (bankSearchInput.value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
    const opciones = bankOptionsList.querySelectorAll(".bank-option");
    let visibles = 0;
    opciones.forEach((opt) => {
      const name =
        opt.querySelector(".bank-name")?.textContent ||
        opt.getAttribute("data-value") ||
        "";
      const cmp = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");
      if (!term || cmp.includes(term)) {
        opt.style.display = "flex";
        visibles++;
      } else {
        opt.style.display = "none";
      }
    });
    bankOptionsList.setAttribute("data-results", visibles);
  }

  function mostrarTodasOpcionesBanco() {
    bankOptionsList.querySelectorAll(".bank-option").forEach((opt) => {
      opt.style.display = "flex";
    });
  }

  function marcarOpcionSeleccionada(val) {
    bankOptionsList.querySelectorAll(".bank-option").forEach((opt) => {
      const isSel = opt.getAttribute("data-value") === val;
      if (isSel) {
        opt.setAttribute("aria-selected", "true");
        opt.classList.add("is-selected");
      } else {
        opt.removeAttribute("aria-selected");
        opt.classList.remove("is-selected");
      }
    });
  }

  function seleccionarBanco(valor, labelMostrada) {
    bancoHidden.value = valor;
    selectedBankNameSpan.textContent =
      labelMostrada || valor || "Selecciona tu banco";
    if (valor === "Other") {
      otherBankWrapper.style.display = "block";
      otherBankInput.focus();
    } else {
      otherBankWrapper.style.display = "none";
      otherBankInput.value = "";
      errorOtherBank.textContent = "";
    }
    marcarOpcionSeleccionada(valor);
    validarBanco();
    abrirCerrarBanco(false);
  }

  if (bankTrigger && bankOptionsContainer && bankOptionsList) {
    bankTrigger.addEventListener("click", () => abrirCerrarBanco());
    bankSearchInput?.addEventListener("input", filtrarOpcionesBanco);
    bankOptionsList.addEventListener("click", (e) => {
      const opt = e.target.closest(".bank-option");
      if (!opt) return;
      const val = opt.getAttribute("data-value");
      const label = opt.querySelector(".bank-name")?.textContent || val;
      seleccionarBanco(val, label);
    });
    bankOptionsList.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        const opt = e.target.closest(".bank-option");
        if (opt) {
          e.preventDefault();
          const val = opt.getAttribute("data-value");
          const label = opt.querySelector(".bank-name")?.textContent || val;
          seleccionarBanco(val, label);
        }
      } else if (e.key === "Escape") {
        abrirCerrarBanco(false);
        bankTrigger.focus();
      }
    });
    document.addEventListener("click", (e) => {
      if (
        !bankOptionsContainer.contains(e.target) &&
        !bankTrigger.contains(e.target)
      ) {
        abrirCerrarBanco(false);
      }
    });
  }

  if (otherBankInput) {
    otherBankInput.addEventListener("input", () => {
      if (bancoHidden.value === "Other") validarBanco();
    });
  }

  if (bancoHidden.value) {
    const pre = bancoHidden.value.trim();
    const bancosPredef = [
      "Bancolombia",
      "Davivienda",
      "BBVA",
      "Banco de Bogotá",
      "Banco Popular",
      "Scotiabank",
      "Colpatria",
      "Banco AV Villas",
      "Bancoomeva",
      "Nequi",
      "Daviplata",
    ];
    const match = bankOptionsList?.querySelector(
      `.bank-option[data-value="${CSS.escape(pre)}"]`
    );
    if (match) {
      const label = match.querySelector(".bank-name")?.textContent || pre;
      selectedBankNameSpan.textContent = label;
      marcarOpcionSeleccionada(pre);
    } else if (pre) {
      bancoHidden.value = "Other";
      selectedBankNameSpan.textContent = "Otro (Especificar)";
      otherBankWrapper.style.display = "block";
      otherBankInput.value = pre;
    }
  }

  validarBanco();
  // FIN selector de banco
  const tipoCuenta = form.tipoCuenta;
  tipoCuenta.addEventListener("change", function () {
    if (!tipoCuenta.value) {
      document.getElementById("errorTipoCuenta").textContent =
        "Selecciona tipo de cuenta.";
      tipoCuenta.classList.add("invalid");
    } else {
      document.getElementById("errorTipoCuenta").textContent = "";
      tipoCuenta.classList.remove("invalid");
    }
  });
  const numeroCuenta = form.numeroCuenta;
  numeroCuenta.addEventListener("input", function () {
    if (!numeroCuenta.value || !/^[0-9]{6,20}$/.test(numeroCuenta.value)) {
      document.getElementById("errorNumeroCuenta").textContent =
        "Solo números, 6-20 dígitos.";
      numeroCuenta.classList.add("invalid");
    } else {
      document.getElementById("errorNumeroCuenta").textContent = "";
      numeroCuenta.classList.remove("invalid");
    }
  });

  // Toggle mostrar/ocultar número de cuenta
  const toggleAccountBtn = document.getElementById("toggleAccountNumber");
  if (toggleAccountBtn && numeroCuenta) {
    toggleAccountBtn.addEventListener("click", () => {
      const oculto = numeroCuenta.type === "password";
      numeroCuenta.type = oculto ? "text" : "password";
      toggleAccountBtn.setAttribute("aria-pressed", oculto ? "true" : "false");
      const icon = toggleAccountBtn.querySelector("i");
      if (icon) {
        icon.classList.toggle("fa-eye", !oculto);
        icon.classList.toggle("fa-eye-slash", oculto);
      }
      toggleAccountBtn.setAttribute(
        "aria-label",
        (oculto ? "Ocultar" : "Mostrar") + " número de cuenta"
      );
      // Llevar el cursor al final por UX
      try {
        const len = numeroCuenta.value.length;
        numeroCuenta.setSelectionRange(len, len);
      } catch (e) {}
    });
  }
  const titular = form.titular;
  titular.addEventListener("input", function () {
    if (!titular.value.trim()) {
      document.getElementById("errorTitular").textContent =
        "Titular obligatorio.";
      titular.classList.add("invalid");
    } else {
      document.getElementById("errorTitular").textContent = "";
      titular.classList.remove("invalid");
    }
  });
  const tipoDocumento = form.tipoDocumento;
  tipoDocumento.addEventListener("change", function () {
    if (!tipoDocumento.value) {
      document.getElementById("errorTipoDocumento").textContent =
        "Selecciona tipo de documento.";
      tipoDocumento.classList.add("invalid");
    } else {
      document.getElementById("errorTipoDocumento").textContent = "";
      tipoDocumento.classList.remove("invalid");
    }
  });
  const numeroDocumento = form.numeroDocumento;
  numeroDocumento.addEventListener("input", function () {
    if (!numeroDocumento.value.trim()) {
      document.getElementById("errorNumeroDocumento").textContent =
        "Número de documento obligatorio.";
      numeroDocumento.classList.add("invalid");
    } else {
      document.getElementById("errorNumeroDocumento").textContent = "";
      numeroDocumento.classList.remove("invalid");
    }
  });

  // Toggle mostrar/ocultar número de documento
  const toggleDocumentoBtn = document.getElementById("toggleDocumentoNumber");
  if (toggleDocumentoBtn && numeroDocumento) {
    toggleDocumentoBtn.addEventListener("click", () => {
      const oculto = numeroDocumento.type === "password";
      numeroDocumento.type = oculto ? "text" : "password";
      toggleDocumentoBtn.setAttribute(
        "aria-pressed",
        oculto ? "true" : "false"
      );
      const icon = toggleDocumentoBtn.querySelector("i");
      if (icon) {
        icon.classList.toggle("fa-eye", !oculto);
        icon.classList.toggle("fa-eye-slash", oculto);
      }
      toggleDocumentoBtn.setAttribute(
        "aria-label",
        (oculto ? "Ocultar" : "Mostrar") + " número de documento"
      );
      try {
        const len = numeroDocumento.value.length;
        numeroDocumento.setSelectionRange(len, len);
      } catch (e) {}
    });
  }

  // Submit handler
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    alerta.textContent = "";
    // Dispara validación de todos los inputs (para mostrar errores si hay)
    precio.dispatchEvent(new Event("input"));
    telefono.dispatchEvent(new Event("input"));
    descripcion.dispatchEvent(new Event("input"));
    validarCategorias();
    updateDias();
    validarBanco();
    tipoCuenta.dispatchEvent(new Event("change"));
    numeroCuenta.dispatchEvent(new Event("input"));
    titular.dispatchEvent(new Event("input"));
    tipoDocumento.dispatchEvent(new Event("change"));
    numeroDocumento.dispatchEvent(new Event("input"));

    if (
      (errorPrecio && errorPrecio.textContent) ||
      (errorTelefono && errorTelefono.textContent) ||
      (errorDescripcion && errorDescripcion.textContent) ||
      (errorCategorias && errorCategorias.textContent) ||
      (errorDias && errorDias.textContent) ||
      document.getElementById("errorBanco").textContent ||
      document.getElementById("errorTipoCuenta").textContent ||
      document.getElementById("errorNumeroCuenta").textContent ||
      document.getElementById("errorTitular").textContent ||
      document.getElementById("errorTipoDocumento").textContent ||
      document.getElementById("errorNumeroDocumento").textContent
    ) {
      alerta.textContent = "Corrige los campos marcados antes de continuar.";
      alerta.className = "registro-alerta alert-danger";
      return;
    }

    // Arma payload con infoExperto
    const payload = {
      descripcion:
        typeof sanitizeDescription === "function"
          ? sanitizeDescription(descripcion.value)
          : descripcion.value.trim(),
      precioPorHora: Number(precio.value),
      categorias: getCategoriasSeleccionadas(),
      banco:
        bancoHidden.value === "Other"
          ? otherBankInput.value.trim() || "Otro"
          : bancoHidden.value,
      tipoCuenta: tipoCuenta.value,
      numeroCuenta: numeroCuenta.value,
      titular: titular.value.trim(),
      tipoDocumento: tipoDocumento.value,
      numeroDocumento: numeroDocumento.value.trim(),
      telefonoContacto: telefono.value.trim(),
      diasDisponibles: diasDisponiblesInput.value
        ? diasDisponiblesInput.value.split(",")
        : [],
    };

    try {
      const resp = await fetch("/api/usuarios/perfil", {
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
        alerta.textContent = "Perfil actualizado correctamente.";
        setTimeout(() => {
          window.location.href = "/perfil";
        }, 1500);
      } else {
        alerta.className = "registro-alerta alert-danger";
        alerta.textContent = data.mensaje || "Error al actualizar perfil.";
      }
    } catch (err) {
      alerta.className = "registro-alerta alert-danger";
      alerta.textContent = "Error de red. Intenta de nuevo.";
    }
  });
});
