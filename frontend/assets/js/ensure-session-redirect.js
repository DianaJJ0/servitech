(function () {
  // Intercepta enlaces con data-ensure-session="true" y, si hay usuario en localStorage, hace POST a /set-session
  async function restoreAndRedirect(e) {
    try {
      const target = e.currentTarget.getAttribute("href");
      if (!target) return;
      // Solo interceptar si apuntan al backend en otro puerto
      if (
        window.location.hostname === "localhost" &&
        target.startsWith("http")
      ) {
        e.preventDefault();
        const usuarioRaw = localStorage.getItem("usuario");
        const token = localStorage.getItem("token");
        if (usuarioRaw && token) {
          try {
            const usuario = JSON.parse(usuarioRaw);
            usuario.token = token;
            // Determinar el origen del target y llamar a su /set-session para crear la cookie de sesión en ese origen
            const origin = new URL(target).origin;
            await fetch(origin + "/set-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ usuario }),
              credentials: "include",
            });
            // Redirigir al destino (la cookie de sesión debería estar creada en el dominio/puerto destino)
            window.location.href = target;
          } catch (err) {
            console.warn("restoreAndRedirect: fallo al set-session", err);
            window.location.href = target; // fallback
          }
        } else {
          // No hay usuario en localStorage, navegar directo
          return; // dejar el enlace seguir su comportamiento
        }
      }
    } catch (e) {
      console.warn("restoreAndRedirect error", e);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll('a[data-ensure-session="true"]').forEach((a) => {
      a.addEventListener("click", restoreAndRedirect);
    });
  });
})();
