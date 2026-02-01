// CREAR ARCHIVO: services/sessionService.ts
import { getDatabase, ref, set, onValue, remove, push } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const db = getDatabase();

// 1. Detectar Navegador/OS
/**
 * Detecta el nombre del dispositivo basándose en el userAgent del navegador.
 * Proporciona una identificación amigable para el usuario en la lista de sesiones.
 */
export const getDeviceName = () => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes("Android")) return "Android Device";
  if (userAgent.includes("iPhone")) return "iPhone";
  if (userAgent.includes("Windows")) return "PC Windows";
  if (userAgent.includes("Mac")) return "Macintosh";
  return "Navegador Web";
};

// 2. Registrar Sesión (Heartbeat)
/**
 * Registra o actualiza la sesión del dispositivo actual en la base de datos.
 * Guarda el nombre del dispositivo, la última vez visto y el estado.
 */
export const registerSession = (deviceId: string) => {
  const auth = getAuth();
  if (!auth.currentUser) return;
  
  const sessionRef = ref(db, `users/${auth.currentUser.uid}/sessions/${deviceId}`);
  set(sessionRef, {
    deviceName: getDeviceName(),
    lastSeen: Date.now(),
    status: 'ONLINE'
  });
};

// 3. Escuchar si me echaron (Kill Switch Local)
/**
 * Se suscribe a los cambios en la sesión del dispositivo actual.
 * Si el registro de la sesión desaparece, significa que ha sido expulsado remotamente.
 */
export const listenForKillSwitch = (deviceId: string, onKicked: () => void) => {
  const auth = getAuth();
  if (!auth.currentUser) return;

  const sessionRef = ref(db, `users/${auth.currentUser.uid}/sessions/${deviceId}`);
  return onValue(sessionRef, (snapshot) => {
    // Si la sesión ya no existe (fue borrada por otro), cerrar sesión.
    if (!snapshot.exists()) {
      onKicked();
    }
  });
};

// 4. Reportar Intrusión (Alerta de Seguridad)
/**
 * Registra una alerta de seguridad cuando se realiza una acción sensible
 * como desbloquear la vista de dispositivos ocultos.
 */
export const reportSecurityBreach = (deviceId: string) => {
  const auth = getAuth();
  if (!auth.currentUser) return;
  
  const alertsRef = ref(db, `users/${auth.currentUser.uid}/security_alerts`);
  push(alertsRef, {
    deviceId,
    deviceName: getDeviceName(),
    timestamp: Date.now(),
    action: 'HIDDEN_VIEW_UNLOCKED'
  });
};

// 5. Escuchar Alertas (Para mostrar el Modal en otros dispositivos)
/**
 * Se suscribe a las alertas de seguridad del usuario.
 * Notifica a través del callback si hay una alerta reciente que no haya sido generada por este dispositivo.
 */
export const subscribeToSecurityAlerts = (currentDeviceId: string, callback: (alert: any) => void) => {
  const auth = getAuth();
  if (!auth.currentUser) return;

  const alertsRef = ref(db, `users/${auth.currentUser.uid}/security_alerts`);
  return onValue(alertsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const keys = Object.keys(data);
      const latestKey = keys[keys.length - 1];
      const latestAlert = data[latestKey];

      // Solo avisar si la alerta es RECIENTE (menos de 10 seg) y NO fui yo
      if (Date.now() - latestAlert.timestamp < 10000 && latestAlert.deviceId !== currentDeviceId) {
        callback(latestAlert);
      }
    }
  });
};

// 6. Eliminar Sesión (Eyectar intruso)
/**
 * Elimina el registro de sesión de un dispositivo específico,
 * lo que activará su Kill Switch local.
 */
export const killSession = async (targetDeviceId: string) => {
  const auth = getAuth();
  if (!auth.currentUser) return;
  await remove(ref(db, `users/${auth.currentUser.uid}/sessions/${targetDeviceId}`));
};
