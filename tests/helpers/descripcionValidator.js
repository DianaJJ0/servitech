export function sanitizeDescription(s) {
  if (!s) return "";
  // Eliminar etiquetas HTML
  let t = String(s).replace(/<[^>]*>/g, "");
  // Colapsar espacios y saltos de línea a un solo espacio
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

const containsURL = (s) => /https?:\/\/|www\./i.test(s);
const hasLongRepeated = (s) => /(.)\1{6,}/.test(s);

export function validateDescription(s) {
  const raw = s || "";
  const clean = sanitizeDescription(raw);
  const MIN_DESC = 30;
  const MAX_DESC = 400;

  if (!clean) {
    return { valid: false, error: "Descripción requerida." };
  }
  if (clean.length < MIN_DESC) {
    return {
      valid: false,
      error: `Describe tu experiencia en al menos ${MIN_DESC} caracteres.`,
    };
  }
  if (clean.length > MAX_DESC) {
    return { valid: false, error: `Máximo ${MAX_DESC} caracteres.` };
  }
  if (containsURL(raw)) {
    return {
      valid: false,
      error: "No incluyas enlaces o direcciones web en la descripción.",
    };
  }
  if (hasLongRepeated(raw)) {
    return { valid: false, error: "Evita secuencias repetidas de caracteres." };
  }

  return { valid: true, value: clean };
}
