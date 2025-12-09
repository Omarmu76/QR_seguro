# Informe de Solución: Crash del Escáner

## Resumen
Se ha corregido el error de "condición de carrera" que provocaba que la aplicación se congelara o lanzara errores críticos al escanear un código QR. El problema se debía a que se intentaba detener el escáner mientras este aún estaba procesando cuadros o pasando a estado de "éxito".

## Implementación Técnica (`ScanScreen.tsx`)

### 1. Sistema de Parada Segura (`safeStopScanner`)
Se creó una función centralizada para detener el escáner que verifica dos cosas antes de actuar:
- **`isStoppingRef`**: Un "banderín" (flag) que evita que multiple intentos de parada ocurran simultáneamente (por ejemplo, si el escaneo es exitoso y el usuario pulsa cancelar al mismo ms).
- **Estado Interno**: Verifica `scannerRef.current.isScanning` para no intentar detener algo que ya está detenido.

### 2. Manejo de Pausa
En lugar de detener el escáner inmediatamente al detectar un código (lo cual era inestable), ahora **se pausa** el escáner (`pause(true)`). Esto congela el último cuadro de video, dando feedback visual de que se detectó algo, pero mantiene el motor encendido hasta que se completa la validación en base de datos. Solo entonces se llama a `stop()`.

### 3. Limpieza Defensiva
El `useEffect` ahora limpia el scanner de forma garantizada al desmontar el componente, usando la función segura para evitar errores si el usuario navega fuera de la pantalla rápidamente.

## Resultado
El flujo de escaneo es ahora mucho más robusto. El "pantallazo azul" o los errores de "Cannot transition to a new state" deberían desaparecer, proporcionando una experiencia fluida al usuario.
