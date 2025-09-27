// JS para registro de experto con validaciones inmediatas y bloqueo de texto en teléfono
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("registroExpertoForm");
  const alerta = document.getElementById("registroAlerta");

  // Bloquear letras en teléfono (solo números)
  const telefono = form.telefonoContacto;
  telefono.addEventListener("keydown", function (e) {
    // Permitir solo números y teclas de control
    if (
      !(
        (e.key >= "0" && e.key <= "9") ||
        ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(
          e.key
        )
      )
    ) {
      e.preventDefault();
    }
  });
  telefono.addEventListener("paste", function (e) {
    e.preventDefault();
    let paste = (e.clipboardData || window.clipboardData)
      .getData("text")
      .replace(/\D/g, "");
    // Solo inserta números
    const start = telefono.selectionStart;
    const end = telefono.selectionEnd;
    const current = telefono.value;
    telefono.value = current.slice(0, start) + paste + current.slice(end);
    telefono.setSelectionRange(start + paste.length, start + paste.length);
    telefono.dispatchEvent(new Event("input"));
  });
  telefono.addEventListener("input", function () {
    // Elimina cualquier carácter no numérico en tiempo real
    let cleaned = telefono.value.replace(/\D/g, "");
    if (telefono.value !== cleaned) {
      telefono.value = cleaned;
    }
  });

  // Validación inmediata teléfono
  const errorTelefono = document.getElementById("errorTelefono");
  telefono.addEventListener("input", function () {
    const v = telefono.value;
    if (!v) {
      errorTelefono.textContent = "Teléfono requerido.";
      telefono.classList.add("invalid");
    } else if (!/^[0-9]{7,10}$/.test(v)) {
      errorTelefono.textContent = "Solo números, 7 a 10 dígitos.";
      telefono.classList.add("invalid");
    } else {
      errorTelefono.textContent = "";
      telefono.classList.remove("invalid");
    }
  });

  // Precio: validación inmediata
  const precio = form.precio;
  const errorPrecio = document.getElementById("errorPrecio");
  precio.addEventListener("input", function () {
    if (precio.value === "" || isNaN(precio.value)) {
      errorPrecio.textContent = "Precio requerido.";
      precio.classList.add("invalid");
    } else if (precio.value < 10000) {
      errorPrecio.textContent = "El mínimo es $10.000 COP.";
      precio.classList.add("invalid");
    } else if (precio.value > 120000) {
      errorPrecio.textContent = "El máximo es $120.000 COP.";
      precio.classList.add("invalid");
    } else {
      errorPrecio.textContent = "";
      precio.classList.remove("invalid");
    }
  });

  // Descripción: validación inmediata y contador
  const descripcion = form.descripcion;
  const errorDescripcion = document.getElementById("errorDescripcion");
  const descContador = document.getElementById("descContador");
  descripcion.addEventListener("input", function () {
    descContador.textContent = descripcion.value.length;
    if (!descripcion.value.trim()) {
      errorDescripcion.textContent = "Descripción requerida.";
      descripcion.classList.add("invalid");
    } else if (descripcion.value.length > 400) {
      errorDescripcion.textContent = "Máximo 400 caracteres.";
      descripcion.classList.add("invalid");
    } else {
      errorDescripcion.textContent = "";
      descripcion.classList.remove("invalid");
    }
  });

  // CATEGORÍAS Choices.js y validación
  const categoriasSelect = document.getElementById("categorias");
  const errorCategorias = document.getElementById("errorCategorias");
  fetch("/api/categorias")
    .then((r) => r.json())
    .then((categorias) => {
      categoriasSelect.innerHTML = "";
      (categorias || []).forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat._id || cat.id || cat.nombre;
        opt.textContent = cat.nombre;
        categoriasSelect.appendChild(opt);
      });
      if (typeof Choices !== "undefined") {
        // Destruir instancia previa si existe
        if (categoriasSelect.choicesInstance) {
          categoriasSelect.choicesInstance.destroy();
        }
        categoriasSelect.choicesInstance = new Choices(categoriasSelect, {
          removeItemButton: true,
          searchPlaceholderValue: "Buscar categoría...",
          noResultsText: "Sin resultados",
        });
      }
    });
  categoriasSelect.addEventListener("change", function () {
    if (categoriasSelect.selectedOptions.length === 0) {
      errorCategorias.textContent = "Selecciona al menos una categoría.";
      categoriasSelect.classList.add("invalid");
    } else {
      errorCategorias.textContent = "";
      categoriasSelect.classList.remove("invalid");
    }
  });

  // DÍAS DISPONIBLES: validación y feedback
  const diasDisponiblesInput = document.getElementById("diasDisponibles");
  const dayOptions = document.querySelectorAll(".day-option");
  const diasDisplay = document.getElementById("diasDisplay");
  const errorDias = document.getElementById("errorDias");
  function updateDias() {
    const seleccionados = Array.from(
      document.querySelectorAll(".day-option.selected")
    ).map((d) => d.getAttribute("data-day"));
    diasDisponiblesInput.value = seleccionados.join(",");
    if (seleccionados.length > 0) {
      diasDisplay.innerHTML = `<span>Días seleccionados:</span> <strong>${seleccionados.join(
        ", "
      )}</strong>`;
    } else {
      diasDisplay.textContent = "Selecciona tus días disponibles";
    }
    if (seleccionados.length === 0) {
      errorDias.textContent = "Selecciona al menos un día.";
    } else {
      errorDias.textContent = "";
    }
  }
  dayOptions.forEach((d) =>
    d.addEventListener("click", function (e) {
      e.preventDefault(); // Evita submit accidental
      this.classList.toggle("selected");
      updateDias();
    })
  );
  updateDias();

  // DATOS BANCARIOS: validación inmediata
  const banco = form.banco;
  banco.addEventListener("change", function () {
    if (!banco.value) {
      document.getElementById("errorBanco").textContent =
        "Selecciona tu banco.";
      banco.classList.add("invalid");
    } else {
      document.getElementById("errorBanco").textContent = "";
      banco.classList.remove("invalid");
    }
  });
  const tipoCuenta = form.tipoCuenta;
  tipoCuenta.addEventListener("change", function () {
    if (!tipoCuenta.value) {
      document.getElementById("errorTipoCuenta").textContent =
        "Selecciona tipo de cuenta.";
      tipoCuenta.classList.add("invalid");
    } else {
      document.getElementById("errorTipoCuenta").textContent = "";
      tipoCuenta.classList.remove("invalid");
    }
  });
  const numeroCuenta = form.numeroCuenta;
  numeroCuenta.addEventListener("input", function () {
    if (!numeroCuenta.value || !/^[0-9]{6,20}$/.test(numeroCuenta.value)) {
      document.getElementById("errorNumeroCuenta").textContent =
        "Solo números, 6-20 dígitos.";
      numeroCuenta.classList.add("invalid");
    } else {
      document.getElementById("errorNumeroCuenta").textContent = "";
      numeroCuenta.classList.remove("invalid");
    }
  });
  const titular = form.titular;
  titular.addEventListener("input", function () {
    if (!titular.value.trim()) {
      document.getElementById("errorTitular").textContent =
        "Titular obligatorio.";
      titular.classList.add("invalid");
    } else {
      document.getElementById("errorTitular").textContent = "";
      titular.classList.remove("invalid");
    }
  });
  const tipoDocumento = form.tipoDocumento;
  tipoDocumento.addEventListener("change", function () {
    if (!tipoDocumento.value) {
      document.getElementById("errorTipoDocumento").textContent =
        "Selecciona tipo de documento.";
      tipoDocumento.classList.add("invalid");
    } else {
      document.getElementById("errorTipoDocumento").textContent = "";
      tipoDocumento.classList.remove("invalid");
    }
  });
  const numeroDocumento = form.numeroDocumento;
  numeroDocumento.addEventListener("input", function () {
    if (!numeroDocumento.value.trim()) {
      document.getElementById("errorNumeroDocumento").textContent =
        "Número de documento obligatorio.";
      numeroDocumento.classList.add("invalid");
    } else {
      document.getElementById("errorNumeroDocumento").textContent = "";
      numeroDocumento.classList.remove("invalid");
    }
  });

  // Submit handler
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    alerta.textContent = "";
    // Dispara validación de todos los inputs (para mostrar errores si hay)
    precio.dispatchEvent(new Event("input"));
    telefono.dispatchEvent(new Event("input"));
    descripcion.dispatchEvent(new Event("input"));
    categoriasSelect.dispatchEvent(new Event("change"));
    updateDias();
    banco.dispatchEvent(new Event("change"));
    tipoCuenta.dispatchEvent(new Event("change"));
    numeroCuenta.dispatchEvent(new Event("input"));
    titular.dispatchEvent(new Event("input"));
    tipoDocumento.dispatchEvent(new Event("change"));
    numeroDocumento.dispatchEvent(new Event("input"));

    // Si hay errores visibles, no envía
    if (
      errorPrecio.textContent ||
      errorTelefono.textContent ||
      errorDescripcion.textContent ||
      errorCategorias.textContent ||
      errorDias.textContent ||
      document.getElementById("errorBanco").textContent ||
      document.getElementById("errorTipoCuenta").textContent ||
      document.getElementById("errorNumeroCuenta").textContent ||
      document.getElementById("errorTitular").textContent ||
      document.getElementById("errorTipoDocumento").textContent ||
      document.getElementById("errorNumeroDocumento").textContent
    ) {
      alerta.textContent = "Corrige los campos marcados antes de continuar.";
      alerta.className = "registro-alerta alert-danger";
      return;
    }

    // Arma payload
    const payload = {
      descripcion: descripcion.value.trim(),
      precioPorHora: Number(precio.value),
      categorias: Array.from(categoriasSelect.selectedOptions).map(
        (opt) => opt.value
      ),
      banco: banco.value,
      tipoCuenta: tipoCuenta.value,
      numeroCuenta: numeroCuenta.value,
      titular: titular.value.trim(),
      tipoDocumento: tipoDocumento.value,
      numeroDocumento: numeroDocumento.value.trim(),
      telefonoContacto: telefono.value.trim(),
      diasDisponibles: diasDisponiblesInput.value.split(","),
    };

    // Envía a backend
    try {
      const resp = await fetch("/api/expertos/perfil", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + (localStorage.getItem("token") || ""),
        },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (resp.ok) {
        alerta.className = "registro-alerta alert-success";
        alerta.textContent =
          "Perfil de experto registrado correctamente. Serás redirigido...";
        setTimeout(() => {
          window.location.href = "/perfil";
        }, 2000);
      } else {
        alerta.className = "registro-alerta alert-danger";
        alerta.textContent = data.mensaje || "Error al registrar perfil.";
      }
    } catch (err) {
      alerta.className = "registro-alerta alert-danger";
      alerta.textContent = "Error de red. Intenta de nuevo.";
    }
  });
});
