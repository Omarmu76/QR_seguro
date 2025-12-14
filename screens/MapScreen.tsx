import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Item, ItemStatus, PaymentStatus } from '../types';
import { getAllUserItems, getPublicReportedItems } from '../services/itemService';
import Header from '../components/Header';
import Spinner from '../components/Spinner';

// --- ICONOS SEMÁFORO ---
const iconMySafe = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const iconMyReported = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

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
  const defaultPosition: [number, number] = [-27.3670, -55.8961];

  useEffect(() => {
    const fetchMapData = async () => {
      setIsLoading(true);
      try {
        const userItems = await getAllUserItems(user.uid);
        const reportedItems = await getPublicReportedItems();
        const allItemsMap = new Map<string, Item>();

        // Función para agregar items al mapa aplicando el FILTRO DE NEGOCIO
        const addItemToMap = (item: Item) => {
          // 1. Verificamos que tenga coordenadas (Sin GPS no hay mapa)
          const hasLocation = item.location || item.recoveryLocation;

          // 2. Verificamos que esté PAGADO (Regla: Si no paga, no ve)
          const isPaid = item.paymentStatus === PaymentStatus.Paid || item.paymentStatus === PaymentStatus.Free;

          if (item.qrId && hasLocation && isPaid) {
            allItemsMap.set(item.qrId, item);
          }
        };

        // Cargamos los datos (Los míos pisan a los públicos para asegurar propiedad)
        reportedItems.forEach(addItemToMap);
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

  /* ===========================================================
     LÓGICA DE FILTRADO Y VISUALIZACIÓN (LA MATRIZ)
     Aquí decidimos qué color de pin se muestra.
     =========================================================== */
  const renderMarkers = () => {
    return items.filter(item => {
      const isReported = item.status === ItemStatus.Denunciado;
      const isMine = item.ownerId === user.uid;

      // Filtros de botones superiores
      if (filter === 'all') return true;
      if (filter === 'reported') return isReported; // Solo denuncias
      if (filter === 'mine') return isMine; // Solo mis cosas
      return true;
    }).map(item => {
      const location = item.location || item.recoveryLocation;
      if (!location) return null;

      const isReported = item.status === ItemStatus.Denunciado;
      const isMine = item.ownerId === user.uid;

      // --- SELECCIÓN DE ICONO SEGÚN ESTADO ---
      let markerIcon;

      if (isMine) {
        // ES MÍO:
        if (isReported) {
          markerIcon = iconMyReported; // ROJO: Mío y Robado
        } else {
          markerIcon = iconMySafe;     // VERDE: Mío y Seguro
        }
      } else {
        // ES DE OTRO:
        if (isReported) {
          markerIcon = iconOtherReported; // VIOLETA: Ajeno y Robado
        } else {
          return null; // INVISIBLE: Ajeno y Seguro (Privacidad)
        }
      }

      return (
        <Marker key={item.qrId} position={[location.lat, location.lng]} icon={markerIcon}>
          <Popup>
            <div className="text-center min-w-[120px]">
              <p className="font-bold text-base text-black">{item.marca} {item.modelo}</p>
              <p className="text-xs text-gray-500 uppercase">{item.tipo}</p>

              <div className="mt-2">
                {isReported ? (
                  <span className={`text-white text-[10px] px-2 py-1 rounded font-bold ${isMine ? 'bg-red-600' : 'bg-purple-600'}`}>
                    {isMine ? '🚨 TU DENUNCIA' : '⚠️ ALERTA VECINAL'}
                  </span>
                ) : (
                  <span className="bg-green-600 text-white text-[10px] px-2 py-1 rounded font-bold">
                    ✓ A SALVO
                  </span>
                )}
              </div>
              <p className="text-[9px] text-gray-400 mt-1">ID: {item.shortId}</p>
            </div>
          </Popup>
        </Marker>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1226] relative">
      <Header title="MAPA GLOBAL" onMenuClick={onMenuClick} />

      {/* FILTROS FLOTANTES */}
      <div className="absolute top-20 left-0 w-full z-[400] flex justify-center gap-2 p-2 pointer-events-none">
        <button onClick={() => setFilter('all')} className={`pointer-events-auto px-4 py-2 rounded-full text-xs font-bold shadow-lg transition-all border ${filter === 'all' ? 'bg-white text-black border-white scale-105' : 'bg-black/60 text-white border-gray-600 backdrop-blur-md'}`}>🌎 Todos</button>
        <button onClick={() => setFilter('reported')} className={`pointer-events-auto px-4 py-2 rounded-full text-xs font-bold shadow-lg transition-all border flex items-center gap-2 ${filter === 'reported' ? 'bg-purple-600 text-white border-purple-400 scale-105' : 'bg-black/60 text-purple-300 border-purple-900/50 backdrop-blur-md'}`}><span className="w-2 h-2 rounded-full bg-white animate-pulse shadow-[0_0_5px_white]"></span> Alertas</button>
        <button onClick={() => setFilter('mine')} className={`pointer-events-auto px-4 py-2 rounded-full text-xs font-bold shadow-lg transition-all border ${filter === 'mine' ? 'bg-green-600 text-white border-green-400 scale-105' : 'bg-black/60 text-green-300 border-green-900/50 backdrop-blur-md'}`}>👤 Mis Cosas</button>
      </div>

      <div className="flex-grow relative overflow-hidden z-0">
        {isLoading ? <div className="flex justify-center items-center h-full"><Spinner /></div>
          : error ? <div className="flex justify-center items-center h-full text-red-500 bg-black/50">{error}</div>
            : (
              <MapContainer center={defaultPosition} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                {renderMarkers()}
              </MapContainer>
            )}

        {/* BOTONES FLOTANTES */}
        <div className="absolute bottom-24 right-4 flex flex-col space-y-4 z-[400]">
          <button onClick={onInputCodeRequest} className="bg-gray-800/90 text-white p-4 rounded-full shadow-xl border border-gray-600 active:scale-95 transition-transform backdrop-blur-sm"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg></button>
          <button onClick={onScanRequest} className="bg-yellow-500 text-black p-4 rounded-full shadow-xl border-4 border-black/20 active:scale-95 transition-transform animate-bounce-slow"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
        </div>
      </div>
    </div>
  );
};

export default MapScreen;
