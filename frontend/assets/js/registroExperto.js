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

    // Intento proactivo de restaurar sesión desde localStorage si el proxy
    // aún no tiene la sesión (evita que un usuario "loggeado" en otra pestaña
    // pierda la sesión en este origen/puerto).
    (async function restoreSessionOnLoad() {
      try {
        // Hacer una comprobación sencilla; si devuelve 401, intentar set-session
        const chk = await fetch("/api/usuarios/perfil", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });
        console.log(
          "restoreSessionOnLoad: auth check status=",
          chk && chk.status
        );
        if (chk.ok) return; // ya autenticado
        if (chk.status === 401) {
          const token = localStorage.getItem("token");
          const usuarioStr = localStorage.getItem("usuario");
          console.log(
            "restoreSessionOnLoad: auth check 401, token present?",
            !!token
          );
          if (!token) return;
          let usuario = null;
          try {
            usuario = usuarioStr ? JSON.parse(usuarioStr) : null;
          } catch (e) {
            usuario = null;
          }
          if (!usuario) usuario = { token };
          usuario.token = token;
          // Intentar establecer la sesión en el proxy
          try {
            const sr = await fetch("/set-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ usuario }),
              credentials: "include",
            });
            console.log(
              "restoreSessionOnLoad: /set-session status=",
              sr.status,
              "ok=",
              sr.ok
            );
          } catch (e) {
            console.warn("restoreSessionOnLoad: /set-session failed", e);
          }
        }
      } catch (e) {
        // No crítico
      }
    })();

    // --- Helper para obtener token CSRF (cacheado) ---
    async function getCsrfToken() {
      try {
        // Reusar token si ya lo obtuvimos antes
        if (window.__csrfTokenCached) return window.__csrfTokenCached;

        const res = await fetch("/csrf-token", { credentials: "include" });
        if (!res.ok) return "";
        const data = await res.json().catch(() => null);
        const token =
          data && (data.csrfToken || data.token)
            ? data.csrfToken || data.token
            : "";
        window.__csrfTokenCached = token;
        return token;
      } catch (e) {
        // No bloquear el flujo si no hay CSRF en este entorno
        return "";
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

    // --- Se ha eliminado la lógica de vista previa y validación de imagen para registroExperto ---

    // --- Validación número de cuenta ---
    // Mantener validación del campo principal `numeroCuenta` (format, maxlength, etc.).
    // La lógica de confirmación fue eliminada porque el formulario ya no incluye el campo de confirmación.

    // --- Validación número de documento ---
    // La lógica de confirmación fue eliminada; se mantiene la validación del campo principal `numero-documento`.

    // El chequeo final del formulario no incluye validación de foto en esta vista.
    const registroForm = document.getElementById("registroExpertoForm");

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
      // Helpers para validar el nombre del titular (sanitizar y reglas)
      const sanitizeName = (s) => {
        if (!s) return "";
        // permitir letras unicode, marcas, espacios y apóstrofe (no guiones ni puntos)
        const allowed = String(s).replace(/[^\p{L}\p{M}\s']+/gu, "");
        return allowed.replace(/\s+/g, " ").trim().slice(0, 100);
      };

      const isValidName = (s) => {
        if (!s) return { ok: false, msg: "El nombre es obligatorio" };
        if (s.length > 100) return { ok: false, msg: "Máximo 100 caracteres." };
        if (!/^[\p{L}\p{M}\s']+$/u.test(s))
          return { ok: false, msg: "Usa solo letras, espacios o apóstrofes." };
        const parts = s.split(" ").filter(Boolean);
        if (parts.length < 2)
          return { ok: false, msg: "Incluye nombre y apellido." };
        for (const p of parts) {
          const letters = p.replace(/'/g, "");
          if (letters.length < 2)
            return {
              ok: false,
              msg: "Cada nombre/apellido debe tener al menos 2 letras.",
            };
        }
        return { ok: true };
      };

      // Solo letras para titular (permitir espacios y acentos), NO permitir guiones ni puntos
      const titular = document.getElementById("titular");
      if (titular) {
        // keydown: bloquear teclas no permitidas (evitar '-' y '.')
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
          // permitir espacio y apóstrofe (no guion ni punto)
          if (e.key === " " || e.key === "'") return;
          // Permitir letras latinas y acentuadas
          if (e.key.length === 1) {
            if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ]$/.test(e.key)) {
              e.preventDefault();
            }
          }
        });

        titular.addEventListener("input", function () {
          const cleaned = sanitizeName(this.value);
          if (this.value !== cleaned) this.value = cleaned;

          if (/^\s+/.test(this.value)) {
            this.value = this.value.replace(/^\s+/, "");
          }

          // Preferir validación compartida si está disponible
          try {
            if (
              window &&
              window.SharedValidators &&
              typeof window.SharedValidators.validateTitularName === "function"
            ) {
              const r = window.SharedValidators.validateTitularName(
                this.value.trim()
              );
              if (!r.valid) showError(this, r.message);
              else clearError(this);
            } else {
              const res = isValidName(this.value.trim());
              if (!res.ok) showError(this, res.msg);
              else clearError(this);
            }
          } catch (e) {
            const res = isValidName(this.value.trim());
            if (!res.ok) showError(this, res.msg);
            else clearError(this);
          }
        });

        titular.addEventListener("paste", function (e) {
          e.preventDefault();
          let paste =
            (e.clipboardData || window.clipboardData).getData("text") || "";
          paste = paste.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s']/g, "");
          const start = titular.selectionStart;
          const end = titular.selectionEnd;
          const cur = titular.value || "";
          titular.value = cur.slice(0, start) + paste + cur.slice(end);
          titular.setSelectionRange(start + paste.length, start + paste.length);
          titular.dispatchEvent(new Event("input"));
        });

        titular.addEventListener("blur", function () {
          this.value = sanitizeName(this.value);
          try {
            if (
              window &&
              window.SharedValidators &&
              typeof window.SharedValidators.validateTitularName === "function"
            ) {
              const r = window.SharedValidators.validateTitularName(
                this.value.trim()
              );
              if (!r.valid) showError(this, r.message);
            } else {
              const res = isValidName(this.value);
              if (!res.ok) showError(this, res.msg);
            }
          } catch (e) {
            const res = isValidName(this.value);
            if (!res.ok) showError(this, res.msg);
          }
        });
      }

      // Solo números para campos numéricos (excluir numeroCuenta, que tiene reglas propias)
      const numericIds = ["numero-documento"];

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

      // Reglas dinámicas para número de cuenta según banco (colombiano vs internacional)
      const bancoHiddenEl = document.getElementById("banco");
      const numeroCuentaEl = document.getElementById("numeroCuenta");
      const errorNumeroCuenta = document.getElementById("numero-cuenta-error");

      // Usar SharedValidators.isColombianBankName/validateNumeroCuentaByBank si está disponible
      function isColombianBank(val) {
        try {
          if (
            window &&
            window.SharedValidators &&
            typeof window.SharedValidators.isColombianBankName === "function"
          )
            return window.SharedValidators.isColombianBankName(val);
        } catch (e) {}
        // fallback local
        if (!val) return true;
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
        return colombianBanks.includes(val);
      }

      function validateNumeroCuenta() {
        if (!numeroCuentaEl) return true;
        const val = (numeroCuentaEl.value || "").trim();
        if (!val) {
          showError(numeroCuentaEl, "Este campo es obligatorio");
          return false;
        }
        const cleaned = val.replace(/\D/g, "");
        if (!/^[0-9]{10,34}$/.test(cleaned)) {
          showError(
            numeroCuentaEl,
            "Número de cuenta inválido (10-34 dígitos, sólo números)"
          );
          return false;
        }
        // Si pasa validación, asegurarse de que el valor visible sea sólo dígitos
        if (numeroCuentaEl.value !== cleaned) numeroCuentaEl.value = cleaned;
        clearError(numeroCuentaEl);
        return true;
      }

      // Actualizar opciones de tipo de cuenta según banco seleccionado
      const tipoCuentaSelect = document.getElementById("tipo-cuenta");
      function updateTipoCuentaOptions(banco) {
        if (!tipoCuentaSelect) return;
        // Guardar valor actual para intentar mantener selección si aplica
        const current = tipoCuentaSelect.value;
        // Limpiar opciones
        tipoCuentaSelect.innerHTML = "";
        const createOpt = (val, label) => {
          const o = document.createElement("option");
          o.value = val;
          o.textContent = label;
          return o;
        };
        tipoCuentaSelect.appendChild(createOpt("", "Selecciona"));
        if (banco === "Bancolombia") {
          tipoCuentaSelect.appendChild(createOpt("Ahorros", "Ahorros"));
          tipoCuentaSelect.appendChild(createOpt("Corriente", "Corriente"));
        } else if (banco === "Nequi") {
          tipoCuentaSelect.appendChild(createOpt("Nequi", "Nequi"));
        } else {
          // por defecto, ofrecer las tres opciones
          tipoCuentaSelect.appendChild(createOpt("Ahorros", "Ahorros"));
          tipoCuentaSelect.appendChild(createOpt("Corriente", "Corriente"));
          tipoCuentaSelect.appendChild(createOpt("Nequi", "Nequi"));
        }
        // Restaurar valor si sigue disponible
        try {
          if (
            Array.from(tipoCuentaSelect.options).some(
              (o) => o.value === current
            )
          )
            tipoCuentaSelect.value = current;
        } catch (e) {}
      }

      // Vincular cambio de banco
      try {
        const bancoSelect = document.getElementById("banco");
        if (bancoSelect) {
          bancoSelect.addEventListener("change", function () {
            updateTipoCuentaOptions(this.value);
            // limpiar errores relacionados
            clearError(numeroCuentaEl);
            const errBanco = document.getElementById("errorBanco");
            if (errBanco) errBanco.textContent = "";
          });
          // Inicializar al cargar
          updateTipoCuentaOptions(bancoSelect.value || "");
        }
      } catch (e) {}

      if (numeroCuentaEl) {
        // toggle show/hide numeroCuenta cuando exista el botón
        try {
          const toggleBtn = document.getElementById("toggleAccountNumber");
          if (toggleBtn) {
            toggleBtn.addEventListener("click", function () {
              const type =
                numeroCuentaEl.type === "password" ? "text" : "password";
              numeroCuentaEl.type = type;
              const icon = this.querySelector("i");
              if (icon)
                icon.className =
                  type === "password" ? "fas fa-eye" : "fas fa-eye-slash";
            });
          }
        } catch (e) {}
        numeroCuentaEl.addEventListener("keydown", function (e) {
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
          // Solo permitir dígitos
          if (!(e.key >= "0" && e.key <= "9")) e.preventDefault();
          // Limitar longitud a 34
          try {
            const selStart = numeroCuentaEl.selectionStart;
            const selEnd = numeroCuentaEl.selectionEnd;
            const current = numeroCuentaEl.value || "";
            const next =
              current.slice(0, selStart) + e.key + current.slice(selEnd);
            if (next.replace(/\D/g, "").length > 34) e.preventDefault();
          } catch (err) {}
        });

        numeroCuentaEl.addEventListener("paste", function (e) {
          e.preventDefault();
          let paste =
            (e.clipboardData || window.clipboardData).getData("text") || "";
          paste = paste.replace(/\D/g, "").slice(0, 34);
          const start = numeroCuentaEl.selectionStart;
          const end = numeroCuentaEl.selectionEnd;
          const cur = numeroCuentaEl.value || "";
          numeroCuentaEl.value = cur.slice(0, start) + paste + cur.slice(end);
          numeroCuentaEl.setSelectionRange(
            start + paste.length,
            start + paste.length
          );
          numeroCuentaEl.dispatchEvent(new Event("input"));
        });

        numeroCuentaEl.addEventListener("input", function () {
          const cleaned = (numeroCuentaEl.value || "")
            .replace(/\D/g, "")
            .slice(0, 34);
          if (numeroCuentaEl.value !== cleaned) numeroCuentaEl.value = cleaned;
          const errEl =
            document.getElementById("errorNumeroCuenta") || errorNumeroCuenta;
          if (!cleaned) {
            if (errEl) errEl.textContent = "Este campo es obligatorio";
            numeroCuentaEl.classList.add("invalid");
          } else if (cleaned.length < 10 || cleaned.length > 34) {
            if (errEl) errEl.textContent = "Solo números, 10-34 dígitos.";
            numeroCuentaEl.classList.add("invalid");
          } else {
            if (errEl) errEl.textContent = "";
            numeroCuentaEl.classList.remove("invalid");
          }
        });

        // Revalidar cuando se cambia el banco (por ejemplo en selecting 'Other')
        bancoHiddenEl?.addEventListener("change", function () {
          // ajustar maxlength visual según banco
          try {
            if (isColombianBank(bancoHiddenEl.value))
              numeroCuentaEl.maxLength = 14;
            else numeroCuentaEl.maxLength = 34;
          } catch (e) {}
          // Solo validar si ya hay un valor en el campo de número de cuenta.
          try {
            const currentVal = (numeroCuentaEl?.value || "").trim();
            if (currentVal) {
              validateNumeroCuenta();
            } else {
              // limpiar errores visuales para no mostrar "obligatorio" cuando el usuario
              // aún no ha escrito el número pero acaba de seleccionar el banco.
              clearError(numeroCuentaEl);
              if (typeof errorNumeroCuenta !== "undefined" && errorNumeroCuenta)
                errorNumeroCuenta.textContent = "";
            }
          } catch (e) {}
        });
      }

      // --- Teléfono: reglas avanzadas (aceptar +57, 57-prefijo o local 10 dígitos)
      const telefono = document.getElementById("telefonoContacto");
      if (telefono) {
        const normalizePhone = (v) => {
          if (!v) return "";
          let s = String(v)
            .trim()
            .replace(/[\s\-()\.]/g, "");
          if (/^00?57/.test(s)) {
            s = s.replace(/^00?/, "");
          }
          if (s.startsWith("+")) {
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

          if (e.key === "+") {
            if (
              telefono.selectionStart === 0 &&
              !telefono.value.includes("+")
            ) {
              return;
            }
            e.preventDefault();
            return;
          }

          if (!(e.key >= "0" && e.key <= "9")) {
            e.preventDefault();
            return;
          }

          try {
            const selStart = telefono.selectionStart;
            const selEnd = telefono.selectionEnd;
            const current = telefono.value || "";
            const next =
              current.slice(0, selStart) + e.key + current.slice(selEnd);
            const digitsNext = next.replace(/\D/g, "");
            if (next.startsWith("+")) {
              if (next.length > 13) {
                e.preventDefault();
                return;
              }
            } else if (digitsNext.startsWith("57")) {
              if (digitsNext.length > 12) {
                e.preventDefault();
                return;
              }
            } else {
              if (digitsNext.length > 10) {
                e.preventDefault();
                return;
              }
            }
          } catch (err) {}
        });

        telefono.addEventListener("paste", function (e) {
          e.preventDefault();
          let raw =
            (e.clipboardData || window.clipboardData).getData("text") || "";
          let norm = normalizePhone(raw);
          if (norm.startsWith("+")) {
            norm = norm.slice(0, 13);
          } else {
            norm = norm.replace(/\D/g, "");
            if (norm.startsWith("57")) norm = norm.slice(0, 12);
            else norm = norm.slice(0, 10);
          }
          const paste = norm;
          const start = telefono.selectionStart;
          const end = telefono.selectionEnd;
          const current = telefono.value || "";
          telefono.value = current.slice(0, start) + paste + current.slice(end);
          telefono.setSelectionRange(
            start + paste.length,
            start + paste.length
          );
          telefono.dispatchEvent(new Event("input"));
        });

        telefono.addEventListener("input", function () {
          const before = telefono.value;
          let cleaned = normalizePhone(before);
          if (cleaned.startsWith("+57")) {
            if (cleaned.length > 13) cleaned = cleaned.slice(0, 13);
          } else if (cleaned.startsWith("+")) {
            cleaned = cleaned.replace(/\D/g, "");
          } else {
            cleaned = cleaned.replace(/\D/g, "");
            if (cleaned.startsWith("57")) cleaned = cleaned.slice(0, 12);
            else cleaned = cleaned.slice(0, 10);
          }
          if (before !== cleaned) telefono.value = cleaned;
        });

        telefono.addEventListener("blur", function () {
          const errorEl = document.getElementById("telefono-error") || null;
          const norm = normalizePhone(telefono.value || "");
          const validIntl = /^\+57[0-9]{10}$/.test(norm);
          const validPrefixed = /^57[0-9]{10}$/.test(norm);
          const validLocal = /^[0-9]{10}$/.test(norm);
          if (!norm) showError(telefono, "Teléfono requerido");
          else if (!validIntl && !validPrefixed && !validLocal)
            showError(
              telefono,
              "Formato inválido. Ej: 3001234567 o +573001234567"
            );
          else clearError(telefono);
        });
      }

      // --- Precio: validación (min 10.000, max 120.000, múltiplos de 100) ---
      const precio = document.getElementById("precio");
      if (precio) {
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
          try {
            const selStart = precio.selectionStart;
            const selEnd = precio.selectionEnd;
            const current = precio.value || "";
            const next =
              current.slice(0, selStart) + e.key + current.slice(selEnd);
            const numeric = parseInt(next, 10);
            if (!isNaN(numeric) && numeric > 120000) {
              e.preventDefault();
              return;
            }
          } catch (err) {}
        });

        precio.addEventListener("paste", function (e) {
          e.preventDefault();
          let paste =
            (e.clipboardData || window.clipboardData).getData("text") || "";
          paste = paste.replace(/\D/g, "").slice(0, 6);
          if (paste) {
            let num = parseInt(paste, 10);
            if (!isNaN(num) && num > 120000) num = 120000;
            paste = String(num);
          }
          precio.value = paste;
          precio.dispatchEvent(new Event("input"));
        });

        precio.addEventListener("input", function () {
          let val = (precio.value || "").toString().replace(/\D/g, "");
          if (precio.value !== val) precio.value = val;
          if (val === "") {
            showError(precio, "Precio requerido");
            return;
          }
          const num = parseInt(val, 10);
          if (isNaN(num)) {
            showError(precio, "Valor inválido");
            return;
          }
          if (num < 10000) {
            showError(precio, "El mínimo es $10.000 COP");
            return;
          }
          if (num > 120000) {
            showError(precio, "El máximo es $120.000 COP");
            return;
          }
          if (num % 100 !== 0) {
            showError(precio, "Debe ser múltiplo de 100");
            return;
          }
          clearError(precio);
        });
      }

      // --- Descripción: autosize, sanitizar y contador ---
      const descripcion = document.getElementById("descripcion");
      if (descripcion) {
        // Crear contador si no existe
        let descContador = document.getElementById("descContador");
        if (!descContador) {
          descContador = document.createElement("div");
          descContador.id = "descContador";
          descContador.style.cssText =
            "font-size:0.85rem;color:var(--muted);margin-top:0.25rem;";
          descripcion.parentNode.appendChild(descContador);
        }

        const autoResize = (el) => {
          el.style.height = "auto";
          el.style.height = el.scrollHeight + "px";
        };

        const sanitizeDescription = (s) => {
          if (!s) return "";
          let t = String(s).replace(/<[^>]*>/g, "");
          t = t.replace(/\s+/g, " ").trim();
          return t;
        };

        const containsURL = (s) => /https?:\/\/|www\./i.test(s);
        const hasLongRepeated = (s) => /(.)\1{6,}/.test(s);
        const MIN_DESC = 30;
        const MAX_DESC = 400;

        autoResize(descripcion);
        descContador.textContent = descripcion.value.length;

        descripcion.addEventListener("input", function () {
          descContador.textContent = descripcion.value.length;
          autoResize(descripcion);
          const raw = descripcion.value || "";
          const clean = sanitizeDescription(raw);
          let errorMsg = "";
          if (!clean) errorMsg = "Descripción requerida.";
          else if (clean.length < MIN_DESC)
            errorMsg = `Describe tu experiencia en al menos ${MIN_DESC} caracteres.`;
          else if (raw.length > MAX_DESC || clean.length > MAX_DESC)
            errorMsg = `Máximo ${MAX_DESC} caracteres.`;
          else if (containsURL(raw))
            errorMsg =
              "No incluyas enlaces o direcciones web en la descripción.";
          else if (hasLongRepeated(raw))
            errorMsg = "Evita secuencias repetidas de caracteres.";

          if (errorMsg) showError(descripcion, errorMsg);
          else clearError(descripcion);
        });
      }

      // --- Inicializar Choices.js para categorías si está disponible ---
      const categoriesEl = document.getElementById("categorias");
      if (categoriesEl && typeof guardedInitChoices === "function") {
        guardedInitChoices(categoriesEl, {
          removeItemButton: true,
          shouldSort: false,
          placeholder: true,
          placeholderValue: "Selecciona tus categorías",
          searchPlaceholderValue: "Buscar categoría...",
          noResultsText: "No se encontraron categorías",
          noChoicesText: "No hay categorías disponibles",
          itemSelectText: "Pulsa para seleccionar",
        });
      }

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

      // La validación/preview de foto fue removida en esta vista por petición del usuario.

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

      // Validación de categorías - CORREGIDA
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
      // scope the options to the list container so we don't pick unrelated elements
      const options = optionsList
        ? Array.from(optionsList.querySelectorAll(".bank-option"))
        : [];
      const selectedName = document.getElementById("selected-bank-name");
      const hiddenInput = document.getElementById("banco");

      if (!trigger || !optionsContainer || !optionsList) {
        console.warn("bankSelector: elementos faltantes", {
          trigger,
          optionsContainer,
          optionsList,
        });
        return;
      }

      // elemento padre .bank-selector (donde el CSS mira aria-expanded)
      const bankSelectorEl = trigger.closest(".bank-selector");
      if (!bankSelectorEl) {
        console.warn(
          "bankSelector: .bank-selector no encontrado como ancestro del trigger"
        );
        return;
      }

      // Asegurar estado inicial consistente (oculto)
      try {
        if (!optionsContainer.style.display)
          optionsContainer.style.display = "none";
        optionsContainer.setAttribute("aria-hidden", "true");
        trigger.setAttribute("aria-expanded", "false");
      } catch (e) {
        console.warn("bankSelector: no se pudo inicializar visibilidad", e);
      }

      // Si el input hidden ya contiene un valor (por ejemplo en edición), preseleccionar
      try {
        const hiddenVal = hiddenInput?.value || "";
        const otherBankWrapper = document.getElementById("other-bank-wrapper");
        const otherBankInput = document.getElementById("other-bank-input");
        if (hiddenVal) {
          const match = optionsList.querySelector(
            `.bank-option[data-value="${CSS.escape(hiddenVal)}"]`
          );
          if (match) {
            const label =
              match.querySelector(".bank-name")?.textContent || hiddenVal;
            if (selectedName) selectedName.textContent = label;
            // marcar visualmente la opción si se requiere
            match.classList.add("selected");
          } else if (hiddenVal) {
            // valor personalizado -> marcar Other
            if (hiddenInput) hiddenInput.value = "Other";
            if (selectedName) selectedName.textContent = "Otro (Especificar)";
            if (otherBankWrapper) otherBankWrapper.style.display = "block";
            if (otherBankInput) otherBankInput.value = hiddenVal;
          }
        }
      } catch (e) {
        // no crítico
      }

      let open = false;
      let focusedIndex = -1;

      function openList() {
        // mostrar internamente y actualizar el atributo aria-expanded en el contenedor
        optionsContainer.style.display = "block";
        bankSelectorEl.setAttribute("aria-expanded", "true");
        trigger.setAttribute("aria-expanded", "true");
        optionsContainer.setAttribute("aria-hidden", "false");
        open = true;
        // Fallback robusto: forzar ancho del dropdown igual al ancho del trigger
        // Esto protege contra estilos externos o si el contenedor se reubica en el DOM.
        try {
          if (window && window.innerWidth > 480) {
            const rect = bankSelectorEl.getBoundingClientRect();
            optionsContainer.style.width = rect.width + "px";
          } else {
            // En móviles dejamos que el CSS responsivo maneje el tamaño (position: fixed)
            optionsContainer.style.width = "";
          }
        } catch (e) {
          // no crítico
        }
        // recalcular opciones en caso de que el DOM haya cambiado dinámicamente
        if (optionsList) {
          const refreshed = Array.from(
            optionsList.querySelectorAll(".bank-option")
          );
          // actualizar la lista 'options' si hay diferencias
          if (refreshed.length !== options.length) {
            // pequeño mutating pero seguro: vaciar y volver a poblar
            options.length = 0;
            refreshed.forEach((o) => options.push(o));
          }
        }
      }

      function closeList() {
        optionsContainer.style.display = "none";
        bankSelectorEl.setAttribute("aria-expanded", "false");
        trigger.setAttribute("aria-expanded", "false");
        optionsContainer.setAttribute("aria-hidden", "true");
        open = false;
        focusedIndex = -1;
        // limpiar estilos inline aplicados al abrir
        try {
          optionsContainer.style.width = "";
        } catch (e) {}
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
          // focus con pequeño delay para asegurar que el elemento es visible
          if (searchInput) setTimeout(() => searchInput.focus(), 40);
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
          // solo iterar las opciones actualmente en el list container
          const currentOptions = optionsList
            ? Array.from(optionsList.querySelectorAll(".bank-option"))
            : options;
          currentOptions.forEach((opt) => {
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
      // Confirmaciones de campos removidas: ya no existen inputs de confirmación en el formulario.
      const numDoc = document.getElementById("numero-documento");
      const nCuenta = document.getElementById("numeroCuenta");

      // Verificar formato de número de cuenta usando la función canónica
      try {
        if (typeof validateNumeroCuenta === "function") {
          const ok = validateNumeroCuenta();
          if (!ok) valid = false;
        } else if (nCuenta) {
          // Fallback: formato simple (solo dígitos 6-20)
          const cleaned = (nCuenta.value || "").replace(/\D/g, "");
          if (!/^[0-9]{10,34}$/.test(cleaned)) {
            showError(nCuenta, "Número inválido (10-34 dígitos)");
            valid = false;
          } else {
            clearError(nCuenta);
          }
        }
      } catch (e) {
        // no bloquear validación por error inesperado
      }

      // Validar teléfono
      const tel = document.getElementById("telefonoContacto");
      if (tel && tel.value.trim().length < 7) {
        showError(tel, "Número de teléfono inválido");
        valid = false;
      }

      // Validación de foto eliminada (no requerida en registroExperto)

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
          // Verificar que la sesión está activa y el usuario autenticado en el proxy frontend
          // Comprobar sesión en el proxy. Si devuelve 401, intentar restaurar sesión
          // a partir del token almacenado en localStorage antes de redirigir al login.
          async function attemptRestoreSessionFromLocalStorage() {
            try {
              const token = localStorage.getItem("token");
              const usuarioStr = localStorage.getItem("usuario");
              console.log(
                "attemptRestoreSessionFromLocalStorage: token present?",
                !!token
              );
              if (!token) return false;
              let usuario = null;
              try {
                usuario = usuarioStr ? JSON.parse(usuarioStr) : null;
              } catch (e) {
                usuario = null;
              }
              if (!usuario) usuario = { token };
              usuario.token = token;

              const setRes = await fetch("/set-session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ usuario }),
                credentials: "include",
              });
              console.log(
                "attemptRestoreSessionFromLocalStorage: /set-session status=",
                setRes.status,
                "ok=",
                setRes.ok
              );
              return setRes.ok;
            } catch (e) {
              return false;
            }
          }

          try {
            const authCheck = await fetch("/api/usuarios/perfil", {
              method: "GET",
              credentials: "include",
              cache: "no-store",
              headers: {
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
              },
            });
            if (!authCheck.ok) {
              if (authCheck.status === 401) {
                // Intentar restaurar sesión desde localStorage (si el token existe)
                const restored = await attemptRestoreSessionFromLocalStorage();
                if (!restored) {
                  alert(
                    "Debes iniciar sesión para completar el registro de experto. Serás redirigido al login."
                  );
                  window.location.href = "/login.html?next=/registroExperto";
                  return;
                }
                // Si se restauró la sesión, seguir adelante (la próxima petición incluirá la cookie)
              }
            }
          } catch (e) {
            // No bloquear el flujo por un error momentáneo de comprobación
            console.warn("No se pudo comprobar autenticación previa:", e);
          }
          const csrfToken = await getCsrfToken();
          // Enviar al endpoint correcto del backend: PUT /api/expertos/perfil
          const headers = {
            "Content-Type": "application/json",
          };
          if (csrfToken) headers["x-csrf-token"] = csrfToken;
          // Si hay token JWT en localStorage, anexarlo en Authorization para
          // que el backend lo reciba incluso si la sesión proxy no se restauró.
          try {
            const localToken = localStorage.getItem("token");
            if (localToken) {
              headers["Authorization"] = `Bearer ${localToken}`;
              console.log(
                "registroExperto: usando token desde localStorage para Authorization"
              );
            }
          } catch (e) {}

          const response = await fetch("/api/expertos/perfil", {
            method: "PUT",
            headers,
            credentials: "include",
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const backendMsg = errorData.mensaje || errorData.message || null;
            let detail = backendMsg || `Error del servidor: ${response.status}`;
            // Si el backend envía campos faltantes, mostrarlos
            if (
              errorData.camposFaltantes &&
              Array.isArray(errorData.camposFaltantes)
            ) {
              detail +=
                "\nCampos faltantes: " + errorData.camposFaltantes.join(", ");
            }
            throw new Error(detail);
          }

          // Leer respuesta del backend (contiene el usuario actualizado)
          const respData = await response.json().catch(() => null);

          // Intentar actualizar la sesión del proxy con el usuario devuelto
          try {
            const usuarioBackend =
              respData && respData.usuario ? respData.usuario : null;
            const token = localStorage.getItem("token");
            let usuarioToSet = usuarioBackend || null;
            if (usuarioToSet && token) {
              usuarioToSet.token = token;
            }
            if (usuarioToSet) {
              try {
                const setRes = await fetch("/set-session", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ usuario: usuarioToSet }),
                });
                console.log(
                  "registroExperto: set-session status",
                  setRes.status,
                  "ok=",
                  setRes.ok
                );
                // Esperar a que la sesión proxy esté activa: comprobar /api/usuarios/perfil
                const maxRetries = 3;
                let ok = false;
                for (let i = 0; i < maxRetries; i++) {
                  try {
                    const perfilChk = await fetch("/api/usuarios/perfil", {
                      method: "GET",
                      credentials: "include",
                      cache: "no-store",
                      headers: {
                        "Cache-Control": "no-cache",
                        Pragma: "no-cache",
                      },
                    });
                    if (perfilChk.ok) {
                      ok = true;
                      break;
                    }
                  } catch (e) {}
                  // small backoff
                  await new Promise((r) => setTimeout(r, 250 * (i + 1)));
                }
                if (!ok) {
                  console.warn(
                    "registroExperto: /api/usuarios/perfil no responde OK tras set-session"
                  );
                }
              } catch (e) {
                console.warn("registroExperto: set-session failed", e);
              }
            }
          } catch (e) {
            console.warn(
              "registroExperto: no se pudo actualizar sesión proxy",
              e
            );
          }

          // Éxito: redirigir al perfil del usuario donde podrá ver su información
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
})();

console.log("registroExperto.js cargado correctamente");
