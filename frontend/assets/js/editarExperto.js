// JS para edición de datos de experto
document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login.html?next=/editarExperto";
    return;
  }

  const form = document.getElementById("registroExpertoForm");
  const alertas = document.getElementById("alertasExpertos");
  const emailField = document.getElementById("emailExperto");
  const fotoInput = document.getElementById("fotoPerfil");
  const epImg = document.getElementById("epImg");
  const epRemove = document.getElementById("epRemove");
  const fotoError = document.getElementById("fotoError");
  const categoriasSelect = document.getElementById("categorias");
  const daysSelector = document.getElementById("daysSelector");
  const diasDisponiblesInput = document.getElementById("diasDisponibles");
  const diasSemana = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
  ];

  // --- Cargar info actual de experto (GET /api/expertos/perfil) y categorías ---
  try {
    const [perfilRes, catsRes] = await Promise.all([
      fetch("/api/expertos/perfil", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/categorias"),
    ]);
    const perfil = await perfilRes.json();
    const categorias = await catsRes.json();

    // Email no editable
    if (emailField) emailField.textContent = perfil.email || "";

    // Campos básicos experto
    form.precio.value = perfil.infoExperto?.precioPorHora || "";
    form.telefonoContacto.value = perfil.infoExperto?.telefonoContacto || "";
    form.descripcion.value = perfil.infoExperto?.descripcion || "";
    form.banco.value = perfil.infoExperto?.banco || "";
    form.tipoCuenta.value = perfil.infoExperto?.tipoCuenta || "";
    form.numeroCuenta.value = perfil.infoExperto?.numeroCuenta || "";
    form.titular.value = perfil.infoExperto?.titular || "";
    form.tipoDocumento.value = perfil.infoExperto?.tipoDocumento || "";
    form.numeroDocumento.value = perfil.infoExperto?.numeroDocumento || "";

    // Categorías
    categoriasSelect.innerHTML = "";
    (categorias || []).forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat._id || cat.id || cat.nombre;
      option.textContent = cat.nombre;
      categoriasSelect.appendChild(option);
    });
    // Seleccionar las categorías del experto
    const seleccionadas = perfil.infoExperto?.categorias || [];
    Array.from(categoriasSelect.options).forEach((opt) => {
      if (
        seleccionadas.includes(opt.value) ||
        seleccionadas.includes(opt.textContent)
      ) {
        opt.selected = true;
      }
    });
    // Choices.js
    new Choices(categoriasSelect, {
      removeItemButton: true,
      searchEnabled: true,
      placeholder: true,
      placeholderValue: "Selecciona categorías",
      noResultsText: "No hay resultados",
      noChoicesText: "No hay opciones",
      itemSelectText: "Seleccionar",
      position: "bottom",
      shouldSort: false,
    });

    // Días disponibles
    daysSelector.innerHTML = diasSemana
      .map(
        (dia) =>
          `<button type="button" class="day-option${
            (perfil.infoExperto?.diasDisponibles || []).includes(dia)
              ? " selected"
              : ""
          }" data-day="${dia}">${dia}</button>`
      )
      .join("");
    function updateDiasDisponibles() {
      const sel = Array.from(
        daysSelector.querySelectorAll(".day-option.selected")
      ).map((b) => b.getAttribute("data-day"));
      diasDisponiblesInput.value = sel.join(",");
    }
    daysSelector.querySelectorAll(".day-option").forEach((btn) => {
      btn.addEventListener("click", function () {
        btn.classList.toggle("selected");
        updateDiasDisponibles();
      });
    });
    updateDiasDisponibles();

    // Avatar
    if (perfil.avatarUrl) {
      epImg.src = perfil.avatarUrl;
      epImg.style.display = "block";
      epRemove.style.display = "inline-block";
    } else {
      epImg.style.display = "none";
      epRemove.style.display = "none";
    }

    epRemove.onclick = function () {
      epImg.src = "";
      epImg.style.display = "none";
      epRemove.style.display = "none";
      fotoInput.value = "";
    };

    // Preview de imagen
    fotoInput.onchange = function () {
      fotoError.style.display = "none";
      const file = fotoInput.files && fotoInput.files[0];
      if (!file) return;
      if (!file.type.match(/^image\/(png|jpeg)$/)) {
        fotoError.textContent = "Solo se permiten imágenes PNG o JPG.";
        fotoError.style.display = "block";
        fotoInput.value = "";
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        fotoError.textContent = "La imagen no debe superar 2MB.";
        fotoError.style.display = "block";
        fotoInput.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = function (e) {
        epImg.src = e.target.result;
        epImg.style.display = "block";
        epRemove.style.display = "inline-block";
      };
      reader.readAsDataURL(file);
    };

    // Submit handler
    form.onsubmit = async function (e) {
      e.preventDefault();
      alertas.innerHTML = "";
      // Validaciones
      if (!form.precio.value || parseInt(form.precio.value, 10) < 10000) {
        alertas.innerHTML = `<div class="alert alert-danger">Precio mínimo: 10000 COP.</div>`;
        return;
      }
      if (
        !form.telefonoContacto.value ||
        !/^[0-9]{7,15}$/.test(form.telefonoContacto.value)
      ) {
        alertas.innerHTML = `<div class="alert alert-danger">Teléfono obligatorio (solo números, 7 a 15 dígitos).</div>`;
        return;
      }
      if (!form.descripcion.value.trim()) {
        alertas.innerHTML = `<div class="alert alert-danger">La descripción es obligatoria.</div>`;
        return;
      }
      if (!categoriasSelect.value) {
        alertas.innerHTML = `<div class="alert alert-danger">Selecciona al menos una categoría.</div>`;
        return;
      }
      if (!diasDisponiblesInput.value) {
        alertas.innerHTML = `<div class="alert alert-danger">Selecciona al menos un día disponible.</div>`;
        return;
      }
      if (
        !form.banco.value.trim() ||
        !form.tipoCuenta.value ||
        !form.numeroCuenta.value.trim() ||
        !form.titular.value.trim() ||
        !form.tipoDocumento.value ||
        !form.numeroDocumento.value.trim()
      ) {
        alertas.innerHTML = `<div class="alert alert-danger">Completa todos los datos bancarios.</div>`;
        return;
      }

      // Si hay archivo, súbelo primero
      let avatarUrl = perfil.avatarUrl || "";
      const file = fotoInput.files && fotoInput.files[0];
      if (file) {
        const fd = new FormData();
        fd.append("avatar", file);
        const upResp = await fetch("/api/usuarios/avatar", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        const upJson = await upResp.json();
        if (upResp.ok && upJson.avatarUrl) {
          avatarUrl = upJson.avatarUrl;
        }
      }

      // Arma payload y envía a backend
      const payload = {
        descripcion: form.descripcion.value,
        precioPorHora: parseInt(form.precio.value, 10),
        categorias: Array.from(categoriasSelect.selectedOptions).map(
          (opt) => opt.value
        ),
        diasDisponibles: diasDisponiblesInput.value.split(","),
        banco: form.banco.value,
        tipoCuenta: form.tipoCuenta.value,
        numeroCuenta: form.numeroCuenta.value,
        titular: form.titular.value,
        tipoDocumento: form.tipoDocumento.value,
        numeroDocumento: form.numeroDocumento.value,
        telefonoContacto: form.telefonoContacto.value,
        avatarUrl,
      };
      const resp = await fetch("/api/expertos/perfil", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (resp.ok) {
        alertas.innerHTML = `<div class="alert alert-success">Datos actualizados correctamente.</div>`;
        // Actualiza localStorage si lo tienes
        let usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
        usuario.infoExperto = data.infoExperto;
        usuario.avatarUrl = data.avatarUrl || usuario.avatarUrl;
        localStorage.setItem("usuario", JSON.stringify(usuario));
        setTimeout(() => (window.location.href = "/perfil"), 1000);
      } else {
        alertas.innerHTML = `<div class="alert alert-danger">${
          data.mensaje || "Error al guardar."
        }</div>`;
      }
    };
  } catch (e) {
    alertas.innerHTML = `<div class="alert alert-danger">Error al cargar datos. Vuelve a intentar.</div>`;
  }
});
