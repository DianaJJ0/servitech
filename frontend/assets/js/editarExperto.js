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

    // Permitir + únicamente al inicio y una sola vez
    if (e.key === "+") {
      if (telefono.selectionStart === 0 && !telefono.value.includes("+")) {
        return;
      }
      e.preventDefault();
      return;
    }

    // Solo dígitos permitidos aparte de las teclas de control
    if (!(e.key >= "0" && e.key <= "9")) {
      e.preventDefault();
      return;
    }

    // Previsualizar valor resultante y bloquear si excede longitud permitida
    try {
      const selStart = telefono.selectionStart;
      const selEnd = telefono.selectionEnd;
      const current = telefono.value || "";
      const next = current.slice(0, selStart) + e.key + current.slice(selEnd);
      // Normalizar solo dígitos para analizar longitudes y prefijos
      const digitsNext = next.replace(/\D/g, "");
      // Si comienza con + permitimos hasta 13 (ej: +57 + 10 dígitos).
      if (next.startsWith("+")) {
        if (next.length > 13) {
          e.preventDefault();
          return;
        }
      } else if (digitsNext.startsWith("57")) {
        // Si el usuario escribe '57' sin +, tratamos como indicativo y permitimos 2+10 = 12 dígitos
        if (digitsNext.length > 12) {
          e.preventDefault();
          return;
        }
      } else {
        // local: máximo 10 dígitos
        if (digitsNext.length > 10) {
          e.preventDefault();
          return;
        }
      }
    } catch (err) {
      // si no podemos determinar selección, permitir la tecla (no bloquear por fallo)
    }
  });

  telefono.addEventListener("paste", function (e) {
    e.preventDefault();
    let raw = (e.clipboardData || window.clipboardData).getData("text") || "";
    let norm = normalizePhone(raw);
    // Si trae + (internacional) permitimos hasta 13 incluyendo '+'; si no, máxima cantidad de dígitos locales: 10
    if (norm.startsWith("+")) {
      norm = norm.slice(0, 13);
    } else {
      // eliminar no dígitos
      norm = norm.replace(/\D/g, "");
      // si comienza con 57 (sin +) permitimos hasta 12 (57 + 10 dígitos)
      if (norm.startsWith("57")) {
        norm = norm.slice(0, 12);
      } else {
        norm = norm.slice(0, 10);
      }
    }
    const paste = norm;
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
    // Si empieza con +57 permitir +57 + 10 dígitos (13 caracteres). Si empieza con + pero no +57, quitar + y mantener solo dígitos
    if (cleaned.startsWith("+57")) {
      // mantener +57 y limitar a 13
      if (cleaned.length > 13) cleaned = cleaned.slice(0, 13);
    } else if (cleaned.startsWith("+")) {
      // quitar + de códigos no permitidos
      cleaned = cleaned.replace(/\D/g, "");
    } else {
      // local: sólo dígitos
      cleaned = cleaned.replace(/\D/g, "");
      // si comienza con 57 sin + permitimos hasta 12 (57 + 10 dígitos)
      if (cleaned.startsWith("57")) {
        cleaned = cleaned.slice(0, 12);
      } else {
        cleaned = cleaned.slice(0, 10);
      }
    }
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
      // Validar +57 con 10 dígitos, 57 (sin +) con 10 dígitos, o exactamente 10 dígitos locales
      const validIntl = /^\+57[0-9]{10}$/.test(norm);
      const validPrefixed = /^57[0-9]{10}$/.test(norm);
      const validLocal = /^[0-9]{10}$/.test(norm);
      if (!validIntl && !validPrefixed && !validLocal) {
        errorTelefono.textContent =
          "Formato inválido. Ej: 3001234567 o +573001234567. Todos los números deben tener 10 dígitos.";
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
      // Previsualizar valor resultante y bloquear si supera 120000
      const selStart = precio.selectionStart;
      const selEnd = precio.selectionEnd;
      const current = precio.value;
      const next = current.slice(0, selStart) + e.key + current.slice(selEnd);
      const numeric = parseInt(next, 10);
      if (!isNaN(numeric) && numeric > 120000) {
        e.preventDefault();
        // Feedback rápido (sin alterar valor) - solo si aún no hay mensaje específico
        if (
          !errorPrecio.textContent ||
          /máximo/i.test(errorPrecio.textContent) === false
        ) {
          errorPrecio.textContent = "El máximo es $120.000 COP.";
          errorPrecio.classList.add("input-error");
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
        if (!isNaN(num) && num > 120000) num = 120000;
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
        errorPrecio.classList.add("input-error");
        precio.classList.add("invalid");
        return;
      }
      const num = parseInt(val, 10);
      if (isNaN(num)) {
        errorPrecio.textContent = "Valor inválido.";
        errorPrecio.classList.add("input-error");
        precio.classList.add("invalid");
        return;
      }
      if (num < 10000) {
        errorPrecio.textContent = "El mínimo es $10.000 COP.";
        errorPrecio.classList.add("input-error");
        precio.classList.add("invalid");
        return;
      }
      if (num > 120000) {
        errorPrecio.textContent = "El máximo es $120.000 COP.";
        errorPrecio.classList.add("input-error");
        precio.classList.add("invalid");
        return;
      }
      if (num % 100 !== 0) {
        errorPrecio.textContent = "Debe ser múltiplo de 100.";
        errorPrecio.classList.add("input-error");
        precio.classList.add("invalid");
        return;
      }
      errorPrecio.textContent = "";
      errorPrecio.classList.remove("input-error");
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
  // Validación y saneamiento para número de cuenta: dinámico según banco (colombiano 6-14 dígitos, internacional 15-34 alfanum.)
  const bankHiddenEl = bancoHidden; // variable ya existente arriba in this file
  numeroCuenta.addEventListener("keydown", function (e) {
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
    const bancoVal = bankHiddenEl?.value || "";
    const colombianBanks = [
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
    const isCol = colombianBanks.includes(bancoVal) || !bancoVal;
    if (isCol) {
      if (!(e.key >= "0" && e.key <= "9")) e.preventDefault();
    } else {
      if (!/^[0-9A-Za-z]$/.test(e.key)) e.preventDefault();
    }
  });

  numeroCuenta.addEventListener("paste", function (e) {
    e.preventDefault();
    const bancoVal = bankHiddenEl?.value || "";
    const colombianBanks = [
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
    const isCol = colombianBanks.includes(bancoVal) || !bancoVal;
    let paste = (e.clipboardData || window.clipboardData).getData("text") || "";
    if (isCol) paste = paste.replace(/\D/g, "").slice(0, 14);
    else paste = paste.replace(/[^0-9A-Za-z]/g, "").slice(0, 34);
    const start = numeroCuenta.selectionStart;
    const end = numeroCuenta.selectionEnd;
    const cur = numeroCuenta.value || "";
    numeroCuenta.value = cur.slice(0, start) + paste + cur.slice(end);
    numeroCuenta.setSelectionRange(start + paste.length, start + paste.length);
    numeroCuenta.dispatchEvent(new Event("input"));
  });

  numeroCuenta.addEventListener("input", function () {
    const bancoVal = bankHiddenEl?.value || "";
    // Preferir validadores compartidos si existen
    try {
      if (
        window &&
        window.SharedValidators &&
        typeof window.SharedValidators.validateNumeroCuentaByBank === "function"
      ) {
        const bancoActual = bankHiddenEl?.value || "";
        const res = window.SharedValidators.validateNumeroCuentaByBank(
          bancoActual,
          numeroCuenta.value || ""
        );
        if (!res.valid) {
          document.getElementById("errorNumeroCuenta").textContent =
            res.message || "Número de cuenta inválido.";
          numeroCuenta.classList.add("invalid");
        } else {
          document.getElementById("errorNumeroCuenta").textContent = "";
          numeroCuenta.classList.remove("invalid");
        }
      } else {
        // Fallback al comportamiento local previo
        const colombianBanks = [
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
        const isCol = colombianBanks.includes(bancoVal) || !bancoVal;
        if (isCol) {
          const cleaned = (numeroCuenta.value || "")
            .replace(/\D/g, "")
            .slice(0, 14);
          if (numeroCuenta.value !== cleaned) numeroCuenta.value = cleaned;
          if (!cleaned || cleaned.length < 6 || cleaned.length > 14) {
            document.getElementById("errorNumeroCuenta").textContent =
              "Solo números, 6-14 dígitos.";
            numeroCuenta.classList.add("invalid");
          } else {
            document.getElementById("errorNumeroCuenta").textContent = "";
            numeroCuenta.classList.remove("invalid");
          }
        } else {
          const cleaned = (numeroCuenta.value || "")
            .replace(/[^0-9A-Za-z]/g, "")
            .slice(0, 34);
          if (numeroCuenta.value !== cleaned) numeroCuenta.value = cleaned;
          if (!cleaned || cleaned.length < 15 || cleaned.length > 34) {
            document.getElementById("errorNumeroCuenta").textContent =
              "Cuenta internacional: 15-34 caracteres alfanuméricos.";
            numeroCuenta.classList.add("invalid");
          } else {
            document.getElementById("errorNumeroCuenta").textContent = "";
            numeroCuenta.classList.remove("invalid");
          }
        }
      }
    } catch (e) {
      // en caso de error usar fallback local
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
  // Reglas para Nombre completo (titular)
  // - Permitir letras (unicode), espacios, guion y apóstrofe
  // - Colapsar espacios, longitud máxima 100
  // - Requerir al menos 2 palabras (nombre y apellido), cada una >= 2 letras (descontando '-' / ''')
  const sanitizeName = (s) => {
    if (!s) return "";
    // permitir letras, marcas, espacios y apóstrofe (no puntos ni guiones)
    const allowed = s.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s'\-]+/g, "");
    return allowed.replace(/\s+/g, " ").trim().slice(0, 100);
  };

  const isValidName = (s) => {
    if (!s) return { ok: false, msg: "Nombre obligatorio." };
    if (s.length > 100) return { ok: false, msg: "Máximo 100 caracteres." };
    // verificar caracteres permitidos (letras, espacios y - ' .)
    if (!/^[\p{L}\p{M}\s'\-]+$/u.test(s))
      return {
        ok: false,
        msg: "Usa solo letras, espacios o apóstrofes.",
      };
    const parts = s.split(" ").filter(Boolean);
    if (parts.length < 2)
      return { ok: false, msg: "Incluye nombre y apellido." };
    for (const p of parts) {
      // quitar apóstrofes para contar letras reales (los guiones no están permitidos)
      const letters = p.replace(/'/g, "");
      if (letters.length < 2)
        return {
          ok: false,
          msg: "Cada nombre/apellido debe tener al menos 2 letras.",
        };
    }
    return { ok: true };
  };

  titular.addEventListener("keydown", function (e) {
    const allowedCtrl = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "Tab",
      "Home",
      "End",
    ];
    if (allowedCtrl.includes(e.key)) return;
    // Permitir espacio y apóstrofe (no punto ni guion)
    if (e.key === " " || e.key === "'") return;
    // Para teclas imprimibles, permitir letras Unicode
    if (e.key.length === 1) {
      if (!/\p{L}/u.test(e.key)) {
        e.preventDefault();
      }
    }
  });
  // Nombre y Apellido: campos que el backend requiere
  const nombreInput = form.nombre;
  const apellidoInput = form.apellido;
  const errorNombre = document.getElementById("errorNombre");
  const errorApellido = document.getElementById("errorApellido");
  const nameReg = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s'\-]{1,80}$/;
  if (nombreInput) {
    nombreInput.addEventListener("input", function () {
      const v = (nombreInput.value || "").trim();
      if (!v) {
        if (errorNombre) errorNombre.textContent = "Nombre obligatorio.";
        nombreInput.classList.add("invalid");
        return;
      }
      if (!nameReg.test(v)) {
        if (errorNombre)
          errorNombre.textContent =
            "Nombre solo puede tener letras y hasta 80 caracteres.";
        nombreInput.classList.add("invalid");
        return;
      }
      if (errorNombre) errorNombre.textContent = "";
      nombreInput.classList.remove("invalid");
    });
  }
  if (apellidoInput) {
    apellidoInput.addEventListener("input", function () {
      const v = (apellidoInput.value || "").trim();
      if (!v) {
        if (errorApellido) errorApellido.textContent = "Apellido obligatorio.";
        apellidoInput.classList.add("invalid");
        return;
      }
      if (!nameReg.test(v)) {
        if (errorApellido)
          errorApellido.textContent =
            "Apellido solo puede tener letras y hasta 80 caracteres.";
        apellidoInput.classList.add("invalid");
        return;
      }
      if (errorApellido) errorApellido.textContent = "";
      apellidoInput.classList.remove("invalid");
    });
  }

  titular.addEventListener("paste", function (e) {
    e.preventDefault();
    let paste = (e.clipboardData || window.clipboardData).getData("text") || "";
    paste = sanitizeName(paste);
    const start = titular.selectionStart;
    const end = titular.selectionEnd;
    const cur = titular.value || "";
    titular.value = cur.slice(0, start) + paste + cur.slice(end);
    titular.setSelectionRange(start + paste.length, start + paste.length);
    titular.dispatchEvent(new Event("input"));
  });

  titular.addEventListener("input", function () {
    const raw = titular.value || "";
    const clean = sanitizeName(raw);
    if (titular.value !== clean) titular.value = clean;
    try {
      if (
        window &&
        window.SharedValidators &&
        typeof window.SharedValidators.validateTitularName === "function"
      ) {
        const r = window.SharedValidators.validateTitularName(clean);
        if (!r.valid) {
          document.getElementById("errorTitular").textContent = r.message;
          titular.classList.add("invalid");
        } else {
          document.getElementById("errorTitular").textContent = "";
          titular.classList.remove("invalid");
        }
      } else {
        const res = isValidName(clean);
        if (!res.ok) {
          document.getElementById("errorTitular").textContent = res.msg;
          titular.classList.add("invalid");
        } else {
          document.getElementById("errorTitular").textContent = "";
          titular.classList.remove("invalid");
        }
      }
    } catch (e) {
      const res = isValidName(clean);
      if (!res.ok) {
        document.getElementById("errorTitular").textContent = res.msg;
        titular.classList.add("invalid");
      } else {
        document.getElementById("errorTitular").textContent = "";
        titular.classList.remove("invalid");
      }
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
  // Reglas dependientes del tipo de documento
  const docRules = {
    CC: {
      sanitize: (s) => (s || "").replace(/\D/g, "").slice(0, 12),
      valid: (s) => /^[0-9]{6,12}$/.test(s),
      message: "Cédula: solo números, 6-12 dígitos.",
    },
    CE: {
      sanitize: (s) => (s || "").replace(/\D/g, "").slice(0, 12),
      valid: (s) => /^[0-9]{6,12}$/.test(s),
      message: "Cédula de extranjería: solo números, 6-12 dígitos.",
    },
    NIT: {
      sanitize: (s) => (s || "").replace(/\D/g, "").slice(0, 15),
      valid: (s) => /^[0-9]{6,15}$/.test(s),
      message: "NIT: solo números, 6-15 dígitos.",
    },
    PAS: {
      sanitize: (s) => (s || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 15),
      valid: (s) => /^[A-Za-z0-9]{5,15}$/.test(s),
      message: "Pasaporte: letras y números, 5-15 caracteres.",
    },
    default: {
      sanitize: (s) => (s || "").replace(/\s+/g, " ").trim().slice(0, 20),
      valid: (s) => !!s && s.length >= 4,
      message: "Número de documento inválido.",
    },
  };

  const getRuleForTipo = () =>
    docRules[tipoDocumento.value] || docRules.default;

  // keydown: bloquear caracteres inválidos según tipo
  numeroDocumento.addEventListener("keydown", function (e) {
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
    const rule = getRuleForTipo();
    // Si la regla de saneamiento elimina todo menos dígitos, permitimos solo dígitos
    if (rule === docRules.PAS) {
      // PAS permite letras y números
      if (!/^[a-zA-Z0-9]$/.test(e.key)) e.preventDefault();
    } else if (rule === docRules.default) {
      // permitir letras y números básicos
      if (!/^[a-zA-Z0-9]$/.test(e.key)) e.preventDefault();
    } else {
      // tipos numéricos: solo dígitos
      if (!(e.key >= "0" && e.key <= "9")) e.preventDefault();
    }
  });

  numeroDocumento.addEventListener("paste", function (e) {
    e.preventDefault();
    const rule = getRuleForTipo();
    let paste = (e.clipboardData || window.clipboardData).getData("text") || "";
    paste = rule.sanitize(paste);
    // Insertar en la posición actual
    const start = numeroDocumento.selectionStart;
    const end = numeroDocumento.selectionEnd;
    const current = numeroDocumento.value || "";
    numeroDocumento.value =
      current.slice(0, start) + paste + current.slice(end);
    numeroDocumento.setSelectionRange(
      start + paste.length,
      start + paste.length
    );
    numeroDocumento.dispatchEvent(new Event("input"));
  });

  numeroDocumento.addEventListener("input", function () {
    const rule = getRuleForTipo();
    // Saneamiento en tiempo real
    const cleaned = rule.sanitize(numeroDocumento.value || "");
    if (numeroDocumento.value !== cleaned) numeroDocumento.value = cleaned;

    if (!cleaned) {
      document.getElementById("errorNumeroDocumento").textContent =
        "Número de documento obligatorio.";
      numeroDocumento.classList.add("invalid");
      return;
    }
    if (!rule.valid(cleaned)) {
      document.getElementById("errorNumeroDocumento").textContent =
        rule.message;
      numeroDocumento.classList.add("invalid");
      return;
    }
    document.getElementById("errorNumeroDocumento").textContent = "";
    numeroDocumento.classList.remove("invalid");
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

    // Si hay errores, mostrar cuál es el primer campo inválido para facilitar depuración
    // Asegurar que nombre/apellido validen antes de chequear errores
    try {
      if (nombreInput) nombreInput.dispatchEvent(new Event("input"));
    } catch (e) {}
    try {
      if (apellidoInput) apellidoInput.dispatchEvent(new Event("input"));
    } catch (e) {}

    const errorChecks = [
      { errEl: errorPrecio, field: precio },
      { errEl: errorTelefono, field: telefono },
      { errEl: errorDescripcion, field: descripcion },
      { errEl: document.getElementById("errorNombre"), field: nombreInput },
      { errEl: document.getElementById("errorApellido"), field: apellidoInput },
      { errEl: errorCategorias, field: categoriasSelect },
      { errEl: errorDias, field: diasDisponiblesInput },
      {
        errEl: document.getElementById("errorBanco"),
        field: bankTrigger || bancoHidden,
      },
      { errEl: document.getElementById("errorTipoCuenta"), field: tipoCuenta },
      {
        errEl: document.getElementById("errorNumeroCuenta"),
        field: numeroCuenta,
      },
      { errEl: document.getElementById("errorTitular"), field: titular },
      {
        errEl: document.getElementById("errorTipoDocumento"),
        field: form.tipoDocumento,
      },
      {
        errEl: document.getElementById("errorNumeroDocumento"),
        field: form.numeroDocumento,
      },
      {
        errEl: document.getElementById("errorOtherBank"),
        field: otherBankInput,
      },
    ];

    const firstInvalid = errorChecks.find(
      (c) => c.errEl && String(c.errEl.textContent).trim()
    );
    if (firstInvalid) {
      const msg =
        firstInvalid.errEl.textContent.trim() ||
        "Corrige los campos marcados antes de continuar.";
      alerta.textContent = msg;
      alerta.className = "registro-alerta alert-danger";
      // intentar enfocar el campo relacionado para ayudar al usuario
      try {
        if (
          firstInvalid.field &&
          typeof firstInvalid.field.focus === "function"
        ) {
          firstInvalid.field.focus();
        }
      } catch (e) {
        // no es crítico
      }
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
      // Backend exige nombre y apellido en la actualización de perfil
      // Saneamos permitiendo solo letras, espacios, apóstrofo y guion, y truncando a 80
      // Incluir nombre/apellido solo si el usuario los escribió (evitar enviar campos vacíos)
      ...(function () {
        const out = {};
        const vNom = (form.nombre && form.nombre.value) || "";
        const cleanNom = String(vNom)
          .trim()
          .replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s'\-]+/g, "")
          .replace(/\s+/g, " ")
          .slice(0, 80);
        const vApe = (form.apellido && form.apellido.value) || "";
        const cleanApe = String(vApe)
          .trim()
          .replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s'\-]+/g, "")
          .replace(/\s+/g, " ")
          .slice(0, 80);
        if (cleanNom) {
          out.nombre = cleanNom;
          try {
            if (form.nombre) form.nombre.value = cleanNom;
          } catch (e) {}
        }
        if (cleanApe) {
          out.apellido = cleanApe;
          try {
            if (form.apellido) form.apellido.value = cleanApe;
          } catch (e) {}
        }
        return out;
      })(),
      tipoDocumento: tipoDocumento.value,
      numeroDocumento: numeroDocumento.value.trim(),
      telefonoContacto: telefono.value.trim(),
      diasDisponibles: diasDisponiblesInput.value
        ? diasDisponiblesInput.value.split(",")
        : [],
    };

    try {
      // DEBUG: publicar payload en consola para depuración de nombre/apellido
      try {
        console.log("PUT /api/usuarios/perfil payload:", payload);
      } catch (e) {}
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
        // Mostrar mensaje principal y adjuntar el body completo para depuración
        alerta.textContent = data.mensaje || "Error al actualizar perfil.";
        try {
          const extra = JSON.stringify(data);
          const pre = document.createElement("pre");
          pre.style.whiteSpace = "pre-wrap";
          pre.style.maxHeight = "200px";
          pre.style.overflow = "auto";
          pre.textContent = extra;
          alerta.appendChild(pre);
        } catch (e) {
          console.log("Server response:", data);
        }
      }
    } catch (err) {
      alerta.className = "registro-alerta alert-danger";
      alerta.textContent = "Error de red. Intenta de nuevo.";
    }
  });
});
