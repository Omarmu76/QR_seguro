# REGLA DE ORO: PRIORIDAD DE PRODUCCIÓN (COMPRAREN.COM.AR)

**IMPORTANCIA CRÍTICA: ESTE DOCUMENTO ES UNA REGLA IRROMPIBLE.**

Antes de realizar cualquier modificación, creación o actualización de código relacionado con Autenticación, Base de Datos o Servicios en el proyecto **QR Seguro**, es OBLIGATORIO validar que no se comprometa el funcionamiento de la aplicación en producción: **https://compraren.com.ar/**.

## 1. Compromiso de Seguridad
- **QR Seguro** (Desarrollo) y **ComprAren** (Producción) comparten el mismo motor de Firebase y base de usuarios.
- **PROHIBIDO** modificar plantillas de correo de Firebase (remitentes, links de verificación, reset de password).
- **PROHIBIDO** alterar la estructura de la colección Users de forma que sea incompatible con la App de producción.
- **PROHIBIDO** deshabilitar métodos de acceso existentes que ComprAren utilice (Google, Email/Pass).

## 2. Protocolo de Acción
1. **Verificar**: Antes de codificar, leer este archivo.
2. **Analizar**: Evaluar si el cambio en uthService.ts, irebaseConfig.ts o servicios compartidos afecta a ComprAren.
3. **Advertir**: Si existe un riesgo de ruptura, **DETENER EL PROCESO** y notificar al usuario inmediatamente solicitando instrucciones antes de tocar una sola línea de código.
4. **Respetar**: La prioridad absoluta es la estabilidad de la App operativa.

---
**CERTIFICACIÓN DE COMPRENSIÓN:**
Como asistente agentico, reconozco la importancia de esta jerarquía y me comprometo al 100% a actuar bajo este blindaje de protección para ComprAren.

## 3. Estructura Técnica Detectada (Legacy ComprAren)
- **Colección de Usuarios**: users (LOWERCASE). *Nota: Validar si existe 'Users' (Uppercase) y evitar duplicidad.*
- **Campos Críticos**:
    - cart (Array): IDs de productos.
    - avorites (Array): IDs de productos favoritos.
    - ole (String): Ejemplo: "SUPER_ADMIN", "USER".
    - emailVerified (Boolean): Estado de verificación.
    - lastLogin (String): Timestamp de último acceso.
- **Colecciones Relacionadas**: categories, comercios, products, solicitudes_venta, zonas.

**Acción Obligatoria**: Cualquier escritura de perfil de usuario desde QR Seguro DEBE preservar estos campos y no sobrescribirlos si ya existen. Usar siempre { merge: true } en operaciones de setDoc.
