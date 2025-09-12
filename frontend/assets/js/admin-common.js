// Admin common helpers (CSRF exposure and form injection)
(function () {
  function injectCsrf(token) {
    if (!token) return;
    window._csrfToken = token;
    document.addEventListener('DOMContentLoaded', function () {
      try {
        var forms = document.querySelectorAll('form[method="post"], form');
        forms.forEach(function (f) {
          if (!f.querySelector('input[name="_csrf"]')) {
            var input = document.createElement('input');
            input.type = 'hidden';
            input.name = '_csrf';
            input.value = token;
            f.appendChild(input);
          }
        });
      } catch (e) {
        // ignore
      }
    });
  }

  // Provide a safe initializer for server-side to call via JSON injection
  window.__adminCommon = {
    initCsrf: injectCsrf
  };
})();
