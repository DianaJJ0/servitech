document.addEventListener("DOMContentLoaded", function () {
  const contactForm = document.getElementById("contactForm");

  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();

      // Mostrar estado de carga
      const submitBtn = contactForm.querySelector(".send-btn");
      const btnText = submitBtn.querySelector(".btn-text");
      const btnLoading = submitBtn.querySelector(".btn-loading");

      btnText.style.display = "none";
      btnLoading.style.display = "inline-flex";

      // Simular envío (reemplazar con AJAX real)
      setTimeout(() => {
        // Resetear formulario
        contactForm.reset();

        // Mostrar mensaje de éxito
        alert(
          "¡Mensaje enviado con éxito! Nos pondremos en contacto contigo pronto."
        );

        // Restaurar botón
        btnText.style.display = "inline";
        btnLoading.style.display = "none";
      }, 1500);
    });

    // Validación en tiempo real
    const inputs = contactForm.querySelectorAll("input, textarea");
    inputs.forEach((input) => {
      input.addEventListener("input", function () {
        if (this.checkValidity()) {
          this.classList.remove("invalid");
          this.nextElementSibling.style.display = "none";
        } else {
          this.classList.add("invalid");
          this.nextElementSibling.style.display = "block";
        }
      });
    });
  }

  // Mejorar accesibilidad de los campos
  document.querySelectorAll(".form-control").forEach((input) => {
    input.setAttribute("aria-describedby", input.id + "-feedback");
  });
});
