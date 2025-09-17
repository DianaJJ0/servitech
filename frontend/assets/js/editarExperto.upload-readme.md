This file documents the upload-then-JSON change applied to `editarExperto.js`.

Why:

- Multipart proxying through the frontend sometimes loses Authorization or causes multer to not parse correctly when streaming the incoming request. Upload-then-JSON is more robust: upload avatar via `/api/usuarios/avatar` (multipart) then send a PUT JSON to `/api/usuarios/perfil` with the rest of the fields and the `avatarUrl` returned by the upload.

What changed:

- `frontend/assets/js/editarExperto.js` submit handler now:
  - Reads form fields and builds a JSON `payload`.
  - If an avatar file is selected, uploads it first (POST `/api/usuarios/avatar`) with Authorization and AJAX headers.
  - Adds `avatarUrl` to payload if upload succeeds.
  - Sends PUT `/api/usuarios/perfil` with JSON payload and Authorization.

How to test locally:

- Start backend (port 5020) and frontend (port 5021).
- Authenticate in the app and ensure `localStorage.token` is set.
- Open `/editarExperto`, change profile fields and optionally select an avatar file, then press "Guardar cambios".
- Watch DevTools Network and backend logs.

Notes:

- This change assumes the backend has the `/api/usuarios/avatar` endpoint (it does in the repo). The multipart upload uses `avatar` as field name to match `upload.single('avatar')`.
- The client still preserves AJAX headers and returns friendly alerts instead of raw HTML.
