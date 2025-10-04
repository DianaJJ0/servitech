/**
 * Custom Select Component
 * Reemplaza selects nativos con versión estilizable
 */
(function () {
  "use strict";

  class CustomSelect {
    constructor(selectElement) {
      if (!selectElement) {
        throw new Error("CustomSelect: selectElement es requerido");
      }

      if (!(selectElement instanceof HTMLSelectElement)) {
        throw new Error(
          "CustomSelect: selectElement debe ser un elemento <select>"
        );
      }

      console.log("CustomSelect constructor: Inicializando con", selectElement);

      this.selectElement = selectElement;
      this.select = selectElement; // Alias para compatibilidad
      this.selectedIndex = selectElement.selectedIndex;
      this.options = Array.from(selectElement.options);

      console.log(
        "CustomSelect constructor: Opciones cargadas:",
        this.options.length
      );

      this.createCustomSelect();
      this.attachEventListeners();
    }

    createCustomSelect() {
      // Debug: Log del select original
      console.log(
        "CustomSelect: Creando select para",
        this.selectElement.id || this.selectElement.name
      );
      console.log("CustomSelect: Opciones encontradas:", this.options.length);
      this.options.forEach((opt, i) => {
        console.log(`Opción ${i}: value="${opt.value}", text="${opt.text}"`);
      });

      // Crear contenedor
      const wrapper = document.createElement("div");
      wrapper.className = "custom-select-wrapper";

      // Crear select visible
      const customSelect = document.createElement("div");
      customSelect.className = "custom-select";
      customSelect.setAttribute("tabindex", "0");
      customSelect.setAttribute("role", "combobox");
      customSelect.setAttribute("aria-expanded", "false");

      // Crear trigger (botón visible)
      const trigger = document.createElement("div");
      trigger.className = "custom-select__trigger";

      const selectedText = document.createElement("span");
      selectedText.className = "custom-select__text";
      selectedText.textContent = this.options[this.selectedIndex].text;

      const arrow = document.createElement("span");
      arrow.className = "custom-select__arrow";
      arrow.innerHTML = '<i class="fas fa-chevron-down"></i>';

      trigger.appendChild(selectedText);
      trigger.appendChild(arrow);

      // Crear lista de opciones
      const optionsList = document.createElement("div");
      optionsList.className = "custom-select__options";
      optionsList.setAttribute("role", "listbox");

      this.options.forEach((option, index) => {
        const customOption = document.createElement("div");
        customOption.className = "custom-select__option";
        customOption.setAttribute("data-value", option.value);
        customOption.setAttribute("data-index", index);
        customOption.setAttribute("role", "option");
        customOption.textContent = option.text;

        // Forzar estilos inline para máxima visibilidad
        customOption.style.color = "#ffffff";
        customOption.style.backgroundColor = "#2a2a2a";
        customOption.style.padding = "0.75rem";
        customOption.style.fontSize = "1rem";
        customOption.style.fontWeight = "500";

        if (index === this.selectedIndex) {
          customOption.classList.add("selected");
          customOption.style.backgroundColor = "#3a8eff";
          customOption.style.fontWeight = "600";
        }

        optionsList.appendChild(customOption);
      });

      customSelect.appendChild(trigger);
      customSelect.appendChild(optionsList);
      wrapper.appendChild(customSelect);

      // Ocultar select original pero mantenerlo para el formulario
      this.selectElement.style.display = "none";
      this.selectElement.parentNode.insertBefore(wrapper, this.selectElement);

      // Guardar referencias
      this.wrapper = wrapper;
      this.customSelect = customSelect;
      this.trigger = trigger;
      this.selectedTextEl = selectedText;
      this.optionsList = optionsList;
      this.customOptions = Array.from(
        optionsList.querySelectorAll(".custom-select__option")
      );
    }

    attachEventListeners() {
      // Toggle dropdown
      this.trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleDropdown();
      });

      // Seleccionar opción
      this.customOptions.forEach((option) => {
        option.addEventListener("click", (e) => {
          e.stopPropagation();
          const value = option.getAttribute("data-value");
          const text = option.textContent;
          const index = parseInt(option.getAttribute("data-index"));

          this.selectOption(value, text, index);
          this.closeDropdown();
        });
      });

      // Cerrar al hacer clic fuera
      document.addEventListener("click", () => {
        this.closeDropdown();
      });

      // Keyboard navigation
      this.customSelect.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.toggleDropdown();
        } else if (e.key === "Escape") {
          this.closeDropdown();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          if (!this.isOpen()) {
            this.openDropdown();
          } else {
            this.selectNext();
          }
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          if (this.isOpen()) {
            this.selectPrevious();
          }
        }
      });
    }

    toggleDropdown() {
      if (this.isOpen()) {
        this.closeDropdown();
      } else {
        this.openDropdown();
      }
    }

    openDropdown() {
      this.customSelect.classList.add("open");
      this.customSelect.setAttribute("aria-expanded", "true");

      // Scroll a la opción seleccionada
      const selected = this.optionsList.querySelector(".selected");
      if (selected) {
        selected.scrollIntoView({ block: "nearest" });
      }
    }

    closeDropdown() {
      this.customSelect.classList.remove("open");
      this.customSelect.setAttribute("aria-expanded", "false");
    }

    isOpen() {
      return this.customSelect.classList.contains("open");
    }

    selectOption(value, text, index) {
      // Actualizar select original
      this.selectElement.value = value;
      this.selectElement.selectedIndex = index;
      this.selectedIndex = index;

      // Actualizar UI
      this.selectedTextEl.textContent = text;

      // Actualizar clases
      this.customOptions.forEach((opt) => opt.classList.remove("selected"));
      this.customOptions[index].classList.add("selected");

      // Disparar evento change en el select original
      const event = new Event("change", { bubbles: true });
      this.selectElement.dispatchEvent(event);
    }

    selectNext() {
      const nextIndex = Math.min(
        this.selectedIndex + 1,
        this.options.length - 1
      );
      if (nextIndex !== this.selectedIndex) {
        const option = this.customOptions[nextIndex];
        const value = option.getAttribute("data-value");
        const text = option.textContent;
        this.selectOption(value, text, nextIndex);
      }
    }

    selectPrevious() {
      const prevIndex = Math.max(this.selectedIndex - 1, 0);
      if (prevIndex !== this.selectedIndex) {
        const option = this.customOptions[prevIndex];
        const value = option.getAttribute("data-value");
        const text = option.textContent;
        this.selectOption(value, text, prevIndex);
      }
    }
  }

  // Inicializar custom selects
  function initCustomSelects() {
    console.log("initCustomSelects: Buscando selects...");

    // Intentar múltiples selectores
    const selectors = [
      "select.filter-input",
      "#categoria-filter",
      'select[name="categoria"]',
    ];

    let selectElement = null;
    for (const selector of selectors) {
      selectElement = document.querySelector(selector);
      if (selectElement) {
        console.log(`initCustomSelects: Select encontrado con "${selector}"`);
        break;
      }
    }

    if (!selectElement) {
      console.error(
        "initCustomSelects: No se encontró el select de categorías"
      );
      return;
    }

    // Verificar que tenga opciones
    if (selectElement.options.length === 0) {
      console.warn("initCustomSelects: El select no tiene opciones");
      return;
    }

    console.log(
      `initCustomSelects: Creando CustomSelect con ${selectElement.options.length} opciones`
    );
    try {
      new CustomSelect(selectElement);
      console.log("initCustomSelects: CustomSelect creado exitosamente");
    } catch (error) {
      console.error("initCustomSelects: Error al crear CustomSelect:", error);
    }
  }

  // Auto-inicializar cuando el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCustomSelects);
  } else {
    initCustomSelects();
  }

  // Exportar para uso manual
  window.CustomSelect = CustomSelect;
  window.initCustomSelects = initCustomSelects;
})();
