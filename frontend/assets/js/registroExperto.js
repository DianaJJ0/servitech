console.log("registroExperto.js cargado");

// Obtener token CSRF desde el servidor (sesión)
async function getCsrfToken() {
  try {
    const r = await fetch("/csrf-token", { credentials: "include" });
    if (!r.ok) return "";
    const j = await r.json().catch(() => ({}));
    return j && j.csrfToken ? j.csrfToken : "";
  } catch {
    return "";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // Ya no dependemos de window.user ni de localStorage para token.
  // El acceso a estas páginas ya está protegido en el SSR (server.js).

  // Toggle número de cuenta
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

  // Selector de días
  const diasDisponiblesInput = document.getElementById("diasDisponibles");
  const dayOptions = document.querySelectorAll(".day-option");
  const daysDisplay = document.querySelector(".days-selected-display");
  function updateSelectedDays() {
    const selectedDays = Array.from(
      document.querySelectorAll(".day-option.selected")
    ).map((d) => d.getAttribute("data-day"));
    if (diasDisponiblesInput)
      diasDisponiblesInput.value = selectedDays.join(",");
    if (daysDisplay) {
      daysDisplay.textContent =
        selectedDays.length > 0
          ? `Días seleccionados: ${selectedDays.join(", ")}`
          : "Selecciona tus días disponibles";
    }
  }
  dayOptions.forEach((d) =>
    d.addEventListener("click", function () {
      this.classList.toggle("selected");
      updateSelectedDays();
    })
  );
  updateSelectedDays();

  // Tooltip con email
  try {
    const emailField = document.querySelector(".email-field");
    if (emailField) {
      const setTitle = () => {
        const txt = emailField.textContent && emailField.textContent.trim();
        if (txt) emailField.setAttribute("title", txt);
      };
      setTitle();
      const mo = new MutationObserver(setTitle);
      mo.observe(emailField, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  } catch (e) {}

  // Preview foto
  (function () {
    const input = document.getElementById("fotoPerfil");
    const img = document.getElementById("epImg");
    const removeBtn = document.getElementById("epRemove");
    const meta = document.getElementById("fotoMeta");
    const nombre = document.getElementById("fotoNombre");
    const tamano = document.getElementById("fotoTamano");
    const errorBox = document.getElementById("fotoError");
    if (!input) return;

    function formatBytes(bytes) {
      if (!bytes) return "0 B";
      const units = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
    }

    function resetPreview() {
      if (img) {
        img.src = "";
        img.style.display = "none";
      }
      if (meta) meta.style.display = "none";
      if (nombre) nombre.textContent = "";
      if (tamano) tamano.textContent = "";
      if (errorBox) errorBox.style.display = "none";
    }

    input.addEventListener("change", function () {
      resetPreview();
      const file = input.files && input.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        if (errorBox) {
          errorBox.textContent = "El archivo debe ser una imagen.";
          errorBox.style.display = "block";
        }
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        if (errorBox) {
          errorBox.textContent = "La imagen no debe superar 2MB.";
          errorBox.style.display = "block";
        }
        return;
      }
      const reader = new FileReader();
      reader.onload = function (e) {
        if (img) {
          img.src = e.target.result;
          img.style.display = "block";
        }
        if (meta) meta.style.display = "flex";
        if (nombre) nombre.textContent = file.name;
        if (tamano) tamano.textContent = formatBytes(file.size);
      };
      reader.readAsDataURL(file);
    });

    if (removeBtn) {
      removeBtn.addEventListener("click", function () {
        input.value = "";
        resetPreview();
      });
    }
    resetPreview();
  })();

  // Cargar categorías (vía proxy /api -> backend)
  (function initCategorias() {
    const select = document.getElementById("categorias");
    if (!select) return;
    fetch("/api/categorias", { credentials: "include" })
      .then((r) => r.json())
      .then((categorias) => {
        select.innerHTML = "";
        (categorias || []).forEach((cat) => {
          const opt = document.createElement("option");
          opt.value = cat._id || cat.id || cat.nombre;
          opt.textContent = cat.nombre;
          select.appendChild(opt);
        });
        if (typeof Choices !== "undefined") {
          new Choices(select, {
            removeItemButton: true,
            searchPlaceholderValue: "Buscar categoría...",
            noResultsText: "Sin resultados",
          });
        }
      })
      .catch((e) => {
        console.warn("No fue posible cargar categorías:", e && e.message);
      });
  })();

  // Envío del formulario (usa CSRF y sesión del servidor; no agrega Authorization)
  const form = document.getElementById("registroExpertoForm");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const categoriasSelect = document.getElementById("categorias");
    const categorias = categoriasSelect
      ? Array.from(categoriasSelect.selectedOptions).map((o) => o.value)
      : [];

    const payload = {
      descripcion: (document.getElementById("descripcion")?.value || "").trim(),
      precioPorHora: Number(document.getElementById("precio")?.value || 0),
      categorias,
      banco: document.getElementById("banco")?.value || "",
      tipoCuenta: document.getElementById("tipoCuenta")?.value || "",
      numeroCuenta: document.getElementById("numeroCuenta")?.value || "",
      titular: document.getElementById("titular")?.value || "",
      tipoDocumento: document.getElementById("tipoDocumento")?.value || "",
      numeroDocumento: document.getElementById("numeroDocumento")?.value || "",
      telefonoContacto:
        document.getElementById("telefonoContacto")?.value || "",
      diasDisponibles: (document.getElementById("diasDisponibles")?.value || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    };

    try {
      const csrf = await getCsrfToken();
      const r = await fetch("/api/perfil-experto/perfil", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrf,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`Error ${r.status}`);
      alert("Perfil de experto guardado correctamente.");
      window.location.href = "/perfil";
    } catch (err) {
      console.error("Error guardando perfil:", err);
      alert("No fue posible guardar tu perfil. Intenta más tarde.");
    }
  });
});
