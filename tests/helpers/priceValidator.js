export function validatePrice(inputValue) {
  // Recibe un string o número (como puede venir de input.value)
  if (inputValue === null || inputValue === undefined || inputValue === "") {
    return { valid: false, error: "Precio requerido." };
  }
  const s = String(inputValue).replace(/\D/g, ""); // solo dígitos
  if (s === "") return { valid: false, error: "Valor inválido." };
  // Limitar longitud razonable (6 dígitos -> hasta 999999)
  if (s.length > 6) return { valid: false, error: "Valor demasiado largo." };
  const num = parseInt(s, 10);
  if (isNaN(num)) return { valid: false, error: "Valor inválido." };
  if (num < 10000) return { valid: false, error: "El mínimo es $10.000 COP." };
  if (num > 100000)
    return { valid: false, error: "El máximo es $100.000 COP." };
  if (num % 100 !== 0)
    return { valid: false, error: "Debe ser múltiplo de 100." };
  return { valid: true, value: num };
}
