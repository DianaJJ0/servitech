/**
 * JS de login. Incluye lógica para login y para redirigir a recuperación de contraseña.
 */
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  const formError = document.getElementById("loginError");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

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
    const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Iniciando...';
    try {
      const response = await fetch("http://localhost:3000/api/usuarios/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosLogin),
        credentials: "include",
      });
      if (!response.ok) {
        formError.textContent = "Credenciales incorrectas.";
        formError.style.display = "block";
        formError.style.color = "#dc3545";
        return;
      }
      // El backend renderiza la vista directamente, así que solo redirigimos
      window.location.href = "/registroExperto.html";
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

  // Enlace "¿Olvidaste tu contraseña?" (redirección)
  // Debe tener id="forgotPassLink"
  const forgotLink = document.getElementById("forgotPassLink");
  if (forgotLink) {
    forgotLink.addEventListener("click", function (e) {
      e.preventDefault();
      window.location.href = "/recuperarPassword.html";
    });
  }
});
