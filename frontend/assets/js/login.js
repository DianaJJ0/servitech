/**
 * JS de login con validación visual de criterios de contraseña.
 * Guarda token y usuario en localStorage tras login exitoso.
 */
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  const formError = document.getElementById("loginError");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  // Criterios de contraseña
  const minLengthItem = document.getElementById("minLengthCriteria");
  const uppercaseItem = document.getElementById("uppercaseCriteria");
  const lowercaseItem = document.getElementById("lowercaseCriteria");
  const numberItem = document.getElementById("numberCriteria");
  const criteriaList = document.getElementById("passwordCriteria");
  criteriaList.style.display = "none";

  passwordInput.addEventListener("focus", () => {
    criteriaList.style.display = "block";
    validatePasswordCriteria(passwordInput.value);
  });
  passwordInput.addEventListener("blur", () => {
    criteriaList.style.display = "none";
  });

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
    if (!datosLogin.email || !datosLogin.password) {
      formError.textContent = "Por favor, complete todos los campos.";
      formError.style.display = "block";
      return;
    }
    if (!datosLogin.email.includes("@")) {
      formError.textContent = "El correo debe contener un '@' válido.";
      formError.style.display = "block";
      return;
    }
    if (
      !(window.PasswordUtils
        ? window.PasswordUtils.isPasswordValid(datosLogin.password)
        : validatePasswordCriteria(datosLogin.password))
    ) {
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
      localStorage.setItem("token", result.token);
      localStorage.setItem("usuario", JSON.stringify(result.usuario));
      await fetch("/set-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario: { ...result.usuario, token: result.token },
        }),
        credentials: "include",
      });
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
