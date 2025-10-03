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

      fotoPerfilInput.addEventListener("change", async function (e) {
        const file = e.target.files && e.target.files[0];
        if (!file) {
          resetPreview();
          return;
        }

        // Reglas recomendadas
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        const MAX_SIZE = 2 * 1024 * 1024; // 2MB
        const MIN_WIDTH = 300;
        const MIN_HEIGHT = 300;
        const MAX_WIDTH = 4000;
        const MAX_HEIGHT = 4000;
        const MAX_DIM_FOR_RESIZE = 2000; // si supera esto intentamos redimensionar
        const MIN_ASPECT = 0.5; // ancho/alto
        const MAX_ASPECT = 2.0;

        // Tipo
        if (!allowedTypes.includes(file.type)) {
          showImageError("Tipo de archivo no soportado. Usa JPG, PNG o WebP.");
          return;
        }

        // Tamaño inicial (si es evidente que sobrepasa límites)
        if (file.size > MAX_SIZE * 4) {
          // demasiado grande para intentar procesar en cliente
          showImageError(
            "Archivo demasiado grande. Sube una imagen más pequeña."
          );
          return;
        }

        // Leer en memoria y comprobar dimensiones
        const dataUrl = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.onerror = rej;
          r.readAsDataURL(file);
        }).catch(() => null);

        if (!dataUrl) {
          showImageError("No se pudo leer el archivo. Intenta otro archivo.");
          return;
        }

        const img = new Image();
        const imgLoad = new Promise((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej();
        });
        img.src = dataUrl;
        try {
          await imgLoad;
        } catch (err) {
          showImageError("Imagen inválida o corrupta.");
          return;
        }

        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (w < MIN_WIDTH || h < MIN_HEIGHT) {
          showImageError(
            `Imagen demasiado pequeña. Mínimo ${MIN_WIDTH}x${MIN_HEIGHT}px.`
          );
          return;
        }
        if (w > MAX_WIDTH || h > MAX_HEIGHT) {
          showImageError(
            `Imagen demasiado grande en dimensiones. Máximo ${MAX_WIDTH}x${MAX_HEIGHT}px.`
          );
          return;
        }
        const aspect = w / h;
        if (aspect < MIN_ASPECT || aspect > MAX_ASPECT) {
          showImageError(
            "Proporción de la imagen no válida. Usa un recorte aproximadamente cuadrado o 4:3/3:4."
          );
          return;
        }

        let fileToUse = file;

        // Si es grande en tamaño o en dimensiones, intentar redimensionar/comprimir
        if (
          file.size > MAX_SIZE ||
          w > MAX_DIM_FOR_RESIZE ||
          h > MAX_DIM_FOR_RESIZE
        ) {
          try {
            const targetMax = MAX_DIM_FOR_RESIZE;
            const scale = Math.min(1, targetMax / Math.max(w, h));
            const tw = Math.round(w * scale);
            const th = Math.round(h * scale);
            const canvas = document.createElement("canvas");
            canvas.width = tw;
            canvas.height = th;
            const ctx = canvas.getContext("2d");
            // Dibujar con alta calidad cuando esté disponible
            if (ctx && typeof ctx.imageSmoothingEnabled !== "undefined") {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = "high";
            }
            ctx.drawImage(img, 0, 0, tw, th);

            // Intentar generar JPEG comprimido para reducir tamaño (mantener calidad razonable)
            const blob = await new Promise((res) =>
              canvas.toBlob(res, "image/jpeg", 0.85)
            );
            if (blob && blob.size > 0) {
              // Si el blob es aceptable en tamaño, reemplazamos
              if (blob.size <= MAX_SIZE) {
                fileToUse = new File(
                  [blob],
                  file.name.replace(/\.[^.]+$/, ".jpg"),
                  {
                    type: blob.type,
                  }
                );
              } else {
                // Si aún es mayor, intentar otra compresión más agresiva
                const blob2 = await new Promise((res) =>
                  canvas.toBlob(res, "image/jpeg", 0.7)
                );
                if (blob2 && blob2.size <= MAX_SIZE) {
                  fileToUse = new File(
                    [blob2],
                    file.name.replace(/\.[^.]+$/, ".jpg"),
                    {
                      type: blob2.type,
                    }
                  );
                } else {
                  // No pudimos reducir lo suficiente
                  showImageError(
                    "No fue posible optimizar la imagen lo suficiente. Intenta subir una versión más pequeña."
                  );
                  return;
                }
              }
            }
          } catch (err) {
            // Si falla la compresión en cliente, avisar y permitir que el usuario suba otra
            showImageError(
              "Fallo al procesar la imagen en el navegador. Usa una imagen más pequeña o de otro formato."
            );
            return;
          }
        }

        // Limpiar errores previos
        if (fotoError) fotoError.style.display = "none";
        clearError(fotoPerfilInput);

        // Reemplazar el FileList del input si usamos un blob diferente
        if (fileToUse !== file) {
          try {
            const dt = new DataTransfer();
            dt.items.add(fileToUse);
            fotoPerfilInput.files = dt.files;
          } catch (e) {
            // Algunos navegadores antiguos pueden no soportarlo; no crítico
          }
        }

        // Actualizar UI
        if (fileInputText) fileInputText.textContent = fileToUse.name;
        if (fotoNombre) fotoNombre.textContent = fileToUse.name;
        if (fotoTamano) fotoTamano.textContent = formatFileSize(fileToUse.size);

        // Mostrar preview desde blob/url
        try {
          const url = URL.createObjectURL(fileToUse);
          if (epImg) epImg.src = url;
        } catch (e) {
          if (epImg) epImg.src = dataUrl;
        }
        if (epPreview) epPreview.style.display = "flex";
        if (epRemove) epRemove.style.display = "inline-block";
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

    // --- Validación final en submit: obligar foto de perfil y revalidar antes de enviar ---
    const registroForm = document.getElementById("registroExpertoForm");
    if (registroForm) {
      registroForm.addEventListener("submit", function (e) {
        const fotoInput = document.getElementById("fotoPerfil");
        if (!fotoInput) return;
        const f = fotoInput.files && fotoInput.files[0];
        if (!f) {
          e.preventDefault();
          showError(fotoInput, "Debes subir una imagen de perfil");
          const el = fotoInput;
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          return false;
        }
        const allowed = ["image/jpeg", "image/png", "image/webp"];
        if (!allowed.includes(f.type)) {
          e.preventDefault();
          showError(
            fotoInput,
            "Tipo de archivo no permitido. Usa JPG/PNG/WebP."
          );
          return false;
        }
        if (f.size > 2 * 1024 * 1024) {
          e.preventDefault();
          showError(
            fotoInput,
            "La imagen excede 2MB. Usa una versión más pequeña."
          );
          return false;
        }
        // si pasa, permitir submit
        return true;
      });
    }

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
      const numericIds = [
        "numero-documento",
        "numero-documento-confirm",
        "numeroCuentaConfirm",
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
        const bancoVal = bancoHiddenEl?.value || "";
        const val = (numeroCuentaEl.value || "").trim();
        if (!val) {
          showError(numeroCuentaEl, "Número de cuenta obligatorio");
          return false;
        }
        // Try SharedValidators for authoritative validation
        try {
          if (
            window &&
            window.SharedValidators &&
            typeof window.SharedValidators.validateNumeroCuentaByBank ===
              "function"
          ) {
            const res = window.SharedValidators.validateNumeroCuentaByBank(
              bancoVal,
              val
            );
            if (!res.valid) {
              showError(
                numeroCuentaEl,
                res.message || "Número de cuenta inválido"
              );
              return false;
            }
            clearError(numeroCuentaEl);
            return true;
          }
        } catch (e) {}
        // Fallback local logic
        if (isColombianBank(bancoVal)) {
          const cleaned = val.replace(/\D/g, "");
          if (!/^[0-9]{6,14}$/.test(cleaned)) {
            showError(
              numeroCuentaEl,
              "Número de cuenta inválido (6-14 dígitos)"
            );
            return false;
          }
          clearError(numeroCuentaEl);
          return true;
        } else {
          // Internacional: permitir alfanumérico IBAN-like 15-34
          const cleaned = val.replace(/[^0-9A-Za-z]/g, "");
          if (!/^[0-9A-Za-z]{15,34}$/.test(cleaned)) {
            showError(
              numeroCuentaEl,
              "Cuenta internacional inválida (15-34 caracteres alfanuméricos)"
            );
            return false;
          }
          clearError(numeroCuentaEl);
          return true;
        }
      }

      if (numeroCuentaEl) {
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
          const bancoVal = bancoHiddenEl?.value || "";
          if (isColombianBank(bancoVal)) {
            if (!(e.key >= "0" && e.key <= "9")) e.preventDefault();
          } else {
            // permitir letras y números
            if (!/^[0-9A-Za-z]$/.test(e.key)) e.preventDefault();
          }
        });

        numeroCuentaEl.addEventListener("paste", function (e) {
          e.preventDefault();
          const bancoVal = bancoHidden?.value || "";
          let paste =
            (e.clipboardData || window.clipboardData).getData("text") || "";
          if (isColombianBank(bancoVal))
            paste = paste.replace(/\D/g, "").slice(0, 14);
          else paste = paste.replace(/[^0-9A-Za-z]/g, "").slice(0, 34);
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
          const bancoVal = bancoHidden?.value || "";
          if (isColombianBank(bancoVal)) {
            const cleaned = (numeroCuentaEl.value || "")
              .replace(/\D/g, "")
              .slice(0, 14);
            if (numeroCuentaEl.value !== cleaned)
              numeroCuentaEl.value = cleaned;
            if (!cleaned || cleaned.length < 6 || cleaned.length > 14) {
              if (errorNumeroCuenta)
                errorNumeroCuenta.textContent = "Solo números, 6-14 dígitos.";
              numeroCuentaEl.classList.add("invalid");
            } else {
              if (errorNumeroCuenta) errorNumeroCuenta.textContent = "";
              numeroCuentaEl.classList.remove("invalid");
            }
          } else {
            const cleaned = (numeroCuentaEl.value || "")
              .replace(/[^0-9A-Za-z]/g, "")
              .slice(0, 34);
            if (numeroCuentaEl.value !== cleaned)
              numeroCuentaEl.value = cleaned;
            if (!cleaned || cleaned.length < 15 || cleaned.length > 34) {
              if (errorNumeroCuenta)
                errorNumeroCuenta.textContent =
                  "Cuenta internacional: 15-34 caracteres alfanuméricos.";
              numeroCuentaEl.classList.add("invalid");
            } else {
              if (errorNumeroCuenta) errorNumeroCuenta.textContent = "";
              numeroCuentaEl.classList.remove("invalid");
            }
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
          validateNumeroCuenta();
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

      // --- Precio: validación (min 10.000, max 100.000, múltiplos de 100) ---
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
            if (!isNaN(numeric) && numeric > 100000) {
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
            if (!isNaN(num) && num > 100000) num = 100000;
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
          if (num > 100000) {
            showError(precio, "El máximo es $100.000 COP");
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

      let open = false;
      let focusedIndex = -1;

      function openList() {
        // mostrar internamente y actualizar el atributo aria-expanded en el contenedor
        optionsContainer.style.display = "block";
        bankSelectorEl.setAttribute("aria-expanded", "true");
        trigger.setAttribute("aria-expanded", "true");
        optionsContainer.setAttribute("aria-hidden", "false");
        open = true;
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

      // Verificar formato de número de cuenta: solo dígitos y 6-20
      if (nCuenta) {
        const cleaned = (nCuenta.value || "").replace(/\D/g, "");
        if (!/^[0-9]{6,20}$/.test(cleaned)) {
          showError(nCuenta, "Número de cuenta inválido (6-20 dígitos)");
          valid = false;
        } else {
          clearError(nCuenta);
        }
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
