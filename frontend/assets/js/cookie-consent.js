(function () {
  const CONSENT_KEY = "servitech_cookie_consent_v1";
  function setConsent(val) {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(val));
    } catch (e) {}
  }
  function getConsent() {
    try {
      return JSON.parse(localStorage.getItem(CONSENT_KEY));
    } catch (e) {
      return null;
    }
  }
  function hideBanner(banner) {
    banner && banner.remove();
  }
  function createBanner() {
    if (getConsent()) return;
    const banner = document.createElement("div");
    banner.id = "cookie-consent-banner";
    banner.innerHTML = `
      <div class="cc-inner">
        <div class="cc-text">Usamos cookies para mejorar tu experiencia. Acepta su uso o configura tus preferencias.</div>
        <div class="cc-actions">
          <button id="cc-accept" class="btn btn-primary">Aceptar todo</button>
          <a href="/cookies.html" class="btn btn-outline">Configurar</a>
        </div>
      </div>
    `;
    document.body.appendChild(banner);
    document.getElementById("cc-accept").addEventListener("click", function () {
      setConsent({ analytics: true, functional: true });
      hideBanner(banner);
      window.dispatchEvent(new Event("cookie-consent-changed"));
    });
  }
  document.addEventListener("DOMContentLoaded", createBanner);
})();
