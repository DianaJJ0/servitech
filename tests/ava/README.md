```markdown
# Pruebas con AVA en ServiTech — Guía corta y práctica

Este README explica, paso a paso y de forma sencilla, cómo usar AVA para pruebas en el proyecto ServiTech, qué hace cada prueba que ya creamos (unidad e integración) y soluciones rápidas a errores comunes.

Resumen rápido
- Ubicación de las pruebas: tests/ava/test/
  - usuario.unit.test.js (pruebas unitarias del modelo Usuario)
  - usuario.integration.test.js (prueba de integración con MongoDB en memoria)
- Configuración de tests independiente: tests/ava/package.json (este package.json contiene AVA, mongodb-memory-server, mongoose y timeout).
- Ejecutar desde: tests/ava (no desde la raíz, salvo que se adapte el package.json raíz).

Beneficios de usar AVA aquí
- Sintaxis simple y moderna (async/await friendly).
- Tests por archivo ejecutados en paralelo (rápido).
- Buena integración con pruebas unitarias y de integración cuando se usan instancias en memoria (mongodb-memory-server).
- Produce salidas limpias y nombres de test descriptivos que son útiles en demos.

Inicialización (paso a paso) — Windows (Git Bash) y Linux
1. Abrir terminal en la carpeta correcta:
   - Git Bash / Linux:
     - cd ~/Music/servitech/tests/ava
   - PowerShell:
     - cd C:\Users\<tu_usuario>\Music\servitech\tests\ava

2. Verifica que exista package.json en esa carpeta:
   - ls -la  (o dir en PowerShell)

3. Instalar dependencias:
   - npm install

4. Ejecutar los tests:
   - npm test
   - O con más detalle:
     - npx ava --verbose

Qué hacen los tests en este ejemplo
- usuario.unit.test.js
  - Prueba matchPassword() y el virtual setter password del modelo (sin base de datos).
  - Rápidas, deterministas, para validar lógica de hashing/validación.
- usuario.integration.test.js
  - Levanta una instancia de MongoDB en memoria (mongodb-memory-server), conecta mongoose y prueba guardar/recuperar un usuario.
  - Verifica la persistencia sin tocar tu base de datos real.

Soluciones a errores comunes (rápidas)

1) npm error ENOENT: Could not read package.json
- Causa: ejecutaste `npm install` en una carpeta que no contiene package.json.
- Solución:
  - Asegúrate de estar en tests/ava:
    - cd ~/Music/servitech/tests/ava
  - Si no existe package.json crea uno (o pega el que se entregó en el repo).
  - Para generar uno rápido: npm init -y (luego editarlo).

2) ERR_MODULE_NOT_FOUND al importar backend/models/usuario.model.js
- Causa: ruta relativa incorrecta desde el archivo de test.
- Solución:
  - Ajustar la importación según la ubicación del test. Ejemplo (desde tests/ava/test):
    - import usuarioModule from '../../../backend/models/usuario.model.js';
  - Verifica la estructura del repo antes de ejecutar.

3) Timed out / mongodb-memory-server tardó en arrancar
- Causa: la primera ejecución descarga el binario de MongoDB (puede tardar).
- Soluciones:
  - Aumentar el timeout de AVA en tests/ava/package.json:
    - "ava": { "timeout": "2m" }
  - O forzar descarga previa (una vez) con un script pequeño:
    - node tests/ava/download-mongo.js
  - Recomendación: ejecutar las pruebas una vez antes de la presentación para cachear el binario.

4) MongooseError: Operation `usuarios.insertOne()` buffering timed out after 10000ms
- Causa: el modelo importado usa una copia distinta de mongoose (diferente instancia/driver) que la que conectó en el test.
- Solución práctica y segura:
  - En la prueba de integración define el esquema/modelo sobre la misma instancia de mongoose que conectas en el test (esto evita problemas por múltiples copias de mongoose en node_modules).
  - Alternativa a mayor alcance: asegurar que backend y tests usan la misma versión/instancia de mongoose (revisar dependencias y hoisting), pero es más frágil.

5) Permisos / problemas en Windows con descargas
- Causa: proxy, firewall o permisos.
- Solución:
  - Ejecuta desde Git Bash o WSL.
  - Comprueba conexión a internet y permisos de carpeta (escribir en %USERPROFILE%/.cache/ mongodb-memory-server).
  - Si estás en red corporativa, considera descargar el binario en otra red o usar WSL.

Consejos para la demo / presentación
- Ejecuta `npm test` en tests/ava una vez antes de la demo para cachéar el binario de MongoDB en memoria.
- Muestra la salida de AVA: cada test con su nombre y la marca ✓; termina con "N tests passed".
- Explica brevemente la diferencia entre prueba unitaria (rápida, sin BD) y la de integración (levanta DB en memoria).
- Si la demo en vivo falla, muestra una captura de terminal con los tests pasados (tener backup en las diapositivas).

Archivos clave y rutas (para copiar/pegar o revisar)
- tests/ava/package.json
- tests/ava/test/usuario.unit.test.js
- tests/ava/test/usuario.integration.test.js
- backend/models/usuario.model.js

Si necesitas, te puedo:
- Adjuntar aquí el package.json completo usado en tests/ava,
- Generar un pequeño script download-mongo.js para forzar la descarga,
- O crear 3 diapositivas listas para pegar en PowerPoint/Google Slides con comandos y la salida de ejemplo.

¿Quieres que te entregue ahora el package.json completo de tests/ava y el script opcional download-mongo.js?
```
