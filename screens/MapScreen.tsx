import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { User } from 'firebase/auth';
import { Item, ItemStatus, PaymentStatus } from '../types';
import { subscribeToUserItems, subscribeToPublicReportedItems, updateItemLocationRealTime } from '../services/itemService';
import Header from '../components/Header';
import Spinner from '../components/Spinner';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Fix Icons
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: iconMarker, iconRetinaUrl: iconRetina, shadowUrl: iconShadow,
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons
const greenIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const redIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const purpleIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });

const MapUpdater = ({ center }: { center: { lat: number, lng: number } | null }) => {
  const map = useMap();
  useEffect(() => { /* Opcional: Centrar */ }, [center, map]);
  return null;
};

// --- FUNCIÓN HELPER: Distancia en Metros ---
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radio tierra
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const b = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * b;
}

interface MapScreenProps {
  user: User;
  onMenuClick: () => void;
  onScanRequest: () => void;
  onInputCodeRequest: () => void;
}

const MapScreen: React.FC<MapScreenProps> = ({ user, onMenuClick, onScanRequest, onInputCodeRequest }) => {
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [initPos, setInitPos] = useState<{ lat: number; lng: number } | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [publicItems, setPublicItems] = useState<Item[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'alerts' | 'mine'>('all');
  const myItemsRef = useRef<Item[]>([]);
  const [alertTriggered, setAlertTriggered] = useState<string | null>(null);
  const currentDeviceId = localStorage.getItem('qr_device_id');

  // --- NUEVOS ESTADOS VIGÍA ---
  const [vigiaMode, setVigiaMode] = useState(false);
  const [vigiaAnchor, setVigiaAnchor] = useState<{ lat: number, lng: number } | null>(null);

  // 1. Subscripciones
  useEffect(() => {
    const unsubMy = subscribeToUserItems(user.uid, (items) => {
      setMyItems(items);
      myItemsRef.current = items;
    });
    const unsubPublic = subscribeToPublicReportedItems((items) => setPublicItems(items));
    return () => { unsubMy(); unsubPublic(); };
  }, [user.uid]);

  // 2. EFECTO "TRAMPA SILENCIOSA" (Robo)
  useEffect(() => {
    const thiefDetected = myItems.find(item =>
      item.status === ItemStatus.Denunciado &&
      item.linkedDeviceId !== currentDeviceId &&
      item.location
    );
    if (thiefDetected && thiefDetected.qrId !== alertTriggered) {
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
      audio.play().catch(e => console.log(e));
      alert(`🚨 ¡ARTÍCULO LOCALIZADO! 🚨\n\nTu "${thiefDetected.marca}" ha emitido señal.`);
      setAlertTriggered(thiefDetected.qrId!);
    }
  }, [myItems, alertTriggered, currentDeviceId]);

  // 3. TELEMETRÍA + VIGÍA
  useEffect(() => {
    if (navigator.geolocation) {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const now = Date.now();
          // Throttling 5s
          if (now - lastUpdateRef.current < 5000) return;
          lastUpdateRef.current = now;

          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserPos(newPos);
          if (!initPos) setInitPos(newPos);

          // --- LOGICA VIGÍA (CENTINELA) ---
          if (vigiaMode && vigiaAnchor) {
            const dist = getDistance(vigiaAnchor.lat, vigiaAnchor.lng, newPos.lat, newPos.lng);
            // Si se aleja más de 20 metros...
            if (dist > 20) {
              const audio = new Audio('https://actions.google.com/sounds/v1/alarms/spaceship_alarm.ogg');
              audio.loop = true;
              audio.play().catch(e => console.log(e));
              if (navigator.vibrate) navigator.vibrate([1000, 500, 1000]);

              const stop = window.confirm(`🚨 ¡MOVIMIENTO DETECTADO! 🚨\n\nEl dispositivo se alejó ${Math.round(dist)} metros del punto seguro.\n\n¿Apagar alarma?`);
              if (stop) {
                setVigiaMode(false);
                setVigiaAnchor(null);
                audio.pause();
              }
            }
          }
          // --------------------------------

          // Update BD
          myItemsRef.current
            .filter(item => {
              const isPaid = item.paymentStatus === PaymentStatus.Paid || item.paymentStatus === PaymentStatus.Free;
              const isSelf = item.trackingType === 'SELF_DEVICE';
              const isMyDevice = item.linkedDeviceId === currentDeviceId;
              if (!isPaid || !isSelf || !isMyDevice) return false;

              // Smart Tracking (Anti-Fantasma)
              if (item.status === ItemStatus.Denunciado) {
                const activeDevices = ['Celular', 'Notebook', 'Tablet', 'Computadora', 'Otros'];
                if (!activeDevices.includes(item.tipo)) return false;
              }
              return true;
            })
            .forEach(item => {
              if (item.qrId) updateItemLocationRealTime(item.qrId, newPos.lat, newPos.lng);
            });
        },
        (err) => console.warn(err),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
      );
      return () => navigator.geolocation.clearWatch(id);
    }
  }, [currentDeviceId, vigiaMode, vigiaAnchor]); // Agregamos dependencias vigia

  // 4. Memoización Visual
  const displayedItems = useMemo(() => {
    const allItemsMap = new Map<string, Item>();
    const isPaid = (item: Item) => item.paymentStatus === PaymentStatus.Paid || item.paymentStatus === PaymentStatus.Free;
    if (filterMode === 'all') {
      myItems.filter(isPaid).forEach(i => allItemsMap.set(i.qrId!, i));
      publicItems.forEach(i => allItemsMap.set(i.qrId!, i));
    } else if (filterMode === 'mine') {
      myItems.filter(isPaid).forEach(i => allItemsMap.set(i.qrId!, i));
    } else if (filterMode === 'alerts') {
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
            <div className="text-center font-sans">
              <h3 className="text-lg font-bold text-gray-800 m-0">{item.marca} {item.modelo}</h3>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">{item.tipo}</p>
              {isReported ? <span className="bg-red-600 text-white py-1 px-3 rounded-full font-bold text-xs animate-pulse">🚨 ROBADO</span> : <span className="bg-green-600 text-white py-1 px-3 rounded-full font-bold text-xs">✔ A SALVO</span>}
              <p className="mt-2 text-[10px] text-gray-400">ID: {item.shortId}</p>
            </div>
          </Popup>
        </Marker>
      );
    });
  }, [displayedItems, user.uid]);

  // --- HANDLER BOTÓN VIGÍA ---
  const toggleVigia = () => {
    if (vigiaMode) {
      setVigiaMode(false);
      setVigiaAnchor(null);
      alert("🛡️ MODO VIGÍA DESACTIVADO");
    } else {
      if (!userPos) return alert("⚠️ Esperando señal GPS precisa...");
      setVigiaAnchor(userPos);
      setVigiaMode(true);
      alert("🛡️ MODO VIGÍA ACTIVADO\n\nSe ha establecido un perímetro de 20 metros.\nSi mueves este dispositivo fuera de la zona, sonará la alarma.");
    }
  };

  if (!initPos && !userPos) return <div className="h-full flex items-center justify-center bg-[#0d1226] text-white"><Spinner /></div>;
  const center = userPos || initPos || { lat: -34.6037, lng: -58.3816 };

  return (
    <div className="flex flex-col h-full bg-[#0d1226] relative">
      <Header title="MAPA GLOBAL" onMenuClick={onMenuClick} />

      {/* FILTROS */}
      <div className="absolute top-20 left-0 right-0 z-[1000] flex justify-center gap-2 px-4 overflow-x-auto pb-2 pointer-events-none">
        <div className="pointer-events-auto flex gap-2">
          <button onClick={() => setFilterMode('all')} className={`px-4 py-2 rounded-full font-bold text-sm shadow-md transition-all ${filterMode === 'all' ? 'bg-white text-blue-900 ring-2' : 'bg-white/90 text-gray-600'}`}>🌎 Todos</button>
          <button onClick={() => setFilterMode('alerts')} className={`px-4 py-2 rounded-full font-bold text-sm shadow-md transition-all ${filterMode === 'alerts' ? 'bg-[#2d3748] text-white ring-red-500' : 'bg-white/90 text-gray-600'}`}>🔴 Alertas</button>
          <button onClick={() => setFilterMode('mine')} className={`px-4 py-2 rounded-full font-bold text-sm shadow-md transition-all ${filterMode === 'mine' ? 'bg-[#2d3748] text-green-400 ring-green-500' : 'bg-white/90 text-gray-600'}`}>👤 Mis Cosas</button>
        </div>
      </div>

      <div className="flex-grow w-full relative z-0">
        <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapUpdater center={userPos} />

          {userPos && (
            <Marker position={userPos} icon={new L.DivIcon({
              className: 'css-icon-user-loc',
              html: `<div style="width: 20px; height: 20px; background-color: #4285F4; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
              iconSize: [20, 20], iconAnchor: [10, 10]
            })} />
          )}

          {/* CÍRCULO VIGÍA */}
          {vigiaMode && vigiaAnchor && (
            <Circle
              center={vigiaAnchor}
              radius={20}
              pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.2 }}
            />
          )}

          <MarkerClusterGroup chunkedLoading key={filterMode}>{markerElements}</MarkerClusterGroup>
        </MapContainer>

        {/* BOTONES FLOTANTES */}
        <div className="absolute bottom-8 right-4 z-[1000] flex flex-col gap-4">
          <button
            onClick={toggleVigia}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl border-4 transition-all ${vigiaMode ? 'bg-red-600 border-red-400 animate-pulse' : 'bg-blue-900 border-blue-500'
              }`}
          >
            <span className="text-2xl">{vigiaMode ? '🚨' : '🛡️'}</span>
          </button>

          <button onClick={onScanRequest} className="w-14 h-14 bg-[#2d3748] rounded-full flex items-center justify-center shadow-2xl border-2 border-gray-600 hover:scale-105 transition-transform">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
          </button>

          <button onClick={onInputCodeRequest} className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-[#2d3748] hover:bg-yellow-400 hover:scale-110 transition-all">
            <svg className="w-8 h-8 text-[#1a202c]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapScreen;
