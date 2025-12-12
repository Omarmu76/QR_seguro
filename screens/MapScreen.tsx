import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Item, ItemStatus, PaymentStatus } from '../types';
import { getAllUserItems, getPublicReportedItems } from '../services/itemService';
import Header from '../components/Header';
import Spinner from '../components/Spinner';

// --- ICONOS SEMÁFORO (Confirma que las URLs sean accesibles) ---

// 1. VERDE: Mis Items A Salvo
const iconMySafe = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

// 2. ROJO: Mis Denuncias (Prioridad)
const iconMyReported = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

// 3. VIOLETA: Alerta Comunitaria (Denuncias de Otros)
const iconOtherReported = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

interface MapScreenProps {
  user: User;
  onMenuClick: () => void;
  onScanRequest: () => void;
  onInputCodeRequest: () => void;
}

const MapScreen: React.FC<MapScreenProps> = ({ user, onMenuClick, onScanRequest, onInputCodeRequest }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<'all' | 'reported' | 'mine'>('all');
  const defaultPosition: [number, number] = [-27.3670, -55.8961]; // Posadas por defecto

  useEffect(() => {
    const fetchMapData = async () => {
      setIsLoading(true);
      try {
        // 1. Traer mis items (Privados + Públicos míos)
        const userItems = await getAllUserItems(user.uid);

        // 2. Traer reportes públicos (Míos + Ajenos)
        const reportedItems = await getPublicReportedItems();

        const allItemsMap = new Map<string, Item>();

        const addItemToMap = (item: Item) => {
          // Solo mostramos items con ubicación válida y servicio pagado
          if (item.qrId && (item.location || item.recoveryLocation) && item.paymentStatus !== PaymentStatus.Pending) {
            allItemsMap.set(item.qrId, item);
          }
        };

        // Orden de carga importa: 
        // Primero cargamos los públicos.
        reportedItems.forEach(addItemToMap);
        // Luego cargamos "Mis Items" encima. Esto asegura que si un ítem es mío, 
        // la App lo reconozca como propio (ownerId correcto) para pintarlo Rojo y no Violeta.
        userItems.forEach(addItemToMap);

        setItems(Array.from(allItemsMap.values()));

      } catch (err) {
        setError("Error cargando mapa.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchMapData();
  }, [user.uid]);

  const renderMarkers = () => {
    return items
      .filter(item => {
        const isReported = item.status === ItemStatus.Denunciado;
        const isMine = item.ownerId === user.uid;

        if (filter === 'all') return true; // Muestra todo lo disponible

        if (filter === 'reported') {
          // Muestra denuncias (Mías Rojas + Ajenas Violetas)
          return isReported;
        }

        if (filter === 'mine') {
          // Muestra SOLO lo mío (Verdes + Rojos)
          return isMine;
        }

        return true;
      })
      .map(item => {
        // Usamos location o recoveryLocation según disponibilidad
        const location = item.location || item.recoveryLocation;

        // Doble chequeo de seguridad: Si no hay coords, no se dibuja
        if (!location || !location.lat || !location.lng) return null;

        const isReported = item.status === ItemStatus.Denunciado;
        const isMine = item.ownerId === user.uid;

        // --- LÓGICA DE COLORES ---
        let markerIcon = iconMySafe; // Default: Verde (Mío Seguro)

        if (isMine) {
          if (isReported) markerIcon = iconMyReported; // Mío + Robado = ROJO
          else markerIcon = iconMySafe; // Mío + Seguro = VERDE
        } else {
          // Si no es mío, solo debería llegar aquí si es reportado (por el filtro de API)
          if (isReported) markerIcon = iconOtherReported; // Ajeno + Robado = VIOLETA
        }

        return (
          <Marker
            key={item.qrId}
            position={[location.lat, location.lng]}
            icon={markerIcon}
          >
            <Popup>
              <div className="text-sm min-w-[150px]">
                <p className="font-bold text-gray-900 text-base">{item.marca} {item.modelo}</p>
                <p className="text-gray-600 text-xs uppercase mb-2">{item.tipo}</p>

                {isReported ? (
                  <div className={`p-2 rounded text-center font-bold text-white ${isMine ? 'bg-red-600' : 'bg-purple-600'}`}>
                    {isMine ? '🚨 TU DENUNCIA' : '⚠️ ALERTA VECINAL'}
                  </div>
                ) : (
                  <div className="p-2 rounded text-center font-bold text-white bg-green-600">
                    ✓ A SALVO
                  </div>
                )}

                <p className="text-[10px] text-gray-400 mt-2 text-center">
                  ID: {item.shortId || '---'}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      });
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1226] relative">
      <Header title="MAPA GLOBAL" onMenuClick={onMenuClick} />

      {/* --- BARRA DE FILTROS FLOTANTE --- */}
      <div className="absolute top-20 left-0 w-full z-[400] flex justify-center gap-2 p-2 pointer-events-none">
        {/* pointer-events-auto en los botones para que sean clickeables */}
        <button
          onClick={() => setFilter('all')}
          className={`pointer-events-auto px-4 py-2 rounded-full text-xs font-bold shadow-lg transition-all border ${filter === 'all' ? 'bg-white text-black border-white scale-105' : 'bg-black/60 text-white border-gray-600 backdrop-blur-md'}`}
        >
          🌎 Todos
        </button>
        <button
          onClick={() => setFilter('reported')}
          className={`pointer-events-auto px-4 py-2 rounded-full text-xs font-bold shadow-lg transition-all border flex items-center gap-2 ${filter === 'reported' ? 'bg-purple-600 text-white border-purple-400 scale-105' : 'bg-black/60 text-purple-300 border-purple-900/50 backdrop-blur-md'}`}
        >
          <span className="w-2 h-2 rounded-full bg-white animate-pulse shadow-[0_0_5px_white]"></span> Alertas
        </button>
        <button
          onClick={() => setFilter('mine')}
          className={`pointer-events-auto px-4 py-2 rounded-full text-xs font-bold shadow-lg transition-all border ${filter === 'mine' ? 'bg-green-600 text-white border-green-400 scale-105' : 'bg-black/60 text-green-300 border-green-900/50 backdrop-blur-md'}`}
        >
          👤 Mis Cosas
        </button>
      </div>

      <div className="flex-grow relative overflow-hidden z-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-full"><Spinner /></div>
        ) : error ? (
          <div className="flex justify-center items-center h-full text-red-500 bg-black/50">{error}</div>
        ) : (
          <MapContainer center={defaultPosition} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            {renderMarkers()}
          </MapContainer>
        )}

        {/* BOTONES FLOTANTES INFERIORES */}
        <div className="absolute bottom-24 right-4 flex flex-col space-y-4 z-[400]">
          <button
            onClick={onInputCodeRequest}
            className="bg-gray-800/90 text-white p-4 rounded-full shadow-xl border border-gray-600 active:scale-95 transition-transform backdrop-blur-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </button>

          <button
            onClick={onScanRequest}
            className="bg-yellow-500 text-black p-4 rounded-full shadow-xl border-4 border-black/20 active:scale-95 transition-transform animate-bounce-slow"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapScreen;
