import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { User } from 'firebase/auth';
import { Item, ItemStatus, PaymentStatus } from '../types';
import { subscribeToUserItems, subscribeToPublicReportedItems, updateItemLocationRealTime } from '../services/itemService';
import Header from '../components/Header';
import Spinner from '../components/Spinner';

// NUEVO: CLUSTERING
import MarkerClusterGroup from 'react-leaflet-markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Fix for default Leaflet marker icons in React
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: iconMarker,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const purpleIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map centering and updates
const MapUpdater = ({ center }: { center: { lat: number, lng: number } | null }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      // Smooth fly to user location on initial load or if requested
      // We can disable this if we want free movement, but for "Uber-like" tracking usually we keep user in view or just let them pan.
      // For now, let's just pan once if needed? checking distance?
      // simpler: map.setView(center);
    }
  }, [center, map]);
  return null;
};

interface MapScreenProps {
  user: User;
  onMenuClick: () => void;
  onScanRequest: () => void;
  onInputCodeRequest: () => void;
}

const MapScreen: React.FC<MapScreenProps> = ({ user, onMenuClick, onScanRequest, onInputCodeRequest }) => {
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [initPos, setInitPos] = useState<{ lat: number; lng: number } | null>(null);

  // Real-time Items State
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [publicItems, setPublicItems] = useState<Item[]>([]);
  const [displayedItems, setDisplayedItems] = useState<Item[]>([]);

  // 1. OBTENER ID DEL DISPOSITIVO ACTUAL (Arquitectura IoT)
  const currentDeviceId = localStorage.getItem('qr_device_id');

  const [filterMode, setFilterMode] = useState<'all' | 'alerts' | 'mine'>('all');

  // --- 1. SUBSCRIPCIONES REAL-TIME ---
  useEffect(() => {
    const unsubMy = subscribeToUserItems(user.uid, (items) => setMyItems(items));
    const unsubPublic = subscribeToPublicReportedItems((items) => setPublicItems(items));
    return () => { unsubMy(); unsubPublic(); };
  }, [user.uid]);

  // --- 2. FILTRADO Y ACTUALIZACIÓN EN VIVO (CANDADO DE PAGO) ---
  useEffect(() => {
    const allItemsMap = new Map<string, Item>();

    const isPaid = (item: Item) => item.paymentStatus === PaymentStatus.Paid || item.paymentStatus === PaymentStatus.Free;

    if (filterMode === 'all') {
      // Mis items solo si están pagos
      myItems.filter(isPaid).forEach(i => allItemsMap.set(i.qrId!, i));
      // Alertas públicas siempre visibles
      publicItems.forEach(i => allItemsMap.set(i.qrId!, i));
    } else if (filterMode === 'mine') {
      myItems.filter(isPaid).forEach(i => allItemsMap.set(i.qrId!, i));
    } else if (filterMode === 'alerts') {
      publicItems.forEach(i => allItemsMap.set(i.qrId!, i));
      // Mis items denunciados siempre visibles (emergencia)
      myItems.filter(i => i.status === ItemStatus.Denunciado).forEach(i => allItemsMap.set(i.qrId!, i));
    }

    setDisplayedItems(Array.from(allItemsMap.values()));
  }, [myItems, publicItems, filterMode]);


  // --- 3. TELEMETRÍA EN VIVO (ACTUALIZA FIRESTORE EN SILENCIO) ---
  useEffect(() => {
    if (navigator.geolocation) {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserPos(newPos);
          if (!initPos) setInitPos(newPos);

          // ACTUALIZACIÓN SILENCIOSA INTELIGENTE (Arquitectura de 3 Niveles)
          myItems
            .filter(item => {
              // A. Debe estar pagado (o ser gratuito)
              const isPaid = item.paymentStatus === PaymentStatus.Paid || item.paymentStatus === PaymentStatus.Free;

              // B. Debe ser "SELF_DEVICE" (Rastreo activo por software)
              const isSelf = item.trackingType === 'SELF_DEVICE';

              // C. CRÍTICO: Debe ser ESTE dispositivo físico, no otro.
              const isMyDevice = item.linkedDeviceId === currentDeviceId;

              return isPaid && isSelf && isMyDevice;
            })
            .forEach(item => {
              if (item.qrId) {
                // Solo se mueven mis items activos vinculados a este celular
                updateItemLocationRealTime(item.qrId, newPos.lat, newPos.lng);
              }
            });
        },
        (err) => console.warn(err),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
      return () => navigator.geolocation.clearWatch(id);
    }
  }, [myItems, initPos, currentDeviceId]); // eslint-disable-line react-hooks/exhaustive-deps


  if (!initPos && !userPos) return <div className="h-full flex items-center justify-center bg-[#0d1226] text-white"><Spinner /></div>;

  const center = userPos || initPos || { lat: -34.6037, lng: -58.3816 };

  return (
    <div className="flex flex-col h-full bg-[#0d1226] relative">
      <Header title="MAPA GLOBAL" onMenuClick={onMenuClick} />

      {/* FILTROS SUPERIORES (Estilo Imagen) */}
      <div className="absolute top-20 left-0 right-0 z-[1000] flex justify-center gap-2 px-4 overflow-x-auto pb-2 pointer-events-none">
        <div className="pointer-events-auto flex gap-2"> {/* Wrapper for pointer events */}
          <button
            onClick={() => setFilterMode('all')}
            className={`px-4 py-2 rounded-full font-bold text-sm shadow-md flex items-center gap-2 transition-all ${filterMode === 'all' ? 'bg-white text-blue-900 ring-2 ring-blue-300' : 'bg-white/90 text-gray-600'
              }`}
          >
            🌎 Todos
          </button>
          <button
            onClick={() => setFilterMode('alerts')}
            className={`px-4 py-2 rounded-full font-bold text-sm shadow-md flex items-center gap-2 transition-all ${filterMode === 'alerts' ? 'bg-[#2d3748] text-white ring-2 ring-red-500' : 'bg-white/90 text-gray-600'
              }`}
          >
            🔴 Alertas
          </button>
          <button
            onClick={() => setFilterMode('mine')}
            className={`px-4 py-2 rounded-full font-bold text-sm shadow-md flex items-center gap-2 transition-all ${filterMode === 'mine' ? 'bg-[#2d3748] text-green-400 ring-2 ring-green-500' : 'bg-white/90 text-gray-600'
              }`}
          >
            👤 Mis Cosas
          </button>
        </div>
      </div>

      <div className="flex-grow w-full relative z-0">
        <MapContainer
          center={center}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false} // Custom or none, map usually has defaults. standard is fine.
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapUpdater center={userPos} />

          {/* MI POSICIÓN */}
          {userPos && (
            <Marker position={userPos} icon={new L.DivIcon({
              className: 'css-icon-user-loc',
              html: `<div style="
                        width: 20px;
                        height: 20px;
                        background-color: #4285F4;
                        border: 3px solid white;
                        border-radius: 50%;
                        box-shadow: 0 0 10px rgba(0,0,0,0.5);
                    "></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })} />
          )}

          {/* SOLUCIÓN AL BUG DE DUPLICACIÓN:
             Agregamos la prop "key" que cambia cuando cambia el filtro.
             Esto obliga a React a destruir y reconstruir el cluster group,
             limpiando cualquier marcador fantasma.
          */}
          <MarkerClusterGroup chunkedLoading key={filterMode + displayedItems.length}>
            {displayedItems.map(item => {
              const isReported = item.status === ItemStatus.Denunciado;

              let position: { lat: number, lng: number } | null = null;
              if (isReported && item.location) position = item.location;
              else if (!isReported && item.location) position = item.location;
              else if (item.status === ItemStatus.Recuperado && item.recoveryLocation) position = item.recoveryLocation;

              if (!position) return null;

              // Definición de icono según dueño y estado
              let icon = greenIcon;
              if (isReported) icon = redIcon;
              if (item.ownerId !== user.uid) icon = purpleIcon;

              return (
                <Marker
                  key={item.qrId}
                  position={position}
                  icon={icon}
                >
                  <Popup>
                    <div className="text-center font-sans">
                      <h3 className="text-lg font-bold text-gray-800 m-0">{item.marca} {item.modelo}</h3>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">{item.tipo}</p>

                      {isReported ? (
                        <span className="bg-red-600 text-white py-1 px-3 rounded-full font-bold text-xs animate-pulse">
                          🚨 ROBADO
                        </span>
                      ) : (
                        <span className="bg-green-600 text-white py-1 px-3 rounded-full font-bold text-xs">
                          ✔ A SALVO
                        </span>
                      )}
                      <p className="mt-2 text-[10px] text-gray-400">ID: {item.shortId}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        </MapContainer>

        {/* BOTONES FLOTANTES (Estilo Imagen) */}
        <div className="absolute bottom-8 right-4 z-[1000] flex flex-col gap-4">
          {/* QR Scanner */}
          <button
            onClick={onScanRequest}
            className="w-14 h-14 bg-[#2d3748] rounded-full flex items-center justify-center shadow-2xl border-2 border-gray-600 hover:scale-105 transition-transform"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </button>

          {/* Camera / Action (Yellow) */}
          <button
            onClick={onInputCodeRequest}
            className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-[#2d3748] hover:bg-yellow-400 hover:scale-110 transition-all"
          >
            <svg className="w-8 h-8 text-[#1a202c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapScreen;
