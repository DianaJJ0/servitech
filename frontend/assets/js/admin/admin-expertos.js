/**
 * @fileoverview
 * Admin expertos.
 * Se mantiene: categorías, precio, días disponibles, estado, verificación, eliminación, paginación.
 */

function ensureChoicesLoaded() {
  if (window._choicesLoadedPromise) return window._choicesLoadedPromise;
  window._choicesLoadedPromise = new Promise((resolve, reject) => {
    if (typeof Choices !== "undefined") return resolve();
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
        s.onload = () => setTimeout(res, 50);
        s.onerror = (e) => rej(e || new Error("failed to load script"));
        document.head.appendChild(s);
      });
    }

    try {
      const exists = Array.from(document.getElementsByTagName("link")).some(
        (l) =>
          l.href &&
          (l.href.indexOf("choices.min.css") !== -1 ||
            l.href.indexOf("/assets/vendor/choices/choices.min.css") !== -1)
      );
      if (!exists) {
        try {
          injectCss(localCss);
        } catch (e) {
          injectCss(cdnCss);
        }
      }
    } catch (e) {}

    tryLoadScript(localScript)
      .catch(() => tryLoadScript(cdnScript))
      .then(() => resolve())
      .catch((err) => reject(err || new Error("Failed to load Choices.js")));
  });
  return window._choicesLoadedPromise;
}

// Entorno tests
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

function debugLog() {
  try {
    if (typeof window !== "undefined" && window.__ADMIN_EXPERTOS_DEBUG) {
      if (console && typeof console.debug === "function")
        console.debug.apply(console, arguments);
    }
  } catch (e) {}
}

// Cierre de modales
onDomReady(function () {
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

// Exports test
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

// Cargar datos inyectados y configurar
onDomReady(function () {
  try {
    const nodeEx = document.getElementById("initial-expertos");
    if (nodeEx && nodeEx.textContent) {
      try {
        const parsed = JSON.parse(nodeEx.textContent);
        if (Array.isArray(parsed)) window._adminExpertos = parsed;
      } catch (e) {}
    }
  } catch (e) {}

  try {
    loadAdminCategorias().catch(() => {});
  } catch (e) {}

  setupExpertModal();
  setupExpertFilters();
  setupExpertActions();
  setupExpertVerification();
  loadExpertos();
  setupDelegatedActions();
});

// Modal agregar/editar experto
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
    try {
      const form = document.getElementById("expertForm");
      if (form && form.dataset) delete form.dataset.editId;
      const titleEl = modal.querySelector(".modal-expert__title");
      if (titleEl) titleEl.textContent = "Agregar nuevo experto";
    } catch (e) {}
    // Cargar categorías e inicializar Choices en #categorias
    loadAdminCategorias().then(() => {
      const categoriasEl = document.getElementById("categorias");
      if (categoriasEl) {
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
    });
  };

  const closeModal = () => {
    modal.style.display = "none";
    document.body.style.overflow = "";
    const form = document.getElementById("expertForm");
    if (form) form.reset();
    try {
      if (form && form.dataset && form.dataset.editId)
        delete form.dataset.editId;
      const titleEl = modal.querySelector(".modal-expert__title");
      if (titleEl) titleEl.textContent = "Agregar nuevo experto";
    } catch (e) {}
  };

  btnAddExpert.addEventListener("click", openModal);
  if (btnCloseModal) btnCloseModal.addEventListener("click", closeModal);
  if (btnCancel) btnCancel.addEventListener("click", closeModal);
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });
  }
}

// Fixes visuales Choices dentro del modal visible
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
    } catch (e) {}
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
    } catch (e) {}
  }
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
  } catch (e) {}
}
onDomReady(function () {
  try {
    applyChoicesVisualFixesWithinVisibleModal();
  } catch (e) {}
});

// Preview de imagen de perfil
onDomReady(function profileImagePreview() {
  try {
    var input = document.getElementById("profileImage");
    var preview = document.getElementById("profilePreview");
    var img = preview ? preview.querySelector("img") : null;
    var removeBtn = document.getElementById("removeProfileBtn");
    var meta = document.getElementById("uploadMeta");
    var err = document.getElementById("profileImageError");

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

    input.addEventListener("change", function () {
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
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", reset);
    else reset();
  } catch (e) {}
});

// Días disponibles, toggle cuenta, feedback precio
onDomReady(function uiHelpers() {
  try {
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

// Modal editar simple (tolerante si faltan campos antiguos)
onDomReady(() => {
  const modal = document.getElementById("editarExperto");
  if (!modal) return;

  const closeBtn = modal.querySelector(".btn-close");
  const cancelBtn = modal.querySelector(".modal-editar-cancelar");

  const nombreInput = document.getElementById("nombreExperto");
  const correoInput = document.getElementById("correoExperto");
  const especialidadInput = document.getElementById("especialidadExperto");
  const estadoSelect = document.getElementById("estadoExperto");
  const fechaRegistroInput = document.getElementById("fechaRegistroExperto");
  const sesionesInput = document.getElementById("sesionesExperto");
  const calificacionInput = document.getElementById("calificacionExperto");

  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest("tr");
      const nombre = row?.querySelector("h4")?.textContent?.trim() || "";
      const correo = row?.querySelector("span")?.textContent?.trim() || "";
      const tds = row ? Array.from(row.querySelectorAll("td")) : [];
      const especialidad = tds[3] ? tds[3].textContent.trim() : "";
      const estado = row.querySelector(".status")
        ? row.querySelector(".status").textContent.trim()
        : "";
      const fechaRegistro = tds[4] ? tds[4].textContent.trim() : "";

      if (nombreInput) nombreInput.value = nombre;
      if (correoInput) correoInput.value = correo;
      if (especialidadInput) especialidadInput.value = especialidad; // si no existe, no falla
      if (estadoSelect) estadoSelect.value = estado || "activo";
      if (fechaRegistroInput) fechaRegistroInput.value = fechaRegistro;
      if (sesionesInput)
        sesionesInput.value = tds[5] ? tds[5].textContent.trim() : "";
      if (calificacionInput)
        calificacionInput.value = tds[6] ? tds[6].textContent.trim() : "";

      modal.style.display = "flex";
      document.body.style.overflow = "hidden";
    });
  });

  if (closeBtn)
    closeBtn.addEventListener("click", () => (modal.style.display = "none"));
  if (cancelBtn)
    cancelBtn.addEventListener("click", () => (modal.style.display = "none"));
  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  const formEditar = document.getElementById("formEditarExperto");
  if (formEditar) {
    formEditar.addEventListener("submit", (e) => {
      e.preventDefault();
      modal.style.display = "none";
    });
  }
});

function getExpertModal() {
  try {
    const byId = document.getElementById("expertModal");
    if (byId) return byId;
    return document.querySelector(".modal-expert");
  } catch (e) {
    return null;
  }
}

onDomReady(() => {
  const modalInactivar = document.getElementById("modalInactivarExperto");
  if (!modalInactivar) return;
  const closeBtnInactivar = modalInactivar.querySelector(".btn-close");
  const cancelarBtnInactivar = modalInactivar.querySelector(
    ".modal-inactivar-cancelar"
  );
  const confirmarBtnInactivar = modalInactivar.querySelector(
    ".modal-inactivar-confirmar"
  );
  const nombreInactivar = document.getElementById(
    "modalInactivarExpertoNombre"
  );
  let rowToInactivate = null;

  document.querySelectorAll(".btn-icon[title='Eliminar']").forEach((button) => {
    button.addEventListener("click", () => {
      rowToInactivate = button.closest("tr");
      const nombre =
        rowToInactivate?.querySelector("h4")?.textContent?.trim() || "";
      if (nombreInactivar) nombreInactivar.textContent = nombre;
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
  window.addEventListener("click", (e) => {
    if (e.target === modalInactivar) modalInactivar.style.display = "none";
  });
  if (confirmarBtnInactivar) {
    confirmarBtnInactivar.addEventListener("click", () => {
      if (rowToInactivate) {
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

// Filtros
function setupExpertFilters() {
  const container = document.querySelector(".expertos-filtros");
  if (!container) return;

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

    window._adminFilters = {
      estado: status || null,
      categoria: category || null,
      minRating,
    };
    window._adminCurrentPage = 1;
    loadExpertos();
  };

  if (applyBtn) {
    applyBtn.addEventListener("click", function (e) {
      e.preventDefault();
      applyFilters();
    });
  }

  [statusSelect, categorySelect, ratingSelect].forEach((sel) => {
    if (!sel) return;
    sel.addEventListener("change", () => {
      if (sel._filterTimer) clearTimeout(sel._filterTimer);
      sel._filterTimer = setTimeout(() => applyFilters(), 120);
    });
  });

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

// Acciones básicas
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

// Verificación (UI)
function setupExpertVerification() {
  const verifyButtons = document.querySelectorAll(".verify-expert");
  verifyButtons.forEach((button) => {
    button.addEventListener("click", function () {
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

function abrirModalAgregarExperto() {
  const modal = getExpertModal();
  if (modal) {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}

// Crear experto (sin skills/especialidad)
async function agregarExperto(datosExperto) {
  try {
    const randomPassword = Math.random().toString(36).slice(-10) + "A1!";
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
      let errBody = null;
      try {
        errBody = await res.json();
      } catch (e) {
        try {
          const t = await res.text();
          errBody = t || null;
        } catch (e2) {
          errBody = null;
        }
      }
      let userMessage = "Error al registrar experto";
      if (errBody) {
        if (typeof errBody === "string") userMessage = errBody;
        else if (errBody.mensaje) userMessage = errBody.mensaje;
        else if (errBody.message) userMessage = errBody.message;
        else if (errBody.error) userMessage = errBody.error;
        else userMessage = JSON.stringify(errBody);
      }
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

    // Completar infoExperto básica: descripcion, categorias, precio/banco si están en el modal
    try {
      const headers = await getHeaders();
      if (window.API_KEY) headers["x-api-key"] = window.API_KEY;

      const maybeInfo = Object.assign({}, datosExperto.infoExperto || {});
      try {
        if (!maybeInfo.descripcion) {
          const bioEl = document.getElementById("bio");
          if (bioEl && bioEl.value) maybeInfo.descripcion = bioEl.value;
        }
      } catch (e) {}
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
        const precioEl =
          document.getElementById("precioPorHora") ||
          document.getElementById("precio");
        if (precioEl && precioEl.value) {
          const v = parseFloat(precioEl.value);
          if (!Number.isNaN(v)) maybeInfo.precioPorHora = v;
        }
      } catch (e) {}
      // Bancarios opcionales
      [
        "banco",
        "tipoCuenta",
        "numeroCuenta",
        "titular",
        "tipoDocumento",
        "numeroDocumento",
        "telefonoContacto",
      ].forEach((k) => {
        const el = document.getElementById(k);
        if (el && el.value) maybeInfo[k] = el.value.trim();
      });

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
          }
        } catch (e) {
          console.warn("Error persisting infoExperto via PUT:", e);
        }
      }
    } catch (e) {
      console.warn("No se pudo completar PUT infoExperto post-creacion:", e);
    }

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
    const saveBtnErr = document.getElementById("saveExpert");
    if (saveBtnErr) {
      saveBtnErr.disabled = false;
      saveBtnErr.textContent = "Guardar experto";
    }
    throw error;
  }
}

// Edit común con tolerancia a campos ausentes (especialidad/skills removidos)
async function openExpertEditModal(expertoId) {
  try {
    const expertos = window._adminExpertos || [];
    const ex = expertos.find((x) => String(x._id) === String(expertoId));
    if (!ex) return showMessage("Experto no encontrado", "error");
    const modal = getExpertModal();
    if (!modal) return;

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

async function cambiarVerificacionExperto(expertoId, verificado) {
  try {
    const headers = await getHeaders();
    const response = await fetch(`/api/experto/${expertoId}/verificar`, {
      method: verificado ? "DELETE" : "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, headers),
      credentials: "same-origin",
    });
    if (!response.ok)
      throw new Error("Error al cambiar verificación del experto");
    await response.json().catch(() => ({}));
  } catch (error) {
    console.error("Error:", error);
  }
}

async function eliminarExperto(expertoId) {
  try {
    const identifier = expertoId || "";
    const encoded = encodeURIComponent(identifier);
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

// Carga y render de expertos
async function loadExpertos() {
  try {
    if (!window._adminCategorias || !Array.isArray(window._adminCategorias)) {
      try {
        await loadAdminCategorias();
      } catch (e) {}
    }
    const tbody = document.querySelector(
      ".expertos-grid__tabla .admin-table tbody"
    );
    if (tbody) {
      tbody.innerHTML = `<tr class="placeholder-row"><td colspan="8" style="text-align:center;padding:24px;color:#9aa0a6;">Cargando expertos...</td></tr>`;
    }

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

    // Conservamos ruta actual usada en admin (/api/usuarios/expertos)
    const url = `/api/usuarios/expertos?${params.toString()}`;
    const res = await fetch(url, {
      headers: await getHeaders(),
      credentials: "same-origin",
    });
    if (!res.ok) {
      console.error("Error al obtener expertos", res.status);
      const status = res.status;
      const tbody = document.querySelector(
        ".expertos-grid__tabla .admin-table tbody"
      );
      if (tbody) tbody.innerHTML = "";
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
    const expertos = Array.isArray(data) ? data : data.expertos || [];
    const total = typeof data.total === "number" ? data.total : expertos.length;
    window._adminExpertos = expertos;
    window._adminExpertosTotal = total;

    try {
      debugLog("adminExpertos: sample experto:", expertos[0]);
      debugLog(
        "adminExpertos: adminCategorias:",
        window._adminCategorias || []
      );
    } catch (e) {}

    const pageSize = parseInt(window._adminPageSize, 10) || 7;
    const currentPage = parseInt(window._adminCurrentPage, 10) || 1;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    window._adminCurrentPage = safePage;

    renderExpertos(expertos, total);
  } catch (err) {
    console.error("Error cargando expertos:", err);
    showMessage("Error al cargar expertos.", "error");
  }
}

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

// Render de filas (columna de especialidad se mantiene como visual "legacy")
function renderExpertos(expertos, total) {
  const tbody = document.querySelector(
    ".expertos-grid__tabla .admin-table tbody"
  );
  if (!tbody) return;

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

      if (names.length > 0) {
        catsHtml = `<div class="user-cats">${names
          .map((n) => `<span class="badge">${escapeHtml(n)}</span>`)
          .join(" ")}</div>`;
      }
    } catch (e) {
      catsHtml = "";
    }

    // especialidad legacy -> si no existe, mostrar "-"
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
      especialidadDisplay = "-";
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

// Delegación de acciones en tabla
function setupDelegatedActions() {
  const tbody = document.querySelector(
    ".expertos-grid__tabla .admin-table tbody"
  );
  if (!tbody) return;

  tbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const title = btn.getAttribute("title") || "";
    const row = btn.closest("tr");
    const id = btn.dataset.id || (row && row.dataset.id);

    if (title === "Editar" || btn.classList.contains("expert-edit")) {
      const expertos = window._adminExpertos || [];
      const ex = expertos.find((x) => String(x._id) === String(id));
      if (!ex) return showMessage("Experto no encontrado", "error");
      const modal = getExpertModal();
      if (!modal) return;

      try {
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

        assign("status", ex.estado || "active");
        const descripcion =
          (ex.infoExperto &&
            (ex.infoExperto.descripcion || ex.infoExperto.bio)) ||
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

        const form = document.getElementById("expertForm");
        if (form) form.dataset.editId = id;
        try {
          const titleEl = modal.querySelector(".modal-expert__title");
          if (titleEl) titleEl.textContent = "Editar experto";
        } catch (e) {}
      } catch (e) {
        console.warn("Error rellenando modal de edición:", e);
      }

      if (modal) {
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
      }
      return;
    }

    if (title === "Ver perfil" || btn.classList.contains("expert-view")) {
      const expertos = window._adminExpertos || [];
      const ex = expertos.find((x) => String(x._id) === String(id));
      if (!ex) return showMessage("Experto no encontrado", "error");

      const modalVer = document.getElementById("verPerfilExperto");
      try {
        const setIf = (idSel, val) => {
          try {
            const prefixed = `ver_${idSel}`;
            let el = null;
            if (modalVer) {
              el =
                modalVer.querySelector(`#${prefixed}`) ||
                modalVer.querySelector(`#${idSel}`);
            } else {
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

        const precioVal =
          (ex.infoExperto &&
            (ex.infoExperto.precioPorHora || ex.infoExperto.precio)) ||
          ex.precioPorHora ||
          "";
        setIf("precio", precioVal);

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

        setIf("status", ex.estado || "");
        setIf("bio", (ex.infoExperto && ex.infoExperto.descripcion) || "");

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

        // Categorías (display + selección)
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

          const catDisplayId = "ver_categorias_display";
          let catDisplayEl = modalVer
            ? modalVer.querySelector(`#${catDisplayId}`)
            : document.getElementById(catDisplayId);
          if (!catDisplayEl) {
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
        } catch (e) {}
      } catch (e) {
        console.warn("Error al rellenar modal de ver perfil:", e);
      }

      if (modalVer) {
        modalVer.style.display = "flex";
        document.body.style.overflow = "hidden";
        try {
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

  const saveBtn = document.getElementById("saveExpert");
  if (saveBtn) {
    saveBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const name = (document.getElementById("name")?.value || "").trim();
      const email = (document.getElementById("email")?.value || "").trim();
      const status = document.getElementById("status")?.value || "";
      const bio = (document.getElementById("bio")?.value || "").trim();

      const payload = {
        nombre: name,
        email,
        estado: status,
      };

      const maybeInfo = {};
      if (bio) maybeInfo.descripcion = bio;

      try {
        const catsSelect = document.getElementById("categorias");
        if (catsSelect) {
          if (catsSelect.multiple) {
            const selected = Array.from(catsSelect.selectedOptions)
              .map((o) => o.value)
              .filter(Boolean);
            if (selected.length > 0) maybeInfo.categorias = selected;
          } else if (catsSelect.value) {
            maybeInfo.categorias = [catsSelect.value];
          }
        }
      } catch (e) {}

      // Adjuntar perfil mínimo si hay al menos infoExperto.descripcion o categorias
      const minimalKeys = ["categorias", "descripcion"];
      const hasMinimal = minimalKeys.some((k) => {
        const v = maybeInfo[k];
        if (k === "descripcion") return v && String(v).trim() !== "";
        if (Array.isArray(v)) return v.length > 0;
        return (
          typeof v !== "undefined" && v !== null && String(v).trim() !== ""
        );
      });

      payload.roles = ["experto"];
      if (hasMinimal) payload.infoExperto = Object.assign({}, maybeInfo);

      try {
        const form = document.getElementById("expertForm");
        const editId = form && form.dataset ? form.dataset.editId : null;
        if (editId) {
          const putPayload = { infoExperto: {} };
          if (bio) putPayload.infoExperto.descripcion = bio;
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
        // manejado arriba
      }
    });
  }
}

async function getHeaders() {
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
  } catch (e) {}
  return { "Content-Type": "application/json" };
}

// Botón guardar del modal -> submit del form
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
          const ev = new Event("submit", { bubbles: true, cancelable: true });
          form.dispatchEvent(ev);
        }
      } catch (err) {}
    });
  } catch (e) {}
});

// Exports (tests)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    initializeChoicesOn: initializeChoicesOn,
    getExpertModal: getExpertModal,
    __adminExpertsDeferredDOMContentLoaded:
      __adminExpertsDeferredDOMContentLoaded,
    onDomReady: onDomReady,
  };
}

// Cargar categorías y poblar selects
async function loadAdminCategorias() {
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
  if (select) {
    select.innerHTML = "";
    categorias.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c._id || c.id || c._id;
      opt.textContent =
        c.nombre || c.name || c.nombreCategoria || String(opt.value);
      select.appendChild(opt);
    });
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
  }

  try {
    const filterSel = document.getElementById("filterCategoria");
    if (filterSel) {
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
  } catch (e) {}
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

// PUT edición modal legacy (si existe el formulario)
onDomReady(() => {
  const form = document.getElementById("formEditarExperto");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = form.dataset.editId;
    const nombre = (
      document.getElementById("nombreExperto")?.value || ""
    ).trim();
    const correo = (
      document.getElementById("correoExperto")?.value || ""
    ).trim();
    const estado = document.getElementById("estadoExperto")?.value || "";
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
        body: JSON.stringify({ nombre, correo, estado }),
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
