import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { User } from 'firebase/auth';
import { Item, ItemStatus, PaymentStatus } from '../types';
import { subscribeToUserItems, subscribeToPublicReportedItems, updateItemLocationRealTime } from '../services/itemService';
import { updateMySentryStatus, removeMySentryStatus, subscribeToActiveSentries, joinOrCreateVigila2Group, SentryNode } from '../services/sentryService';
import Header from '../components/Header';
import Spinner from '../components/Spinner';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// --- ICONOS LEAFLET ---
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({ iconUrl: iconMarker, iconRetinaUrl: iconRetina, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// --- MARCADORES PERSONALIZADOS ---
const greenIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const redIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const purpleIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });

// --- ICONOS VIGÍA ---
const shieldBlueIcon = new L.DivIcon({ className: 'custom-div-icon', html: `<div style="font-size: 24px;">🛡️</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
const shieldGoldIcon = new L.DivIcon({ className: 'custom-div-icon', html: `<div style="font-size: 28px; filter: drop-shadow(0 0 5px orange);">⚜️</div>`, iconSize: [35, 35], iconAnchor: [17, 17] });
const shieldRedIcon = new L.DivIcon({ className: 'custom-div-icon', html: `<div style="font-size: 24px;" class="animate-pulse">🚨</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
const shieldRescueIcon = new L.DivIcon({ className: 'custom-div-icon', html: `<div style="font-size: 24px;">🚑</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });

// --- UI HELPERS ---
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
  const [mySentryStatus, setMySentryStatus] = useState<'ARMED' | 'ALARM' | 'RESCUE'>('ARMED');
  const [activeSentries, setActiveSentries] = useState<SentryNode[]>([]);
  const alarmAudio = useRef(new Audio('https://actions.google.com/sounds/v1/alarms/spaceship_alarm.ogg'));

  // 1. SUBSCRIPCIONES
  useEffect(() => {
    const unsubMy = subscribeToUserItems(user.uid, (items) => { setMyItems(items); myItemsRef.current = items; });
    const unsubPublic = subscribeToPublicReportedItems((items) => setPublicItems(items));
    const unsubSentries = subscribeToActiveSentries((sentries) => setActiveSentries(sentries.filter(s => s.userId !== user.uid)));
    return () => { unsubMy(); unsubPublic(); unsubSentries(); };
  }, [user.uid]);

  // 2. DETECTOR DE ROBOS
  const [alertTriggered, setAlertTriggered] = useState<string | null>(null);
  useEffect(() => {
    const thiefDetected = myItems.find(item => item.status === ItemStatus.Denunciado && item.linkedDeviceId !== currentDeviceId && item.location);
    if (thiefDetected && thiefDetected.qrId !== alertTriggered) {
      new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg').play().catch(console.error);
      alert(`🚨 ¡OBJETO EN MOVIMIENTO! 🚨\n\nTu "${thiefDetected.marca}" se está moviendo sin ti.`);
      setAlertTriggered(thiefDetected.qrId!);
    }
  }, [myItems, alertTriggered, currentDeviceId]);

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

          // Lógica Vigía
          if ((vigiaMode || silentHuntActive) && vigiaAnchor) {
            if (mySentryStatus !== 'RESCUE') {
              const dist = getDistance(vigiaAnchor.lat, vigiaAnchor.lng, newPos.lat, newPos.lng);
              if (dist > 30) {
                if (mySentryStatus !== 'ALARM') {
                  setMySentryStatus('ALARM');
                  updateMySentryStatus(user.uid, newPos.lat, newPos.lng, 'ALARM', vigiaType === 'GROUP' ? vigiaPin : undefined);
                }
              } else {
                if (mySentryStatus === 'ALARM') setMySentryStatus('ARMED');
                updateMySentryStatus(user.uid, newPos.lat, newPos.lng, mySentryStatus, vigiaType === 'GROUP' ? vigiaPin : undefined);
              }
            } else {
              updateMySentryStatus(user.uid, newPos.lat, newPos.lng, 'RESCUE', vigiaType === 'GROUP' ? vigiaPin : undefined);
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
    updateMySentryStatus(user.uid, userPos!.lat, userPos!.lng, 'ARMED', vigiaType === 'GROUP' ? pinInput : undefined);
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
    updateMySentryStatus(user.uid, userPos!.lat, userPos!.lng, 'RESCUE', vigiaType === 'GROUP' ? vigiaPin : undefined);
    alarmAudio.current.pause();
  };

  // 5. RENDERIZADO MAPA
  const displayedItems = useMemo(() => {
    const allItemsMap = new Map<string, Item>();
    const isPaid = (item: Item) => item.paymentStatus === PaymentStatus.Paid || item.paymentStatus === PaymentStatus.Free;

    if (filterMode === 'all') {
      myItems.filter(isPaid).forEach(i => { if (i.qrId) allItemsMap.set(i.qrId, i); });
      publicItems.forEach(i => { if (i.qrId) allItemsMap.set(i.qrId, i); });
    }
    else if (filterMode === 'mine') {
      myItems.filter(isPaid).forEach(i => { if (i.qrId) allItemsMap.set(i.qrId, i); });
    }
    else if (filterMode === 'alerts') {
      // LOGICA DE BLINDAJE: 
      // Muestra items 'Denunciado', PERO excluye forzosamente cualquiera que sea 'Recuperado'.
      // Garantiza que las alertas sean solo amenazas activas.
      const isActiveAlert = (i: Item) =>
        i.status === ItemStatus.Denunciado && (i.status as any) !== ItemStatus.Recuperado;

      publicItems.filter(isActiveAlert).forEach(i => allItemsMap.set(i.qrId!, i));
      myItems.filter(isActiveAlert).forEach(i => allItemsMap.set(i.qrId!, i));
    }
    return Array.from(allItemsMap.values());
  }, [myItems, publicItems, filterMode]);

  const markerElements = useMemo(() => {
    return displayedItems
      .filter(item => item.qrId) // Solo renderizar si tiene ID (Evita errores de key)
      .map(item => {
        const isRecuperado = item.status === ItemStatus.Recuperado || String(item.status).toUpperCase() === 'RECUPERADO';
        const isDenunciado = item.status === ItemStatus.Denunciado || String(item.status).toUpperCase() === 'DENUNCIADO';

        // Lógica robusta de posición
        let position = item.location;

        // Si no hay señal en vivo, intentar usar la ubicación de recuperación
        if (!position && item.recoveryLocation) {
          const statusStr = (item.status || '').toUpperCase();
          if (statusStr !== 'DENUNCIADO' && statusStr !== 'ROBADO') {
            position = item.recoveryLocation;
          }
        }

        if (!isValidCoords(position)) return null;

        // Visualización: Verde para Recuperado/En Regla, Potección de fallos de status
        const shouldShowGreen = isRecuperado || !item.status || String(item.status).toUpperCase() === 'EN_REGLA' || String(item.status).toUpperCase() === 'EN REGLA';
        let icon = isDenunciado ? redIcon : greenIcon; // Por defecto verde si no está denunciado
        if (item.ownerId !== user.uid) icon = purpleIcon;

        return (
          <Marker key={`item-${item.qrId}`} position={position} icon={icon}>
            <Popup className="classic-popup" closeButton={false}>
              <div className={`flex flex-col items-center min-w-[150px] p-3 text-center rounded-lg border-2 shadow-xl bg-white ${isDenunciado ? 'border-red-600' : 'border-blue-600'}`}>
                <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 text-white shadow-sm ${isDenunciado ? 'bg-red-600 animate-pulse' : shouldShowGreen ? 'bg-green-600' : 'bg-blue-600'}`}>
                  {shouldShowGreen ? 'EN REGLA' : (item.status || 'EN REGLA')}
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
  }, [displayedItems, user.uid]);

  const visibleSentries = activeSentries.filter(s => {
    if (!vigiaMode) return false;
    if (vigiaType === 'GROUP') return s.groupCode === vigiaPin;
    return !s.groupCode;
  });

  if (!initPos && !userPos) return <div className="h-full flex items-center justify-center bg-[#0d1226] text-white"><Spinner /></div>;
  const center = isValidCoords(userPos) ? userPos : (isValidCoords(initPos) ? initPos : { lat: -34.6037, lng: -58.3816 });

  // UI CLASES
  const glassCardClass = "bg-[#111928]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center animate-fade-in";
  const btnBase = "w-full py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2";
  const fabClass = "w-14 h-14 bg-[#111928]/90 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-white shadow-xl hover:bg-blue-600/20 active:scale-90 transition-all";

  return (
    <div className="flex flex-col h-full bg-[#0d1226] relative overflow-hidden">
      <Header title="RADAR GLOBAL" onMenuClick={onMenuClick} transparent={true} />

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
          {isValidCoords(userPos) && <Marker key="user-pos" position={userPos} icon={new L.DivIcon({ className: 'user-loc', html: `<div style="width: 20px; height: 20px; background-color: #4285F4; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`, iconSize: [20, 20], iconAnchor: [10, 10] })} />}
          {vigiaMode && isValidCoords(vigiaAnchor) && <Circle key="vigia-anchor" center={vigiaAnchor} radius={30} pathOptions={{ color: mySentryStatus === 'ALARM' ? 'red' : (vigiaType === 'GROUP' ? 'gold' : '#0066ff'), fillColor: mySentryStatus === 'ALARM' ? 'red' : (vigiaType === 'GROUP' ? 'gold' : '#0066ff'), fillOpacity: 0.15 }} />}

          <MarkerClusterGroup chunkedLoading key={`cluster-${filterMode}`}>
            {visibleSentries.map(sentry => {
              if (!isValidCoords({ lat: sentry.lat, lng: sentry.lng })) return null;
              return (
                <Marker key={`sentry-${sentry.userId}`} position={{ lat: sentry.lat, lng: sentry.lng }} icon={sentry.status === 'RESCUE' ? shieldRescueIcon : (sentry.status === 'ALARM' ? shieldRedIcon : (vigiaType === 'GROUP' ? shieldGoldIcon : shieldBlueIcon))}>
                  {sentry.status === 'ALARM' && <Popup autoClose={false} closeButton={false} className="alarm-popup"><div className="text-red-600 font-black">¡AYUDA!</div></Popup>}
                </Marker>
              );
            })}
            {markerElements}
          </MarkerClusterGroup>
        </MapContainer>

        {/* --- BOTONES FLOTANTES --- */}
        {vigiaMode && (mySentryStatus === 'ALARM' || activeSentries.some(s => s.status === 'ALARM' && (s.groupCode === vigiaPin || !s.groupCode))) && mySentryStatus !== 'RESCUE' && (
          <div className="absolute top-32 left-0 right-0 z-[1500] flex justify-center animate-bounce">
            <button onClick={activateRescueMode} className="bg-red-600 border-4 border-red-400 text-white px-8 py-4 rounded-full font-black text-xl shadow-[0_0_30px_rgba(255,0,0,0.6)] flex items-center gap-2 hover:scale-105 transition-transform">🚑 IR AL RESCATE</button>
          </div>
        )}

        <div className="absolute top-24 left-0 right-0 z-[1000] flex justify-center gap-2 px-4 pointer-events-none">
          <div className="pointer-events-auto flex gap-3 p-1 rounded-2xl bg-black/20 backdrop-blur-md border border-white/5">
            <button onClick={() => setFilterMode('all')} className={filterMode === 'all' ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl px-4 py-2 text-xs font-bold" : "bg-[#111928]/80 text-white rounded-xl px-4 py-2 text-xs"}>🌎 Todos</button>
            <button onClick={() => setFilterMode('alerts')} className={filterMode === 'alerts' ? "bg-red-600 text-white rounded-xl px-4 py-2 text-xs font-bold" : "bg-[#111928]/80 text-white rounded-xl px-4 py-2 text-xs"}>🚨 Alertas</button>
            <button onClick={() => setFilterMode('mine')} className={filterMode === 'mine' ? "bg-green-600 text-white rounded-xl px-4 py-2 text-xs font-bold" : "bg-[#111928]/80 text-white rounded-xl px-4 py-2 text-xs"}>👤 Mis Cosas</button>
          </div>
        </div>

        <div className="absolute bottom-28 right-4 z-[1000] flex flex-col gap-4 items-end">
          <button onClick={onScanRequest} className={`${fabClass} bg-gradient-to-tr from-blue-600 to-cyan-500 border-none`}><QrIcon /></button>
          <button onClick={onInputCodeRequest} className={fabClass}> <span className="font-bold text-sm">123</span></button>
          <button onClick={handleMainShieldClick} className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl border-4 transition-all z-10 ${vigiaMode ? (mySentryStatus === 'ALARM' ? 'bg-red-600 border-red-400 animate-pulse' : (vigiaType === 'GROUP' ? 'bg-yellow-600 border-yellow-400' : 'bg-blue-600 border-blue-400')) : 'bg-[#111928]/90 backdrop-blur-xl border-white/10 text-white'}`}> <span className="text-3xl filter drop-shadow-md">{vigiaMode ? (mySentryStatus === 'ALARM' ? '🚨' : (vigiaType === 'GROUP' ? '⚜️' : '🛡️')) : '🛡️'}</span> </button>
        </div>
      </div>
    </div>
  );
};
export default MapScreen;