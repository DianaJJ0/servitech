/**
 * JS de registro con validación visual de criterios de contraseña SOLO visible con focus.
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

  const criteriaList = document.getElementById("passwordCriteria");
  criteriaList.style.display = "none"; // oculto al cargar

  // Mostrar criterios solo con focus
  passwordInput.addEventListener("focus", () => {
    criteriaList.style.display = "block";
    validatePasswordCriteria(passwordInput.value);
  });
  passwordInput.addEventListener("blur", () => {
    criteriaList.style.display = "none";
  });

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

  // Validación en tiempo real de campos obligatorios
  const nombreInput = document.getElementById("nombre");
  const apellidoInput = document.getElementById("apellido");

  const nombreError = document.getElementById("nombreError");
  const apellidoError = document.getElementById("apellidoError");
  const emailError = document.getElementById("emailError");
  const confirmPasswordError = document.getElementById("confirmPasswordError");

  function validarNombre() {
    if (!nombreInput.value.trim()) {
      nombreError.textContent = "El nombre es obligatorio.";
      nombreError.style.display = "block";
      return false;
    } else {
      nombreError.style.display = "none";
      return true;
    }
  }
  function validarApellido() {
    if (!apellidoInput.value.trim()) {
      apellidoError.textContent = "El apellido es obligatorio.";
      apellidoError.style.display = "block";
      return false;
    } else {
      apellidoError.style.display = "none";
      return true;
    }
  }
  function validarEmail() {
    if (!emailInput.value.trim()) {
      emailError.textContent = "El correo es obligatorio.";
      emailError.style.display = "block";
      return false;
    } else if (!emailInput.value.includes("@")) {
      emailError.textContent = "El correo debe contener un '@' válido.";
      emailError.style.display = "block";
      return false;
    } else {
      emailError.style.display = "none";
      return true;
    }
  }


  function validarConfirmPassword() {
    if (!confirmPasswordInput.value.trim()) {
      confirmPasswordError.textContent = "Debes confirmar la contraseña.";
      confirmPasswordError.style.display = "block";
      return false;
    } else if (passwordInput.value !== confirmPasswordInput.value) {
      confirmPasswordError.textContent = "Las contraseñas no coinciden.";
      confirmPasswordError.style.display = "block";
      return false;
    } else {
      confirmPasswordError.style.display = "none";
      return true;
    }
  }

  nombreInput.addEventListener("input", validarNombre);
  apellidoInput.addEventListener("input", validarApellido);
  emailInput.addEventListener("input", validarEmail);
  confirmPasswordInput.addEventListener("input", validarConfirmPassword);

  // Validación y envío del registro
  registroForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    formError.style.display = "none";

    // Oculta todos los errores al iniciar
    [nombreError, apellidoError, emailError, confirmPasswordError].forEach(
      (el) => {
        if (el) el.style.display = "none";
      }
    );

    const termsCheckbox = document.getElementById("terms");
    const privacyCheckbox = document.getElementById("privacy");
    const termsError = document.getElementById("termsError");
    const privacyError = document.getElementById("privacyError");
    termsError.style.display = "none";
    privacyError.style.display = "none";

    let valid = true;

    // Validación de nombre
    if (!validarNombre()) valid = false;
    // Validación de apellido
    if (!validarApellido()) valid = false;
    // Validación de email
    if (!validarEmail()) valid = false;
    // Validación de contraseña
    if (!passwordInput.value.trim()) {
      formError.textContent = "La contraseña es obligatoria.";
      formError.style.display = "block";
      valid = false;
    }
    // Validación de confirmación de contraseña
    if (!validarConfirmPassword()) valid = false;
    // Validación de criterios
    if (!validatePasswordCriteria(passwordInput.value)) {
      formError.textContent = "La contraseña no cumple los requisitos.";
      formError.style.display = "block";
      valid = false;
    }
    // Validación de checkboxes obligatorios
    if (!termsCheckbox.checked) {
      termsError.style.display = "block";
      valid = false;
    }
    if (!privacyCheckbox.checked) {
      privacyError.style.display = "block";
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
