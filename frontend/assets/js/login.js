/**
 * LÓGICA DEL FRONTEND PARA LA PÁGINA DE INICIO DE SESIÓN
 * Maneja el envío del formulario, la comunicación con la API y la gestión del token.
 */
document.addEventListener("DOMContentLoaded", () => {
  // Se busca el formulario de login en el DOM. Si no existe, no se hace nada.
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  // Se obtienen los elementos del DOM para mostrar errores.
  const formError = document.getElementById("loginError");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  // Listener para el evento 'submit' del formulario.
  loginForm.addEventListener("submit", async (e) => {
    // Prevenimos el comportamiento por defecto del formulario.
    e.preventDefault();

    // Ocultamos mensajes de error previos.
    formError.style.display = "none";

    // Se obtienen los datos del formulario.
    const datosLogin = {
      email: emailInput.value.trim(),
      password: passwordInput.value.trim(),
    };

    // Validación básica en frontend
    if (!datosLogin.email || !datosLogin.password) {
      formError.textContent = "Por favor, complete todos los campos.";
      formError.style.display = "block";
      return;
    }

    // Se deshabilita el botón de envío.
    const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Iniciando...';

    try {
      // Se envía la petición directamente al backend
      const response = await fetch("http://localhost:3000/api/usuarios/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datosLogin),
      });

      // Se lee la respuesta
      const result = await response.json();

      // Si la respuesta HTTP no fue exitosa, se lanza un error
      if (!response.ok) {
        throw new Error(result.mensaje || "Credenciales incorrectas.");
      }

      // Éxito: Guardamos el token en el almacenamiento local del navegador
      localStorage.setItem("token", result.token);

      // Guardamos también los datos del usuario si vienen en la respuesta
      if (result.usuario) {
        localStorage.setItem("currentUser", JSON.stringify(result.usuario));
      }

      // Mostramos mensaje de éxito brevemente
      formError.textContent = "Inicio de sesión exitoso. Redirigiendo...";
      formError.style.display = "block";
      formError.style.color = "#28a745";

      // Redirigimos al usuario a la página principal después de un breve delay
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (error) {
      // Si ocurre cualquier error, se muestra en el elemento 'formError'
      console.error("Error en login:", error);
      formError.textContent = error.message;
      formError.style.color = "#dc3545";
      formError.style.display = "block";
    } finally {
      // Este bloque se ejecuta siempre. Se reactiva el botón.
      submitButton.disabled = false;
      submitButton.innerHTML = "Iniciar Sesión";
    }
  });

  // Lógica para mostrar/ocultar la contraseña.
  const togglePassword = document.querySelector(".toggle-password");
  if (togglePassword) {
    togglePassword.addEventListener("click", () => {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      togglePassword.classList.toggle("fa-eye");
      togglePassword.classList.toggle("fa-eye-slash");
    });
  }
});
