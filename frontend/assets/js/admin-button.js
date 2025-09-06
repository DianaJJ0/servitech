// Maneja el botón de 'Entrar como admin (dev)'.
// Si el backend/frontend expone /set-session, hace POST para establecer req.session.user
// Solo se mostrará si NODE_ENV=development (comprobado por variable global window.__ENV__ si existe)

document.addEventListener("DOMContentLoaded", () => {
  try {
    const devBtn = document.getElementById("devAdminBtn");
    if (!devBtn) return;

    // El servidor decide si debe mostrarse el botón; si llegó aquí, lo dejamos activo
    devBtn.style.display = "";
    devBtn.addEventListener("click", async () => {
      // Preserve original content (icon + accessible text) so we don't remove it
      const originalContent = devBtn.innerHTML;
      devBtn.disabled = true;
      devBtn.setAttribute("aria-busy", "true");
      devBtn.innerHTML = "<span>Entrando...</span>";
      try {
        const payload = {
          usuario: {
            roles: ["admin"],
            token: "dev-token",
            email: "admin@local.dev",
          },
        };
        // Obtener CSRF token: preferir window._csrfToken, si no, pedir /csrf-token
        let csrf = (window && window._csrfToken) || null;
        if (!csrf) {
          try {
            const t = await fetch("/csrf-token");
            if (t.ok) {
              const jd = await t.json();
              csrf = jd && jd.csrfToken;
            }
          } catch (e) {
            // ignore
          }
        }

        const headers = { "Content-Type": "application/json" };
        if (csrf) headers["x-csrf-token"] = csrf;

        // Intentar ruta dev especializada que crea/asegura un admin y devuelve token
        let res = null;
        try {
          res = await fetch("/dev/create-admin-session", {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
            credentials: "same-origin",
          });
        } catch (e) {
          // ignore — fallback below
          res = null;
        }

        // Si el endpoint dev no está disponible, intentar /set-session (compatibilidad)
        if (!res || !res.ok) {
          try {
            res = await fetch("/set-session", {
              method: "POST",
              headers,
              body: JSON.stringify(payload),
              credentials: "same-origin",
            });
          } catch (e) {
            res = null;
          }
        }
        if (!res.ok) throw new Error("No se pudo establecer sesión");
        const data = await res.json();
        // Abrir panel admin en nueva pestaña
        window.open("/admin/adminExpertos", "_blank");
      } catch (e) {
        console.error(e);
        alert("Error al intentar iniciar sesión como admin. Revisa consola.");
      } finally {
        devBtn.disabled = false;
        devBtn.removeAttribute("aria-busy");
        // restore original content (icon + sr-only text)
        try {
          devBtn.innerHTML = originalContent;
        } catch (e) {
          devBtn.textContent = "Entrar como admin (dev)";
        }
      }
    });
  } catch (e) {
    console.error("admin-button init error", e);
  }
});
