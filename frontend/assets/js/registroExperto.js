// archivo para manejar el registro de expertos

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");

  // 1. Proteger la página: si no hay token, redirigir al login.
  if (!token) {
    alert("Debes iniciar sesión para registrarte como experto.");
    window.location.href = "/login.html";
    return;
  }

  const form = document.getElementById("registroExpertoForm");
  const categoryGrid = document.getElementById("categoryGrid");
  const formError = document.getElementById("formError");

  // 2. Cargar las categorías dinámicamente desde la API.
  try {
    const response = await fetch("/api/categorias");
    if (!response.ok) throw new Error("No se pudieron cargar las categorías.");

    const categorias = await response.json();

    categoryGrid.innerHTML = ""; // Limpiar el mensaje de "Cargando..."
    if (categorias.length > 0) {
      categorias.forEach((categoria) => {
        const label = document.createElement("label");
        label.innerHTML = `
                    <input type="checkbox" name="categorias" value="${categoria.nombre}">
                    ${categoria.nombre}
                `;
        categoryGrid.appendChild(label);
      });
    } else {
      categoryGrid.innerHTML =
        "<p>No hay categorías disponibles en este momento.</p>";
    }
  } catch (error) {
    categoryGrid.innerHTML = `<p style="color: #ff5050;">${error.message}</p>`;
  }

  // 3. Manejar el envío del formulario.
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formError.textContent = "";
    formError.style.display = "none";

    // Recolectar los datos del formulario
    const formData = new FormData(form);
    const especialidad = formData.get("especialidad");
    const descripcion = formData.get("descripcion");
    const precioPorHora = formData.get("precioPorHora");
    const skills = formData
      .get("skills")
      .split(",")
      .map((skill) => skill.trim());

    // Recolectar categorías seleccionadas
    const categoriasSeleccionadas = [];
    document
      .querySelectorAll('input[name="categorias"]:checked')
      .forEach((checkbox) => {
        categoriasSeleccionadas.push(checkbox.value);
      });

    // Recolectar horario
    const diasDisponibles = [];
    document
      .querySelectorAll('input[name="diasDisponibles"]:checked')
      .forEach((checkbox) => {
        diasDisponibles.push(checkbox.value);
      });
    const horaInicio = formData.get("horaInicio");
    const horaFin = formData.get("horaFin");

    const datosExperto = {
      especialidad,
      descripcion,
      precioPorHora: Number(precioPorHora),
      categorias: categoriasSeleccionadas,
      skills,
      horario: {
        diasDisponibles,
        horaInicio,
        horaFin,
      },
    };

    // Enviar los datos al backend
    try {
      const response = await fetch("/api/usuarios/convertirse-en-experto", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Enviar el token para la autenticación
        },
        body: JSON.stringify(datosExperto),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.mensaje || "Ocurrió un error.");
      }

      alert("¡Felicidades! Tu perfil de experto ha sido creado exitosamente.");
      window.location.href = "/perfil.html"; // Redirigir al perfil
    } catch (error) {
      formError.textContent = error.message;
      formError.style.display = "block";
    }
  });
});
