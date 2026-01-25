# REGLAS DEL AGENTE - QR SEGURO

Este documento contiene las reglas de comportamiento y calidad que el agente de IA debe seguir estrictamente para este proyecto.

## 1. Comunicación y Chat

- **Idioma**: Toda respuesta del agente o el editor en el chat debe ser en **Español**.
- **Contexto**: Explicar siempre lo que se está haciendo o lo que se va a generar.
- **Traducción**: Si el agente lee documentación en inglés, debe traducirla al usuario si es relevante para la tarea.

## 2. Generación de Código

- **Idioma del Código**: El código fuente (nombres de variables, funciones, comentarios internos) se mantiene en **Inglés** por convención técnica.
- **Documentación Detallada**: Todo código generado debe tener:
  - Una descripción inicial de su propósito.
  - Explicaciones bloque por bloque y línea por línea de lo que realiza.
  - Justificación de parámetros y tipos de datos.

## 3. Flujo de Trabajo y Aprobaciones

- **Planificación**: Antes de cualquier cambio masivo, se debe generar un `implementation_plan.md` y esperar la aprobación explícita del usuario.
- **Informes**: Se debe generar un informe detallado por cada sesión de trabajo significativa.
  - Ubicación: Carpeta `INFORMES`.
  - Nomenclatura: Correlativa con número y fecha (ej: `042_REPORTE_TITULO_DD-MM-AA.md`).

## 4. Calidad y Estabilidad

- **Verificación de Errores**: Antes de entregar una tarea, se deben revisar:
  - Errores de terminal (compilación).
  - Errores de TypeScript (`Problems`).
  - Mensajes de error en la consola del navegador (si aplica).
- **Prohibido entregar código con errores evidentes**.

## 5. Control de Versiones (Git)

- **GITHUB**: NO realizar `git push` a menos que el usuario lo solicite explícitamente. Los commits locales están permitidos.

---

_Documento establecido el 24 de Enero de 2026._
