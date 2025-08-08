// JS dinámico para Mis Asesorías
// Este script carga las asesorías del usuario autenticado y gestiona los modales y botones

// Configuración: obtener el usuarioId y rol desde una variable global inyectada por EJS
const usuarioId = window.usuarioId || null;
const rol = window.rolUsuario || "cliente";

const asesoriasList = document.querySelector(".asesorias-list");

async function cargarAsesorias() {
  if (!usuarioId) {
    asesoriasList.innerHTML =
      '<div class="alert alert-danger">No se pudo identificar el usuario.</div>';
    return;
  }
  asesoriasList.innerHTML = '<div class="cargando">Cargando asesorías...</div>';
  try {
    const res = await fetch(`/api/asesorias?usuario=${usuarioId}&rol=${rol}`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) {
      asesoriasList.innerHTML =
        '<div class="alert alert-warning">No se encontraron asesorías.</div>';
      return;
    }
    if (data.data.length === 0) {
      asesoriasList.innerHTML =
        '<div class="alert alert-info">Aún no tienes asesorías agendadas.</div>';
      return;
    }
    asesoriasList.innerHTML = "";
    data.data.forEach((asesoria) => {
      const experto = asesoria.experto || {};
      const fechaObj = new Date(asesoria.fechaHora);
      const fecha = fechaObj.toLocaleDateString("es-CO");
      const hora = fechaObj.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const horaFin = asesoria.duracionMinutos
        ? new Date(
            fechaObj.getTime() + asesoria.duracionMinutos * 60000
          ).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
        : "";
      const estado = asesoria.estado || "Agendada";
      const card = document.createElement("div");
      card.className = "asesoria-card";
      card.innerHTML = `
        <div class="asesoria-info">
          <div>
            <span class="asesoria-fecha">${fecha}</span>
            <span class="asesoria-hora">${hora}${
        horaFin ? " - " + horaFin : ""
      }</span>
          </div>
          <div class="asesoria-experto">
            <img src="${
              experto.avatar_url ||
              "https://ui-avatars.com/api/?name=" +
                encodeURIComponent(experto.nombre || "Experto") +
                "&background=3a8eff&color=fff"
            }" alt="${experto.nombre || ""}" class="experto-avatar">
            <div>
              <span class="experto-nombre" style="display:block; margin-bottom:0.2em;">${
                experto.nombre || ""
              } ${experto.apellido || ""}</span>
              <span class="experto-rol" style="display:block; margin-top:0.2em;">${
                (experto.especialidades && experto.especialidades[0]) || ""
              }</span>
            </div>
          </div>
          <div class="asesoria-estado ${estado.toLowerCase()}">${estado}</div>
        </div>
        <div class="asesoria-acciones">
          <button class="btn btn-primary btn-sm" onclick="abrirMensajesAsesoria('${
            asesoria._id
          }', '${experto.nombre || ""} ${experto.apellido || ""}')">
            <i class="fas fa-comment-dots"></i> Mensaje
          </button>
          <button class="btn btn-outline btn-sm" onclick='abrirDetallesAsesoria(${JSON.stringify(
            {
              fecha,
              hora: hora + (horaFin ? " - " + horaFin : ""),
              experto: (experto.nombre || "") + " " + (experto.apellido || ""),
              rol: (experto.especialidades && experto.especialidades[0]) || "",
              estado,
            }
          )})'>
            <i class="fas fa-calendar-alt"></i> Ver detalles
          </button>
        </div>
      `;
      asesoriasList.appendChild(card);
    });
  } catch (err) {
    asesoriasList.innerHTML =
      '<div class="alert alert-danger">Error al cargar asesorías.</div>';
  }
}

window.abrirMensajesAsesoria = function (asesoriaId, expertoNombre) {
  document.getElementById("expertoNombre").innerText = expertoNombre;
  document.getElementById("mensajeModal").style.display = "flex";
  // Aquí puedes cargar el historial real de mensajes usando asesoriaId
};

window.abrirDetallesAsesoria = function (data) {
  const html = `
    <div style="margin-bottom:1rem;">
      <strong>Fecha:</strong> ${data.fecha}<br>
      <strong>Hora:</strong> ${data.hora}<br>
      <strong>Estado:</strong> ${data.estado}
    </div>
    <div style="display:flex;align-items:center;gap:1rem;">
      <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(
        data.experto
      )}&background=3a8eff&color=fff" alt="${
    data.experto
  }" style="width:48px;height:48px;border-radius:50%;border:2px solid var(--accent-color);">
      <div>
        <strong>${data.experto}</strong><br>
        <span style="color:var(--accent-color);">${data.rol}</span>
      </div>
    </div>
  `;
  document.getElementById("detalleContenido").innerHTML = html;
  document.getElementById("detalleModal").style.display = "flex";
};

document.addEventListener("DOMContentLoaded", cargarAsesorias);
