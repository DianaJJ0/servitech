document.addEventListener("DOMContentLoaded", function () {
  // Sincroniza el token entre la sesión y localStorage si está disponible en window.user
  if (window.user && window.user.token) {
    localStorage.setItem("token", window.user.token);
  }
  // Si no hay token, redirige al login
  const token = localStorage.getItem("token");
  if (!token || token === "null") {
    window.location.href = "/login.html?next=/editarExperto";
    return;
  }
  const dayOptions = document.querySelectorAll(".days-selector .day-option");
  const diasInput = document.getElementById("diasDisponibles");
  const daysDisplay = document.querySelector(".days-selected-display");

  // Marcar días seleccionados según el valor inicial del input oculto
  if (diasInput && diasInput.value) {
    const diasSeleccionados = diasInput.value.split(",").map((d) => d.trim());
    dayOptions.forEach((opt) => {
      if (diasSeleccionados.includes(opt.getAttribute("data-day"))) {
        opt.classList.add("selected");
      } else {
        opt.classList.remove("selected");
      }
    });
  }

  function updateSelectedDays() {
    const selectedDays = Array.from(dayOptions)
      .filter((opt) => opt.classList.contains("selected"))
      .map((opt) => opt.getAttribute("data-day"));
    diasInput.value = selectedDays.join(",");
    daysDisplay.textContent =
      selectedDays.length > 0
        ? `Días seleccionados: ${selectedDays.join(", ")}`
        : "Ningún día seleccionado";
  }

  dayOptions.forEach((option) => {
    option.addEventListener("click", function () {
      this.classList.toggle("selected");
      updateSelectedDays();
    });
  });

  updateSelectedDays();

  // Event listener para el botón cancelar
  const cancelarBtn = document.getElementById("cancelarEdicion");
  if (cancelarBtn) {
    cancelarBtn.addEventListener("click", function () {
      // Redirigir al perfil del usuario
      window.location.href = "/perfil";
    });
  }
});

// Ensure Choices.js is loaded and initialize on the categorias select (for editarExperto)
(function ensureChoicesForEditar() {
  const localJs = "/assets/vendor/choices/choices.min.js";
  const cdnJs =
    "https://cdn.jsdelivr.net/npm/choices.js/public/assets/scripts/choices.min.js";

  function tryLoadScript(href) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = href;
      s.onload = () => setTimeout(() => res(), 30);
      s.onerror = (e) => rej(e || new Error("failed to load script"));
      document.head.appendChild(s);
    });
  }

  tryLoadScript(localJs)
    .catch(() => tryLoadScript(cdnJs))
    .then(() => {
      const categoriasSelect = document.getElementById("categorias");
      if (!categoriasSelect) return;
      try {
        new Choices(categoriasSelect, {
          removeItemButton: true,
          searchEnabled: true,
          placeholder: true,
          placeholderValue: "Selecciona categorías",
          noResultsText: "No hay resultados",
          noChoicesText: "No hay opciones",
          itemSelectText: "Seleccionar",
          appendTo: document.body,
          position: "bottom",
          shouldSort: false,
        });
      } catch (e) {
        console.error("Choices init failed on editarExperto:", e);
      }
    })
    .catch((err) =>
      console.error("Failed loading Choices assets for editar:", err)
    );
})();

document.addEventListener("DOMContentLoaded", function () {
  const btnShowAccount = document.querySelector(".btn-show-account");
  if (btnShowAccount) {
    btnShowAccount.addEventListener("click", function () {
      const accountElement = this.closest(".account-number");
      const realNumber = accountElement.getAttribute("data-number");

      if (accountElement.textContent.includes("••••")) {
        accountElement.innerHTML =
          realNumber +
          ' <button class="btn-show-account"><i class="fas fa-eye-slash"></i></button>';
      } else {
        accountElement.innerHTML =
          "••••••••••••••••" +
          ' <button class="btn-show-account"><i class="fas fa-eye"></i></button>';
      }
    });
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const btnEditarPerfil = document.getElementById("btnEditarPerfil");
  if (btnEditarPerfil) {
    btnEditarPerfil.addEventListener("click", async function (e) {
      e.preventDefault();
      // Sincroniza sesión si hay token en localStorage pero no en window.user
      const token = localStorage.getItem("token");
      const usuario = localStorage.getItem("usuario");
      if (token && usuario) {
        try {
          await fetch("/set-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              usuario: { ...JSON.parse(usuario), token },
            }),
          });
        } catch (err) {
          // Si falla, igual redirige
        }
      }
      window.location.href = "/editarExperto";
    });
  }
});

// Submit handler: enviar formulario por fetch en lugar de dejar que el navegador haga GET
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("registroExpertoForm");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token || token === "null") {
      window.location.href = "/login.html?next=/editarExperto";
      return;
    }

    // Build JSON payload from form fields (avoid FormData multipart)
    try {
      const payload = {};
      // basic fields
      const getVal = (name) => {
        const el = form.querySelector(`[name="${name}"]`);
        return el ? el.value : undefined;
      };
      payload.nombre = getVal("nombre");
      payload.apellido = getVal("apellido");
      payload.email = getVal("email");
      payload.descripcion = getVal("descripcion");
      // Support both 'precio' and 'precioPorHora'
      payload.precioPorHora = getVal("precioPorHora") || getVal("precio") || 0;
      payload.precio = payload.precioPorHora;
      payload.banco = getVal("banco");
      payload.tipoCuenta = getVal("tipoCuenta");
      payload.numeroCuenta = getVal("numeroCuenta");
      payload.titular = getVal("titular");
      payload.tipoDocumento = getVal("tipoDocumento");
      payload.numeroDocumento = getVal("numeroDocumento");
      payload.telefonoContacto = getVal("telefonoContacto");
      // categorias: collect selected values from select[name="categorias"]
      const categoriasSel = form.querySelector('select[name="categorias"]');
      if (categoriasSel) {
        payload.categorias = Array.from(categoriasSel.selectedOptions).map(
          (o) => o.value
        );
      }
      // diasDisponibles: from hidden input
      const diasInput = document.getElementById("diasDisponibles");
      if (diasInput) payload.diasDisponibles = diasInput.value;

      // If there is a file selected, upload it first to /api/usuarios/avatar
      const fileInput = document.getElementById("fotoPerfil");
      if (fileInput && fileInput.files && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fd = new FormData();
        fd.append("avatar", file);

        const upResp = await fetch("/api/usuarios/avatar", {
          method: "POST",
          headers: Object.assign(
            {
              "X-Requested-With": "XMLHttpRequest",
              Accept: "application/json",
            },
            token ? { Authorization: `Bearer ${token}` } : {}
          ),
          credentials: "same-origin",
          body: fd,
        });

        if (!upResp.ok) {
          const t = await upResp.text().catch(() => null);
          console.error("Avatar upload failed:", upResp.status, t);
          if (upResp.status === 401) {
            window.location.href = "/login.html?next=/editarExperto";
            return;
          }
          alert(
            `Error al subir la imagen (status ${upResp.status}). Revisa la consola para más detalles.`
          );
          return;
        }
        const upJson = await upResp.json().catch(() => null);
        if (upJson && upJson.avatarUrl) {
          payload.avatarUrl = upJson.avatarUrl;
        }
      }

      // Now send JSON payload to update profile
      const resp = await fetch("/api/usuarios/perfil", {
        method: "PUT",
        headers: Object.assign(
          {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            Accept: "application/json",
          },
          token ? { Authorization: `Bearer ${token}` } : {}
        ),
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      if (resp.redirected) {
        window.location.href = resp.url;
        return;
      }

      const ctype = (resp.headers.get("content-type") || "").toLowerCase();
      if (ctype.includes("application/json")) {
        const data = await resp.json().catch(() => null);
        if (resp.ok) {
          alert(
            data && data.mensaje
              ? data.mensaje
              : "Perfil actualizado correctamente."
          );
          window.location.reload();
        } else {
          if (resp.status === 401) {
            window.location.href = "/login.html?next=/editarExperto";
            return;
          }
          alert(
            data && (data.mensaje || data.message)
              ? data.mensaje || data.message
              : `Error al guardar (status ${resp.status})`
          );
          console.error("Error updating profile:", data);
        }
      } else {
        const txt = await resp.text().catch(() => null);
        console.error(
          "Non-JSON response when updating profile:",
          resp.status,
          txt
        );
        if (resp.status === 401) {
          window.location.href = "/login.html?next=/editarExperto";
          return;
        }
        alert(
          "Error del servidor al guardar. Revisa la consola para detalles."
        );
      }
    } catch (err) {
      console.error("Error en submit editarExperto:", err);
      alert(
        "Error al enviar datos: " +
          (err && err.message ? err.message : "network error")
      );
    }
  });
});
