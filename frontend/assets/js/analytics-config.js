/**
 * Archivo: assets/js/analytics-config.js
 * Propósito: Configuración y constantes para la integración de analítica (p.ej. Google Analytics).
 * Uso: Incluido desde `componentes/footer.ejs` y cargado de forma defer.
 * Notas: No colocar claves privadas en este archivo; usa variables de entorno en el servidor cuando sea necesario.
 */

// Configuración para la analítica (coloca tu ID de Google Analytics o déjalo vacío para desactivar)
window.SERVITECH_ANALYTICS = {
  GA_MEASUREMENT_ID: "", // e.g. 'G-XXXXXXXXXX'
};
