/**
 * JS para recuperación de contraseña. Incluye envío de email y cambio de contraseña usando el token.
 */
document.addEventListener("DOMContentLoaded", function () {
  const recoveryForm = document.getElementById("recoveryForm");
  const resetForm = document.getElementById("resetForm");
  const emailError = document.getElementById("emailError");
  const resetError = document.getElementById("resetError");

  // Mostrar el formulario de nueva contraseña si hay token en la URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  if (token) {
    if (recoveryForm) recoveryForm.style.display = "none";
    if (resetForm) resetForm.style.display = "block";
  } else {
    if (resetForm) resetForm.style.display = "none";
    if (recoveryForm) recoveryForm.style.display = "block";
  }

  // Solicitud de recuperación: envía el email al backend
  if (recoveryForm) {
    recoveryForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      emailError.style.display = "none";
      const email = recoveryForm.email.value.trim();
      if (!email) {
        emailError.textContent = "Por favor ingresa tu correo.";
        emailError.style.display = "block";
        return;
      }
      // Validación básica de formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        emailError.textContent = "Formato de correo inválido.";
        emailError.style.display = "block";
        return;
      }

      // Verificar existencia del email en la base de datos mediante endpoint público
      try {
        const lookupResp = await fetch(
          `/api/usuarios/buscar?email=${encodeURIComponent(email)}`,
          { method: "GET" }
        );
        if (!lookupResp.ok) {
          // Si retorna 404 -> usuario no encontrado
          if (lookupResp.status === 404) {
            emailError.textContent =
              "No se encontró una cuenta con ese correo. Verifica el email ingresado.";
            emailError.style.color = "#dc3545";
            emailError.style.display = "block";
            return;
          }
          // Otros errores se tratan genéricamente
          const lookupResult = await lookupResp.json().catch(() => ({}));
          throw new Error(
            lookupResult.mensaje || "Error verificando el correo."
          );
        }
      } catch (lookupErr) {
        emailError.textContent =
          lookupErr.message || "Error verificando el correo.";
        emailError.style.color = "#dc3545";
        emailError.style.display = "block";
        return;
      }
      const submitBtn = recoveryForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Enviando...';
      try {
        // Obtener token CSRF
        const csrfResponse = await fetch("/csrf-token", {
          credentials: "include",
        });
        const csrfData = await csrfResponse.json();
        const csrfToken = csrfData.csrfToken;

        const headers = { "Content-Type": "application/json" };
        if (csrfToken) {
          headers["x-csrf-token"] = csrfToken;
        }

        const response = await fetch("/api/usuarios/recuperar-password", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ email }),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.mensaje || "Error en el envío.");
        emailError.textContent =
          "Se enviaron instrucciones a tu correo si existe una cuenta registrada.";
        emailError.style.color = "#28a745";
        emailError.style.display = "block";
      } catch (err) {
        emailError.textContent = err.message;
        emailError.style.color = "#dc3545";
        emailError.style.display = "block";
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML =
          'Enviar instrucciones <i class="fas fa-arrow-right"></i>';
      }
    });
  }

  // Restablecer contraseña usando el token recibido por email
  if (resetForm) {
    // Añadir toggles para mostrar/ocultar contraseñas
    const addPasswordToggle = (input) => {
      if (!input) return;
      // evitar duplicar el toggle si ya existe
      const wrapper = input.parentElement;
      if (!wrapper) return;
      if (wrapper.querySelector(".toggle-password")) return;

      const toggle = document.createElement("span");
      toggle.className = "toggle-password";
      toggle.setAttribute("role", "button");
      toggle.setAttribute("aria-label", "Mostrar contraseña");
      toggle.style.userSelect = "none";
      toggle.innerHTML = '<i class="fas fa-eye"></i>';
      toggle.addEventListener("click", function () {
        if (input.type === "password") {
          input.type = "text";
          this.innerHTML = '<i class="fas fa-eye-slash"></i>';
          this.setAttribute("aria-label", "Ocultar contraseña");
        } else {
          input.type = "password";
          this.innerHTML = '<i class="fas fa-eye"></i>';
          this.setAttribute("aria-label", "Mostrar contraseña");
        }
        input.focus();
      });
      wrapper.appendChild(toggle);
    };

    // Crear toggles para ambos inputs (si existen)
    const newPasswordInput = document.getElementById("newPassword");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    addPasswordToggle(newPasswordInput);
    addPasswordToggle(confirmPasswordInput);

    // Añadir lista de criterios y validación en tiempo real (mismo comportamiento que registro)
    const minLengthItem = document.getElementById("minLengthCriteria");
    const uppercaseItem = document.getElementById("uppercaseCriteria");
    const lowercaseItem = document.getElementById("lowercaseCriteria");
    const numberItem = document.getElementById("numberCriteria");
    const criteriaList = document.getElementById("passwordCriteria");
    const confirmPasswordErrorEl = document.getElementById(
      "confirmPasswordError"
    );
    if (criteriaList) criteriaList.style.display = "none";

    function validatePasswordCriteria(pw) {
      // Delegar en PasswordUtils cuando esté disponible
      if (window.PasswordUtils) {
        window.PasswordUtils.updateCriteriaNodes(pw, {
          minLengthItem,
          uppercaseItem,
          lowercaseItem,
          numberItem,
        });
        return window.PasswordUtils.isPasswordValid(pw);
      }
      const { minLength, hasUppercase, hasLowercase, hasNumber } = criteria;
      if (minLengthItem) {
        minLengthItem.classList.toggle("valid", minLength);
        minLengthItem.classList.toggle("invalid", !minLength);
      }
      if (uppercaseItem) {
        uppercaseItem.classList.toggle("valid", hasUppercase);
        uppercaseItem.classList.toggle("invalid", !hasUppercase);
      }
      if (lowercaseItem) {
        lowercaseItem.classList.toggle("valid", hasLowercase);
        lowercaseItem.classList.toggle("invalid", !hasLowercase);
      }
      if (numberItem) {
        numberItem.classList.toggle("valid", hasNumber);
        numberItem.classList.toggle("invalid", !hasNumber);
      }
      return minLength && hasUppercase && hasLowercase && hasNumber;
    }

    if (newPasswordInput) {
      newPasswordInput.addEventListener("focus", () => {
        if (criteriaList) criteriaList.style.display = "block";
        validatePasswordCriteria(newPasswordInput.value);
      });
      newPasswordInput.addEventListener("blur", () => {
        if (criteriaList) criteriaList.style.display = "none";
      });
      newPasswordInput.addEventListener("input", (e) => {
        validatePasswordCriteria(e.target.value);
        // actualizar estado de confirmación cuando cambia la contraseña
        if (confirmPasswordInput) validateConfirmPassword();
      });
    }

    function validateConfirmPassword() {
      if (!confirmPasswordInput) return true;
      // Delegar en PasswordUtils si está disponible
      if (window.PasswordUtils) {
        return window.PasswordUtils.validateConfirmAndShow(
          newPasswordInput ? newPasswordInput.value : "",
          confirmPasswordInput.value,
          confirmPasswordErrorEl
        );
      }

      // Fallback al comportamiento original
      if (!confirmPasswordInput.value.trim()) {
        if (confirmPasswordErrorEl) {
          confirmPasswordErrorEl.textContent = "Debes confirmar la contraseña.";
          confirmPasswordErrorEl.style.display = "block";
        }
        return false;
      } else if (
        newPasswordInput &&
        newPasswordInput.value !== confirmPasswordInput.value
      ) {
        if (confirmPasswordErrorEl) {
          confirmPasswordErrorEl.textContent = "Las contraseñas no coinciden.";
          confirmPasswordErrorEl.style.display = "block";
        }
        return false;
      } else {
        if (confirmPasswordErrorEl)
          confirmPasswordErrorEl.style.display = "none";
        return true;
      }
    }

    if (confirmPasswordInput) {
      confirmPasswordInput.addEventListener("input", validateConfirmPassword);
    }

    resetForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      resetError.style.display = "none";
      const newPassword = newPasswordInput ? newPasswordInput.value.trim() : "";
      const confirmPassword = confirmPasswordInput
        ? confirmPasswordInput.value.trim()
        : "";
      if (!newPassword || !confirmPassword) {
        resetError.textContent = "Completa ambos campos.";
        resetError.style.display = "block";
        return;
      }
      // Validar criterios
      if (
        !(window.PasswordUtils
          ? window.PasswordUtils.isPasswordValid(newPassword)
          : validatePasswordCriteria(newPassword))
      ) {
        resetError.textContent = "La contraseña no cumple los requisitos.";
        resetError.style.display = "block";
        return;
      }
      // Validar confirm
      if (!validateConfirmPassword()) {
        resetError.textContent = "Las contraseñas no coinciden.";
        resetError.style.display = "block";
        return;
      }
      const submitBtn = resetForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
      try {
        // Obtener token CSRF
        const csrfResponse = await fetch("/csrf-token", {
          credentials: "include",
        });
        const csrfData = await csrfResponse.json();
        const csrfToken = csrfData.csrfToken;

        const headers = { "Content-Type": "application/json" };
        if (csrfToken) {
          headers["x-csrf-token"] = csrfToken;
        }

        const response = await fetch("/api/usuarios/reset-password", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ token, newPassword }),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.mensaje || "Error al actualizar.");
        resetError.textContent =
          "Contraseña actualizada correctamente. Puedes iniciar sesión.";
        resetError.style.color = "#28a745";
        resetError.style.display = "block";
        setTimeout(() => {
          window.location.href = "/login.html";
        }, 2000);
      } catch (err) {
        resetError.textContent = err.message;
        resetError.style.color = "#dc3545";
        resetError.style.display = "block";
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML =
          'Actualizar contraseña <i class="fas fa-save"></i>';
      }
    });
  }

  // Efecto visual en el input (opcional)
  const inputs = document.querySelectorAll(".input-group input");
  inputs.forEach((input) => {
    input.addEventListener("focus", function () {
      this.parentElement.style.transform = "translateY(-3px)";
      this.parentElement.style.transition = "transform 0.3s";
      this.parentElement.style.boxShadow = "0 5px 15px rgba(0, 0, 0, 0.05)";
    });
    input.addEventListener("blur", function () {
      if (!this.value) {
        this.parentElement.style.transform = "";
        this.parentElement.style.boxShadow = "";
      }
    });
  });
});
