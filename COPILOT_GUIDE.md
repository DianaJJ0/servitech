Instrucciones Específicas para el Proyecto SERVITECH
Repositorios a analizar

DianaJJ0/servitech (versión principal)
DianaJJ0/SERVITECH-PRUEBA (versión de pruebas con esquemas MongoDB)
--

Base de datos MongoDB

Extraer y entregar el código completo de la DB actual (SERVITECH-PRUEBA).

Rediseñar la DB en modelo no relacional, usando el email único como identificador principal en lugar de ObjectId.

--
Revisar y validar los esquemas JSON-Schema para colecciones:

¿Están bien definidas como NoSQL?

¿Qué campos mínimos y estructuras recomendables para colecciones de usuarios, expertos y asesorías?

Entregar dos versiones de código:

Colecciones actuales (tal cual en Compass, pero en archivos models/ para VSCode).

Colecciones rediseñadas con email como clave primaria.

Ejemplo de inserción:

Crear 2 usuarios (uno evoluciona a experto), 1 experto y 1 documento de asesoría, mostrando cómo quedan los datos en la nueva estructura.
--
Modelos en carpeta models/

Proveer todos los archivos de modelos reestructurados (JS/TS), usando únicamente el email como ID.

Para cada archivo, listar las modificaciones realizadas (campos añadidos, renombrados o removidos).

Evaluar si conviene dividir o unir archivos de modelos; justificar cada decisión.

Flujo de “Confirmar Cita” y Pago

Definir la lógica UI y backend al pulsar “Confirmar Cita”:

¿Mostrar pantalla de resumen o redireccionar directamente al gateway externo?

Qué datos debe visualizar el usuario antes/durante la redirección.

Cómo manejar la confirmación por correo (usuario y experto) con estado de pago retenido.

Proponer una implementación sencilla (wireframe básico o pseudocódigo) para entender el flujo sin profundizar aún en integración de pasarela.
--
Instrucción final para Copilot:

Usa estas pautas como “Custom Instructions” para este proyecto.

Antes de cualquier modificación, verifica la estructura y pide el contenido actual si no lo conoces.

Aplica el email como clave primaria en todos los modelos MongoDB.

Mantén el código limpio, comentado y completo en cada archivo.


--
te mando el documento de requisitos funcionales del proyecto para que los tengas presentes y me ayudes a verificar que todo este. para el tema del crud de todo y la db buena.

--
MÓDULOS	REQUISITOS
Usuarios	RF-USU-01 Registrar usuarios
	RF-USU-02 Registrar información adicional
	RF-USU-03 Enviar correo electrónico de confirmación del registro
	RF-USU-04 Iniciar sesión
	RF-USU-05 Enviar correo electrónico de notificación de inicio de sesión
	RF-USU-06 Generar verificación captcha
	RF-USU-07 Recuperar contraseña
	RF-USU-08 Recuperar cuenta
	RF-USU-09 Editar / actualizar información de usuarios
	RF-USU-10 Cerrar sesión
	RF-USU-11 Eliminar la cuenta
Asesoría	RF-ASE-01 Interactuar con asesorías de expertos
	RF-ASE-02 Listar o filtrar asesorías de expertos
	RF-ASE-03 Editar asesoría como experto
Pago	RF-PAG-01 Pagar por la asesoría
	RF-PAG-02 Enviar correo electrónico de confirmación de pago de la asesoría
	RF-PAG-03 Retener el pago
	RF-PAG-04 Recibir pago por la asesoría
	RF-PAG-05 Enviar correo electrónico de recepción del pago por la asesoría
Calificación	RF-CAL-01 Calificar asesoría del experto de 1 a 5 estrellas
	RF-CAL-02 Redactar un comentario del servicio

