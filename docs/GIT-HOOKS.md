# Hooks de Git personalizados (español)

Este repositorio incluye un conjunto ligero de hooks para prellenar los mensajes de commit en español con un resumen de archivos cambiados.

Instalación (Windows / PowerShell):

1. Abre PowerShell en la raíz del repositorio.
2. Ejecuta:

   .\scripts\install-git-hooks.ps1

Esto configurará `core.hooksPath` para que Git ejecute los hooks que están en `.githooks`.

Uso:

- Al ejecutar `git commit` (sin mensaje), el hook `prepare-commit-msg` rellenará el fichero de mensaje con un título en español y una lista de archivos (modificados, agregados, eliminados, renombrados). Edita el mensaje si quieres antes de confirmar.

Notas:

- El hook no sobrescribirá mensajes existentes (por ejemplo, si ya ingresaste un mensaje en el editor).
- No interfiere con merges/squash.
- Si usas Git GUIs que evitan hooks, verifica la configuración de la herramienta.

Si quieres personalizar el formato del mensaje o traducir palabras diferentes, edita `.githooks/prepare-commit-msg`.
