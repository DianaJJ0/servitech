// Scripts consolidado para registroExperto.ejs - Versión Mejorada
(function () {
  "use strict";

  // Estado global para evitar duplicaciones
  const state = {
    choicesInitialized: false,
    formSubmitting: false,
  };

  function onReady(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  onReady(function () {
    // Helper: Inicializa Choices solo si no ha sido inicializado antes
    function guardedInitChoices(selectEl, opts) {
      if (!selectEl || state.choicesInitialized) return null;

      try {
        if (selectEl.dataset?.choicesInited === "1") return null;

        const instance = new Choices(selectEl, opts || {});
        selectEl.dataset.choicesInited = "1";
        selectEl._choicesInstance = instance;
        state.choicesInitialized = true;

        return instance;
      } catch (e) {
        console.warn("Error inicializando Choices:", e);
        // Fallback: mostrar select nativo
        selectEl.style.display = "block";
        return null;
      }
    }

    // --- Fecha actual ---
    (function showDate() {
      const currentDateElement = document.getElementById("currentDate");
      if (!currentDateElement) return;

      const now = new Date();
      const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };

      try {
        currentDateElement.textContent = now.toLocaleDateString(
          "es-ES",
          options
        );
      } catch (e) {
        currentDateElement.textContent = now.toDateString();
      }
    })();

    // --- Días disponibles ---
    (function daysHandler() {
      const dayOptions = document.querySelectorAll(".day-option");
      const diasDisponiblesInput = document.getElementById("diasDisponibles");
      const daysSelectedDisplay = document.querySelector(
        ".days-selected-display"
      );

      if (!dayOptions.length || !diasDisponiblesInput || !daysSelectedDisplay)
        return;

      function updateSelectedDays() {
        const selectedDays = Array.from(
          document.querySelectorAll(".day-option.selected")
        ).map((d) => d.getAttribute("data-day"));

        diasDisponiblesInput.value = selectedDays.join(",");

        if (selectedDays.length > 0) {
          daysSelectedDisplay.textContent = `Días seleccionados: ${selectedDays.join(
            ", "
          )}`;
          daysSelectedDisplay.style.color = "var(--text-color)";
          clearError(daysSelectedDisplay);
        } else {
          daysSelectedDisplay.textContent = "Selecciona tus días disponibles";
          daysSelectedDisplay.style.color = "var(--text-secondary)";
        }
      }

      dayOptions.forEach((option) => {
        option.addEventListener("click", function () {
          this.classList.toggle("selected");
          updateSelectedDays();
        });
      });

      updateSelectedDays(); // Estado inicial
    })();

    // --- Vista previa de imagen ---
    (function imagePreview() {
      const fotoPerfilInput = document.getElementById("fotoPerfil");
      const fileInputText = document.getElementById("file-input-text");
      const epPreview = document.getElementById("epPreview");
      const epImg = document.getElementById("epImg");
      const fotoNombre = document.getElementById("fotoNombre");
      const fotoTamano = document.getElementById("fotoTamano");
      const epRemove = document.getElementById("epRemove");
      const fotoError = document.getElementById("fotoError");

      if (!fotoPerfilInput) return;

      function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + " bytes";
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
        else return (bytes / 1048576).toFixed(1) + " MB";
      }

      function showImageError(message) {
        if (!fotoError) return;
        fotoError.textContent = message;
        fotoError.style.display = "block";
        fotoPerfilInput.value = "";
        if (fileInputText) fileInputText.textContent = "Seleccionar archivo";
      }

      function resetPreview() {
        if (epPreview) epPreview.style.display = "none";
        if (epRemove) epRemove.style.display = "none";
        if (fotoError) fotoError.style.display = "none";
        if (fileInputText) fileInputText.textContent = "Seleccionar archivo";
      }

      fotoPerfilInput.addEventListener("change", function (e) {
        const file = e.target.files && e.target.files[0];
        if (!file) {
          resetPreview();
          return;
        }

        // Validaciones
        if (!file.type.match("image.*")) {
          showImageError(
            "Solo se permiten archivos de imagen (JPG, PNG, etc.)"
          );
          return;
        }

        if (file.size > 2 * 1024 * 1024) {
          showImageError("La imagen no debe superar los 2MB");
          return;
        }

        // Limpiar errores previos
        if (fotoError) fotoError.style.display = "none";
        clearError(fotoPerfilInput);

        // Actualizar UI
        if (fileInputText) fileInputText.textContent = file.name;
        if (fotoNombre) fotoNombre.textContent = file.name;
        if (fotoTamano) fotoTamano.textContent = formatFileSize(file.size);

        const reader = new FileReader();
        reader.onload = function (ev) {
          if (epImg) epImg.src = ev.target.result;
          if (epPreview) epPreview.style.display = "flex";
          if (epRemove) epRemove.style.display = "inline-block";
        };
        reader.readAsDataURL(file);
      });

      if (epRemove) {
        epRemove.addEventListener("click", function () {
          fotoPerfilInput.value = "";
          resetPreview();
        });
      }
    })();

    // --- Validación número de cuenta ---
    (function accountValidation() {
      const numero = document.getElementById("numeroCuenta");
      const confirm = document.getElementById("numeroCuentaConfirm");
      const error = document.getElementById("numero-cuenta-error");
      const toggle = document.getElementById("toggleAccountNumber");

      if (!numero || !confirm) return;

      function normalize(val) {
        return (val || "").replace(/\s|\./g, "");
      }

      function validateMatch() {
        const a = normalize(numero.value);
        const b = normalize(confirm.value);

        if (b === "" || a === b) {
          confirm.setCustomValidity("");
          if (error) error.style.display = "none";
          clearError(confirm);
        } else {
          confirm.setCustomValidity("Los números de cuenta no coinciden");
          if (error) error.style.display = "block";
          showError(confirm, "Los números de cuenta no coinciden");
        }
      }

      numero.addEventListener("input", validateMatch);
      confirm.addEventListener("input", validateMatch);

      if (toggle) {
        toggle.addEventListener("click", function () {
          const type = numero.type === "password" ? "text" : "password";
          numero.type = type;
          confirm.type = type;

          const icon = this.querySelector("i");
          if (icon) {
            icon.className =
              type === "password" ? "fas fa-eye" : "fas fa-eye-slash";
          }
        });
      }
    })();

    // --- Validación número de documento ---
    (function documentValidation() {
      const numero = document.getElementById("numero-documento");
      const confirm = document.getElementById("numero-documento-confirm");
      const error = document.getElementById("numero-documento-error");

      if (!numero || !confirm) return;

      function normalize(val) {
        return (val || "").replace(/\s|\./g, "");
      }

      function validateMatch() {
        const a = normalize(numero.value);
        const b = normalize(confirm.value);

        if (b === "" || a === b) {
          confirm.setCustomValidity("");
          if (error) error.style.display = "none";
          clearError(confirm);
        } else {
          confirm.setCustomValidity("Los números no coinciden");
          if (error) error.style.display = "block";
          showError(confirm, "Los números de documento no coinciden");
        }
      }

      numero.addEventListener("input", validateMatch);
      confirm.addEventListener("input", validateMatch);
    })();

    // --- Sistema de manejo de errores ---
    function ensureErrorEl(input) {
      if (!input) return null;

      let container = input.parentNode;
      if (!container) return null;

      let err = container.querySelector(".input-error");
      if (!err) {
        err = document.createElement("div");
        err.className = "input-error";
        err.style.cssText = `
          color: var(--danger, #d9534f);
          font-size: 0.85rem;
          margin-top: 0.25rem;
          display: none;
        `;
        container.appendChild(err);
      }
      return err;
    }

    function showError(input, msg) {
      if (!input) return;

      const err = ensureErrorEl(input);
      if (err) {
        err.textContent = msg;
        err.style.display = "block";
      }

      // Marcar input como inválido
      input.classList.add("invalid-input");
      input.setAttribute("aria-invalid", "true");
    }

    function clearError(input) {
      if (!input) return;

      const err = ensureErrorEl(input);
      if (err) {
        err.style.display = "none";
      }

      // Remover marca de inválido
      input.classList.remove("invalid-input");
      input.removeAttribute("aria-invalid");
    }

    // --- Reglas de validación de campos ---
    (function inputRules() {
      // Solo letras para titular (permitir espacios y acentos)
      const titular = document.getElementById("titular");
      if (titular) {
        titular.addEventListener("input", function () {
          const cleaned = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s'\-]/g, "");
          if (this.value !== cleaned) this.value = cleaned;

          if (/^\s+/.test(this.value)) {
            this.value = this.value.replace(/^\s+/, "");
          }

          if (this.value.trim() === "") {
            showError(this, "El nombre es obligatorio");
          } else {
            clearError(this);
          }
        });

        titular.addEventListener("blur", function () {
          this.value = this.value.trim();
          if (this.value === "") {
            showError(this, "El nombre es obligatorio");
          }
        });
      }

      // Solo números para campos numéricos
      const numericIds = [
        "numero-documento",
        "numero-documento-confirm",
        "numeroCuenta",
        "numeroCuentaConfirm",
        "telefonoContacto",
      ];

      numericIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener("input", function () {
          const cleaned = this.value.replace(/\D/g, "");
          if (this.value !== cleaned) this.value = cleaned;

          if (/^\s+/.test(this.value)) {
            this.value = this.value.replace(/^\s+/, "");
          }

          if (this.value.trim() === "") {
            showError(this, "Este campo es obligatorio");
          } else {
            clearError(this);
          }
        });

        el.addEventListener("blur", function () {
          this.value = this.value.trim();
          if (this.value === "") {
            showError(this, "Este campo es obligatorio");
          }
        });

        // Prevenir entrada de letras
        el.addEventListener("keydown", function (e) {
          const allowed = [
            "Backspace",
            "Delete",
            "Tab",
            "ArrowLeft",
            "ArrowRight",
            "Home",
            "End",
          ];
          if (allowed.includes(e.key)) return;
          if (/^[0-9]$/.test(e.key)) return;
          e.preventDefault();
        });
      });

      // Validación de campos de texto
      const textIds = ["descripcion", "precio"];
      textIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener("blur", function () {
          this.value = this.value.trim();
          if (this.value === "") {
            showError(this, "Este campo no puede quedar vacío");
          } else {
            clearError(this);
          }
        });
      });

      // Validación de selects
      const tipoCuentaEl = document.getElementById("tipo-cuenta");
      if (tipoCuentaEl) {
        tipoCuentaEl.addEventListener("change", function () {
          if (!this.value) {
            showError(this, "Tipo de cuenta obligatorio");
          } else {
            clearError(this);
          }
        });
      }

      const tipoDocumentoEl = document.getElementById("tipo-documento");
      if (tipoDocumentoEl) {
        tipoDocumentoEl.addEventListener("change", function () {
          if (!this.value) {
            showError(this, "Tipo de documento obligatorio");
          } else {
            clearError(this);
          }
        });
      }

      // Validación de banco
      const bancoHidden = document.getElementById("banco");
      if (bancoHidden) {
        bancoHidden.addEventListener("change", function () {
          if (!this.value) {
            showError(this, "Selecciona un banco");
          } else {
            clearError(this);
            // También limpiar error del trigger si existe
            const trigger = document.getElementById("bank-trigger");
            if (trigger) clearError(trigger);
          }
        });
      }

      // Validación de foto de perfil
      const fotoPerfil = document.getElementById("fotoPerfil");
      if (fotoPerfil) {
        fotoPerfil.addEventListener("change", function () {
          const file = this.files && this.files[0];
          if (!file) {
            showError(this, "Selecciona una foto de perfil");
          } else {
            clearError(this);
            // La validación de tipo/tamaño se hace en imagePreview()
          }
        });
      }

      // Validación de días disponibles
      function validateDays() {
        const diasDisponiblesInput = document.getElementById("diasDisponibles");
        const daysDisplay = document.querySelector(".days-selected-display");

        if (!diasDisponiblesInput || !daysDisplay) return true;

        const value = diasDisponiblesInput.value.trim();
        if (!value) {
          showError(daysDisplay, "Selecciona al menos un día");
          return false;
        } else {
          clearError(daysDisplay);
          return true;
        }
      }

      // Escuchar cambios en días
      document.querySelectorAll(".day-option").forEach((day) => {
        day.addEventListener("click", function () {
          setTimeout(validateDays, 0);
        });
      });

      // Validación de categorías
      const categoriasSelect = document.getElementById("categorias");
      if (categoriasSelect) {
        // Función mejorada para contar categorías seleccionadas
        function countSelectedCategories() {
          try {
            // Primero intentar con selectedOptions nativo
            const nativeSelected = Array.from(
              categoriasSelect.selectedOptions || []
            );
            if (nativeSelected.length > 0) return nativeSelected.length;

            // Si usa Choices.js, verificar en el DOM
            const choicesWrapper = categoriasSelect.nextElementSibling;
            if (
              choicesWrapper &&
              choicesWrapper.classList.contains("choices")
            ) {
              const selectedItems = choicesWrapper.querySelectorAll(
                ".choices__list--multiple .choices__item:not(.choices__placeholder)"
              );
              return selectedItems.length;
            }

            return 0;
          } catch (e) {
            return 0;
          }
        }

        function validateCategorias() {
          const selectedCount = countSelectedCategories();
          if (selectedCount === 0) {
            showError(categoriasSelect, "Selecciona al menos una categoría");
            return false;
          } else {
            clearError(categoriasSelect);
            return true;
          }
        }

        // Usar MutationObserver para detectar cambios en Choices.js
        const observer = new MutationObserver(function (mutations) {
          mutations.forEach(function (mutation) {
            if (
              mutation.type === "childList" ||
              mutation.type === "attributes"
            ) {
              validateCategorias();
            }
          });
        });

        // Observar el wrapper de Choices si existe
        const choicesWrapper = categoriasSelect.nextElementSibling;
        if (choicesWrapper && choicesWrapper.classList.contains("choices")) {
          observer.observe(choicesWrapper, {
            childList: true,
            subtree: true,
            attributes: true,
          });
        }

        // También escuchar eventos change nativos
        categoriasSelect.addEventListener("change", validateCategorias);
      }
    })();

    // --- Selector de bancos ---
    (function bankSelector() {
      const trigger = document.getElementById("bank-trigger");
      const optionsContainer = document.getElementById(
        "bank-options-container"
      );
      const optionsList = document.getElementById("bank-options-list");
      const searchInput = document.getElementById("bank-search");
      const options = Array.from(document.querySelectorAll(".bank-option"));
      const selectedName = document.getElementById("selected-bank-name");
      const hiddenInput = document.getElementById("banco");

      if (!trigger || !optionsContainer || !optionsList) return;

      let open = false;
      let focusedIndex = -1;

      function openList() {
        optionsContainer.style.display = "block";
        trigger.setAttribute("aria-expanded", "true");
        optionsContainer.setAttribute("aria-hidden", "false");
        open = true;
      }

      function closeList() {
        optionsContainer.style.display = "none";
        trigger.setAttribute("aria-expanded", "false");
        optionsContainer.setAttribute("aria-hidden", "true");
        open = false;
        focusedIndex = -1;
        updateFocus();
      }

      function updateFocus() {
        options.forEach((opt, idx) => {
          if (idx === focusedIndex) {
            opt.classList.add("focused");
            opt.setAttribute("aria-selected", "true");
          } else {
            opt.classList.remove("focused");
            opt.setAttribute("aria-selected", "false");
          }
        });
      }

      function selectOption(opt) {
        const value = opt.getAttribute("data-value");
        const text =
          opt.querySelector(".bank-name")?.textContent.trim() ||
          opt.textContent.trim();

        if (selectedName) selectedName.textContent = text;
        if (hiddenInput) {
          hiddenInput.value = value;
          hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
        }

        clearError(hiddenInput);
        closeList();
      }

      trigger.addEventListener("click", function (e) {
        e.stopPropagation();
        if (open) closeList();
        else {
          openList();
          searchInput?.focus();
        }
      });

      options.forEach((opt, idx) => {
        opt.addEventListener("click", function (e) {
          selectOption(opt);
        });

        opt.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectOption(opt);
          }
        });
      });

      // Navegación con teclado
      trigger.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (!open) openList();
          focusedIndex = 0;
          updateFocus();
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (!open) openList();
          focusedIndex = options.length - 1;
          updateFocus();
        }
        if (e.key === "Escape") {
          closeList();
        }
      });

      // Búsqueda
      if (searchInput) {
        searchInput.addEventListener("input", function () {
          const query = this.value.toLowerCase().trim();
          options.forEach((opt) => {
            const name = (
              opt.querySelector(".bank-name")?.textContent || opt.textContent
            ).toLowerCase();
            opt.style.display = name.includes(query) ? "flex" : "none";
          });
        });
      }

      // Cerrar al hacer click fuera
      document.addEventListener("click", function (e) {
        if (
          !optionsContainer.contains(e.target) &&
          !trigger.contains(e.target)
        ) {
          closeList();
        }
      });

      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && open) {
          closeList();
        }
      });
    })();

    // --- Inicialización de Categorías con Choices.js ---
    (function initCategorias() {
      const categoriasSelect = document.getElementById("categorias");
      if (!categoriasSelect) return;

      // Configuración de Choices.js
      const choicesOptions = {
        removeItemButton: true,
        maxItemCount: 5,
        searchEnabled: true,
        placeholderValue: "Selecciona hasta 5 categorías...",
        searchPlaceholderValue: "Buscar categorías...",
        noResultsText: "No se encontraron categorías",
        itemSelectText: "Presiona para seleccionar",
        shouldSort: false,
        duplicateItemsAllowed: false,
        loadingText: "Cargando categorías...",
        noChoicesText: "No hay más categorías disponibles",
      };

      if (typeof Choices !== "undefined") {
        guardedInitChoices(categoriasSelect, choicesOptions);
      } else {
        // Fallback: mostrar select nativo
        categoriasSelect.style.display = "block";
        categoriasSelect.size = 6;
      }
    })();

    // --- Validación global del formulario ---
    window.validateRegistroExperto = function () {
      let valid = true;

      // Validar campos individuales
      const fields = [
        { id: "titular", message: "El nombre es obligatorio" },
        { id: "numero-documento", message: "Número de documento requerido" },
        { id: "numeroCuenta", message: "Número de cuenta requerido" },
        { id: "telefonoContacto", message: "Teléfono requerido" },
        { id: "precio", message: "Precio inválido" },
        { id: "tipo-cuenta", message: "Tipo de cuenta obligatorio" },
        { id: "tipo-documento", message: "Tipo de documento obligatorio" },
        { id: "banco", message: "Selecciona un banco" },
      ];

      fields.forEach(({ id, message }) => {
        const el = document.getElementById(id);
        if (!el) return;

        let fieldValid = true;

        if (el.type === "select-one") {
          fieldValid = !!el.value;
        } else if (el.type === "number") {
          fieldValid = el.value !== "" && Number(el.value) > 0;
        } else {
          fieldValid = el.value.trim() !== "";
        }

        if (!fieldValid) {
          showError(el, message);
          valid = false;
        } else {
          clearError(el);
        }
      });

      // Validar coincidencia de números
      const numDoc = document.getElementById("numero-documento");
      const numDocConfirm = document.getElementById("numero-documento-confirm");
      if (numDoc && numDocConfirm && numDoc.value !== numDocConfirm.value) {
        showError(numDocConfirm, "Los números de documento no coinciden");
        valid = false;
      }

      const nCuenta = document.getElementById("numeroCuenta");
      const nCuentaC = document.getElementById("numeroCuentaConfirm");
      if (nCuenta && nCuentaC && nCuenta.value !== nCuentaC.value) {
        showError(nCuentaC, "Los números de cuenta no coinciden");
        valid = false;
      }

      // Validar teléfono
      const tel = document.getElementById("telefonoContacto");
      if (tel && tel.value.trim().length < 7) {
        showError(tel, "Número de teléfono inválido");
        valid = false;
      }

      // Validar foto
      const fotoPerfil = document.getElementById("fotoPerfil");
      if (fotoPerfil && !fotoPerfil.files?.length) {
        showError(fotoPerfil, "Selecciona una foto de perfil");
        valid = false;
      }

      // Validar días
      const diasInput = document.getElementById("diasDisponibles");
      const daysDisplay = document.querySelector(".days-selected-display");
      if (diasInput && !diasInput.value.trim()) {
        showError(daysDisplay, "Selecciona al menos un día");
        valid = false;
      }

      // Validar categorías - USANDO LA MISMA LÓGICA MEJORADA
      const categoriasSelect = document.getElementById("categorias");
      if (categoriasSelect) {
        function countSelectedCategories() {
          try {
            const nativeSelected = Array.from(
              categoriasSelect.selectedOptions || []
            );
            if (nativeSelected.length > 0) return nativeSelected.length;

            const choicesWrapper = categoriasSelect.nextElementSibling;
            if (
              choicesWrapper &&
              choicesWrapper.classList.contains("choices")
            ) {
              const selectedItems = choicesWrapper.querySelectorAll(
                ".choices__list--multiple .choices__item:not(.choices__placeholder)"
              );
              return selectedItems.length;
            }

            return 0;
          } catch (e) {
            return 0;
          }
        }

        if (countSelectedCategories() === 0) {
          showError(categoriasSelect, "Selecciona al menos una categoría");
          valid = false;
        } else {
          clearError(categoriasSelect);
        }
      }

      return valid;
    };

    // --- Manejo del envío del formulario ---
    const form = document.getElementById("registroExpertoForm");
    if (form) {
      form.addEventListener("submit", async function (e) {
        e.preventDefault();

        if (state.formSubmitting) return;
        state.formSubmitting = true;

        // Validación global
        if (!window.validateRegistroExperto()) {
          state.formSubmitting = false;

          // Enfocar el primer campo con error
          const firstError = document.querySelector(".invalid-input");
          if (firstError) firstError.focus();

          return;
        }

        // Preparar datos
        const categoriasSelect = document.getElementById("categorias");
        const categorias = categoriasSelect
          ? Array.from(categoriasSelect.selectedOptions).map((opt) => opt.value)
          : [];

        const payload = {
          descripcion: (
            document.getElementById("descripcion")?.value || ""
          ).trim(),
          precioPorHora: Number(document.getElementById("precio")?.value || 0),
          categorias,
          banco: document.getElementById("banco")?.value || "",
          tipoCuenta: document.getElementById("tipo-cuenta")?.value || "",
          numeroCuenta: document.getElementById("numeroCuenta")?.value || "",
          titular: document.getElementById("titular")?.value || "",
          tipoDocumento: document.getElementById("tipo-documento")?.value || "",
          numeroDocumento:
            document.getElementById("numero-documento")?.value || "",
          telefonoContacto:
            document.getElementById("telefonoContacto")?.value || "",
          diasDisponibles: (
            document.getElementById("diasDisponibles")?.value || ""
          )
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
        };

        try {
          const csrfToken = await getCsrfToken();
          const response = await fetch("/api/perfil-experto/perfil", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-csrf-token": csrfToken,
            },
            credentials: "include",
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.mensaje || `Error del servidor: ${response.status}`
            );
          }

          alert("Perfil de experto guardado correctamente.");
          window.location.href = "/perfil";
        } catch (error) {
          console.error("Error guardando perfil:", error);
          alert(`No fue posible guardar tu perfil. ${error.message}`);
        } finally {
          state.formSubmitting = false;
        }
      });
    }
  });

  // --- Utilidad CSRF Token ---
  async function getCsrfToken() {
    try {
      const response = await fetch("/csrf-token", { credentials: "include" });
      if (!response.ok) return "";
      const data = await response.json();
      return data.csrfToken || "";
    } catch {
      return "";
    }
  }
})();

console.log("registroExperto.js cargado correctamente");
