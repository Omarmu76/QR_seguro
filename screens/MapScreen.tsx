import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { User } from 'firebase/auth';
import { Item, ItemStatus, PaymentStatus } from '../types';
import { subscribeToUserItems, subscribeToPublicReportedItems, updateItemLocationRealTime } from '../services/itemService';
import { updateMySentryStatus, removeMySentryStatus, subscribeToActiveSentries, SentryNode } from '../services/sentryService';
import Header from '../components/Header';
import Spinner from '../components/Spinner';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// ICONS CONFIG
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({ iconUrl: iconMarker, iconRetinaUrl: iconRetina, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// CUSTOM MARKERS
const greenIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const redIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const purpleIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
// SENTRY ICONS
const shieldBlueIcon = new L.DivIcon({ className: 'custom-div-icon', html: `<div style="font-size: 24px;">🛡️</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
const shieldRedIcon = new L.DivIcon({ className: 'custom-div-icon', html: `<div style="font-size: 24px;" class="animate-pulse">🚨</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });

const MapUpdater = ({ center }: { center: { lat: number, lng: number } | null }) => {
  const map = useMap();
  useEffect(() => { }, [center, map]);
  return null;
};

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180; const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180; const Δλ = (lon2 - lon1) * Math.PI / 180;
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

  // --- VIGÍA COLLAB STATES ---
  const [vigiaMode, setVigiaMode] = useState(false);
  const [vigiaAnchor, setVigiaAnchor] = useState<{ lat: number, lng: number } | null>(null);
  const [vigiaPin, setVigiaPin] = useState<string>("");
  const [showPinModal, setShowPinModal] = useState<'SET' | 'UNLOCK' | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [silentHuntActive, setSilentHuntActive] = useState(false);
  const [activeSentries, setActiveSentries] = useState<SentryNode[]>([]);
  const [mySentryStatus, setMySentryStatus] = useState<'ARMED' | 'ALARM'>('ARMED');
  const alarmAudio = useRef(new Audio('https://actions.google.com/sounds/v1/alarms/spaceship_alarm.ogg'));

  // 1. SUBSCRIPTIONS
  useEffect(() => {
    const unsubMy = subscribeToUserItems(user.uid, (items) => { setMyItems(items); myItemsRef.current = items; });
    const unsubPublic = subscribeToPublicReportedItems((items) => setPublicItems(items));
    const unsubSentries = subscribeToActiveSentries((sentries) => setActiveSentries(sentries.filter(s => s.userId !== user.uid)));
    return () => { unsubMy(); unsubPublic(); unsubSentries(); };
  }, [user.uid]);

  // 2. THIEF TRAP (OLD LOGIC)
  const [alertTriggered, setAlertTriggered] = useState<string | null>(null);
  useEffect(() => {
    const thiefDetected = myItems.find(item => item.status === ItemStatus.Denunciado && item.linkedDeviceId !== currentDeviceId && item.location);
    if (thiefDetected && thiefDetected.qrId !== alertTriggered) {
      new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg').play().catch(console.error);
      alert(`🚨 ¡ARTÍCULO LOCALIZADO! 🚨\n\nTu "${thiefDetected.marca}" ha emitido señal.`);
      setAlertTriggered(thiefDetected.qrId!);
    }
  }, [myItems, alertTriggered, currentDeviceId]);

  // 3. MASTER TELEMETRY (GPS + VIGIA)
  useEffect(() => {
    if (navigator.geolocation) {
      alarmAudio.current.loop = true;
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const now = Date.now();
          if (now - lastUpdateRef.current < 5000) return;
          lastUpdateRef.current = now;
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserPos(newPos);
          if (!initPos) setInitPos(newPos);

          // === VIGIA LOGIC ===
          if ((vigiaMode || silentHuntActive) && vigiaAnchor) {
            const dist = getDistance(vigiaAnchor.lat, vigiaAnchor.lng, newPos.lat, newPos.lng);
            let triggerAlarm = false;
            // A. Self Detection (30m)
            if (dist > 30) {
              triggerAlarm = true;
              if (mySentryStatus !== 'ALARM') {
                setMySentryStatus('ALARM');
                updateMySentryStatus(user.uid, newPos.lat, newPos.lng, 'ALARM');
              }
            } else {
              if (mySentryStatus === 'ALARM') setMySentryStatus('ARMED');
              updateMySentryStatus(user.uid, newPos.lat, newPos.lng, mySentryStatus);
            }
            // B. Ally Panic
            const allyInPanic = activeSentries.find(s => getDistance(newPos.lat, newPos.lng, s.lat, s.lng) < 30 && s.status === 'ALARM');
            if (allyInPanic) triggerAlarm = true;

            // C. Execute
            if (triggerAlarm && !silentHuntActive) {
              alarmAudio.current.play().catch(e => console.log(e));
              if (navigator.vibrate) navigator.vibrate([1000, 500, 1000]);
            } else {
              if (!triggerAlarm && !silentHuntActive) alarmAudio.current.pause();
            }
          }
          // ===================
          myItemsRef.current.filter(item => {
            const isPaid = item.paymentStatus === PaymentStatus.Paid || item.paymentStatus === PaymentStatus.Free;
            const isSelf = item.trackingType === 'SELF_DEVICE';
            const isMyDevice = item.linkedDeviceId === currentDeviceId;
            if (!isPaid || !isSelf || !isMyDevice) return false;
            if (item.status === ItemStatus.Denunciado) {
              if (!['Celular', 'Notebook', 'Tablet', 'Computadora', 'Otros'].includes(item.tipo)) return false;
            }
            return true;
          }).forEach(item => { if (item.qrId) updateItemLocationRealTime(item.qrId, newPos.lat, newPos.lng); });
        },
        (err) => console.warn(err), { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
      );
      return () => { navigator.geolocation.clearWatch(id); alarmAudio.current.pause(); removeMySentryStatus(user.uid); };
    }
  }, [currentDeviceId, vigiaMode, vigiaAnchor, activeSentries, mySentryStatus, silentHuntActive, user.uid]);

  // 4. PIN HANDLERS
  const handleVigiaClick = () => {
    if (vigiaMode || silentHuntActive) { setPinInput(""); setShowPinModal('UNLOCK'); }
    else { if (!userPos) return alert("Esperando señal GPS..."); setPinInput(""); setShowPinModal('SET'); }
  };
  const confirmPinSet = () => {
    if (pinInput.length < 4) return alert("PIN de 4 dígitos");
    setVigiaPin(pinInput); setVigiaAnchor(userPos); setVigiaMode(true); setSilentHuntActive(false);
    setFailedAttempts(0); setMySentryStatus('ARMED'); updateMySentryStatus(user.uid, userPos!.lat, userPos!.lng, 'ARMED');
    setShowPinModal(null); alert(`🛡️ VIGÍA ACTIVADO\nPIN: ${pinInput}\nRadio: 30m`);
  };
  const confirmUnlock = () => {
    if (pinInput === vigiaPin) {
      setVigiaMode(false); setSilentHuntActive(false); setVigiaAnchor(null); setFailedAttempts(0);
      alarmAudio.current.pause(); removeMySentryStatus(user.uid); setShowPinModal(null);
      alert("✅ VIGÍA DESACTIVADO");
    } else {
      const newFail = failedAttempts + 1; setFailedAttempts(newFail); setPinInput("");
      if (newFail >= 3) {
        setVigiaMode(false); setSilentHuntActive(true); alarmAudio.current.pause(); setShowPinModal(null); alert("Sistema Desactivado.");
      } else { alert(`⛔ PIN INCORRECTO (${newFail}/3)`); }
    }
  };

  // 5. VISUALS (RESTORED POPUPS)
  const displayedItems = useMemo(() => {
    const allItemsMap = new Map<string, Item>();
    const isPaid = (item: Item) => item.paymentStatus === PaymentStatus.Paid || item.paymentStatus === PaymentStatus.Free;
    if (filterMode === 'all') { myItems.filter(isPaid).forEach(i => allItemsMap.set(i.qrId!, i)); publicItems.forEach(i => allItemsMap.set(i.qrId!, i)); }
    else if (filterMode === 'mine') { myItems.filter(isPaid).forEach(i => allItemsMap.set(i.qrId!, i)); }
    else if (filterMode === 'alerts') {
      publicItems.filter(i => i.status === ItemStatus.Denunciado).forEach(i => allItemsMap.set(i.qrId!, i));
      myItems.filter(i => i.status === ItemStatus.Denunciado).forEach(i => allItemsMap.set(i.qrId!, i));
    }
    return Array.from(allItemsMap.values());
  }, [myItems, publicItems, filterMode]);

  const markerElements = useMemo(() => {
    return displayedItems.map(item => {
      const isReported = item.status === ItemStatus.Denunciado;
      let position = item.location;
      if (item.status === ItemStatus.Recuperado && item.recoveryLocation) position = item.recoveryLocation;
      if (!position) return null;
      let icon = isReported ? redIcon : greenIcon;
      if (item.ownerId !== user.uid) icon = purpleIcon;

      return (
        <Marker key={item.qrId} position={position} icon={icon}>
          <Popup>
            {/* --- RESTORED DETAILED POPUP --- */}
            <div className="text-center font-sans min-w-[150px]">
              <h3 className="text-lg font-extrabold text-gray-800 m-0 leading-tight">{item.marca} {item.modelo}</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3 mt-1 border-b pb-1">{item.tipo}</p>
              <div className="flex justify-center mb-2">
                {isReported ? (
                  <span className="bg-red-600 text-white py-1 px-4 rounded-full font-black text-xs animate-pulse shadow-red-500/50 shadow-lg flex items-center gap-1">🚨 ROBADO</span>
                ) : (
                  <span className="bg-green-600 text-white py-1 px-4 rounded-full font-black text-xs shadow-green-500/50 shadow-md flex items-center gap-1">✔ A SALVO</span>
                )}
              </div>
              <p className="mt-1 text-[9px] text-gray-400 font-mono">ID: {item.shortId || item.qrId?.slice(0, 6)}...</p>
            </div>
          </Popup>
        </Marker>
      );
    });
  }, [displayedItems, user.uid]);

  if (!initPos && !userPos) return <div className="h-full flex items-center justify-center bg-[#0d1226] text-white"><Spinner /></div>;
  const center = userPos || initPos || { lat: -34.6037, lng: -58.3816 };

  return (
    <div className="flex flex-col h-full bg-[#0d1226] relative">
      <Header title="MAPA GLOBAL" onMenuClick={onMenuClick} />

      {showPinModal && (
        <div className="absolute inset-0 z-[2000] bg-black/90 flex flex-col items-center justify-center p-6 animate-fade-in">
          <h3 className="text-2xl font-bold text-white mb-4">{showPinModal === 'SET' ? '🛡️ DEFINIR PIN' : '🔓 DESACTIVAR'}</h3>
          <p className="text-gray-400 text-sm mb-6 text-center">{showPinModal === 'SET' ? 'Crea un PIN de 4 dígitos para esta sesión.' : 'Ingresa tu PIN para detener la alarma.'}</p>
          <input type="number" value={pinInput} onChange={(e) => setPinInput(e.target.value)} className="bg-gray-800 text-white text-center text-4xl tracking-[10px] w-full max-w-[200px] py-4 rounded-xl border-2 border-blue-500 focus:border-yellow-400 outline-none mb-6" maxLength={4} autoFocus />
          <div className="flex gap-4 w-full max-w-xs">
            <button onClick={() => setShowPinModal(null)} className="flex-1 bg-gray-700 text-white py-3 rounded-lg font-bold">CANCELAR</button>
            <button onClick={showPinModal === 'SET' ? confirmPinSet : confirmUnlock} className="flex-1 bg-yellow-500 text-black py-3 rounded-lg font-bold">{showPinModal === 'SET' ? 'ACTIVAR' : 'DESBLOQUEAR'}</button>
          </div>
        </div>
      )}

      <div className="absolute top-20 left-0 right-0 z-[1000] flex justify-center gap-2 px-4 overflow-x-auto pb-2 pointer-events-none">
        <div className="pointer-events-auto flex gap-2">
          <button onClick={() => setFilterMode('all')} className={`px-4 py-2 rounded-full font-bold text-sm shadow-md ${filterMode === 'all' ? 'bg-white text-blue-900' : 'bg-white/90 text-gray-600'}`}>🌎 Todos</button>
          <button onClick={() => setFilterMode('alerts')} className={`px-4 py-2 rounded-full font-bold text-sm shadow-md ${filterMode === 'alerts' ? 'bg-gray-800 text-white ring-red-500' : 'bg-white/90 text-gray-600'}`}>🔴 Alertas</button>
          <button onClick={() => setFilterMode('mine')} className={`px-4 py-2 rounded-full font-bold text-sm shadow-md ${filterMode === 'mine' ? 'bg-gray-800 text-green-400' : 'bg-white/90 text-gray-600'}`}>👤 Mis Cosas</button>
        </div>
      </div>

      <div className="flex-grow w-full relative z-0">
        <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapUpdater center={userPos} />
          {userPos && <Marker position={userPos} icon={new L.DivIcon({ className: 'css-icon-user-loc', html: `<div style="width: 20px; height: 20px; background-color: #4285F4; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`, iconSize: [20, 20], iconAnchor: [10, 10] })} />}
          {vigiaMode && vigiaAnchor && <Circle center={vigiaAnchor} radius={30} pathOptions={{ color: mySentryStatus === 'ALARM' ? 'red' : '#0066ff', fillColor: mySentryStatus === 'ALARM' ? 'red' : '#0066ff', fillOpacity: 0.15 }} />}
          {activeSentries.map(sentry => (<Marker key={sentry.userId} position={{ lat: sentry.lat, lng: sentry.lng }} icon={sentry.status === 'ALARM' ? shieldRedIcon : shieldBlueIcon}> {sentry.status === 'ALARM' && <Popup autoClose={false} closeButton={false}> <div className="text-center font-bold text-red-600">¡AYUDA!</div> </Popup>} </Marker>))}
          <MarkerClusterGroup chunkedLoading key={filterMode}>{markerElements}</MarkerClusterGroup>
        </MapContainer>

        <div className="absolute bottom-24 right-4 z-[1000] flex flex-col gap-4">
          <button onClick={handleVigiaClick} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl border-4 transition-all ${vigiaMode ? (mySentryStatus === 'ALARM' ? 'bg-red-600 border-red-400 animate-pulse' : 'bg-blue-600 border-blue-400') : (silentHuntActive ? 'bg-blue-900 border-blue-500' : 'bg-blue-900 border-blue-500')}`}> <span className="text-2xl">{vigiaMode ? (mySentryStatus === 'ALARM' ? '🚨' : '🛡️') : '🛡️'}</span> </button>
          <button onClick={onScanRequest} className="w-14 h-14 bg-[#2d3748] rounded-full flex items-center justify-center shadow-2xl border-2 border-gray-600"><svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg></button>
          <button onClick={onInputCodeRequest} className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-[#2d3748]"> <svg className="w-8 h-8 text-[#1a202c]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg> </button>
        </div>
      </div>
    </div>
  );
};
export default MapScreen;
