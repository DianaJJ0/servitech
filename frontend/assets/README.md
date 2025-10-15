# Carpeta assets (Frontend)

Propósito:

- Contiene los recursos estáticos del frontend: JavaScript, CSS, imágenes, fuentes y otros assets.

Estructura y convenciones:

- js/: scripts de comportamiento cliente organizados por área (admin/, etc.).
- css/: hojas de estilo organizadas por páginas o componentes. `base.css` contiene variables y resets.
- img/: imágenes (logo, íconos). No editar imágenes directamente en binario para documentación; usa este README para describir usos/licencias.
- fonts/: fuentes usadas por la interfaz (documentar licencia).

Buenas prácticas para documentación Deepwiki:

- Añadir cabeceras comentadas en archivos JS y CSS con metadatos (archivo, propósito, variables esperadas, dependencias y notas de seguridad).
- No modificar archivos binarios ni minificados; documenta su uso aquí en lugar de insertar comentarios en el archivo.

Archivos principales (mapa rápido):

- js/
  - admin-common.js: utilidades comunes para el panel admin (sidebar, CSRF helpers)
  - admin/: carpeta con scripts específicos del panel administrativo.
    - admin.js: dashboard (gráficos, modal detalle)
    - admin-common.js: utilidades compartidas del admin (sidebar, menús, mobile)
    - admin-usuarios.js: validaciones y UI para crear/editar usuarios en Admin
    - admin-expertos.js: render, filtros y acciones sobre expertos (tabla, modales)
    - admin-categorias.js: CRUD y modales para categorías
    - admin-notificaciones.js: gestión y filtrado de notificaciones del panel
    - admin-mensajes.js: manejo de conversaciones/mensajes en el panel
    - admin-clientes.js: vistas y acciones para clientes (filtros, ver perfil)
  - analytics-config.js, analytics-loader.js: configuración y carga de analítica (GA)
  - cookie-consent.js: cargador y control del banner de cookies
  - common.js: funciones globales usadas en múltiples vistas
  - index.js, login.js, registro.js, perfil.js, etc.: scripts página-por-página
- css/
  - base.css: variables, reset y reglas globales
  - administrador.css, admin.css: estilos del panel de administración
  - componentes.css: estilos de componentes reutilizables (header, footer, modales)

Entradas detalladas:

- assets/js/calendario.js

  - Propósito: Controla el calendario de asesorías, generación del calendario mensual, selección de fecha y hora, y actualización del resumen de reserva.
  - Uso: El servidor embebe datos en el DOM para que este script los lea desde:
    - `#expertoData` (JSON): datos del experto (nombre, apellido, infoExperto.precioPorHora)
    - `#usuarioData` (JSON): datos del usuario autenticado (opcional)
    - `#asesoriasData` (JSON): array de asesorías para bloquear fechas/hours
  - Dependencias: `/assets/css/calendario.css` y utilidades en `/assets/js/common.js`.
  - Notas: El script puede usar `localStorage.token` para intentar sincronizar sesión con `/set-session`. Toda autorización final debe realizarse en el backend.

- assets/js/registroExperto.js
  - Propósito: Validaciones complejas y UX para el formulario de registro/edición de expertos (gestión de días disponibles, reglas de formato, uso de Choices.js para selects avanzados).
  - Uso: Incluido en `registroExperto.ejs`. Elementos relevantes:
    - `#registroExpertoForm`, `#diasDisponibles`, `.day-option`, `#titular`, `#numero-documento`, `#numeroCuenta`.
  - Dependencias: Choices.js (para selects enriquecidos), `window.SharedValidators` si está disponible, y el endpoint `/csrf-token` para obtener token CSRF cuando aplique.
  - Notas: Implementa medidas de robustez (restauración de sesión mediante `/set-session` si el proxy devuelve 401). Evitar exponer datos sensibles en localStorage; usarla solo para mejorar UX y siempre validar en servidor.

Notas de seguridad:

- Nunca inyectar claves secretas (API keys) directamente en estos archivos JS del cliente.
- Si un script requiere una API key para admin, póngala sólo en variables servidas al cliente cuando la sesión sea admin y documente el riesgo en este README.

Cómo añadir documentación:

- Para JS/CSS: añade un bloque de comentarios al comienzo del archivo siguiendo la plantilla en el manual (ejemplos: JSDoc para JS, /_ ... _/ para CSS).
- Para imágenes/fuentes: agregar una entrada en este README con uso y licencia.

Contacto:

- Equipo frontend / responsable: Diana (repositorio: servitech)
