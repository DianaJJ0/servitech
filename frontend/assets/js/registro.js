/**
 * JS de registro con validación visual de criterios de contraseña.
 */
document.addEventListener("DOMContentLoaded", () => {
  const registroForm = document.getElementById("registroForm");
  if (!registroForm) return;

  const formError = document.getElementById("formError");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");

  // Elementos criterios
  const minLengthItem = document.getElementById("minLengthCriteria");
  const uppercaseItem = document.getElementById("uppercaseCriteria");
  const lowercaseItem = document.getElementById("lowercaseCriteria");
  const numberItem = document.getElementById("numberCriteria");

  // Mostrar criterios visualmente desde el inicio
  const criteriaList = document.getElementById("passwordCriteria");
  criteriaList.style.maxHeight = "500px";

  // Validar criterios y actualizar clases visuales
  function validatePasswordCriteria(pw) {
    const minLength = pw.length >= 8;
    const hasUppercase = /[A-Z]/.test(pw);
    const hasLowercase = /[a-z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);

    minLengthItem.classList.toggle("valid", minLength);
    minLengthItem.classList.toggle("invalid", !minLength);
    uppercaseItem.classList.toggle("valid", hasUppercase);
    uppercaseItem.classList.toggle("invalid", !hasUppercase);
    lowercaseItem.classList.toggle("valid", hasLowercase);
    lowercaseItem.classList.toggle("invalid", !hasLowercase);
    numberItem.classList.toggle("valid", hasNumber);
    numberItem.classList.toggle("invalid", !hasNumber);

    return minLength && hasUppercase && hasLowercase && hasNumber;
  }

  // Actualiza los criterios en tiempo real
  passwordInput.addEventListener("input", (e) => {
    validatePasswordCriteria(e.target.value);
  });

  // Mostrar/ocultar contraseña
  const togglePassword = document.querySelector(".toggle-password");
  if (togglePassword) {
    togglePassword.addEventListener("click", () => {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      togglePassword.classList.toggle("fa-eye");
      togglePassword.classList.toggle("fa-eye-slash");
    });
  }

  // Validación y envío del registro
  registroForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    formError.style.display = "none";
    const termsCheckbox = document.getElementById("terms");
    const privacyCheckbox = document.getElementById("privacy");
    const termsError = document.getElementById("termsError");
    const privacyError = document.getElementById("privacyError");
    termsError.style.display = "none";
    privacyError.style.display = "none";

    let valid = true;
    if (!termsCheckbox.checked) {
      termsError.style.display = "block";
      valid = false;
    }
    if (!privacyCheckbox.checked) {
      privacyError.style.display = "block";
      valid = false;
    }

    // Validación básica
    if (
      !emailInput.value.trim() ||
      !passwordInput.value.trim() ||
      !confirmPasswordInput.value.trim()
    ) {
      formError.textContent = "Por favor, complete todos los campos.";
      formError.style.display = "block";
      valid = false;
    }
    if (passwordInput.value !== confirmPasswordInput.value) {
      formError.textContent = "Las contraseñas no coinciden.";
      formError.style.display = "block";
      valid = false;
    }
    if (!validatePasswordCriteria(passwordInput.value)) {
      formError.textContent = "La contraseña no cumple los requisitos.";
      formError.style.display = "block";
      valid = false;
    }
    if (!valid) return;

    const datosRegistro = {
      nombre: document.getElementById("nombre").value.trim(),
      apellido: document.getElementById("apellido").value.trim(),
      email: emailInput.value.trim(),
      password: passwordInput.value.trim(),
    };

    const submitButton = registroForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Registrando...';

    try {
      const response = await fetch(
        "http://localhost:3000/api/usuarios/registro",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datosRegistro),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        formError.textContent =
          result.mensaje || "Ocurrió un error desconocido.";
        formError.style.display = "block";
        return;
      }

      formError.textContent =
        "¡Registro exitoso! Redirigiendo al inicio de sesión...";
      formError.classList.add("success-message");
      formError.style.color = "#28a745";
      formError.style.display = "block";
      setTimeout(() => {
        window.location.href = "/login.html";
      }, 2000);
    } catch (error) {
      formError.textContent = error.message;
      formError.style.color = "#dc3545";
      formError.style.display = "block";
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = "Crear Cuenta";
    }
  });
});
