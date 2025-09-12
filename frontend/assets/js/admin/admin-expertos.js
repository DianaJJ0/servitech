/**
 * @fileoverview
 * Funcionalidad del panel de administración para la gestión de expertos en Servitech.
 * Permite listar, filtrar, agregar, editar, verificar y eliminar expertos desde la interfaz de administrador.
 *
 * Autor: Diana Carolina Jimenez
 * Fecha: 2025-06-04
 */

/**
 * Inicializa la lógica y eventos de la página de administración de expertos.
 */
/**
 * Carga dinámica de Choices.js (CDN) una sola vez y devuelve una promesa.
 * También se encarga de inyectar la hoja de estilos si falta.
 */
function ensureChoicesLoaded() {
  if (window._choicesLoadedPromise) return window._choicesLoadedPromise;
  window._choicesLoadedPromise = new Promise((resolve, reject) => {
    if (typeof Choices !== "undefined") return resolve();
    // Preferir assets locales bajo /assets/vendor/choices/, fallback CDN
    const localCss = "/assets/vendor/choices/choices.min.css";
    const localScript = "/assets/vendor/choices/choices.min.js";
    const cdnCss =
      "https://cdn.jsdelivr.net/npm/choices.js/public/assets/styles/choices.min.css";
    const cdnScript =
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
        s.onload = () => setTimeout(() => res(), 50);
        s.onerror = (e) => rej(e || new Error("failed to load script"));
        document.head.appendChild(s);
      });
    }

    // inject CSS: prefer local but don't fail if missing
    try {
      const exists = Array.from(document.getElementsByTagName("link")).some(
        (l) =>
          l.href &&
          (l.href.indexOf("choices.min.css") !== -1 ||
            l.href.indexOf("/assets/vendor/choices/choices.min.css") !== -1)
      );
      if (!exists) {
        // try local first
        try {
          injectCss(localCss);
        } catch (e) {
          injectCss(cdnCss);
        }
      }
    } catch (e) {}

    // try local script first, then CDN
    tryLoadScript(localScript)
      .catch(() => tryLoadScript(cdnScript))
      .then(() => resolve())
      .catch((err) => reject(err || new Error("Failed to load Choices.js")));
  });
  return window._choicesLoadedPromise;
}

// Lightweight test-detection and DOM-ready wrapper.
// In Jest (JSDOM) we avoid registering DOMContentLoaded handlers automatically
// so tests can import functions and control when initialization runs.
var __ADMIN_EXPERTS_IS_TEST = false;
try {
  __ADMIN_EXPERTS_IS_TEST =
    typeof process !== "undefined" &&
    !!process.env &&
    !!process.env.JEST_WORKER_ID;
} catch (e) {}

var __adminExpertsDeferredDOMContentLoaded = [];
function onDomReady(fn) {
  if (__ADMIN_EXPERTS_IS_TEST) {
    __adminExpertsDeferredDOMContentLoaded.push(fn);
    return;
  }
  document.addEventListener("DOMContentLoaded", fn);
}

// Debug helper: enabled when window.__ADMIN_EXPERTOS_DEBUG === true
function debugLog() {
  try {
    if (typeof window !== "undefined" && window.__ADMIN_EXPERTOS_DEBUG) {
      if (console && typeof console.debug === "function")
        console.debug.apply(console, arguments);
    }
  } catch (e) {}
}

// Global modal close helpers: handle any .modal-expert instances (covers duplicates)
onDomReady(function () {
  // Close by clicking .btn-close or [data-dismiss="modal"] inside any modal
  document.body.addEventListener("click", function (e) {
    const closeBtn =
      e.target.closest(".btn-close") ||
      e.target.closest("[data-dismiss='modal']");
    if (closeBtn) {
      const modal = closeBtn.closest(".modal-expert");
      if (modal) {
        try {
          modal.style.display = "none";
          document.body.style.overflow = "";
          // if modal contains the expertForm, clear edit state and reset title
          const form = modal.querySelector("form#expertForm");
          if (form) {
            try {
              if (form.dataset && form.dataset.editId)
                delete form.dataset.editId;
              form.reset();
            } catch (e) {}
            const titleEl = modal.querySelector(".modal-expert__title");
            if (titleEl) titleEl.textContent = "Agregar nuevo experto";
          }
        } catch (err) {}
      }
      return;
    }

    // Close when clicking on backdrop (the modal element itself)
    const modalClicked = e.target.closest(".modal-expert");
    if (modalClicked && e.target === modalClicked) {
      try {
        modalClicked.style.display = "none";
        document.body.style.overflow = "";
        const form = modalClicked.querySelector("form#expertForm");
        if (form) {
          try {
            if (form.dataset && form.dataset.editId) delete form.dataset.editId;
            form.reset();
          } catch (e) {}
          const titleEl = modalClicked.querySelector(".modal-expert__title");
          if (titleEl) titleEl.textContent = "Agregar nuevo experto";
        }
      } catch (err) {}
      return;
    }
  });

  // Close visible modals on Escape
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" || e.key === "Esc") {
      document.querySelectorAll(".modal-expert").forEach((modal) => {
        try {
          if (
            modal.style &&
            (modal.style.display === "flex" || modal.style.display === "block")
          ) {
            modal.style.display = "none";
            document.body.style.overflow = "";
            const form = modal.querySelector("form#expertForm");
            if (form) {
              try {
                if (form.dataset && form.dataset.editId)
                  delete form.dataset.editId;
                form.reset();
              } catch (e) {}
              const titleEl = modal.querySelector(".modal-expert__title");
              if (titleEl) titleEl.textContent = "Agregar nuevo experto";
            }
          }
        } catch (err) {}
      });
    }
  });
});

// Exports para permitir pruebas controladas (CommonJS)
try {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = module.exports || {};
    module.exports.initializeChoicesOn = initializeChoicesOn;
    module.exports.getExpertModal = getExpertModal;
    module.exports.onDomReady = onDomReady;
    module.exports.__adminExpertsDeferredDOMContentLoaded =
      __adminExpertsDeferredDOMContentLoaded;
  }
} catch (e) {}

/**
 * Inicializa (o re-inicializa) Choices.js en un elemento dado.
 * idOrElement puede ser id o elemento DOM. key es la clave para almacenar instancia.
 */
function initializeChoicesOn(idOrElement, options = {}, key) {
  const id =
    typeof idOrElement === "string"
      ? idOrElement
      : idOrElement && idOrElement.id;
  if (!id) return;
  const el =
    typeof idOrElement === "string"
      ? document.getElementById(idOrElement)
      : idOrElement;
  if (!el) return;
  const instanceKey = key || id;
  ensureChoicesLoaded()
    .then(() => {
      try {
        window._choicesInstances = window._choicesInstances || {};
        if (window._choicesInstances[instanceKey]) {
          try {
            window._choicesInstances[instanceKey].destroy();
          } catch (e) {}
          window._choicesInstances[instanceKey] = null;
        }
        // Only initialize if Choices constructor available
        if (typeof Choices !== "undefined") {
          window._choicesInstances[instanceKey] = new Choices(
            el,
            options || {}
          );
        }
      } catch (e) {
        console.error("Error initializing Choices on", id, e);
      }
    })
    .catch((e) => console.error("Failed loading Choices.js for", id, e));
}

onDomReady(function () {
  // Leer habilidades inyectadas por el servidor (si existen)
  try {
    const node = document.getElementById("admin-habilidades");
    if (node && node.textContent) {
      try {
        const parsed = JSON.parse(node.textContent);
        if (Array.isArray(parsed)) window._adminHabilidades = parsed;
      } catch (e) {
        // ignore parse errors
      }
    }
  } catch (e) {}
  // Leer expertos iniciales inyectados por el servidor (dev) para evitar esperar al fetch
  try {
    const nodeEx = document.getElementById("initial-expertos");
    if (nodeEx && nodeEx.textContent) {
      try {
        const parsed = JSON.parse(nodeEx.textContent);
        if (Array.isArray(parsed)) window._adminExpertos = parsed;
      } catch (e) {
        // ignore parse errors
      }
    }
  } catch (e) {}
  // Si ya tenemos habilidades inyectadas, inicializar Choices básico para que las opciones existan
  try {
    const skillsEl = document.getElementById("skills");
    if (
      skillsEl &&
      window._adminHabilidades &&
      Array.isArray(window._adminHabilidades) &&
      window._adminHabilidades.length > 0
    ) {
      const choicesArray = window._adminHabilidades.map((h) => ({
        value: h.nombre || h.name || h.label || String(h._id),
        label: h.nombre || h.name || h.label || String(h._id),
      }));
      initializeChoicesOn(
        skillsEl,
        Object.assign(
          {
            removeItemButton: true,
            searchEnabled: true,
            addItems: true,
            placeholder: true,
            placeholderValue: "Selecciona habilidades",
          },
          { choices: choicesArray }
        ),
        "skills"
      );
    }
  } catch (e) {}

  // Inicializar Choices en #skills siempre al cargar la página.
  try {
    const skillsEl = document.getElementById("skills");
    if (skillsEl) {
      const baseOpts = {
        removeItemButton: true,
        searchEnabled: true,
        addItems: true,
        duplicateItemsAllowed: false,
        placeholder: true,
        placeholderValue: "Selecciona habilidades",
        noResultsText: "No hay resultados",
        noChoicesText: "No hay opciones",
      };
      let initOpts = Object.assign({}, baseOpts);
      if (
        window._adminHabilidades &&
        Array.isArray(window._adminHabilidades) &&
        window._adminHabilidades.length > 0
      ) {
        initOpts.choices = window._adminHabilidades.map((h) => ({
          value: h.nombre || h.name || h.label || String(h._id),
          label: h.nombre || h.name || h.label || String(h._id),
        }));
      }
      initializeChoicesOn(skillsEl, initOpts, "skills");
    }
  } catch (e) {}
  // Cargar categorías de admin en background para poblar tanto el modal
  // como el filtro de categoría en la UI. Esto asegura que el filtro
  // funcione incluso si la ruta dev no inyectó `categorias` en el HTML.
  try {
    loadAdminCategorias().catch(() => {});
  } catch (e) {}

  setupExpertModal();
  setupExpertFilters();
  setupExpertActions();
  setupExpertVerification();
  // cargar lista real de expertos y registrar manejadores delegados
  loadExpertos();
  setupDelegatedActions();
});

/**
 * Configura la funcionalidad del modal para agregar/editar expertos
 */
function setupExpertModal() {
  const modal = getExpertModal();
  const btnAddExpert = document.getElementById("btnAddExpert");
  const btnCloseModal = modal ? modal.querySelector(".btn-close") : null;
  const btnCancel = modal
    ? modal.querySelector('[data-dismiss="modal"]')
    : null;

  if (!modal || !btnAddExpert) return;

  const openModal = () => {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
    // Ensure expertForm edit state is cleared when opening as "Agregar"
    try {
      const form = document.getElementById("expertForm");
      if (form && form.dataset) {
        delete form.dataset.editId;
      }
      const titleEl = modal.querySelector(".modal-expert__title");
      if (titleEl) titleEl.textContent = "Agregar nuevo experto";
    } catch (e) {}
    // cargar categorías disponibles para el modal (si no cargadas)
    // también inicializar Choices en #categorias de forma idempotente
    loadAdminCategorias().catch((err) =>
      console.error("Error cargando categorias:", err)
    );
    const skillsEl = document.getElementById("skills");
    if (skillsEl) {
      (async () => {
        let skillSuggestions = [];
        // ensure categories are loaded and initialized for the modal
        try {
          await loadAdminCategorias().catch(function () {});
          const categoriasEl = document.getElementById("categorias");
          if (categoriasEl) {
            try {
              if (
                !(
                  window._choicesInstances &&
                  window._choicesInstances["categorias"]
                )
              ) {
                initializeChoicesOn(
                  "categorias",
                  {
                    removeItemButton: true,
                    searchEnabled: true,
                    placeholder: true,
                    placeholderValue: "Selecciona categorías",
                  },
                  "categorias"
                );
              }
            } catch (e) {}
          }
        } catch (e) {}
        // Preferir listado inyectado por servidor (más eficiente)
        try {
          if (
            window._adminHabilidades &&
            Array.isArray(window._adminHabilidades) &&
            window._adminHabilidades.length > 0
          ) {
            skillSuggestions = window._adminHabilidades
              .map((h) => h.nombre || h.name || h.label || String(h._id))
              .filter(Boolean);
          }
        } catch (e) {}

        // Si no hubo inyección, intentar la API pública
        if (!skillSuggestions || skillSuggestions.length === 0) {
          try {
            const res = await fetch("/api/habilidades", {
              credentials: "same-origin",
            });
            if (res && res.ok) {
              const habs = await res.json();
              if (Array.isArray(habs) && habs.length > 0) {
                skillSuggestions = habs
                  .map((h) => h.nombre || h.name || h.label || String(h._id))
                  .filter(Boolean);
              }
            }
          } catch (e) {
            // ignore and fallback
          }
        }

        // Si aun no hay sugerencias, usar datos ya cargados en la página como último recurso
        if (!skillSuggestions || skillSuggestions.length === 0) {
          try {
            const experts = window._adminExpertos || [];
            const allSkills = experts.flatMap((ex) => {
              if (ex && ex.infoExperto && Array.isArray(ex.infoExperto.skills))
                return ex.infoExperto.skills;
              if (ex && Array.isArray(ex.skills)) return ex.skills;
              return [];
            });
            skillSuggestions = Array.from(new Set(allSkills))
              .filter(Boolean)
              .slice(0, 200);
          } catch (e) {
            skillSuggestions = [];
          }
        }

        const choicesArray = skillSuggestions.map((s) => ({
          value: s,
          label: s,
        }));
        // DEBUG: mostrar en consola el origen y cantidad de sugerencias
        try {
          console.log(
            "adminExpertos: window._adminHabilidades present?",
            Array.isArray(window._adminHabilidades)
              ? window._adminHabilidades.length
              : false
          );
          console.log(
            "adminExpertos: skillSuggestions count",
            skillSuggestions.length,
            skillSuggestions.slice(0, 10)
          );
        } catch (e) {}
        initializeChoicesOn(
          skillsEl,
          {
            removeItemButton: true,
            searchEnabled: true,
            addItems: true,
            duplicateItemsAllowed: false,
            placeholder: true,
            placeholderValue: "Selecciona habilidades",
            noResultsText: "No hay resultados",
            noChoicesText: "No hay opciones",
            choices: choicesArray,
          },
          "skills"
        );
      })();
    }
  };

  const closeModal = () => {
    modal.style.display = "none";
    document.body.style.overflow = "";
    const form = document.getElementById("expertForm");
    if (form) form.reset();
    // remove edit id and reset title if present
    try {
      if (form && form.dataset && form.dataset.editId)
        delete form.dataset.editId;
      const titleEl = modal.querySelector(".modal-expert__title");
      if (titleEl) titleEl.textContent = "Agregar nuevo experto";
    } catch (e) {}
  };

  btnAddExpert.addEventListener("click", openModal);

  if (btnCloseModal) {
    btnCloseModal.addEventListener("click", closeModal);
  }

  if (btnCancel) {
    btnCancel.addEventListener("click", closeModal);
  }

  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
}

/**
 * Visual fixes for Choices instances restricted to the currently visible modal.
 * Centralizes the logic previously duplicated inline in the EJS template.
 */
function applyChoicesVisualFixesWithinVisibleModal() {
  function applyInputFix(el) {
    if (!el || el.dataset.__stylingApplied) return;
    try {
      el.style.setProperty("background", "transparent", "important");
      el.style.setProperty(
        "color",
        getComputedStyle(document.documentElement).getPropertyValue(
          "--admin-text-primary"
        ) || "#ffffff",
        "important"
      );
      el.style.setProperty(
        "-webkit-text-fill-color",
        getComputedStyle(document.documentElement).getPropertyValue(
          "--admin-text-primary"
        ) || "#ffffff",
        "important"
      );
      el.style.setProperty(
        "caret-color",
        getComputedStyle(document.documentElement).getPropertyValue(
          "--admin-accent-color"
        ) || "#5e81ff",
        "important"
      );
      el.style.setProperty("border", "none", "important");
      el.style.setProperty("outline", "none", "important");
      el.style.setProperty("width", "auto", "important");
      el.style.setProperty("min-width", "22ch", "important");
      el.style.setProperty("font-family", "inherit", "important");
      el.style.setProperty("padding-left", "42px", "important");
      el.dataset.__stylingApplied = "1";
    } catch (e) {
      /* ignore */
    }
  }

  function findVisibleModal() {
    return Array.from(document.querySelectorAll(".modal-expert")).find(
      function (m) {
        try {
          const cs = getComputedStyle(m);
          return (
            cs &&
            cs.display !== "none" &&
            cs.visibility !== "hidden" &&
            m.offsetWidth > 0 &&
            m.offsetHeight > 0
          );
        } catch (e) {
          return false;
        }
      }
    );
  }

  function processAll() {
    const visibleModal = findVisibleModal();
    if (!visibleModal) return;

    try {
      visibleModal
        .querySelectorAll(
          '.choices__input, .choices__input--cloned, input[placeholder="Selecciona categorías"], input[aria-label="Selecciona categorías"]'
        )
        .forEach(applyInputFix);
      visibleModal
        .querySelectorAll(
          ".choices__list--dropdown, .choices__list--dropdown .choices__item"
        )
        .forEach(function (el) {
          try {
            el.style.setProperty(
              "background",
              getComputedStyle(document.documentElement).getPropertyValue(
                "--admin-card-bg"
              ) || "#121212",
              "important"
            );
            el.style.setProperty(
              "color",
              getComputedStyle(document.documentElement).getPropertyValue(
                "--admin-text-primary"
              ) || "#ffffff",
              "important"
            );
            el.style.setProperty(
              "border-color",
              getComputedStyle(document.documentElement).getPropertyValue(
                "--admin-border-color"
              ) || "#333",
              "important"
            );
          } catch (e) {}
        });

      visibleModal
        .querySelectorAll(".choices__inner")
        .forEach(function (inner) {
          try {
            if (inner.querySelector(".choices__list--multiple"))
              inner.classList.add("no-icon");
            else inner.classList.remove("no-icon");
          } catch (e) {}
        });
    } catch (e) {
      /* ignore */
    }
  }

  // Diagnostics: log choices button computed styles inside visible modal
  function diag() {
    try {
      const visibleModal = findVisibleModal();
      if (!visibleModal) {
        console.info("[diag] No hay modal visible para inspeccionar");
        return;
      }
      const btns = visibleModal.querySelectorAll(".choices__button");
      if (!btns || btns.length === 0) {
        console.info(
          "[diag] No se encontraron .choices__button dentro del modal visible"
        );
        return;
      }
      btns.forEach(function (b, i) {
        try {
          console.info("[diag] choices__button #" + i + ":", b.outerHTML);
          var cs = window.getComputedStyle(b);
          console.info("[diag] computed (button):", {
            display: cs.display,
            visibility: cs.visibility,
            color: cs.color,
            background: cs.backgroundColor || cs["background-color"],
            overflow: cs.overflow,
            zIndex: cs.zIndex,
          });
        } catch (e) {}
      });
    } catch (e) {
      console.error("[diag] error:", e);
    }
  }

  // Run now and observe for dynamic clones
  try {
    processAll();
    let attempts = 0;
    const tid = setInterval(function () {
      processAll();
      attempts++;
      if (attempts > 30) clearInterval(tid);
    }, 150);
    const mo = new MutationObserver(function () {
      processAll();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // also attach a lightweight click to re-run diag when modal interactions occur
    document.body.addEventListener(
      "click",
      function (ev) {
        if (
          ev.target.closest(".modal-expert") ||
          ev.target.closest(".btn-close")
        )
          setTimeout(diag, 300);
      },
      true
    );
  } catch (e) {
    /* ignore */
  }
}

// Auto-run visual fixes after DOM ready so inline scripts can be removed
onDomReady(function () {
  try {
    applyChoicesVisualFixesWithinVisibleModal();
  } catch (e) {}
});

// Profile image preview and upload helpers (moved from inline view)
onDomReady(function profileImagePreview() {
  try {
    var input = document.getElementById("profileImage");
    var preview = document.getElementById("profilePreview");
    var img = preview ? preview.querySelector("img") : null;
    var removeBtn = document.getElementById("removeProfileBtn");
    var meta = document.getElementById("uploadMeta");
    var err = document.getElementById("profileImageError");
    var label = document.getElementById("uploadLabel");

    function reset() {
      if (input) input.value = "";
      if (img) img.src = "";
      if (preview) preview.classList.remove("visible");
      if (removeBtn) removeBtn.style.display = "none";
      if (meta) {
        meta.style.display = "none";
        meta.textContent = "";
      }
      if (err) {
        err.style.display = "none";
        err.textContent = "";
      }
    }

    function showError(message) {
      if (err) {
        err.textContent = message;
        err.style.display = "block";
      }
    }

    function setFileInfo(file) {
      if (!meta) return;
      meta.style.display = "block";
      meta.textContent =
        file.name + " · " + Math.round(file.size / 1024) + "KB";
    }

    if (!input) return;

    input.addEventListener("change", function (e) {
      var f = input.files && input.files[0];
      if (!f) {
        reset();
        return;
      }
      var allowed = /^image\/(png|jpe?g|gif|webp)$/i;
      if (!allowed.test(f.type)) {
        showError("Formato no soportado. Usa png, jpg, gif o webp.");
        input.value = "";
        return;
      }
      var max = 2 * 1024 * 1024;
      if (f.size > max) {
        showError("Archivo muy grande. Máx 2MB.");
        input.value = "";
        return;
      }
      var reader = new FileReader();
      reader.onload = function (ev) {
        if (img) img.src = ev.target.result;
        if (preview) preview.classList.add("visible");
        if (removeBtn) removeBtn.style.display = "inline-flex";
        if (err) {
          err.style.display = "none";
          err.textContent = "";
        }
        setFileInfo(f);
      };
      reader.readAsDataURL(f);
    });

    if (removeBtn) {
      removeBtn.addEventListener("click", function () {
        reset();
      });
    }

    if (meta) {
      meta.addEventListener("keydown", function (ev) {
        if (ev.key === "Delete" || ev.key === "Backspace") reset();
      });
    }

    // hide preview initial
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", reset);
    else reset();
  } catch (e) {
    /* ignore */
  }
});

// Days selector, price feedback and account toggle centralization
onDomReady(function uiHelpers() {
  try {
    // Days selector
    function readHidden() {
      var h = document.getElementById("diasDisponibles");
      if (!h) return [];
      if (!h.value) return [];
      try {
        var v = JSON.parse(h.value);
        if (Array.isArray(v)) return v;
      } catch (e) {}
      return h.value
        .split(",")
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
    }
    function writeHidden(arr) {
      var h = document.getElementById("diasDisponibles");
      if (!h) return;
      h.value = JSON.stringify(arr);
    }
    function shortLabel(day) {
      var map = {
        Lunes: "L",
        Martes: "M",
        Miércoles: "X",
        Miercoles: "X",
        Jueves: "J",
        Viernes: "V",
        Sábado: "S",
        Sabado: "S",
        Domingo: "D",
      };
      return map[day] || (day && day.charAt(0)) || "";
    }
    function updateDisplay(selected) {
      var disp = document.querySelector(".srv-days-display");
      if (!disp) return;
      if (!selected || selected.length === 0)
        disp.textContent = "Ningún día seleccionado";
      else {
        var short = selected
          .map(function (d) {
            return shortLabel(d);
          })
          .join(" ");
        disp.textContent = short + " — " + selected.join(", ");
      }
    }
    function syncHiddenFromUI() {
      var items = Array.from(document.querySelectorAll(".srv-day.selected"))
        .map(function (e) {
          return e.getAttribute("data-day");
        })
        .filter(Boolean);
      writeHidden(items);
      updateDisplay(items);
    }
    function toggleDay(el) {
      if (!el) return;
      var day = el.getAttribute("data-day");
      if (!day) return;
      var was = el.classList.toggle("selected");
      el.setAttribute("aria-pressed", was ? "true" : "false");
      syncHiddenFromUI();
    }

    var nodes = Array.from(document.querySelectorAll(".srv-day"));
    nodes.forEach(function (n) {
      try {
        n.setAttribute("tabindex", "0");
        n.setAttribute("role", "button");
        n.setAttribute("aria-pressed", "false");
        n.addEventListener("click", function () {
          toggleDay(n);
        });
        n.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleDay(n);
          }
        });
      } catch (e) {}
    });
    var initial = readHidden();
    if (initial && initial.length) {
      nodes.forEach(function (n) {
        var d = n.getAttribute("data-day");
        if (initial.indexOf(d) !== -1) {
          n.classList.add("selected");
          n.setAttribute("aria-pressed", "true");
        }
      });
    }
    syncHiddenFromUI();
    window._srv = window._srv || {};
    window._srv.getSelectedDays = function () {
      try {
        return JSON.parse(document.getElementById("diasDisponibles").value);
      } catch (e) {
        return [];
      }
    };

    // Force inline styles for days container (fallback)
    function applyDaysInline() {
      try {
        var containers = document.querySelectorAll(".srv-days");
        containers.forEach(function (c) {
          c.style.setProperty("display", "flex", "important");
          c.style.setProperty("flex-direction", "row", "important");
          c.style.setProperty("flex-wrap", "wrap", "important");
          c.style.setProperty("gap", "0.5rem", "important");
          c.style.setProperty("align-items", "center", "important");
          c.style.setProperty("justify-content", "flex-start", "important");
          c.style.setProperty("margin-top", "0.35rem", "important");
          c.style.setProperty("padding", "0", "important");
        });
        document.querySelectorAll(".srv-day").forEach(function (n) {
          n.style.setProperty("display", "inline-flex", "important");
          n.style.setProperty("align-items", "center", "important");
          n.style.setProperty("justify-content", "center", "important");
          n.style.setProperty("width", "40px", "important");
          n.style.setProperty("height", "40px", "important");
          n.style.setProperty("min-width", "40px", "important");
          n.style.setProperty("padding", "0", "important");
          n.style.setProperty("margin", "0", "important");
          n.style.setProperty("box-sizing", "border-box", "important");
          n.style.setProperty("line-height", "1", "important");
          n.style.setProperty("position", "relative", "important");
        });
      } catch (e) {}
    }
    applyDaysInline();
    var ddAttempts = 0;
    var ddId = setInterval(function () {
      applyDaysInline();
      ddAttempts++;
      if (ddAttempts > 25) clearInterval(ddId);
    }, 120);
    var ddMo = new MutationObserver(function () {
      applyDaysInline();
    });
    ddMo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", applyDaysInline);

    // Toggle account number visibility
    try {
      var toggleBtn = document.getElementById("toggleAccountNumber");
      var acctInput = document.getElementById("numeroCuenta");
      if (toggleBtn && acctInput) {
        toggleBtn.addEventListener("click", function () {
          try {
            if (acctInput.type === "password") {
              acctInput.type = "text";
              toggleBtn.setAttribute("aria-label", "Ocultar número de cuenta");
            } else {
              acctInput.type = "password";
              toggleBtn.setAttribute("aria-label", "Mostrar número de cuenta");
            }
          } catch (e) {}
        });
      }
    } catch (e) {}

    // Price feedback (simple validation/display)
    try {
      var precioEl = document.getElementById("precio");
      var feedback = document.getElementById("precio-feedback");
      if (precioEl && feedback) {
        precioEl.addEventListener("input", function () {
          try {
            var v = Number(precioEl.value) || 0;
            if (!v) {
              feedback.style.display = "none";
              return;
            }
            if (v < 10000) {
              feedback.textContent = "El precio es muy bajo.";
              feedback.style.display = "block";
            } else if (v > 500000) {
              feedback.textContent =
                "El precio es alto, verifica si es correcto.";
              feedback.style.display = "block";
            } else {
              feedback.textContent = "";
              feedback.style.display = "none";
            }
          } catch (e) {}
        });
      }
    } catch (e) {}
  } catch (e) {}
});

/**
 * Helper: devuelve el modal de experto preferido.
 * Prioriza el id "expertModal" si existe, si no devuelve el primer elemento con
 * la clase `.modal-expert` en el documento.
 */
function getExpertModal() {
  try {
    const byId = document.getElementById("expertModal");
    if (byId) return byId;
    return document.querySelector(".modal-expert");
  } catch (e) {
    return null;
  }
}

/* editar experto */
onDomReady(() => {
  const modal = document.getElementById("editarExperto");
  const closeBtn = modal.querySelector(".btn-close");
  const cancelBtn = modal.querySelector(".modal-editar-cancelar");

  const nombreInput = document.getElementById("nombreExperto");
  const correoInput = document.getElementById("correoExperto");
  const especialidadInput = document.getElementById("especialidadExperto");
  const estadoSelect = document.getElementById("estadoExperto");
  const fechaRegistroInput = document.getElementById("fechaRegistroExperto");
  const sesionesInput = document.getElementById("sesionesExperto");
  const calificacionInput = document.getElementById("calificacionExperto");

  // Abrir modal con datos del experto
  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest("tr");
      const nombre = row.querySelector("h4").textContent.trim();
      const correo = row.querySelector("span").textContent.trim();
      // Use td cell indexes to avoid relying on children[] which shifts when columns change
      const tds = row ? Array.from(row.querySelectorAll("td")) : [];
      const especialidad = tds[3] ? tds[3].textContent.trim() : "";
      const estado = row.querySelector(".status")
        ? row.querySelector(".status").textContent.trim()
        : "";
      const fechaRegistro = tds[4] ? tds[4].textContent.trim() : "";

      nombreInput.value = nombre;
      correoInput.value = correo;
      especialidadInput.value = especialidad;
      estadoSelect.value = estado;
      fechaRegistroInput.value = fechaRegistro;
      sesionesInput.value = tds[5] ? tds[5].textContent.trim() : "";
      calificacionInput.value = tds[6] ? tds[6].textContent.trim() : "";

      modal.style.display = "flex";
    });
  });

  // Cerrar modal con la X
  closeBtn.addEventListener("click", () => (modal.style.display = "none"));

  // Cerrar modal con el botón cancelar
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => (modal.style.display = "none"));
  }

  // Cerrar modal al hacer click fuera del contenido
  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  // Evento para guardar
  document
    .getElementById("formEditarExperto")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      modal.style.display = "none";
    });
});

// The delegated handler in setupDelegatedActions() covers 'Ver perfil' actions
// and fills the #verPerfilExperto modal using scoped queries. No duplicate
// initialization is necessary here.

onDomReady(() => {
  // Modal inactivar experto
  const modalInactivar = document.getElementById("modalInactivarExperto");
  const closeBtnInactivar = modalInactivar
    ? modalInactivar.querySelector(".btn-close")
    : null;
  const cancelarBtnInactivar = modalInactivar
    ? modalInactivar.querySelector(".modal-inactivar-cancelar")
    : null;
  const confirmarBtnInactivar = modalInactivar
    ? modalInactivar.querySelector(".modal-inactivar-confirmar")
    : null;
  const nombreInactivar = document.getElementById(
    "modalInactivarExpertoNombre"
  );
  let rowToInactivate = null;

  document.querySelectorAll(".btn-icon[title='Eliminar']").forEach((button) => {
    button.addEventListener("click", () => {
      rowToInactivate = button.closest("tr");
      const nombre = rowToInactivate.querySelector("h4").textContent.trim();
      nombreInactivar.textContent = nombre;
      modalInactivar.style.display = "flex";
    });
  });

  if (closeBtnInactivar) {
    closeBtnInactivar.addEventListener(
      "click",
      () => (modalInactivar.style.display = "none")
    );
  }
  if (cancelarBtnInactivar) {
    cancelarBtnInactivar.addEventListener(
      "click",
      () => (modalInactivar.style.display = "none")
    );
  }
  if (modalInactivar) {
    window.addEventListener("click", (e) => {
      if (e.target === modalInactivar) modalInactivar.style.display = "none";
    });
  }
  if (confirmarBtnInactivar) {
    confirmarBtnInactivar.addEventListener("click", () => {
      if (rowToInactivate) {
        // Cambia el estado visualmente a inactivo
        const statusCell = rowToInactivate.querySelector(".status");
        if (statusCell) {
          statusCell.className = "status inactive";
          statusCell.textContent = "Inactivo";
        }
      }
      modalInactivar.style.display = "none";
    });
  }
});

/**
 * Configura los filtros para la lista de expertos
 */
function setupExpertFilters() {
  const container = document.querySelector(".expertos-filtros");
  if (!container) return;

  // Prefer explicit ids for robustness
  const statusSelect =
    container.querySelector("select#filterEstado") ||
    container.querySelectorAll("select")[0];
  const categorySelect =
    document.getElementById("filterCategoria") ||
    container.querySelectorAll("select")[1];
  const ratingSelect =
    container.querySelector("select:nth-of-type(3)") ||
    container.querySelectorAll("select")[2];

  const applyBtn = container.querySelector(".expertos-filtros__btn");

  const applyFilters = () => {
    const status = statusSelect ? statusSelect.value : "";
    const category = categorySelect ? categorySelect.value : "";
    const minRating =
      ratingSelect && ratingSelect.value ? Number(ratingSelect.value) : null;
    // Normalize to backend param names: estado, categoria, minRating
    window._adminFilters = {
      estado: status || null,
      categoria: category || null,
      minRating,
    };
    // resetear a primera página al aplicar filtros
    window._adminCurrentPage = 1;
    loadExpertos();
  };

  if (applyBtn) {
    applyBtn.addEventListener("click", function (e) {
      e.preventDefault();
      applyFilters();
    });
  }

  // permitir aplicar automáticamente al cambiar un select
  [statusSelect, categorySelect, ratingSelect].forEach((sel) => {
    if (!sel) return;
    sel.addEventListener("change", () => {
      // ligero debounce: esperar 120ms para evitar múltiples llamadas seguidas
      if (sel._filterTimer) clearTimeout(sel._filterTimer);
      sel._filterTimer = setTimeout(() => applyFilters(), 120);
    });
  });

  // Si no existe un botón de reset, crear uno al lado del aplicar
  let resetBtn = container.querySelector(".expertos-filtros__reset");
  if (!resetBtn) {
    resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "btn-outline expertos-filtros__reset";
    resetBtn.textContent = "Limpiar filtros";
    if (applyBtn && applyBtn.parentNode)
      applyBtn.parentNode.insertBefore(resetBtn, applyBtn.nextSibling);
  }
  resetBtn.addEventListener("click", function () {
    if (statusSelect) statusSelect.value = "";
    if (categorySelect) categorySelect.value = "";
    if (ratingSelect) ratingSelect.value = "";
    window._adminFilters = {};
    window._adminCurrentPage = 1;
    loadExpertos();
  });
}

/**
 * Configura las acciones para la gestión de expertos
 */
function setupExpertActions() {
  const editButtons = document.querySelectorAll(".expert-edit");
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const expertId = this.getAttribute("data-id");
      console.log(`Editar experto ID: ${expertId}`);
    });
  });

  const deleteButtons = document.querySelectorAll(".expert-delete");
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const expertId = this.getAttribute("data-id");
      const expertName = this.getAttribute("data-name");
      const email = this.getAttribute("data-email") || null;
      const display = email ? `${expertName} <${email}>` : expertName;
      if (!confirm(`¿Eliminar al experto "${display}"?`)) return;
      console.log(`Experto eliminado: ${expertName}`);
    });
  });

  const viewButtons = document.querySelectorAll(".expert-view");
  viewButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const expertId = this.getAttribute("data-id");
      console.log(`Ver perfil del experto ID: ${expertId}`);
    });
  });
}

/**
 * Configura la funcionalidad para verificar expertos
 */
function setupExpertVerification() {
  const verifyButtons = document.querySelectorAll(".verify-expert");

  verifyButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const expertId = this.getAttribute("data-id");
      const expertName = this.getAttribute("data-name");

      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      this.disabled = true;

      setTimeout(() => {
        this.innerHTML = '<i class="fas fa-check-circle"></i> Verificado';
        this.classList.remove("btn-warning");
        this.classList.add("btn-success");

        const statusCell = this.closest("tr").querySelector(".status");
        if (statusCell) {
          statusCell.innerHTML =
            '<span class="status verified">Verificado</span>';
        }

        console.log(`Experto verificado: ${expertName}`);
      }, 1500);
    });
  });
}

/**
 * Abre el modal para agregar un nuevo experto.
 */
function abrirModalAgregarExperto() {
  const modal = getExpertModal();
  if (modal) {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}

/**
 * Envía los datos del nuevo experto al backend y actualiza la tabla.
 */
async function agregarExperto(datosExperto) {
  try {
    // Registrar usuario usando el endpoint de registro y asignando rol 'experto'.
    // Generamos una contraseña temporal que el experto podrá resetear luego.
    const randomPassword = Math.random().toString(36).slice(-10) + "A1!";
    // datosExperto podría contener nombre completo en `nombre`.
    const fullName = datosExperto.nombre || datosExperto.name || "";
    const parts = fullName.split(" ");
    const nombre = parts.shift() || fullName;
    const apellido = parts.join(" ") || "";

    const payload = {
      nombre,
      apellido,
      email: datosExperto.email,
      password: randomPassword,
      roles: ["experto"],
    };

    const headers = await getHeaders();
    // provide UI feedback if called from modal save button
    const saveBtn = document.getElementById("saveExpert");
    const prevSaveTxt = saveBtn && saveBtn.textContent;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Creando...";
    }

    const res = await fetch("/api/usuarios/registro", {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, headers),
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // Intentar extraer un mensaje de error legible del backend.
      let errBody = null;
      try {
        errBody = await res.json();
      } catch (e) {
        // si no es JSON, leer como texto
        try {
          const t = await res.text();
          errBody = t || null;
        } catch (e2) {
          errBody = null;
        }
      }

      // Priorizar campos comunes: 'mensaje', 'message', 'error'
      let userMessage = "Error al registrar experto";
      if (errBody) {
        if (typeof errBody === "string") userMessage = errBody;
        else if (errBody.mensaje) userMessage = errBody.mensaje;
        else if (errBody.message) userMessage = errBody.message;
        else if (errBody.error) userMessage = errBody.error;
        else userMessage = JSON.stringify(errBody);
      }
      // Mostrar mensaje al usuario y propagar error para el flujo llamador
      showMessage(userMessage, "error", 5000);
      throw new Error(userMessage);
    }

    const nuevo = await res.json();
    console.log("Usuario experto registrado:", nuevo);
    showMessage(
      `Experto creado: ${datosExperto.email}. Contraseña temporal: ${randomPassword}`,
      "success",
      6000
    );

    // Si el modal contenía campos de perfil de experto, enviar un PUT
    // para garantizar que el subdocumento infoExperto se persista completamente
    try {
      const headers = await getHeaders();
      // prep headers and include x-api-key if present globally
      if (window.API_KEY) headers["x-api-key"] = window.API_KEY;

      // Construir payload minimo para infoExperto tomando valores del modal si existen
      // Si `datosExperto.infoExperto` fue pasado desde el modal (save handler), usarlo como base
      const maybeInfo = Object.assign({}, datosExperto.infoExperto || {});
      try {
        // Preferir valores ya calculados en `datosExperto.infoExperto` o en el modal estándar
        if (!maybeInfo.especialidad) {
          const specialSel =
            document.getElementById("specialty") ||
            document.getElementById("especialidadInput");
          if (specialSel && specialSel.value)
            maybeInfo.especialidad = specialSel.value;
        }
      } catch (e) {}
      try {
        if (!maybeInfo.descripcion) {
          const bioEl =
            document.getElementById("bio") ||
            document.getElementById("descripcionInput");
          if (bioEl && bioEl.value) maybeInfo.descripcion = bioEl.value;
        }
      } catch (e) {}
      // categorias select puede venir como select multiple con option:selected
      try {
        const categoriasEl = document.getElementById("categorias");
        if (categoriasEl) {
          const vals = Array.from(categoriasEl.selectedOptions || []).map(
            (o) => o.value
          );
          if (vals.length > 0) maybeInfo.categorias = vals;
        }
      } catch (e) {}
      try {
        const skillsInst =
          window._choicesInstances && window._choicesInstances["skills"];
        if (skillsInst && Array.isArray(skillsInst.getValue(true)))
          maybeInfo.skills = skillsInst.getValue(true);
      } catch (e) {}

      // Si tenemos al menos una propiedad en maybeInfo, enviar PUT para completar infoExperto
      if (Object.keys(maybeInfo).length > 0) {
        const putPayload = { roles: ["experto"], infoExperto: maybeInfo };
        try {
          const putRes = await fetch(
            `/api/usuarios/${encodeURIComponent(datosExperto.email)}`,
            {
              method: "PUT",
              headers: Object.assign(
                { "Content-Type": "application/json" },
                headers
              ),
              credentials: "same-origin",
              body: JSON.stringify(putPayload),
            }
          );
          if (!putRes.ok) {
            console.warn("PUT infoExperto failed", await putRes.text());
          } else {
            console.log(
              "infoExperto persisted via PUT for",
              datosExperto.email
            );
            // Verificación adicional: obtener el usuario actualizado y loguearlo
            try {
              const verifyRes = await fetch(
                `/api/usuarios/${encodeURIComponent(datosExperto.email)}`,
                {
                  method: "GET",
                  headers: await getHeaders(),
                  credentials: "same-origin",
                }
              );
              if (verifyRes.ok) {
                const userUpdated = await verifyRes.json();
                console.log("Verified user after PUT:", userUpdated);
              } else {
                console.warn(
                  "Could not verify user after PUT",
                  verifyRes.status
                );
              }
            } catch (ve) {
              console.warn("Error fetching user for verification", ve);
            }
          }
        } catch (e) {
          console.warn("Error persisting infoExperto via PUT:", e);
        }
      }
    } catch (e) {
      console.warn("No se pudo completar PUT infoExperto post-creacion:", e);
    }

    // recargar lista de expertos
    try {
      await loadExpertos();
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        if (prevSaveTxt) saveBtn.textContent = prevSaveTxt;
      }
    }
    return nuevo;
  } catch (error) {
    console.error("Error:", error);
    showMessage(error.message || "Error al agregar experto", "error");
    // ensure UI restores button state
    const saveBtnErr = document.getElementById("saveExpert");
    if (saveBtnErr) {
      saveBtnErr.disabled = false;
      saveBtnErr.textContent = "Guardar experto";
    }
    throw error;
  }
}

/**
 * Abre el modal para editar un experto existente.
 */
function abrirModalEditarExperto(expertoId) {
  const modal = document.getElementById("editarExperto");
  if (modal) {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    // Aquí puedes agregar código para cargar los datos del experto a editar
  }
}

/**
 * Abre y rellena el modal común de edición `.modal-expert` para el experto dado.
 */
async function openExpertEditModal(expertoId) {
  try {
    const expertos = window._adminExpertos || [];
    const ex = expertos.find((x) => String(x._id) === String(expertoId));
    if (!ex) return showMessage("Experto no encontrado", "error");
    const modal = getExpertModal();
    if (!modal) return;

    // Reutilizar el mismo mapeo que antes (precio, dias, bio, categorias, skills, avatar, bank)
    const assign = (sel, value) => {
      try {
        const el = document.getElementById(sel);
        if (!el) return;
        if (typeof value === "undefined" || value === null) value = "";
        if ("value" in el) el.value = value;
        else el.textContent = String(value);
      } catch (e) {}
    };

    assign("name", ex.nombre || ex.email || "");
    assign("email", ex.email || "");

    const precioVal =
      (ex.infoExperto &&
        (ex.infoExperto.precioPorHora || ex.infoExperto.precio)) ||
      ex.precioPorHora ||
      ex.precio ||
      "";
    assign("precio", precioVal);

    try {
      const dias =
        (ex.infoExperto && ex.infoExperto.diasDisponibles) ||
        ex.diasDisponibles ||
        [];
      const diasEl = document.getElementById("diasDisponibles");
      if (diasEl)
        diasEl.value = Array.isArray(dias) ? dias.join(",") : dias || "";
      const display = modal.querySelector(".srv-days-display");
      if (display)
        display.textContent =
          Array.isArray(dias) && dias.length
            ? dias.join(", ")
            : "Ningún día seleccionado";
      modal.querySelectorAll(".srv-day").forEach((b) => {
        try {
          const d = b.dataset.day;
          b.setAttribute(
            "aria-pressed",
            Array.isArray(dias) && dias.indexOf(d) !== -1 ? "true" : "false"
          );
        } catch (e) {}
      });
    } catch (e) {}

    assign(
      "specialty",
      (ex.infoExperto && ex.infoExperto.especialidad) || ex.especialidad || ""
    );
    assign("status", ex.estado || "active");
    const descripcion =
      (ex.infoExperto && (ex.infoExperto.descripcion || ex.infoExperto.bio)) ||
      ex.descripcion ||
      ex.bio ||
      "";
    assign("bio", descripcion);

    try {
      const preview = document.getElementById("profilePreview");
      if (preview) {
        const img = preview.querySelector("img");
        const avatarUrl =
          (ex.infoExperto && ex.infoExperto.avatarUrl) ||
          ex.avatarUrl ||
          ex.avatar ||
          "";
        if (img) img.src = avatarUrl || "";
        const removeBtn = document.getElementById("removeProfileBtn");
        if (removeBtn)
          removeBtn.style.display = avatarUrl ? "inline-block" : "none";
        preview.style.display = avatarUrl ? "block" : "none";
        const avatarInput = document.getElementById("avatarUrl");
        if (avatarInput) avatarInput.value = avatarUrl || "";
      }
    } catch (e) {}

    try {
      const bankKeys = [
        "banco",
        "tipoCuenta",
        "numeroCuenta",
        "titular",
        "tipoDocumento",
        "numeroDocumento",
        "telefonoContacto",
      ];
      bankKeys.forEach((k) => {
        try {
          const el = document.getElementById(k);
          if (!el) return;
          const val =
            (ex.infoExperto && typeof ex.infoExperto[k] !== "undefined"
              ? ex.infoExperto[k]
              : ex[k]) || "";
          el.value = val;
        } catch (e) {}
      });
    } catch (e) {}

    try {
      await loadAdminCategorias();
      const categoriasEl = document.getElementById("categorias");
      if (categoriasEl) {
        const cats =
          (ex.infoExperto &&
            Array.isArray(ex.infoExperto.categorias) &&
            ex.infoExperto.categorias) ||
          ex.categorias ||
          [];
        const vals = (Array.isArray(cats) ? cats : []).map((c) => {
          if (!c) return String(c);
          if (typeof c === "object")
            return String(
              c._id || c.id || c.value || c.nombre || c.name || c.label || c
            );
          return String(c);
        });
        Array.from(categoriasEl.options).forEach((opt) => {
          opt.selected = vals.indexOf(String(opt.value)) !== -1;
        });
        initializeChoicesOn(
          "categorias",
          {
            removeItemButton: true,
            searchEnabled: true,
            placeholder: true,
            placeholderValue: "Selecciona categorías",
          },
          "categorias"
        );
      }
    } catch (e) {}

    try {
      const skillsEl = document.getElementById("skills");
      if (skillsEl) {
        const skillsArr =
          (ex.infoExperto &&
            Array.isArray(ex.infoExperto.skills) &&
            ex.infoExperto.skills) ||
          ex.skills ||
          [];
        skillsEl.innerHTML = "";
        (Array.isArray(skillsArr) ? skillsArr : []).forEach((s) => {
          try {
            const opt = document.createElement("option");
            if (typeof s === "object")
              opt.value =
                s.nombre || s.name || s._id || s.id || JSON.stringify(s);
            else opt.value = s;
            opt.textContent =
              typeof s === "object"
                ? s.nombre || s.name || s._id || s.id || String(opt.value)
                : s;
            opt.selected = true;
            skillsEl.appendChild(opt);
          } catch (e) {}
        });
        initializeChoicesOn(
          "skills",
          {
            removeItemButton: true,
            searchEnabled: true,
            addItems: true,
            placeholder: true,
            placeholderValue: "Selecciona habilidades",
          },
          "skills"
        );
      }
    } catch (e) {}

    const form = document.getElementById("expertForm");
    if (form) form.dataset.editId = expertoId;
    try {
      const titleEl = modal.querySelector(".modal-expert__title");
      if (titleEl) titleEl.textContent = "Editar experto";
    } catch (e) {}

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  } catch (err) {
    console.error("openExpertEditModal error", err);
    showMessage("No se pudo abrir el modal de edición", "error");
  }
}

/**
 * Verifica o desverifica un experto.
 */
async function cambiarVerificacionExperto(expertoId, verificado) {
  try {
    const headers = await getHeaders();
    const response = await fetch(`/api/experto/${expertoId}/verificar`, {
      method: verificado ? "DELETE" : "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, headers),
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error("Error al cambiar verificación del experto");
    }

    const expertoActualizado = await response.json();
    console.log("Estado de verificación actualizado:", expertoActualizado);

    // Aquí puedes agregar código para actualizar el estado de verificación en la tabla
  } catch (error) {
    console.error("Error:", error);
  }
}

/**
 * Elimina un experto de la base de datos.
 */
async function eliminarExperto(expertoId) {
  try {
    // El backend espera el email en la ruta: /api/usuarios/expertos/:email
    const identifier = expertoId || "";
    const encoded = encodeURIComponent(identifier);
    // Provide UI feedback: find button in row and disable it
    let btn = null;
    try {
      btn =
        document.querySelector(`button[data-email="${expertoId}"]`) ||
        document.querySelector(`button[data-id="${expertoId}"]`);
    } catch (e) {
      btn = null;
    }
    const prevHtml = btn && btn.innerHTML;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }

    const res = await fetch(`/api/usuarios/expertos/${encoded}`, {
      method: "DELETE",
      headers: await getHeaders(),
      credentials: "same-origin",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.mensaje || "Error al eliminar experto");
    }
    showMessage("Experto eliminado", "success");
    try {
      await loadExpertos();
    } finally {
      if (btn) {
        btn.disabled = false;
        if (prevHtml) btn.innerHTML = prevHtml;
      }
    }
  } catch (error) {
    console.error("Error:", error);
    showMessage(error.message || "Error al eliminar experto", "error");
  }
}

// --- Helpers: loadExpertos, getHeaders, escapeHtml, showMessage, edit submit handler
async function loadExpertos() {
  try {
    // ensure categories available for mapping ids -> names
    if (!window._adminCategorias || !Array.isArray(window._adminCategorias)) {
      try {
        await loadAdminCategorias();
      } catch (e) {
        // ignore errors, we'll still render ids as fallback
      }
    }
    // show loading placeholder immediately so the user sees feedback
    const tbody = document.querySelector(
      ".expertos-grid__tabla .admin-table tbody"
    );
    if (tbody) {
      tbody.innerHTML = `<tr class="placeholder-row"><td colspan="8" style="text-align:center;padding:24px;color:#9aa0a6;">Cargando expertos...</td></tr>`;
    }

    // Si ya tenemos expertos inyectados desde el servidor (dev), renderizarlos inmediatamente
    if (
      Array.isArray(window._adminExpertos) &&
      window._adminExpertos.length > 0
    ) {
      try {
        renderExpertos(
          window._adminExpertos,
          window._adminExpertosTotal || window._adminExpertos.length
        );
      } catch (e) {
        debugLog("adminExpertos: error rendering initial experts", e);
      }
    }

    // construir query params para paginación server-side y filtros
    if (!window._adminCurrentPage) window._adminCurrentPage = 1;
    if (!window._adminPageSize) window._adminPageSize = 7;
    const page = parseInt(window._adminCurrentPage, 10) || 1;
    const limit = parseInt(window._adminPageSize, 10) || 7;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    const filters = window._adminFilters || {};
    if (filters.estado) params.set("estado", filters.estado);
    if (filters.categoria) params.set("categoria", filters.categoria);
    if (typeof filters.minRating === "number" && !isNaN(filters.minRating))
      params.set("minRating", String(filters.minRating));

    const url = `/api/usuarios/expertos?${params.toString()}`;
    const res = await fetch(url, {
      headers: await getHeaders(),
      credentials: "same-origin",
    });
    if (!res.ok) {
      console.error("Error al obtener expertos", res.status);
      // Si no estamos autenticados como admin, informar al usuario claramente
      const status = res.status;
      const tbody = document.querySelector(
        ".expertos-grid__tabla .admin-table tbody"
      );
      if (tbody) tbody.innerHTML = ""; // eliminar filas estáticas si las hay
      if (status === 401 || status === 403) {
        showMessage(
          "Necesitas iniciar sesión como administrador para ver la lista de expertos.",
          "error",
          7000
        );
      } else {
        showMessage("Error al cargar expertos", "error");
      }
      return;
    }
    const data = await res.json();
    // El backend devuelve { expertos: [...], total } para paginación server-side.
    const expertos = Array.isArray(data) ? data : data.expertos || [];
    const total = typeof data.total === "number" ? data.total : expertos.length;
    // guardar lista actual de la página (útil para acciones en fila)
    window._adminExpertos = expertos;
    window._adminExpertosTotal = total;

    // DEBUG: mostrar una muestra del primer experto y categorias disponibles
    try {
      debugLog("adminExpertos: sample experto:", expertos[0]);
      debugLog(
        "adminExpertos: adminCategorias:",
        window._adminCategorias || []
      );
    } catch (e) {}

    // servidor devuelve la página solicitada (experts) y el total
    const pageSize = parseInt(window._adminPageSize, 10) || 7;
    const currentPage = parseInt(window._adminCurrentPage, 10) || 1;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    window._adminCurrentPage = safePage;

    // Delegar render a helper para mantener código consistente
    renderExpertos(expertos, total);
  } catch (err) {
    console.error("Error cargando expertos:", err);
    showMessage("Error al cargar expertos.", "error");
  }
}

/**
 * Renderiza la UI de paginación (info y controles) dentro de la sección de paginación
 * Parámetros: { total, pageSize, currentPage, totalPages, showingStart, showingEnd }
 */
function renderPagination(opts) {
  const containerInfo = document.querySelector(".expertos-paginacion__info");
  const containerControls = document.querySelector(
    ".expertos-paginacion__controles"
  );
  if (!containerInfo || !containerControls) return;

  const {
    total = 0,
    pageSize = 7,
    currentPage = 1,
    totalPages = 1,
    showingStart = 0,
    showingEnd = 0,
  } = opts || {};
  containerInfo.textContent = `Mostrando ${showingStart || 0}-${
    showingEnd || 0
  } de ${total} expertos`;

  // Limpiar controles y construir prev, páginas y next
  containerControls.innerHTML = "";

  const prevBtn = document.createElement("button");
  prevBtn.className =
    "expertos-paginacion__btn" +
    (currentPage <= 1 ? " expertos-paginacion__btn--disabled" : "");
  prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
  prevBtn.disabled = currentPage <= 1;
  prevBtn.addEventListener("click", async () => {
    if (currentPage <= 1) return;
    window._adminCurrentPage = currentPage - 1;
    await loadExpertos();
  });
  containerControls.appendChild(prevBtn);

  // Mostrar hasta 5 páginas alrededor del actual
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let p = startPage; p <= endPage; p++) {
    const btn = document.createElement("button");
    btn.className =
      "expertos-paginacion__btn" +
      (p === currentPage ? " expertos-paginacion__btn--active" : "");
    btn.textContent = String(p);
    btn.addEventListener("click", async () => {
      window._adminCurrentPage = p;
      await loadExpertos();
    });
    containerControls.appendChild(btn);
  }

  if (endPage < totalPages) {
    const ell = document.createElement("span");
    ell.className = "expertos-paginacion__ellipsis";
    ell.textContent = "...";
    containerControls.appendChild(ell);

    const lastBtn = document.createElement("button");
    lastBtn.className = "expertos-paginacion__btn";
    lastBtn.textContent = String(totalPages);
    lastBtn.addEventListener("click", async () => {
      window._adminCurrentPage = totalPages;
      await loadExpertos();
    });
    containerControls.appendChild(lastBtn);
  }

  const nextBtn = document.createElement("button");
  nextBtn.className =
    "expertos-paginacion__btn" +
    (currentPage >= totalPages ? " expertos-paginacion__btn--disabled" : "");
  nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
  nextBtn.disabled = currentPage >= totalPages;
  nextBtn.addEventListener("click", async () => {
    if (currentPage >= totalPages) return;
    window._adminCurrentPage = currentPage + 1;
    await loadExpertos();
  });
  containerControls.appendChild(nextBtn);
}

/**
 * Renderiza la lista de expertos en la tabla principal.
 * Maneja mapeo de categorías (ids o objetos poblados) y especialidad.
 */
function renderExpertos(expertos, total) {
  const tbody = document.querySelector(
    ".expertos-grid__tabla .admin-table tbody"
  );
  if (!tbody) return;

  // Calcular paginación consistente con loadExpertos
  const pageSize = parseInt(window._adminPageSize, 10) || 7;
  const currentPage = parseInt(window._adminCurrentPage, 10) || 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  window._adminCurrentPage = safePage;

  tbody.innerHTML = "";
  expertos.forEach((ex) => {
    const tr = document.createElement("tr");
    tr.dataset.id = ex._id;

    let catsHtml = "";
    try {
      const cats =
        ex.infoExperto && Array.isArray(ex.infoExperto.categorias)
          ? ex.infoExperto.categorias
          : ex.categorias || [];
      const adminCats = Array.isArray(window._adminCategorias)
        ? window._adminCategorias
        : [];
      const names = (Array.isArray(cats) ? cats : [])
        .map((c) => {
          if (!c) return null;
          if (typeof c === "string" || typeof c === "number") {
            const found = adminCats.find(
              (ac) =>
                String(ac._id) === String(c) || String(ac.id) === String(c)
            );
            if (found) return found.nombre || found.name || String(found._id);
            return String(c);
          }
          if (typeof c === "object") {
            return (
              c.nombre || c.name || c.label || (c._id ? String(c._id) : null)
            );
          }
          return String(c);
        })
        .filter(Boolean);

      if (names.length === 0 && Array.isArray(cats) && cats.length > 0) {
        const fallbackNames = cats
          .map((c) => {
            try {
              if (!c) return null;
              if (typeof c === "object")
                return c.nombre || c.name || (c._id ? String(c._id) : null);
              return String(c);
            } catch (er) {
              return null;
            }
          })
          .filter(Boolean);
        if (fallbackNames.length > 0) {
          catsHtml = `<div class="user-cats">${fallbackNames
            .map((n) => `<span class="badge">${escapeHtml(n)}</span>`)
            .join(" ")}</div>`;
        }
      } else if (names.length > 0) {
        catsHtml = `<div class="user-cats">${names
          .map((n) => `<span class="badge">${escapeHtml(n)}</span>`)
          .join(" ")}</div>`;
      }
    } catch (e) {
      catsHtml = "";
    }

    let especialidadDisplay = "-";
    try {
      if (
        ex.infoExperto &&
        ex.infoExperto.especialidad &&
        String(ex.infoExperto.especialidad).trim() !== ""
      ) {
        especialidadDisplay = ex.infoExperto.especialidad;
      } else if (ex.especialidad && String(ex.especialidad).trim() !== "") {
        especialidadDisplay = ex.especialidad;
      }
    } catch (e) {
      especialidadDisplay = ex.especialidad || "-";
    }

    tr.innerHTML = `
      <td><input type="checkbox" class="expertos-checkbox"/></td>
      <td>
        <div class="user-info">
          <img src="${escapeHtml(
            ex.avatarUrl || "https://i.pravatar.cc/100"
          )}" alt="Experto" />
          <div>
            <h4>${escapeHtml(ex.nombre || ex.email)}</h4>
            <span>${escapeHtml(ex.email || "")}</span>
          </div>
        </div>
      </td>
      <td>${catsHtml}</td>
      <td>${escapeHtml(especialidadDisplay || "-")}</td>
      <td>${escapeHtml((ex.fechaRegistro || "").split("T")[0] || "")}</td>
      <td>${ex.sesionesCount || 0}</td>
      <td>${escapeHtml(ex.calificacion || "Sin calificaciones")}</td>
      <td><span class="status ${
        ex.estado === "inactive" ? "inactive" : "active"
      }">${escapeHtml(ex.estado || "Activo")}</span></td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon expert-edit" title="Editar" data-id="${
            ex._id
          }" data-name="${escapeHtml(
      ex.nombre || ex.email
    )}"><i class="fas fa-edit"></i></button>
          <button class="btn-icon expert-view" title="Ver perfil" data-id="${
            ex._id
          }"><i class="fas fa-eye"></i></button>
          <button class="btn-icon expert-delete" title="Eliminar" data-id="${
            ex._id
          }" data-email="${escapeHtml(ex.email || "")}" data-name="${escapeHtml(
      ex.nombre || ex.email
    )}"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);

    // Log para depuración rápida en caso de filas sin infoExperto
    if (!ex.infoExperto) {
      try {
        debugLog("adminExpertos: experto sin infoExperto", ex.email || ex._id);
      } catch (e) {}
    }
  });

  const showingStart = (safePage - 1) * pageSize + 1;
  const showingEnd = (safePage - 1) * pageSize + expertos.length;
  renderPagination({
    total,
    pageSize,
    currentPage: safePage,
    totalPages,
    showingStart,
    showingEnd,
  });
  showMessage("Expertos cargados.", "info", 800);
}

/**
 * Manejador delegado para acciones dinámicas en la tabla de expertos.
 * Usa event delegation para cubrir filas cargadas dinámicamente.
 */
function setupDelegatedActions() {
  const tbody = document.querySelector(
    ".expertos-grid__tabla .admin-table tbody"
  );
  if (!tbody) return;

  // Click delegation
  tbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const title = btn.getAttribute("title") || "";
    const row = btn.closest("tr");
    const id = btn.dataset.id || (row && row.dataset.id);

    if (title === "Editar" || btn.classList.contains("expert-edit")) {
      // Abrir el modal común de "Agregar/Editar" experto (.modal-expert)
      const expertos = window._adminExpertos || [];
      const ex = expertos.find((x) => String(x._id) === String(id));
      if (!ex) return showMessage("Experto no encontrado", "error");
      const modal = getExpertModal();
      if (!modal) return;

      // Rellenar los campos del modal con la información registrada por el experto
      try {
        // Helper seguro para asignar values
        const assign = (sel, value) => {
          try {
            const el = document.getElementById(sel);
            if (!el) return;
            if (typeof value === "undefined" || value === null) value = "";
            if ("value" in el) el.value = value;
            else el.textContent = String(value);
          } catch (e) {}
        };

        assign("name", ex.nombre || ex.email || "");
        assign("email", ex.email || "");

        // Precio
        const precioVal =
          (ex.infoExperto &&
            (ex.infoExperto.precioPorHora || ex.infoExperto.precio)) ||
          ex.precioPorHora ||
          ex.precio ||
          "";
        assign("precio", precioVal);

        // Días disponibles
        try {
          const dias =
            (ex.infoExperto && ex.infoExperto.diasDisponibles) ||
            ex.diasDisponibles ||
            [];
          const diasEl = document.getElementById("diasDisponibles");
          if (diasEl)
            diasEl.value = Array.isArray(dias) ? dias.join(",") : dias || "";
          const display = modal.querySelector(".srv-days-display");
          if (display)
            display.textContent =
              Array.isArray(dias) && dias.length
                ? dias.join(", ")
                : "Ningún día seleccionado";
          modal.querySelectorAll(".srv-day").forEach((b) => {
            try {
              const d = b.dataset.day;
              b.setAttribute(
                "aria-pressed",
                Array.isArray(dias) && dias.indexOf(d) !== -1 ? "true" : "false"
              );
            } catch (e) {}
          });
        } catch (e) {}

        // Especialidad, estado y bio/descripcion
        assign(
          "specialty",
          (ex.infoExperto && ex.infoExperto.especialidad) ||
            ex.especialidad ||
            ""
        );
        assign("status", ex.estado || "active");
        // registro uses 'descripcion' field name; modal uses 'bio'
        const descripcion =
          (ex.infoExperto &&
            (ex.infoExperto.descripcion || ex.infoExperto.bio)) ||
          ex.descripcion ||
          ex.bio ||
          "";
        assign("bio", descripcion);

        // Avatar / preview
        try {
          const preview = document.getElementById("profilePreview");
          if (preview) {
            const img = preview.querySelector("img");
            const avatarUrl =
              (ex.infoExperto && ex.infoExperto.avatarUrl) ||
              ex.avatarUrl ||
              ex.avatar ||
              "";
            if (img) img.src = avatarUrl || "";
            const removeBtn = document.getElementById("removeProfileBtn");
            if (removeBtn)
              removeBtn.style.display = avatarUrl ? "inline-block" : "none";
            preview.style.display = avatarUrl ? "block" : "none";
            // set hidden avatarUrl input if present
            const avatarInput = document.getElementById("avatarUrl");
            if (avatarInput) avatarInput.value = avatarUrl || "";
          }
        } catch (e) {}

        // Datos bancarios
        try {
          const bankKeys = [
            "banco",
            "tipoCuenta",
            "numeroCuenta",
            "titular",
            "tipoDocumento",
            "numeroDocumento",
            "telefonoContacto",
          ];
          bankKeys.forEach((k) => {
            try {
              const el = document.getElementById(k);
              if (!el) return;
              const val =
                (ex.infoExperto && typeof ex.infoExperto[k] !== "undefined"
                  ? ex.infoExperto[k]
                  : ex[k]) || "";
              el.value = val;
            } catch (e) {}
          });
        } catch (e) {}

        // Categorías: asegurar opciones y marcar las seleccionadas
        try {
          await loadAdminCategorias();
          const categoriasEl = document.getElementById("categorias");
          if (categoriasEl) {
            const cats =
              (ex.infoExperto &&
                Array.isArray(ex.infoExperto.categorias) &&
                ex.infoExperto.categorias) ||
              ex.categorias ||
              [];
            const vals = (Array.isArray(cats) ? cats : []).map((c) => {
              if (!c) return String(c);
              if (typeof c === "object")
                return String(
                  c._id || c.id || c.value || c.nombre || c.name || c.label || c
                );
              return String(c);
            });
            Array.from(categoriasEl.options).forEach((opt) => {
              opt.selected = vals.indexOf(String(opt.value)) !== -1;
            });
            initializeChoicesOn(
              "categorias",
              {
                removeItemButton: true,
                searchEnabled: true,
                placeholder: true,
                placeholderValue: "Selecciona categorías",
              },
              "categorias"
            );
          }
        } catch (e) {}

        // Habilidades: reconstruir opciones seleccionadas y reiniciar Choices
        try {
          const skillsEl = document.getElementById("skills");
          if (skillsEl) {
            const skillsArr =
              (ex.infoExperto &&
                Array.isArray(ex.infoExperto.skills) &&
                ex.infoExperto.skills) ||
              ex.skills ||
              [];
            skillsEl.innerHTML = "";
            (Array.isArray(skillsArr) ? skillsArr : []).forEach((s) => {
              try {
                const opt = document.createElement("option");
                // si s es objeto intentar extraer nombre o id
                if (typeof s === "object")
                  opt.value =
                    s.nombre || s.name || s._id || s.id || JSON.stringify(s);
                else opt.value = s;
                opt.textContent =
                  typeof s === "object"
                    ? s.nombre || s.name || s._id || s.id || String(opt.value)
                    : s;
                opt.selected = true;
                skillsEl.appendChild(opt);
              } catch (e) {}
            });
            initializeChoicesOn(
              "skills",
              {
                removeItemButton: true,
                searchEnabled: true,
                addItems: true,
                placeholder: true,
                placeholderValue: "Selecciona habilidades",
              },
              "skills"
            );
          }
        } catch (e) {}

        // Indicar que el modal está en modo edición asignando edit id al form
        const form = document.getElementById("expertForm");
        if (form) form.dataset.editId = id;

        // Ajustar título del modal para reflejar edición
        try {
          const titleEl = modal.querySelector(".modal-expert__title");
          if (titleEl) titleEl.textContent = "Editar experto";
        } catch (e) {}
      } catch (e) {
        console.warn("Error rellenando modal de edición:", e);
      }

      modal.style.display = "flex";
      document.body.style.overflow = "hidden";
      return;
    }

    if (title === "Ver perfil" || btn.classList.contains("expert-view")) {
      const expertos = window._adminExpertos || [];
      const ex = expertos.find((x) => String(x._id) === String(id));
      if (!ex) return showMessage("Experto no encontrado", "error");

      // find modal root first so we can scope queries and avoid duplicate ID conflicts
      const modalVer = document.getElementById("verPerfilExperto");

      // Mapear datos del experto a los campos dentro de `modalVer`
      try {
        const setIf = (idSel, val) => {
          try {
            // preferir elementos dentro del modal (ids renombrados con ver_ prefix)
            const prefixed = `ver_${idSel}`;
            let el = null;
            if (modalVer) {
              // dentro del modal: probar prefixed, luego fallback a idSinPrefijo dentro del mismo modal
              el =
                modalVer.querySelector(`#${prefixed}`) ||
                modalVer.querySelector(`#${idSel}`);
            } else {
              // fuera del modal: probar prefixed globalmente, luego id sin prefijo
              el =
                document.getElementById(prefixed) ||
                document.getElementById(idSel);
            }
            if (!el) return;
            if (typeof val === "undefined" || val === null) val = "";
            if ("value" in el) el.value = val;
            else el.textContent = String(val);
          } catch (e) {}
        };

        setIf("name", ex.nombre || ex.email || "");
        setIf("email", ex.email || "");

        // Precio por hora
        const precioVal =
          (ex.infoExperto &&
            (ex.infoExperto.precioPorHora || ex.infoExperto.precio)) ||
          ex.precioPorHora ||
          "";
        setIf("precio", precioVal);

        // Días disponibles: oculto + botones visuales (scoped)
        try {
          const dias =
            (ex.infoExperto &&
              Array.isArray(ex.infoExperto.diasDisponibles) &&
              ex.infoExperto.diasDisponibles) ||
            (Array.isArray(ex.diasDisponibles) && ex.diasDisponibles) ||
            [];
          const diasInput = modalVer
            ? modalVer.querySelector("#ver_diasDisponibles")
            : document.getElementById("ver_diasDisponibles") ||
              document.getElementById("diasDisponibles");
          if (diasInput)
            diasInput.value = Array.isArray(dias) ? dias.join(",") : dias || "";
          const display = modalVer
            ? modalVer.querySelector(".srv-days-display")
            : document.querySelector("#verPerfilExperto .srv-days-display");
          if (display)
            display.textContent =
              Array.isArray(dias) && dias.length > 0
                ? dias.join(", ")
                : "Ningún día seleccionado";
          const dayButtons = modalVer
            ? modalVer.querySelectorAll(".srv-day")
            : document.querySelectorAll("#verPerfilExperto .srv-day");
          Array.from(dayButtons || []).forEach((b) => {
            try {
              const d = b.dataset.day;
              b.setAttribute(
                "aria-pressed",
                Array.isArray(dias) && dias.indexOf(d) !== -1 ? "true" : "false"
              );
            } catch (e) {}
          });
        } catch (e) {}

        // Especialidad y estado
        setIf(
          "specialty",
          (ex.infoExperto && ex.infoExperto.especialidad) ||
            ex.especialidad ||
            ""
        );
        setIf("status", ex.estado || "");

        // Biografía
        setIf("bio", (ex.infoExperto && ex.infoExperto.descripcion) || "");

        // Perfil / imagen (scoped)
        try {
          const preview = modalVer
            ? modalVer.querySelector("#ver_profilePreview")
            : document.getElementById("ver_profilePreview") ||
              document.getElementById("profilePreview");
          if (preview) {
            const img = preview.querySelector("img");
            if (img) img.src = ex.avatarUrl || ex.avatar || "";
            const removeBtn = modalVer
              ? modalVer.querySelector("#ver_removeProfileBtn")
              : document.getElementById("ver_removeProfileBtn") ||
                document.getElementById("removeProfileBtn");
            if (removeBtn)
              removeBtn.style.display =
                img && img.src ? "inline-block" : "none";
            preview.style.display = img && img.src ? "block" : "none";
          }
        } catch (e) {}

        // Datos bancarios (si existen) (scoped) — preferir campos con prefijo 'ver_'
        try {
          const bankFields = [
            "banco",
            "tipoCuenta",
            "numeroCuenta",
            "titular",
            "tipoDocumento",
            "numeroDocumento",
            "telefonoContacto",
          ];
          bankFields.forEach((k) => {
            try {
              const prefId = `ver_${k}`;
              let el = null;
              if (modalVer)
                el =
                  modalVer.querySelector(`#${prefId}`) ||
                  modalVer.querySelector(`#${k}`);
              else
                el =
                  document.getElementById(prefId) || document.getElementById(k);
              if (!el) return;
              const v =
                ex.infoExperto && typeof ex.infoExperto[k] !== "undefined"
                  ? ex.infoExperto[k]
                  : ex[k];
              if (typeof v !== "undefined" && v !== null) el.value = v;
            } catch (e) {}
          });
        } catch (e) {}

        // Categorías: asegurar opciones cargadas y marcar las seleccionadas (scoped)
        try {
          await loadAdminCategorias();
          const categoriasEl = modalVer
            ? modalVer.querySelector("#ver_categorias")
            : document.getElementById("ver_categorias") ||
              document.getElementById("categorias");
          if (categoriasEl) {
            const cats =
              (ex.infoExperto &&
                Array.isArray(ex.infoExperto.categorias) &&
                ex.infoExperto.categorias) ||
              ex.categorias ||
              [];
            const vals = (Array.isArray(cats) ? cats : []).map((c) => {
              if (!c) return String(c);
              if (typeof c === "object")
                return String(
                  c._id || c.id || c.value || c.nombre || c.name || c.label || c
                );
              return String(c);
            });
            Array.from(categoriasEl.options).forEach((opt) => {
              opt.selected = vals.indexOf(String(opt.value)) !== -1;
            });
            // Re-inicializar Choices para reflejar selección visual
            initializeChoicesOn(
              categoriasEl,
              {
                removeItemButton: true,
                searchEnabled: true,
                placeholder: true,
                placeholderValue: "Selecciona categorías",
              },
              "categorias"
            );
          }
        } catch (e) {}

        // Habilidades: poblar select con las habilidades del experto (scoped)
        try {
          const skillsEl = modalVer
            ? modalVer.querySelector("#ver_skills")
            : document.getElementById("ver_skills") ||
              document.getElementById("skills");
          if (skillsEl) {
            const skillsArr =
              (ex.infoExperto &&
                Array.isArray(ex.infoExperto.skills) &&
                ex.infoExperto.skills) ||
              ex.skills ||
              [];
            // reconstruir opciones para mostrar las habilidades actuales
            skillsEl.innerHTML = "";
            (Array.isArray(skillsArr) ? skillsArr : []).forEach((s) => {
              try {
                const opt = document.createElement("option");
                opt.value = s;
                opt.textContent = s;
                opt.selected = true;
                skillsEl.appendChild(opt);
              } catch (e) {}
            });
            initializeChoicesOn(
              skillsEl,
              {
                removeItemButton: true,
                searchEnabled: true,
                addItems: true,
                placeholder: true,
                placeholderValue: "Selecciona habilidades",
              },
              "skills"
            );
          }
        } catch (e) {}

        // Render visual-only badges for categorias and skills as a fallback
        try {
          // Categorías display
          const categoriasForDisplay =
            (ex.infoExperto &&
              Array.isArray(ex.infoExperto.categorias) &&
              ex.infoExperto.categorias) ||
            ex.categorias ||
            [];
          const adminCats = Array.isArray(window._adminCategorias)
            ? window._adminCategorias
            : [];
          const categoriasNames = (
            Array.isArray(categoriasForDisplay) ? categoriasForDisplay : []
          )
            .map((c) => {
              try {
                if (!c) return null;
                if (typeof c === "object")
                  return c.nombre || c.name || (c._id ? String(c._id) : null);
                // buscar nombre en adminCats
                const found = adminCats.find(
                  (ac) =>
                    String(ac._id) === String(c) || String(ac.id) === String(c)
                );
                if (found)
                  return found.nombre || found.name || String(found._id);
                return String(c);
              } catch (e) {
                return null;
              }
            })
            .filter(Boolean);

          const catDisplayId = modalVer
            ? "ver_categorias_display"
            : "ver_categorias_display";
          let catDisplayEl = modalVer
            ? modalVer.querySelector(`#${catDisplayId}`)
            : document.getElementById(catDisplayId);
          if (!catDisplayEl) {
            // intentar insertar cerca del select de categorias si existe
            const insertAfter = modalVer
              ? modalVer.querySelector("#ver_categorias") ||
                modalVer.querySelector("#categorias")
              : document.getElementById("categorias");
            catDisplayEl = document.createElement("div");
            catDisplayEl.id = catDisplayId;
            catDisplayEl.className = "user-cats";
            if (insertAfter && insertAfter.parentNode)
              insertAfter.parentNode.insertBefore(
                catDisplayEl,
                insertAfter.nextSibling
              );
            else if (modalVer && modalVer.querySelector(".modal-expert__body"))
              modalVer
                .querySelector(".modal-expert__body")
                .appendChild(catDisplayEl);
            else document.body.appendChild(catDisplayEl);
          }
          catDisplayEl.innerHTML =
            categoriasNames.length > 0
              ? categoriasNames
                  .map((n) => `<span class="badge">${escapeHtml(n)}</span>`)
                  .join(" ")
              : '<span class="muted">Sin categorías</span>';

          // Skills display
          const skillsForDisplay =
            (ex.infoExperto &&
              Array.isArray(ex.infoExperto.skills) &&
              ex.infoExperto.skills) ||
            ex.skills ||
            [];
          const skillsNames = (
            Array.isArray(skillsForDisplay) ? skillsForDisplay : []
          )
            .map((s) => {
              try {
                if (!s) return null;
                if (typeof s === "object")
                  return (
                    s.nombre ||
                    s.name ||
                    (s._id ? String(s._id) : JSON.stringify(s))
                  );
                return String(s);
              } catch (e) {
                return null;
              }
            })
            .filter(Boolean);

          const skillsDisplayId = modalVer
            ? "ver_skills_display"
            : "ver_skills_display";
          let skillsDisplayEl = modalVer
            ? modalVer.querySelector(`#${skillsDisplayId}`)
            : document.getElementById(skillsDisplayId);
          if (!skillsDisplayEl) {
            const insertAfterSkills = modalVer
              ? modalVer.querySelector("#ver_skills") ||
                modalVer.querySelector("#skills")
              : document.getElementById("skills");
            skillsDisplayEl = document.createElement("div");
            skillsDisplayEl.id = skillsDisplayId;
            skillsDisplayEl.className = "user-skills";
            if (insertAfterSkills && insertAfterSkills.parentNode)
              insertAfterSkills.parentNode.insertBefore(
                skillsDisplayEl,
                insertAfterSkills.nextSibling
              );
            else if (modalVer && modalVer.querySelector(".modal-expert__body"))
              modalVer
                .querySelector(".modal-expert__body")
                .appendChild(skillsDisplayEl);
            else document.body.appendChild(skillsDisplayEl);
          }
          skillsDisplayEl.innerHTML =
            skillsNames.length > 0
              ? skillsNames
                  .map((n) => `<span class="badge">${escapeHtml(n)}</span>`)
                  .join(" ")
              : '<span class="muted">Sin habilidades</span>';
        } catch (e) {
          // no bloquear la visualización por errores al renderizar badges
        }
      } catch (e) {
        console.warn("Error al rellenar modal de ver perfil:", e);
      }

      if (modalVer) {
        modalVer.style.display = "flex";
        document.body.style.overflow = "hidden";
        try {
          // añadir botón 'Editar' en el footer temporalmente (si no existe)
          const footer = modalVer.querySelector(".modal-expert__footer");
          if (footer && !footer.querySelector(".ver-to-edit")) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn-primary ver-to-edit";
            btn.textContent = "Editar";
            btn.addEventListener("click", function () {
              try {
                modalVer.style.display = "none";
                document.body.style.overflow = "";
              } catch (e) {}
              openExpertEditModal(id);
            });
            footer.appendChild(btn);
          }
        } catch (e) {}
      }
      return;
    }

    if (title === "Eliminar" || btn.classList.contains("expert-delete")) {
      const name = btn.dataset.name || "este experto";
      if (!confirm(`¿Eliminar al experto "${name}"?`)) return;
      // Preferir email (ruta esperada por el backend), si existe en el atributo dataset
      const email = btn.dataset.email || null;
      const identifier = email || id;
      if (!identifier)
        return showMessage("Identificador de experto faltante", "error");
      const display = email ? `${name} <${email}>` : name;
      if (!confirm(`¿Eliminar al experto "${display}"?`)) return;
      await eliminarExperto(identifier);
      return;
    }
  });

  // Guardar nuevo experto desde modal
  const saveBtn = document.getElementById("saveExpert");
  if (saveBtn) {
    saveBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const specialty = document.getElementById("specialty").value;
      const status = document.getElementById("status").value;
      let skills = [];
      try {
        const skillsEl = document.getElementById("skills");
        if (skillsEl) {
          // If Choices instance exists, use it
          const inst =
            window._choicesInstances && window._choicesInstances["skills"];
          if (inst && typeof inst.getValue === "function")
            skills = inst.getValue(true) || [];
          else
            skills = skillsEl.value
              ? skillsEl.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [];
        }
      } catch (e) {
        skills = [];
      }
      const bio = document.getElementById("bio").value.trim();
      // Build payload for registration. If the modal contains enough
      // expert-profile fields, include an `infoExperto` object so the
      // frontend proxy (server) can call the admin PUT to complete the profile.
      const payload = {
        nombre: name,
        email,
        estado: status,
      };

      // Optional lightweight infoExperto from modal
      const maybeInfo = {};
      if (specialty) maybeInfo.especialidad = specialty;
      if (bio) maybeInfo.descripcion = bio;
      if (skills && skills.length > 0) maybeInfo.skills = skills;

      // The backend requires many fields to accept infoExperto on PUT as admin.
      // We only attach infoExperto if the user filled a minimal subset (descripcion, precioPorHora, especialidad, categorias, skills, banco, tipoCuenta, numeroCuenta, titular, tipoDocumento, numeroDocumento).
      // Since the modal is simple, attach only when the form includes the required banking fields (optional enhancements later).
      const bankFieldsPresent =
        document.getElementById("banco") &&
        document.getElementById("numeroCuenta") &&
        document.getElementById("tipoCuenta") &&
        document.getElementById("titular") &&
        document.getElementById("tipoDocumento") &&
        document.getElementById("numeroDocumento");
      if (bankFieldsPresent) {
        // collect banking and full fields if present in DOM
        maybeInfo.banco = document.getElementById("banco").value.trim();
        maybeInfo.tipoCuenta = document
          .getElementById("tipoCuenta")
          .value.trim();
        maybeInfo.numeroCuenta = document
          .getElementById("numeroCuenta")
          .value.trim();
        maybeInfo.titular = document.getElementById("titular").value.trim();
        maybeInfo.tipoDocumento = document
          .getElementById("tipoDocumento")
          .value.trim();
        maybeInfo.numeroDocumento = document
          .getElementById("numeroDocumento")
          .value.trim();
        maybeInfo.precioPorHora =
          parseFloat(document.getElementById("precioPorHora").value) ||
          undefined;
        // categorias expected as ids; try to parse CSV from input if present
        const catsInput = document.getElementById("categorias");
        if (catsInput)
          maybeInfo.categorias = catsInput.value
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean);
      }

      // siempre intentar leer el select #categorias del modal si existe
      try {
        const catsSelect = document.getElementById("categorias");
        if (catsSelect) {
          // si es multiple, tomar ids seleccionadas; si no, tomar valor único
          if (catsSelect.multiple) {
            const selected = Array.from(catsSelect.selectedOptions)
              .map((o) => o.value)
              .filter(Boolean);
            if (selected.length > 0) maybeInfo.categorias = selected;
          } else if (catsSelect.value) {
            maybeInfo.categorias = [catsSelect.value];
          }
        }
      } catch (e) {
        // ignore
      }

      // Decide whether to attach infoExperto. For admin creation we allow
      // attaching a minimal profile (especialidad, categorias, skills, descripcion)
      // so that the expert appears correctly in the list immediately.
      const minimalKeys = [
        "especialidad",
        "categorias",
        "skills",
        "descripcion",
      ];
      let hasMinimal = minimalKeys.some((k) => {
        if (k === "descripcion")
          return (
            (maybeInfo.descripcion || bio) &&
            String(maybeInfo.descripcion || bio).trim() !== ""
          );
        const v = maybeInfo[k];
        if (Array.isArray(v)) return v.length > 0;
        return (
          typeof v !== "undefined" && v !== null && String(v).trim() !== ""
        );
      });

      // If admin didn't provide any minimal expert data, attach a safe default
      // using the first available category (if any) so the created user has
      // a non-null infoExperto and will appear on the public listing immediately.
      if (!hasMinimal) {
        try {
          const cats = window._adminCategorias || [];
          if (cats && cats.length > 0) {
            const first = cats[0];
            maybeInfo.categorias = [first._id || first.id || String(first)];
            // Use category name as a reasonable default for especialidad when missing
            if (!maybeInfo.especialidad)
              maybeInfo.especialidad = first.nombre || first.name || "General";
            // keep descripcion empty if none provided
            if (!maybeInfo.descripcion) maybeInfo.descripcion = "";
            if (!maybeInfo.skills) maybeInfo.skills = [];
            hasMinimal = true;
          }
        } catch (e) {
          // ignore — fall back to not attaching infoExperto
        }
      }

      // Always create with role 'experto'
      payload.roles = ["experto"];
      if (hasMinimal) {
        // attach provided profile fields so the admin sees especialidad/categorias/skills
        payload.infoExperto = Object.assign({}, maybeInfo);
      }
      try {
        // Si el form tiene dataset.editId -> modo edición: enviar PUT
        const form = document.getElementById("expertForm");
        const editId = form && form.dataset ? form.dataset.editId : null;
        if (editId) {
          // construir payload para actualizar
          const putPayload = { infoExperto: {} };
          if (specialty) putPayload.infoExperto.especialidad = specialty;
          if (bio) putPayload.infoExperto.descripcion = bio;
          if (skills && skills.length > 0)
            putPayload.infoExperto.skills = skills;
          // categorias (multiple)
          try {
            const catsSelect = document.getElementById("categorias");
            if (catsSelect) {
              if (catsSelect.multiple)
                putPayload.infoExperto.categorias = Array.from(
                  catsSelect.selectedOptions
                ).map((o) => o.value);
              else if (catsSelect.value)
                putPayload.infoExperto.categorias = [catsSelect.value];
            }
          } catch (e) {}

          // enviar PUT
          try {
            const headers = await getHeaders();
            const res = await fetch(
              `/api/usuarios/expertos/${encodeURIComponent(editId)}`,
              {
                method: "PUT",
                headers: Object.assign(
                  { "Content-Type": "application/json" },
                  headers
                ),
                credentials: "same-origin",
                body: JSON.stringify(putPayload),
              }
            );
            if (!res.ok) {
              let err = {};
              try {
                err = await res.json();
              } catch (e) {}
              throw new Error(
                err.mensaje || err.message || "Error al actualizar experto"
              );
            }
            showMessage("Experto actualizado", "success");
            await loadExpertos();
            const modal = getExpertModal();
            if (modal) modal.style.display = "none";
          } catch (e) {
            console.error(e);
            showMessage(e.message || "Error al actualizar experto", "error");
          }
        } else {
          await agregarExperto(payload);
          const modal = getExpertModal();
          if (modal) modal.style.display = "none";
        }
      } catch (err) {
        // ya manejado por agregarExperto o arriba
      }
    });
  }
}

async function getHeaders() {
  // Authorization and x-api-key are handled server-side by the frontend proxy
  // for admin sessions. Obtain CSRF token from the frontend server and include
  // it on mutating requests so the proxy can validate it.
  if (window._csrfToken) {
    return {
      "Content-Type": "application/json",
      "x-csrf-token": window._csrfToken,
    };
  }
  try {
    const res = await fetch("/csrf-token", { credentials: "same-origin" });
    if (res.ok) {
      const data = await res.json();
      window._csrfToken = data && data.csrfToken;
      return {
        "Content-Type": "application/json",
        "x-csrf-token": window._csrfToken,
      };
    }
  } catch (e) {
    // ignore and return minimal headers
  }
  return { "Content-Type": "application/json" };
}

// Conectar el botón guardar del modal al envío del formulario
onDomReady(function () {
  try {
    const saveBtn = document.getElementById("saveExpert");
    if (!saveBtn) return;
    saveBtn.addEventListener("click", function (e) {
      try {
        const form = document.getElementById("expertForm");
        if (!form) return;
        if (typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else {
          // fallback: dispatch submit event
          const ev = new Event("submit", { bubbles: true, cancelable: true });
          form.dispatchEvent(ev);
        }
      } catch (err) {}
    });
  } catch (e) {}
});

// Exports for unit tests: expose a minimal surface without running DOM listeners.
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    initializeChoicesOn: initializeChoicesOn,
    getExpertModal: getExpertModal,
    __adminExpertsDeferredDOMContentLoaded:
      __adminExpertsDeferredDOMContentLoaded,
    onDomReady: onDomReady,
  };
}

/**
 * Carga las categorías desde el backend y las guarda en window._adminCategorias.
 * También renderiza las opciones dentro del select #categorias del modal de experto.
 */
async function loadAdminCategorias() {
  // usar cache si ya cargadas
  if (window._adminCategorias && Array.isArray(window._adminCategorias)) {
    renderCategoriasSelect(window._adminCategorias);
    return window._adminCategorias;
  }
  try {
    const res = await fetch("/api/categorias", {
      headers: await getHeaders(),
      credentials: "same-origin",
    });
    if (!res.ok) {
      console.error("Error al obtener categorias", res.status);
      return [];
    }
    const categorias = await res.json();
    window._adminCategorias = Array.isArray(categorias) ? categorias : [];
    renderCategoriasSelect(window._adminCategorias);
    return window._adminCategorias;
  } catch (err) {
    console.error("Error cargando categorias", err);
    return [];
  }
}

function renderCategoriasSelect(categorias) {
  const select = document.getElementById("categorias");
  if (!select) return;
  // limpiar
  select.innerHTML = "";
  // agregar opciones
  categorias.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c._id || c.id || c._id;
    opt.textContent =
      c.nombre || c.name || c.nombreCategoria || String(opt.value);
    select.appendChild(opt);
  });

  // También poblar el select de filtros si existe (#filterCategoria)
  try {
    const filterSel = document.getElementById("filterCategoria");
    if (filterSel) {
      // conservar la primera opción (placeholder) y añadir el resto
      const placeholder = filterSel.querySelector('option[value=""]');
      filterSel.innerHTML = "";
      if (placeholder) filterSel.appendChild(placeholder);
      categorias.forEach((c) => {
        const o = document.createElement("option");
        o.value = c._id || c.id || c._id;
        o.textContent = c.nombre || c.name || String(o.value);
        filterSel.appendChild(o);
      });
    }
  } catch (e) {
    // no bloquear si falla
  }

  // Inicializar Choices.js en el select de categorias para selección múltiple (fuera del bucle)
  initializeChoicesOn("categorias", {
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

  /**
   * Carga dinámica de Choices.js (CDN) una sola vez y devuelve una promesa.
   */
  function ensureChoicesLoaded() {
    if (window._choicesLoadedPromise) return window._choicesLoadedPromise;
    window._choicesLoadedPromise = new Promise((resolve, reject) => {
      if (typeof Choices !== "undefined") return resolve();
      // Ensure Choices CSS is present (inject if missing)
      try {
        const cssHref =
          "https://cdn.jsdelivr.net/npm/choices.js/public/assets/styles/choices.min.css";
        const exists = Array.from(document.getElementsByTagName("link")).some(
          (l) => l.href && l.href.indexOf("choices.min.css") !== -1
        );
        if (!exists) {
          const cssLink = document.createElement("link");
          cssLink.rel = "stylesheet";
          cssLink.href = cssHref;
          document.head.appendChild(cssLink);
        }
      } catch (e) {}

      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/choices.js/public/assets/scripts/choices.min.js";
      script.onload = () => {
        // small delay to ensure global is ready
        setTimeout(() => resolve(), 50);
      };
      script.onerror = (err) =>
        reject(err || new Error("Failed to load Choices.js"));
      document.head.appendChild(script);
    });
    return window._choicesLoadedPromise;
  }

  /**
   * Inicializa (o re-inicializa) Choices.js en un elemento identificado por id.
   * key es la clave interna para almacenar la instancia en window._choicesInstances
   */
  function initializeChoicesOn(idOrElement, options = {}, key) {
    const id =
      typeof idOrElement === "string"
        ? idOrElement
        : idOrElement && idOrElement.id;
    if (!id) return;
    const el =
      typeof idOrElement === "string"
        ? document.getElementById(idOrElement)
        : idOrElement;
    if (!el) return;
    const instanceKey = key || id;
    ensureChoicesLoaded()
      .then(() => {
        try {
          window._choicesInstances = window._choicesInstances || {};
          if (window._choicesInstances[instanceKey]) {
            try {
              window._choicesInstances[instanceKey].destroy();
            } catch (e) {}
            window._choicesInstances[instanceKey] = null;
          }
          // Only initialize if Choices constructor available
          if (typeof Choices !== "undefined") {
            window._choicesInstances[instanceKey] = new Choices(
              el,
              options || {}
            );
          }
        } catch (e) {
          console.error("Error initializing Choices on", id, e);
        }
      })
      .catch((e) => console.error("Failed loading Choices.js for", id, e));
  }

  // Inicializar Choices en #skills si existe al cargar la página (admin)
  // Al cargar la página, intentar inicializar Choices en #skills si existe.
  const __skillsEl = document.getElementById("skills");
  if (__skillsEl) {
    const __opts = {
      removeItemButton: true,
      searchEnabled: true,
      placeholder: true,
      addItems: true,
      placeholderValue: "Selecciona habilidades",
      noResultsText: "No hay resultados",
      noChoicesText: "No hay opciones",
      itemSelectText: "Seleccionar",
      classNames: {
        containerInner: "choices-container",
        input: "choices-input",
      },
    };
    initializeChoicesOn(__skillsEl, __opts, "skills");
  }
}

function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showMessage(text, type = "info", timeout = 2000) {
  let container = document.getElementById("adminMessageContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "adminMessageContainer";
    container.style.position = "fixed";
    container.style.top = "16px";
    container.style.right = "16px";
    container.style.zIndex = "9999";
    document.body.appendChild(container);
  }
  const el = document.createElement("div");
  el.textContent = text;
  el.style.padding = "10px 14px";
  el.style.marginTop = "8px";
  el.style.borderRadius = "6px";
  el.style.color = "#fff";
  el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.12)";
  if (type === "success") el.style.background = "#28a745";
  else if (type === "error") el.style.background = "#dc3545";
  else el.style.background = "#007bff";
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }, timeout);
}

// Manejo del envío del formulario de edición (PUT)
onDomReady(() => {
  const form = document.getElementById("formEditarExperto");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = form.dataset.editId;
    const nombre = document.getElementById("nombreExperto").value.trim();
    const correo = document.getElementById("correoExperto").value.trim();
    const especialidad = document
      .getElementById("especialidadExperto")
      .value.trim();
    const estado = document.getElementById("estadoExperto").value;
    if (!id) {
      showMessage("ID de experto faltante", "error");
      return;
    }
    try {
      const res = await fetch(`/api/usuarios/expertos/${id}`, {
        method: "PUT",
        headers: Object.assign(
          { "Content-Type": "application/json" },
          await getHeaders()
        ),
        body: JSON.stringify({ nombre, correo, especialidad, estado }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.mensaje || "Error al actualizar experto");
      }
      showMessage("Experto actualizado", "success");
      const modal = document.getElementById("editarExperto");
      if (modal) modal.style.display = "none";
      await loadExpertos();
    } catch (err) {
      console.error(err);
      showMessage(err.message || "Error al actualizar experto", "error");
    }
  });
});
