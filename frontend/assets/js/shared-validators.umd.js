// Copia del shared UMD para servir desde frontend/assets/js (igual que shared/validators.umd.js)
(function (root, factory) {
  if (typeof exports === "object" && typeof module === "object")
    module.exports = factory();
  else if (typeof define === "function" && define.amd) define([], factory);
  else root.SharedValidators = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const COLOMBIAN_BANKS = new Set([
    "banco de bogotá",
    "bancolombia",
    "davivienda",
    "bbva",
    "banco populares",
    "banco avvillas",
    "banco caja social",
    "colpatria",
    "daviplata",
  ]);

  function isColombianBankName(banco) {
    if (!banco) return false;
    try {
      const s = String(banco).toLowerCase().trim();
      if (s.includes("banco")) return true;
      for (const b of COLOMBIAN_BANKS) if (s.includes(b)) return true;
      if ([...COLOMBIAN_BANKS].includes(s)) return true;
    } catch (e) {}
    return false;
  }

  function isValidIBAN(iban) {
    if (!iban || typeof iban !== "string") return false;
    const str = iban.replace(/\s+/g, "").toUpperCase();
    if (!/^[A-Z0-9]{15,34}$/.test(str)) return false;
    const rearranged = str.slice(4) + str.slice(0, 4);
    let expanded = "";
    for (let i = 0; i < rearranged.length; i++) {
      const ch = rearranged.charAt(i);
      if (ch >= "0" && ch <= "9") expanded += ch;
      else expanded += (ch.charCodeAt(0) - 55).toString();
    }
    let remainder = 0;
    for (let i = 0; i < expanded.length; i += 7) {
      const block = remainder.toString() + expanded.substr(i, 7);
      remainder = parseInt(block, 10) % 97;
    }
    return remainder === 1;
  }

  function validateNumeroCuentaByBank(banco, numero) {
    if (!numero || !String(numero).trim())
      return { valid: false, message: "Número de cuenta requerido." };
    const s = String(numero).trim();
    // Caso especial: Nequi -> exactamente 10 dígitos (número de celular)
    if (banco && /nequi/i.test(String(banco))) {
      if (!/^\d{10}$/.test(s))
        return {
          valid: false,
          message: "Para Nequi, ingresa 10 dígitos (tu número de celular).",
        };
      return { valid: true };
    }
    if (isColombianBankName(banco)) {
      if (!/^\d{6,14}$/.test(s))
        return {
          valid: false,
          message:
            "Para bancos nacionales el número de cuenta debe contener solo dígitos (6 a 14 caracteres).",
        };
      return { valid: true };
    }
    if (/^[A-Za-z]{2}[0-9A-Za-z]{13,32}$/.test(s)) {
      if (!isValidIBAN(s)) return { valid: false, message: "IBAN inválido." };
      return { valid: true };
    }
    if (!/^[A-Za-z0-9]{15,34}$/.test(s))
      return {
        valid: false,
        message: "Número de cuenta inválido.",
      };
    return { valid: true };
  }

  function validateTitularName(titular) {
    if (!titular || !String(titular).trim())
      return { valid: false, message: "Titular es requerido." };
    const s = String(titular).trim();
    if (/[\.-]/.test(s))
      return {
        valid: false,
        message: "El nombre del titular no puede contener '.' ni '-'.",
      };
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length < 1)
      return { valid: false, message: "Proporciona el nombre del titular." };
    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ'\s]+$/.test(s))
      return {
        valid: false,
        message:
          "El nombre del titular sólo puede contener letras, espacios y apóstrofos.",
      };
    return { valid: true };
  }

  return {
    isColombianBankName,
    isValidIBAN,
    validateNumeroCuentaByBank,
    validateTitularName,
  };
});
