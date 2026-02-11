import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { User } from 'firebase/auth';
import { Item, ItemStatus, PaymentStatus } from '../types';
import { subscribeToUserItems, subscribeToPublicReportedItems, updateItemLocationRealTime } from '../services/itemService';
import { updateMySentryStatus, removeMySentryStatus, subscribeToActiveSentries, joinOrCreateVigila2Group, SentryNode } from '../services/sentryService';
import Header from '../components/Header';
import Spinner from '../components/Spinner';
import { reportSecurityBreach } from '../services/sessionService';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// --- CONFIGURACIÓN DE ICONOS DE LEAFLET ---
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({ iconUrl: iconMarker, iconRetinaUrl: iconRetina, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// --- MARCADORES PERSONALIZADOS (Pines PNG de Colores) ---
const greenIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const redIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const purpleIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });



// --- PALETA DE COLORES VIGILA2 ---
const GROUP_COLORS = [
    '#06B6D4', // Cyan (Usuario 2)
    '#F97316', // Naranja (Usuario 3)
    '#D946EF', // Magenta (Usuario 4)
    '#8B5CF6', // Violeta
    '#EAB308', // Amarillo
    '#EC4899', // Rosa
    '#14B8A6', // Turquesa
    '#6366F1', // Índigo
    '#84CC16', // Lima
    '#F43F5E'  // Coral
];

// --- PALETA DE 10 COLORES PARA EL ENJAMBRE (Diferentes a los del sistema) ---
const SWARM_COLORS = [
  '#EFFF00', '#FF8C00', '#FF00FF', '#32CD32', '#DAA520', 
  '#C0C0C0', '#008B8B', '#F0F0F0', '#B8860B', '#FF8066'
];

// --- MARCADORES PERSONALIZADOS ---

// --- ICONOS VIGÍA ---
const QrIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zM6 8V4h2M4 8H2M6 20h2m-2-4H2m6-8h4m2 0h4" /></svg>);

const MapUpdater = ({ center }: { center: { lat: number, lng: number } | null }) => {
  const map = useMap();
  useEffect(() => { }, [center, map]);
  return null;
};

// --- SEGURIDAD DE COORDENADAS (ESCUDO SAGRADO) ---
const isValidCoords = (p: any): p is { lat: number; lng: number } => {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
  // Si accidentalmente nos llega un string largo (tipo UID), lo rechazamos de inmediato
  if (typeof p.lat === 'string' && p.lat.length > 10) return false;
  const lat = Number(p.lat);
  const lng = Number(p.lng);
  return typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
};

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180; const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180; const Δλ = (lon2 - lon1) * Math.PI / 180;
  if (isNaN(φ1) || isNaN(φ2) || isNaN(Δφ) || isNaN(Δλ)) return 999999;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface MapScreenProps { user: User; onMenuClick: () => void; onScanRequest: () => void; onInputCodeRequest: () => void; }

const MapScreen: React.FC<MapScreenProps> = ({ user, onMenuClick, onScanRequest, onInputCodeRequest }) => {

  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [initPos, setInitPos] = useState<{ lat: number; lng: number } | null>(null);
  
  /**
   * Explicación (Paso 4): Alerta Pasiva.
   * Estado para controlar el Toast que avisa sobre denuncias en la zona.
   */
  const [showToast, setShowToast] = useState(false);
  
  const lastUpdateRef = useRef<number>(0);
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [publicItems, setPublicItems] = useState<Item[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'alerts' | 'mine'>('all');
  const myItemsRef = useRef<Item[]>([]);
  const currentDeviceId = localStorage.getItem('qr_device_id');

  // --- ESTADOS VIGILA2 ---
  const [vigiaMode, setVigiaMode] = useState(false);
  const [vigiaType, setVigiaType] = useState<'INDIVIDUAL' | 'GROUP' | null>(null);
  const [vigiaAnchor, setVigiaAnchor] = useState<{ lat: number, lng: number } | null>(null);
  const [vigiaPin, setVigiaPin] = useState<string>("");
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showPinModal, setShowPinModal] = useState<'SET_INDIVIDUAL' | 'SET_GROUP' | 'UNLOCK' | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [silentHuntActive, setSilentHuntActive] = useState(false);
  
  // --- ESTADOS OJO DE DIOS (PRIVACIDAD TEMPORAL) ---
  const [showHiddenDevices, setShowHiddenDevices] = useState(false);
  
  const [mySentryStatus, setMySentryStatus] = useState<'ARMED' | 'ALARM' | 'RESCUE'>('ARMED');
  const [activeSentries, setActiveSentries] = useState<SentryNode[]>([]);
  const alarmAudio = useRef(new Audio('https://actions.google.com/sounds/v1/alarms/spaceship_alarm.ogg'));

  // --- LÓGICA DE COLORES DE GRUPO ---
  const groupMembership = useMemo(() => {
    if (!vigiaMode || vigiaType !== 'GROUP') return [];
    // Incluimos a todos los miembros del grupo incluyendo al usuario actual
    const members = [
      ...activeSentries.filter(s => s.groupCode === vigiaPin),
      { userId: user.uid }
    ];
    return members.sort((a, b) => a.userId.localeCompare(b.userId));
  }, [activeSentries, vigiaMode, vigiaType, vigiaPin, user.uid]);

  const myGroupColor = useMemo(() => {
    const idx = groupMembership.findIndex(m => m.userId === user.uid);
    return idx !== -1 ? GROUP_COLORS[idx % GROUP_COLORS.length] : null;
  }, [groupMembership, user.uid]);

  // 1. SUBSCRIPCIONES
  useEffect(() => {
    const unsubMy = subscribeToUserItems(user.uid, (items) => { setMyItems(items); myItemsRef.current = items; });
    const unsubPublic = subscribeToPublicReportedItems((items) => setPublicItems(items));
    const unsubSentries = subscribeToActiveSentries((sentries) => setActiveSentries(sentries.filter(s => s.userId !== user.uid)));
    return () => { unsubMy(); unsubPublic(); unsubSentries(); };
  }, [user.uid]);

  /**
   * Explicación (Paso 4): Detector de Denuncias Cercanas.
   * Si la lista de ítems denunciados cambia y hay denuncias activas,
   * mostramos un aviso visual discreto durante 5 segundos, pero SOLO si hay una denuncia a menos de 5KM.
   */
  useEffect(() => {
    if (publicItems.length > 0 && userPos) {
      // Verificamos si hay alguna denuncia pública a menos de 5000 metros (5KM)
      const nearbyAlert = publicItems.some(item => {
        if (isValidCoords(item.location)) {
          const dist = getDistance(userPos.lat, userPos.lng, item.location.lat, item.location.lng);
          return dist < 5000;
        }
        return false;
      });

      if (nearbyAlert) {
        setShowToast(true);
        const timer = setTimeout(() => setShowToast(false), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [publicItems, userPos]);

  // 2. DETECTOR DE ROBOS (Refactorizado: PROTOCOLO DE GEO-SEGURIDAD)
  const [alertTriggered, setAlertTriggered] = useState<string | null>(null);
  useEffect(() => {
    // LEY DE ALERTAS: Filtro de falsos positivos
    const shouldMonitorAlert = (item: Item) => {
      if (item.tipo === 'Celular' || item.tipo === 'Vehiculo') return true;
      if (item.trackingType === 'SELF_DEVICE') return true;
      return false;
    };

    const thiefDetected = myItems.find(item =>
      item.status === ItemStatus.Denunciado &&
      item.linkedDeviceId !== currentDeviceId &&
      item.location &&
      shouldMonitorAlert(item)
    );

    if (thiefDetected && thiefDetected.qrId !== alertTriggered) {
      new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg').play().catch(console.error);
      alert(`🚨 ¡OBJETO EN MOVIMIENTO! 🚨\n\nTu "${thiefDetected.marca}" se está moviendo sin ti.`);
      setAlertTriggered(thiefDetected.qrId!);
    }
  }, [myItems, alertTriggered, currentDeviceId]);

  // (Telemetría y Handlers UI se mantienen igual...)

  // 3. TELEMETRÍA CENTRAL (GPS)
  useEffect(() => {
    if (navigator.geolocation) {
      alarmAudio.current.loop = true;
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const now = Date.now();
          if (now - lastUpdateRef.current < 4000) return;
          lastUpdateRef.current = now;
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserPos(newPos);
          if (!initPos) setInitPos(newPos);

          // 1. Obtener items "imantados" para compartir
          const myDynamicItems = myItemsRef.current
            .filter(item => item.trackingType === 'SELF_DEVICE' && item.linkedDeviceId === currentDeviceId && isValidCoords(item.location))
            .map(item => ({
              id: item.qrId,
              lat: item.location!.lat,
              lng: item.location!.lng,
              tipo: item.tipo,
              marca: item.marca
            }));

          // Lógica Vigía
          if ((vigiaMode || silentHuntActive) && vigiaAnchor) {
            
            // NUEVO: LÓGICA DE RESOLUCIÓN AUTOMÁTICA (EFECTO DOMINÓ)
            const isGroupResolved = activeSentries.some(s => s.groupCode === vigiaPin && s.status === 'RESOLVED');
            if (isGroupResolved && vigiaMode) {
              alarmAudio.current.pause();
              alert("✅ ¡EMERGENCIA RESUELTA! El grupo se ha disuelto.");
              setVigiaMode(false);
              setSilentHuntActive(false);
              setVigiaAnchor(null);
              setVigiaType(null);
              setFailedAttempts(0);
              removeMySentryStatus(user.uid);
              return;
            }

            if (mySentryStatus !== 'RESCUE') {
              const dist = getDistance(vigiaAnchor.lat, vigiaAnchor.lng, newPos.lat, newPos.lng);
              if (dist > 30) {
                if (mySentryStatus !== 'ALARM') {
                  setMySentryStatus('ALARM');
                  updateMySentryStatus(user.uid, newPos.lat, newPos.lng, 'ALARM', vigiaType === 'GROUP' ? vigiaPin : undefined, myDynamicItems, localStorage.getItem('qr_device_name') || undefined);
                }
              } else {
                if (mySentryStatus === 'ALARM') setMySentryStatus('ARMED');
                updateMySentryStatus(user.uid, newPos.lat, newPos.lng, mySentryStatus, vigiaType === 'GROUP' ? vigiaPin : undefined, myDynamicItems, localStorage.getItem('qr_device_name') || undefined);
              }
            } else {
              updateMySentryStatus(user.uid, newPos.lat, newPos.lng, 'RESCUE', vigiaType === 'GROUP' ? vigiaPin : undefined, myDynamicItems, localStorage.getItem('qr_device_name') || undefined);
            }

            let triggerAlarm = false;
            if (vigiaType === 'GROUP') {
              const partnerInPanic = activeSentries.find(s => s.groupCode === vigiaPin && s.status === 'ALARM');
              if (partnerInPanic) triggerAlarm = true;
            } else {
              const neighborInPanic = activeSentries.find(s => !s.groupCode && s.status === 'ALARM' && getDistance(newPos.lat, newPos.lng, s.lat, s.lng) < 30);
              if (neighborInPanic) triggerAlarm = true;
            }
            if (mySentryStatus === 'ALARM') triggerAlarm = true;

            if (triggerAlarm && !silentHuntActive) {
              alarmAudio.current.play().catch(() => { });
              if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
            } else {
              if (!triggerAlarm && !silentHuntActive) alarmAudio.current.pause();
            }
          }

          // LEY 2: GEOCERCA DE SEGURIDAD (40M)
          const shouldMonitorAlert = (item: Item) => {
            if (item.tipo === 'Celular' || item.tipo === 'Vehiculo') return true;
            if (item.trackingType === 'SELF_DEVICE') return true;
            return false;
          };

          myItemsRef.current.filter(item =>
            item.status !== ItemStatus.Denunciado && // Solo si está "a salvo"
            shouldMonitorAlert(item)
          ).forEach(item => {
            if (isValidCoords(item.location)) {
              const dist = getDistance(newPos.lat, newPos.lng, item.location.lat, item.location.lng);
              if (dist > 40) { // SAFE_RADIUS_40M
                // Solo alertar si no se ha alertado ya para este item en este ciclo
                // (Para simplificar usamos un alert de consola/sistema)
                console.warn(`🚨 GEOFENCE ALERT: ${item.marca} se alejó más de 40m!`);
                // Aquí podrías disparar el triggerRedAlert si existiera una función específica, 
                // por ahora usamos la lógica de sonido/vibración existente si aplica.
              }
            }
          });

          // MONITOREO DE ENJAMBRE (ALERTA DE RUPTURA > 50M)
          if (vigiaMode && vigiaType === 'GROUP' && vigiaPin) {
            activeSentries.forEach(member => {
              if (member.groupCode === vigiaPin && member.status === 'ARMED') {
                const distToAlly = getDistance(newPos.lat, newPos.lng, member.lat, member.lng);
                if (distToAlly > 50) {
                   // 🔥 DISPARAR ALERTA GRUPAL
                   if (alarmAudio.current.paused) {
                     alarmAudio.current.play().catch(() => {});
                   }
                   if (navigator.vibrate) navigator.vibrate([1000, 500, 1000]);
                   console.warn(`🚨 RUPTURA DE PERÍMETRO: ${member.deviceName || 'Aliado'} se alejó del grupo!`);
                }
              }
            });
          }

          // Actualizar Items Vinculados
          myItemsRef.current.filter(item =>
            (item.paymentStatus === PaymentStatus.Paid || item.paymentStatus === PaymentStatus.Free) &&
            item.trackingType === 'SELF_DEVICE' &&
            item.linkedDeviceId === currentDeviceId
          ).forEach(item => { if (item.qrId) updateItemLocationRealTime(item.qrId, newPos.lat, newPos.lng); });
        },
        (err) => console.warn("GPS Error:", err), { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
      );
      return () => {
        navigator.geolocation.clearWatch(id);
        alarmAudio.current.pause();
        // Silenciamos este error porque es un problema de reglas de Firebase no crítico al cerrar sesión
        if (user?.uid) removeMySentryStatus(user.uid).catch(() => { });
      };
    }
  }, [currentDeviceId, vigiaMode, vigiaAnchor, activeSentries, mySentryStatus, silentHuntActive, user, vigiaType, vigiaPin]);

  // 4. HANDLERS UI
  const handleMainShieldClick = () => {
    if (vigiaMode || silentHuntActive) { setPinInput(""); setShowPinModal('UNLOCK'); }
    else { if (!userPos) return alert("Buscando GPS..."); setShowModeSelector(true); }
  };

  const handleModeSelect = (type: 'INDIVIDUAL' | 'GROUP') => {
    setShowModeSelector(false); setVigiaType(type); setPinInput("");
    setShowPinModal(type === 'GROUP' ? 'SET_GROUP' : 'SET_INDIVIDUAL');
  };

  const confirmActivation = async () => {
    if (pinInput.length < 4) return alert("Mínimo 4 dígitos");
    let anchorToUse = userPos!;
    if (vigiaType === 'GROUP') {
      try {
        const groupAnchor = await joinOrCreateVigila2Group(pinInput, userPos!.lat, userPos!.lng);
        const distToAnchor = getDistance(userPos!.lat, userPos!.lng, groupAnchor.lat, groupAnchor.lng);
        if (distToAnchor > 50) {
          if (!window.confirm("Grupo lejano detectado. ¿Unirse igual?")) return;
        }
        anchorToUse = groupAnchor;
      } catch (e) { console.error(e); anchorToUse = userPos!; }
    }
    setVigiaPin(pinInput); setVigiaAnchor(anchorToUse); setVigiaMode(true); setSilentHuntActive(false);
    setFailedAttempts(0); setMySentryStatus('ARMED');
    
    const myDynamicItems = myItemsRef.current
      .filter(item => item.trackingType === 'SELF_DEVICE' && item.linkedDeviceId === currentDeviceId && isValidCoords(item.location))
      .map(item => ({
        id: item.qrId,
        lat: item.location!.lat,
        lng: item.location!.lng,
        tipo: item.tipo,
        marca: item.marca
      }));

    updateMySentryStatus(user.uid, userPos!.lat, userPos!.lng, 'ARMED', vigiaType === 'GROUP' ? pinInput : undefined, myDynamicItems, localStorage.getItem('qr_device_name') || undefined);
    setShowPinModal(null);
  };

  const confirmUnlock = async () => {
    if (pinInput === vigiaPin) {
      setVigiaMode(false); setSilentHuntActive(false); setVigiaAnchor(null); setVigiaType(null);
      setFailedAttempts(0); alarmAudio.current.pause(); removeMySentryStatus(user.uid); setShowPinModal(null);
      alert("✅ VIGILANCIA FINALIZADA");
    } else {
      const newFail = failedAttempts + 1; setFailedAttempts(newFail); setPinInput("");
      if (newFail >= 3) {
        setVigiaMode(false); setSilentHuntActive(true); alarmAudio.current.pause(); setShowPinModal(null);
        alert("Sistema Desactivado.");
      } else { alert(`⛔ PIN INCORRECTO (${newFail}/3)`); }
    }
  };

  const activateRescueMode = () => {
    setMySentryStatus('RESCUE');
    const myDynamicItems = myItemsRef.current
      .filter(item => item.trackingType === 'SELF_DEVICE' && item.linkedDeviceId === currentDeviceId && isValidCoords(item.location))
      .map(item => ({
        id: item.qrId,
        lat: item.location!.lat,
        lng: item.location!.lng,
        tipo: item.tipo,
        marca: item.marca
      }));
    updateMySentryStatus(user.uid, userPos!.lat, userPos!.lng, 'RESCUE', vigiaType === 'GROUP' ? vigiaPin : undefined, myDynamicItems, localStorage.getItem('qr_device_name') || undefined);
    alarmAudio.current.pause();
  };

  /**
   * Maneja el desbloqueo de la vista de dispositivos ocultos (Ojo de Dios).
   * Genera una alerta de seguridad inmediata para auditoría.
   */
  const toggleHiddenView = () => {
    if (showHiddenDevices) {
       // CASO: APAGAR (Cerrar Ojo) -> Silencioso
       setShowHiddenDevices(false);
    } else {
       // CASO: ENCENDER (Abrir Ojo) -> Ruidoso
       setShowHiddenDevices(true);
       
       // 🔥 EL CHIVATO: Avisar a la base de datos que se abrió la vista
       if (currentDeviceId) {
           reportSecurityBreach(currentDeviceId); 
       }
       
       // Feedback local
       alert("👁️ VISTA OCULTA ACTIVADA. Se ha enviado una notificación de seguridad a tu dispositivo principal.");
    }
  };

  // 5. RENDERIZADO MAPA
  const displayedItems = useMemo(() => {
    const allItemsMap = new Map<string, Item>();
    // Filtros auxiliares eliminados por no ser requeridos en la lógica final
    if (filterMode === 'all') {
      // TODOS: Mis items + Alertas públicas
      myItems.forEach(i => { if (i.qrId) allItemsMap.set(i.qrId, i); });
      publicItems.forEach(i => { if (i.qrId) allItemsMap.set(i.qrId, i); });
    }
    else if (filterMode === 'mine') {
      // MIS COSAS: Mis items (En Regla, Recuperados y Denunciados propios)
      myItems.forEach(i => { if (i.qrId) allItemsMap.set(i.qrId, i); });
    }
    else if (filterMode === 'alerts') {
      // ALERTAS: Mis Denuncias (Rojo) + Denuncias Públicas (Púrpura)
      // EXCLUIMOS Recuperados forzosamente
      const isActiveAlert = (i: Item) => i.status === ItemStatus.Denunciado;

      publicItems.filter(isActiveAlert).forEach(i => { if (i.qrId) allItemsMap.set(i.qrId, i); });
      myItems.filter(isActiveAlert).forEach(i => { if (i.qrId) allItemsMap.set(i.qrId, i); });
    }
    return Array.from(allItemsMap.values());
  }, [myItems, publicItems, filterMode, user.uid]);

  const center = isValidCoords(userPos) ? userPos : (isValidCoords(initPos) ? initPos : { lat: -34.6037, lng: -58.3816 });

  // 5. RENDERIZADO DE MARCADORES (CEREBRO DEL MAPA)
  // Utilizamos useMemo para optimizar el rendimiento: los pines solo se recalculan 
  // si cambian los ítems mostrados, el ID del usuario o la posición central (GPS).
  const visualLines = useMemo(() => {
    const lines: React.ReactNode[] = [];
    const deviceMags = new Map<string, { lat: number, lng: number }>();

    // 1. Encontramos los centros (Imanes) de cada dispositivo
    displayedItems.forEach(item => {
      if (item.trackingType === 'SELF_DEVICE' && item.linkedDeviceId && item.location) {
        // Si es el imán de ESTE celular, usamos la posición en vivo
        if (item.linkedDeviceId === currentDeviceId && center) {
          deviceMags.set(item.linkedDeviceId, center);
        } else {
          deviceMags.set(item.linkedDeviceId, item.location);
        }
      }
    });

    // 2. Trazamos líneas desde los fijos hacia su imán
    displayedItems.forEach(item => {
      if (item.trackingType !== 'SELF_DEVICE' && item.linkedDeviceId && item.location) {
        const magPos = deviceMags.get(item.linkedDeviceId);
        if (magPos && isValidCoords(item.location) && isValidCoords(magPos)) {
          lines.push(
            <Polyline
              key={`line-${item.qrId}`}
              positions={[[item.location.lat, item.location.lng], [magPos.lat, magPos.lng]]}
              pathOptions={{ color: '#3B82F6', weight: 1, dashArray: '5, 5', opacity: 0.4 }}
            />
          );
        }
      }
    });
    return lines;
  }, [displayedItems, center, currentDeviceId]);

  const markerElements = useMemo(() => {
    return displayedItems
      .filter(item => item.qrId) // Solo procesamos ítems que tienen un ID válido para evitar errores de clave
      .map(item => {
        // -----------------------------------------------------------
        // 1. LEY DE POSICIONAMIENTO & PRIVACIDAD (ANTI-ESPÍAS)
        // -----------------------------------------------------------
        const isSelfDevice = item.trackingType === 'SELF_DEVICE';
        const isThisHandset = isSelfDevice && item.linkedDeviceId === currentDeviceId;
        const isDenunciado = item.status === ItemStatus.Denunciado || String(item.status).toUpperCase() === 'DENUNCIADO';
        const isRecuperado = item.status === ItemStatus.Recuperado || String(item.status).toUpperCase() === 'RECUPERADO';
        const shouldShowGreen = isRecuperado || !item.status || String(item.status).toUpperCase() === 'EN_REGLA' || String(item.status).toUpperCase() === 'EN REGLA';
        
        let position = item.location; // Por defecto: Base de Datos

        // CASO A: Es el dispositivo que tengo en la mano -> Usar GPS Local
        if (isThisHandset && center) {
           position = center; 
        } 
        // CASO B: Es mi dispositivo pero lo miro desde otro lado (PC/Otro Celular)
        else if (isSelfDevice && !isThisHandset) {
           // REGLA DE PRIVACIDAD: Si NO está denunciado y el "Ojo de Dios" está apagado, NO LO MOSTRAMOS.
           // Esto evita que alguien use tu cuenta en otro lado para espiarte.
           if (!isDenunciado && !showHiddenDevices) {
             return null; // Ocultar marcador completamente
           }
           // Si está denunciado o se activó el "Ojo de Dios", permitimos la visualización.
        }

        // Fallback para estáticos o recuperación
        if (!position && item.recoveryLocation && !isDenunciado) {
           position = item.recoveryLocation;
        }

        // -----------------------------------------------------------
        // 2. BLINDAJE CONTRA CRASH (PANTALLA AZUL)
        // -----------------------------------------------------------
        if (!isValidCoords(position)) return null;

        // -----------------------------------------------------------
        // 3. SELECCIÓN VISUAL (ICONOS)
        // -----------------------------------------------------------
        let selectedIcon = greenIcon; // Default
        if (item.ownerId === user.uid && isDenunciado) {
           selectedIcon = redIcon;
        } else if (item.ownerId !== user.uid && isDenunciado) {
           selectedIcon = purpleIcon;
        } else if (item.ownerId === user.uid && !isDenunciado) {
           selectedIcon = greenIcon;
        } else if (item.ownerId !== user.uid) {
           // Items de amigos o públicos seguros
           selectedIcon = greenIcon;
        }

        // --- REGLA VIGILA2: Color de Grupo para Imantados o Aliados Protegidos ---
        const memberIdx = groupMembership.findIndex(m => m.userId === item.ownerId);
        if (memberIdx !== -1 && !isDenunciado) {
           const allyColor = SWARM_COLORS[memberIdx % SWARM_COLORS.length];
           return (
            <Marker key={`item-${item.qrId}`} position={[position.lat, position.lng]} icon={new L.DivIcon({
                className: 'ally-item-pin',
                html: `<div style="background-color: ${allyColor}; width: 14px; height: 14px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 5px ${allyColor};"></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7]
            })}>
               <Popup className="classic-popup" closeButton={false}>
                  <div className={`flex flex-col items-center min-w-[150px] p-3 text-center rounded-lg border-2 shadow-xl bg-white`} style={{ borderColor: allyColor }}>
                    <div className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 text-white shadow-sm" style={{ backgroundColor: allyColor }}>
                      ALIADO PROTEGIDO ({item.tipo})
                    </div>
                    <h3 className="text-gray-900 font-extrabold text-sm m-0 leading-tight">{item.marca}</h3>
                    <p className="text-gray-500 font-bold text-xs uppercase mb-2">{item.modelo}</p>
                    <div className="w-full border-t border-gray-200 pt-1 mt-1">
                      <p className="text-[9px] text-gray-400 font-mono italic">Dispositivo: {item.linkedDeviceId?.slice(0, 8) || 'Desconocido'}</p>
                    </div>
                  </div>
               </Popup>
            </Marker>
           );
        }

        // RETORNO SEGURO CON PIN PNG
        return (
          <Marker key={`item-${item.qrId}`} position={[position.lat, position.lng]} icon={selectedIcon}>
            <Popup className="classic-popup" closeButton={false}>
              <div className={`flex flex-col items-center min-w-[150px] p-3 text-center rounded-lg border-2 shadow-xl bg-white ${isDenunciado ? 'border-red-600' : 'border-blue-600'}`}>
                <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 text-white shadow-sm ${isDenunciado ? 'bg-red-600 animate-pulse' : shouldShowGreen ? 'bg-green-600' : 'bg-blue-600'}`}>
                  {isDenunciado ? 'DENUNCIADO' : (shouldShowGreen ? 'EN REGLA' : (item.status || 'EN REGLA'))}
                </div>
                <h3 className="text-gray-900 font-extrabold text-sm m-0 leading-tight">{item.marca}</h3>
                <p className="text-gray-500 font-bold text-xs uppercase mb-2">{item.modelo}</p>
                <div className="w-full border-t border-gray-200 pt-1 mt-1">
                  <p className="text-[9px] text-gray-400 font-mono">ID: <span className="text-blue-600 font-bold">{item.shortId || item.qrId?.slice(0, 6)}</span></p>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      }).filter(Boolean);
 // Filtramos los nulos provenientes de coordenadas inválidas para evitar crasheos.
  }, [displayedItems, user.uid, center, currentDeviceId]); // Dependencias críticas para la reactividad.

  const visibleSentries = activeSentries.filter(s => {
    if (!vigiaMode) return false;
    if (vigiaType === 'GROUP') return s.groupCode === vigiaPin;
    return !s.groupCode;
  });

  if (!initPos && !userPos) return <div className="h-full flex items-center justify-center bg-[#0d1226] text-white"><Spinner /></div>;

  // UI CLASES
  const glassCardClass = "bg-[#111928]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center animate-fade-in";
  const btnBase = "w-full py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2";
  const fabClass = "w-14 h-14 bg-[#111928]/90 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-white shadow-xl hover:bg-blue-600/20 active:scale-90 transition-all";

  return (
    <div className="flex flex-col h-full bg-[#0d1226] relative overflow-hidden">
      <Header title="RADAR GLOBAL" onMenuClick={onMenuClick} transparent={true} />
      
      {/* Paso 4: Alerta Pasiva en el Mapa */}
      {showToast && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-6 py-2 rounded-full z-[2000] shadow-xl border border-red-500/50 flex items-center gap-2 animate-fade-in-down pointer-events-none">
          <span>⚠️</span>
          <span className="text-xs font-bold">Hay artículos denunciados en esta zona</span>
        </div>
      )}

      {/* --- MODALES --- */}
      {showModeSelector && (
        <div className="absolute inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={glassCardClass}>
            <h3 className="text-xl font-bold text-white mb-6 tracking-widest">SELECCIONA MODO</h3>
            <button onClick={() => handleModeSelect('INDIVIDUAL')} className={`${btnBase} bg-blue-600 hover:bg-blue-500 text-white mb-4`}>🛡️ VIGÍA PERSONAL</button>
            <button onClick={() => handleModeSelect('GROUP')} className={`${btnBase} bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black`}>⚜️ VIGILA-2 (Grupo)</button>
            <button onClick={() => setShowModeSelector(false)} className="mt-4 text-gray-400 text-sm underline">Cancelar</button>
          </div>
        </div>
      )}

      {/* --- CABECERA COMPACTA CON FILTROS --- */}
      <div className="absolute top-0 left-0 right-0 z-[1100] bg-black/50 backdrop-blur-md border-b border-white/5 px-2 py-1.5 flex items-center justify-between pointer-events-auto">
        <button className="p-2 text-white/70" onClick={onMenuClick}>
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        
        <div className="flex bg-black/60 p-0.5 rounded-lg border border-white/10">
          <button onClick={() => setFilterMode('all')} className={`px-2.5 py-1 text-[9px] uppercase font-black tracking-tighter transition-all rounded-md ${filterMode === 'all' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>Todos</button>
          <button onClick={() => setFilterMode('alerts')} className={`px-2.5 py-1 text-[9px] uppercase font-black tracking-tighter transition-all rounded-md ${filterMode === 'alerts' ? 'bg-red-600 text-white' : 'text-gray-500'}`}>Alertas</button>
          <button onClick={() => setFilterMode('mine')} className={`px-2.5 py-1 text-[9px] uppercase font-black tracking-tighter transition-all rounded-md ${filterMode === 'mine' ? 'bg-green-600 text-white' : 'text-gray-500'}`}>Mis Cosas</button>
        </div>

        <div className="w-9"></div> {/* Espaciador para centrar filtros */}
      </div>

      {showPinModal && (
        <div className="absolute inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={glassCardClass}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 text-3xl ${showPinModal === 'UNLOCK' ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
              {showPinModal === 'UNLOCK' ? '🔓' : (vigiaType === 'GROUP' ? '⚜️' : '🛡️')}
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">{showPinModal === 'UNLOCK' ? 'DESBLOQUEAR' : (vigiaType === 'GROUP' ? 'CLAVE DE GRUPO' : 'PIN PERSONAL')}</h3>
            <input type="number" value={pinInput} onChange={(e) => setPinInput(e.target.value)} className="bg-[#0d1226] text-white text-center text-4xl tracking-[10px] w-full py-4 rounded-xl border border-blue-500/30 focus:border-blue-400 outline-none mb-6 shadow-inner" maxLength={4} autoFocus placeholder="••••" />
            <div className="flex gap-3 w-full">
              <button onClick={() => setShowPinModal(null)} className="flex-1 bg-white/5 text-gray-300 py-3 rounded-xl font-bold border border-white/5">VOLVER</button>
              <button onClick={showPinModal === 'UNLOCK' ? confirmUnlock : confirmActivation} className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-xl font-bold shadow-lg">{showPinModal === 'UNLOCK' ? 'OK' : 'ACTIVAR'}</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MAPA --- */}
      <div className="flex-grow w-full relative z-0">
        <MapContainer center={center} zoom={16} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapUpdater center={userPos} />
          {isValidCoords(userPos) && <Marker key="user-pos" position={userPos} icon={new L.DivIcon({ className: 'user-loc', html: `<div style="width: 20px; height: 20px; background-color: ${myGroupColor || '#4285F4'}; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px ${myGroupColor || 'rgba(0,0,0,0.5)'};"></div>`, iconSize: [20, 20], iconAnchor: [10, 10] })} />}
          {vigiaMode && isValidCoords(vigiaAnchor) && <Circle key="vigia-anchor" center={vigiaAnchor} radius={30} pathOptions={{ color: mySentryStatus === 'ALARM' ? 'red' : (vigiaType === 'GROUP' ? 'gold' : '#0066ff'), fillColor: mySentryStatus === 'ALARM' ? 'red' : (vigiaType === 'GROUP' ? 'gold' : '#0066ff'), fillOpacity: 0.15 }} />}

          <MarkerClusterGroup chunkedLoading key={`cluster-${filterMode}`}>
            {visibleSentries
              .sort((a, b) => a.userId.localeCompare(b.userId)) // Orden determinista
              .map((sentry, index) => {
                if (!isValidCoords({ lat: sentry.lat, lng: sentry.lng })) return null;
                
                // Asignación de color cíclica
                const memberColor = GROUP_COLORS[index % GROUP_COLORS.length];

                return (
                  <React.Fragment key={`sentry-group-${sentry.userId}`}>
                    {/* PIN DEL MIEMBRO */}
                    <Marker 
                      position={{ lat: sentry.lat, lng: sentry.lng }} 
                      icon={new L.DivIcon({
                        className: 'custom-pin',
                        html: `<div style="background-color: ${memberColor}; width: 18px; height: 18px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 8px ${memberColor}; position: relative;">
                                ${sentry.status === 'ALARM' ? '<div style="position: absolute; top: -10px; right: -10px; font-size: 16px;">🚨</div>' : (sentry.status === 'RESCUE' ? '<div style="position: absolute; top: -10px; right: -10px; font-size: 16px;">🚑</div>' : '')}
                               </div>`,
                        iconSize: [18, 18],
                        iconAnchor: [9, 9]
                      })}
                    >
                      <Popup autoClose={false} closeButton={false}>
                        <div className="text-center p-2">
                          <span className="font-bold text-xs" style={{ color: memberColor }}>MIEMBRO GRUPO</span>
                          <div className="text-[10px] text-gray-500 italic mt-1">{sentry.deviceName || 'Vigía Activo'}</div>
                          {sentry.status === 'ALARM' && <div className="text-red-600 font-black animate-pulse">¡EN PELIGRO!</div>}
                        </div>
                      </Popup>
                    </Marker>

                    {/* ITEMS DINÁMICOS DEL MIEMBRO (Auto, Moto, etc) */}
                    {sentry.dynamicItems?.map((gItem: any) => (
                      <Marker 
                        key={`group-item-${gItem.id}`}
                        position={[gItem.lat, gItem.lng]}
                        icon={new L.DivIcon({
                          className: 'group-item-pin',
                          html: `<div style="background-color: ${memberColor}; width: 12px; height: 12px; border: 2px solid white; border-radius: 50%; opacity: 0.9; box-shadow: 0 0 5px ${memberColor};"></div>`,
                          iconSize: [12, 12],
                          iconAnchor: [6, 6]
                        })}
                      >
                        <Popup>
                          <div className="text-center">
                            <p className="font-bold text-[10px] m-0" style={{ color: memberColor }}>{gItem.tipo}</p>
                            <p className="text-[10px] m-0">{gItem.marca}</p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </React.Fragment>
                );
              })}
            {markerElements}
          </MarkerClusterGroup>
          {visualLines}
        </MapContainer>

        {/* --- BOTONES FLOTANTES --- */}
        {vigiaMode && (mySentryStatus === 'ALARM' || activeSentries.some(s => s.status === 'ALARM' && (s.groupCode === vigiaPin || !s.groupCode))) && mySentryStatus !== 'RESCUE' && (
          <div className="absolute top-32 left-0 right-0 z-[1500] flex flex-col items-center gap-3 animate-fade-in">
            <button onClick={activateRescueMode} className="bg-red-600 border-4 border-red-400 text-white px-8 py-4 rounded-full font-black text-xl shadow-[0_0_30px_rgba(255,0,0,0.6)] flex items-center gap-2 hover:scale-105 transition-transform">🚑 IR AL RESCATE</button>
            
            {/* BOTÓN RESOLUCIÓN (LO TENGO) */}
            {vigiaType === 'GROUP' && (
              <button 
                onClick={() => {
                  const myDynamicItems = myItemsRef.current
                    .filter(item => item.trackingType === 'SELF_DEVICE' && item.linkedDeviceId === currentDeviceId && isValidCoords(item.location))
                    .map(item => ({
                      id: item.qrId,
                      lat: item.location!.lat,
                      lng: item.location!.lng,
                      tipo: item.tipo,
                      marca: item.marca
                    }));
                  updateMySentryStatus(user.uid, userPos!.lat, userPos!.lng, 'RESOLVED', vigiaPin, myDynamicItems, localStorage.getItem('qr_device_name') || undefined);
                  
                  alarmAudio.current.pause();
                  setVigiaMode(false);
                  removeMySentryStatus(user.uid);
                  alert("✅ Has resuelto la alerta. El grupo se cerrará.");
                }}
                className="bg-green-600 border-4 border-green-400 text-white px-6 py-2 rounded-full font-black text-sm shadow-xl hover:scale-105 transition-transform"
              >
                ✅ ¡LO TENGO! (Desactivar)
              </button>
            )}
          </div>
        )}

        {/* --- BOTONES DE ACCIÓN (FABs) --- */}
        <div className="absolute bottom-28 right-4 z-[1000] flex flex-col gap-3 items-center">
          <button onClick={onScanRequest} className={`${fabClass} bg-[#111928]/90 border border-white/10 text-white shadow-xl shadow-blue-500/10 hover:bg-blue-600 transition-all`}><QrIcon /></button>
          <button onClick={onInputCodeRequest} className={`${fabClass} bg-[#111928]/90 backdrop-blur-xl border border-white/10 text-white shadow-xl hover:bg-gray-800 transition-all`}> <span className="font-bold text-sm">123</span></button>
          
          <button 
            onClick={toggleHiddenView}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl border border-white/10 transition-all duration-500 z-10 ${showHiddenDevices ? 'bg-red-600 text-white animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 'bg-[#111928]/90 backdrop-blur-xl text-gray-400'}`}
          >
            <span className="text-2xl filter drop-shadow-md">{showHiddenDevices ? '👁️' : '🔒'}</span>
          </button>

          <button onClick={handleMainShieldClick} className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl border-4 transition-all z-10 ${vigiaMode ? (mySentryStatus === 'ALARM' ? 'bg-red-600 border-red-400 animate-pulse' : (vigiaType === 'GROUP' ? 'bg-yellow-600 border-yellow-400' : 'bg-blue-600 border-blue-400')) : 'bg-[#111928]/90 backdrop-blur-xl border-white/10 text-white'}`}> <span className="text-3xl filter drop-shadow-md">{vigiaMode ? (mySentryStatus === 'ALARM' ? '🚨' : (vigiaType === 'GROUP' ? '⚜️' : '🛡️')) : '🛡️'}</span> </button>
        </div>

      </div>
    </div>
  );
};

export default MapScreen;
