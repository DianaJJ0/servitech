/**
 * LÓGICA DEL FRONTEND PARA LA PÁGINA DE REGISTRO
 * Maneja la validación en tiempo real de la contraseña y el envío del formulario.
 */
document.addEventListener("DOMContentLoaded", () => {
  // Se busca el formulario de registro en el DOM. Si no existe, no se hace nada.
  const registroForm = document.getElementById("registroForm");
  if (!registroForm) return;

  // Se obtienen los elementos del DOM para mostrar errores y validar la contraseña.
  const formError = document.getElementById("formError");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");

  // Listener para el evento 'submit' del formulario.
  registroForm.addEventListener("submit", async (e) => {
    // Prevenimos el comportamiento por defecto del formulario (recargar la página).
    e.preventDefault();

    // Ocultamos mensajes de error previos y quitamos clases de éxito.
    formError.style.display = "none";
    formError.classList.remove("success-message");

    // Validación: las contraseñas deben coincidir.
    if (passwordInput.value !== confirmPasswordInput.value) {
      formError.textContent = "Las contraseñas no coinciden.";
      formError.style.display = "block";
      return;
    }

    // Se obtienen los datos del formulario.
    const formData = new FormData(registroForm);
    const datosRegistro = {
      nombre: formData.get("nombre").trim(),
      apellido: formData.get("apellido").trim(),
      email: formData.get("email").trim(),
      password: formData.get("password").trim(),
    };

    // Validación básica en frontend
    if (
      !datosRegistro.nombre ||
      !datosRegistro.apellido ||
      !datosRegistro.email ||
      !datosRegistro.password
    ) {
      formError.textContent = "Por favor, complete todos los campos.";
      formError.style.display = "block";
      return;
    }

    // Se deshabilita el botón de envío para evitar clics múltiples.
    const submitButton = registroForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Registrando...';

    try {
      // Se envía la petición directamente al backend
      const response = await fetch(
        "http://localhost:3000/api/usuarios/registro",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datosRegistro),
        }
      );

      // Se lee la respuesta
      const result = await response.json();

      // Si la respuesta HTTP no fue exitosa (ej. status 409, 500), se lanza un error.
      if (!response.ok) {
        throw new Error(result.mensaje || "Ocurrió un error desconocido.");
      }

      // Éxito en el registro: se muestra un mensaje de éxito.
      formError.textContent =
        "¡Registro exitoso! Redirigiendo al inicio de sesión...";
      formError.classList.add("success-message");
      formError.style.color = "#28a745";
      formError.style.display = "block";

      // Se redirige al usuario al login después de 2 segundos.
      setTimeout(() => {
        window.location.href = "/login.html";
      }, 2000);
    } catch (error) {
      // Si ocurre cualquier error, se muestra en el elemento 'formError'.
      console.error("Error en registro:", error);
      formError.textContent = error.message;
      formError.style.color = "#dc3545";
      formError.style.display = "block";
    } finally {
      // Este bloque se ejecuta siempre, haya habido éxito o error.
      // Se reactiva el botón de envío.
      submitButton.disabled = false;
      submitButton.innerHTML = "Crear Cuenta";
    }
  });

  // Lógica para mostrar/ocultar la contraseña.
  const togglePasswordElements = document.querySelectorAll(".toggle-password");
  togglePasswordElements.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const wrapper = toggle.closest(".input-wrapper");
      const input = wrapper.querySelector("input");
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      toggle.classList.toggle("fa-eye");
      toggle.classList.toggle("fa-eye-slash");
    });
  });
});
