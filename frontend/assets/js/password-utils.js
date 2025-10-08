// password-utils.js - utilidades para validación de contraseña reutilizables
(function (global) {
  function getPasswordCriteria(pw) {
    return {
      minLength: pw && pw.length >= 8,
      hasUppercase: /[A-Z]/.test(pw || ""),
      hasLowercase: /[a-z]/.test(pw || ""),
      hasNumber: /[0-9]/.test(pw || ""),
    };
  }

  function isPasswordValid(pw) {
    const c = getPasswordCriteria(pw);
    return c.minLength && c.hasUppercase && c.hasLowercase && c.hasNumber;
  }

  // Actualiza los nodos DOM de los criterios (minLengthItem, uppercaseItem, ...)
  function updateCriteriaNodes(pw, nodes) {
    if (!nodes) return;
    const criteria = getPasswordCriteria(pw);
    const { minLength, hasUppercase, hasLowercase, hasNumber } = criteria;
    if (nodes.minLengthItem)
      nodes.minLengthItem.classList.toggle("valid", minLength),
        nodes.minLengthItem.classList.toggle("invalid", !minLength);
    if (nodes.uppercaseItem)
      nodes.uppercaseItem.classList.toggle("valid", hasUppercase),
        nodes.uppercaseItem.classList.toggle("invalid", !hasUppercase);
    if (nodes.lowercaseItem)
      nodes.lowercaseItem.classList.toggle("valid", hasLowercase),
        nodes.lowercaseItem.classList.toggle("invalid", !hasLowercase);
    if (nodes.numberItem)
      nodes.numberItem.classList.toggle("valid", hasNumber),
        nodes.numberItem.classList.toggle("invalid", !hasNumber);
  }

  // Validación y mensaje para confirmación de contraseña
  // errorEl es un elemento DOM donde se escribirá el mensaje (o null para no mostrar)
  function validateConfirmAndShow(newPw, confirmPw, errorEl) {
    if (!confirmPw || !confirmPw.trim()) {
      if (errorEl) {
        errorEl.textContent = "Debes confirmar la contraseña.";
        errorEl.style.display = "block";
        errorEl.style.color = "#dc3545";
      }
      return false;
    }
    if (newPw !== confirmPw) {
      if (errorEl) {
        errorEl.textContent = "Las contraseñas no coinciden.";
        errorEl.style.display = "block";
        errorEl.style.color = "#dc3545";
      }
      return false;
    }
    if (errorEl) {
      errorEl.style.display = "none";
    }
    return true;
  }

  function showError(el, msg, color = "#dc3545") {
    if (!el) return;
    el.textContent = msg;
    el.style.color = color;
    el.style.display = "block";
  }

  function clearError(el) {
    if (!el) return;
    el.textContent = "";
    el.style.display = "none";
  }

  global.PasswordUtils = {
    getPasswordCriteria,
    isPasswordValid,
    updateCriteriaNodes,
    validateConfirmAndShow,
    showError,
    clearError,
  };
})(window);
