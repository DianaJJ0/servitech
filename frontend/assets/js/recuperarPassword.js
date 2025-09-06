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
    resetForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      resetError.style.display = "none";
      const newPassword = resetForm.newPassword.value.trim();
      const confirmPassword = resetForm.confirmPassword.value.trim();
      if (!newPassword || !confirmPassword) {
        resetError.textContent = "Completa ambos campos.";
        resetError.style.display = "block";
        return;
      }
      if (newPassword !== confirmPassword) {
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
