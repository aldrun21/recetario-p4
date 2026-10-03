# Especificación de Seguridad de Firestore (Security Spec)

## Invariantes de Datos
1. **Propiedad Integra**: Ningún doctor puede registrar pacientes ni recetas a nombre de otro doctor (`createdBy` o el ID del documento en `/doctors` debe coincidir exactamente con `request.auth.uid`).
2. **Aislamiento de Datos**: Un doctor solo puede leer y escribir pacientes y recetas creados por él mismo para proteger la privacidad e integridad de la información médica (PII).
3. **Validación de Identificadores (IDs)**: Los identificadores de documentos deben tener un tamaño seguro para mitigar ataques de denegación de cartera (Denial of Wallet).

## Payloads del "Dirty Dozen" (Intentos de Ataque Mitigados)
1. **Suplantación de Creador (Pacientes)**: Intentar crear un paciente con `createdBy` correspondiente a otra cuenta UID para ocultar o desviar responsabilidades.
2. **Escritura sin Autenticación**: Intentar escribir un paciente o receta sin haber iniciado sesión con Firebase Auth.
3. **Lectura Cruzada de Pacientes**: Un doctor intenta consultar el historial médico de pacientes creados por otro médico.
4. **Modificación de Receta Ajena**: Un doctor intenta editar o borrar una receta generada por otro profesional.
5. **Inyección de ID Gigante**: Intentar crear un documento con un ID de 100 KB para agotar recursos o inflar costos de almacenamiento.
6. **Campos Ocultos (Shadow Fields)**: Intentar agregar campos no especificados en el blueprint a un paciente (ej. `isAdmin: true` o `credit: 99999`).
7. **Actualización de Creador**: Un doctor intenta cambiar el campo `createdBy` de una receta ya existente.
8. **Lectura de Perfil de Médico Ajeno**: Un usuario no autenticado intenta leer el perfil administrativo/médico de un doctor.
9. **Eliminación Maliciosa**: Intentar eliminar masivamente registros de pacientes sin ser el creador.
10. **Tipos de Datos Corruptos**: Intentar guardar el campo `name` de un paciente como un arreglo de números en lugar de un string.
11. **Receta Huérfana**: Intentar crear una receta con un `patientId` vacío o con caracteres de inyección de código.
12. **Sobrecarga de Medicamentos**: Intentar guardar una cantidad masiva de datos estructurados inválidos para saturar el sistema.

## Reglas de Seguridad (firestore.rules)
Las siguientes reglas de Firestore implementan estas políticas estrictas.
