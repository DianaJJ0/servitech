(function () {
  const CONSENT_KEY = "servitech_cookie_consent_v1";
  function getConsent() {
    try {
      return JSON.parse(localStorage.getItem(CONSENT_KEY));
    } catch (e) {
      return null;
    }
  }
  function loadGA(id) {
    if (!id) return;
    // cargar gtag si no está presente
    if (window.gtag) return;
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", id);
  }
  document.addEventListener("DOMContentLoaded", function () {
    const cfg = window.SERVITECH_ANALYTICS || {};
    const consent = getConsent();
    if (consent && consent.analytics && cfg.GA_MEASUREMENT_ID) {
      loadGA(cfg.GA_MEASUREMENT_ID);
    }
    // Escuchar cambios de consentimiento en runtime
    window.addEventListener("cookie-consent-changed", function () {
      const c = getConsent();
      if (c && c.analytics && cfg.GA_MEASUREMENT_ID) {
        loadGA(cfg.GA_MEASUREMENT_ID);
      }
    });
  });
})();
