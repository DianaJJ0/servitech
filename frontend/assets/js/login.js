/**
 * JS de login con validación visual de criterios de contraseña.
 */
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  const formError = document.getElementById("loginError");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  // Elementos criterios
  const minLengthItem = document.getElementById("minLengthCriteria");
  const uppercaseItem = document.getElementById("uppercaseCriteria");
  const lowercaseItem = document.getElementById("lowercaseCriteria");
  const numberItem = document.getElementById("numberCriteria");

  // Mostrar criterios solo con focus (igual que registro)
  const criteriaList = document.getElementById("passwordCriteria");
  criteriaList.style.display = "none"; // oculto al cargar

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

  // Login principal
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    formError.style.display = "none";
    const datosLogin = {
      email: emailInput.value.trim(),
      password: passwordInput.value.trim(),
    };
    // Validación de campos vacíos
    if (!datosLogin.email || !datosLogin.password) {
      formError.textContent = "Por favor, complete todos los campos.";
      formError.style.display = "block";
      return;
    }
    // Validación de formato de correo
    if (!datosLogin.email.includes("@")) {
      formError.textContent = "El correo debe contener un '@' válido.";
      formError.style.display = "block";
      return;
    }
    if (!validatePasswordCriteria(datosLogin.password)) {
      formError.textContent = "La contraseña no cumple los requisitos.";
      formError.style.display = "block";
      return;
    }
    const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Iniciando...';
    try {
      const response = await fetch("/api/usuarios/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosLogin),
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok) {
        formError.textContent = result.mensaje || "Credenciales incorrectas.";
        formError.style.display = "block";
        formError.style.color = "#dc3545";
        return;
      }

      // Guardar el token y usuario en localStorage
      localStorage.setItem("token", result.token);
      localStorage.setItem("usuario", JSON.stringify(result.usuario));

      // Establece el usuario en la sesión del frontend incluyendo el token
      await fetch("/set-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario: { ...result.usuario, token: result.token },
        }),
        credentials: "include",
      });

      // Redirección inteligente según parámetro next
      const nextInput = document.getElementById("next");
      const nextUrl = nextInput && nextInput.value ? nextInput.value : "/";
      window.location.href = nextUrl;
    } catch (error) {
      formError.textContent = error.message;
      formError.style.color = "#dc3545";
      formError.style.display = "block";
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = "Iniciar Sesión";
    }
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
  // Enlace "¿Olvidaste tu contraseña?"
  const forgotLink = document.getElementById("forgotPassLink");
  if (forgotLink) {
    forgotLink.addEventListener("click", function (e) {
      e.preventDefault();
      window.location.href = "/recuperarPassword.html";
    });
  }
});
