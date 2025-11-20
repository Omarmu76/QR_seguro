import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Item, ItemStatus, PaymentStatus } from '../types';
import { getAllUserItems, getPublicReportedItems } from '../services/itemService';
import Header from '../components/Header';
import Spinner from '../components/Spinner';

// ... (Mantén los iconos iconReported y iconMyItem igual que antes) ...
const iconReported = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const iconMyItem = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapScreenProps {
  user: User;
  onMenuClick: () => void;
  onScanRequest: () => void;
  onInputCodeRequest: () => void; // <<< NUEVA PROP
}

const MapScreen: React.FC<MapScreenProps> = ({ user, onMenuClick, onScanRequest, onInputCodeRequest }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const defaultPosition: [number, number] = [-27.3670, -55.8961];

  useEffect(() => {
    const fetchMapData = async () => {
      setIsLoading(true);
      try {
        const userItems = await getAllUserItems(user.uid);
        const reportedItems = await getPublicReportedItems();
        const allItemsMap = new Map<string, Item>();

        const addItemToMap = (item: Item) => {
          if (item.qrId && (item.location || item.recoveryLocation) && item.paymentStatus !== PaymentStatus.Pending) {
            allItemsMap.set(item.qrId, item);
          }
        };
        userItems.forEach(addItemToMap);
        reportedItems.forEach(addItemToMap);
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
    // ... (Mantén la lógica de renderMarkers igual) ...
    return items.map(item => {
      const location = item.recoveryLocation || item.location;
      if (!location || !item.qrId) return null;
      const isReported = item.status === ItemStatus.Denunciado;
      let markerIcon = iconMyItem;
      if (isReported) markerIcon = iconReported;

      return (
        <Marker
          key={item.qrId}
          position={[location.lat, location.lng]}
          icon={markerIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-bold">{item.marca} {item.modelo}</p>
              <p>{item.tipo}</p>
              <p className={`font-bold ${isReported ? 'text-red-600' : 'text-blue-600'}`}>
                {item.status?.replace('_', ' ')}
              </p>
            </div>
          </Popup>
        </Marker>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1226]">
      <Header title="MAPA DE ITEMS" onMenuClick={onMenuClick} />

      <div className="flex-grow relative overflow-hidden z-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-full"><Spinner /></div>
        ) : error ? (
          <div className="flex justify-center items-center h-full text-red-500">{error}</div>
        ) : (
          <MapContainer center={defaultPosition} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            {renderMarkers()}
          </MapContainer>
        )}

        {/* --- BOTONES FLOTANTES CORREGIDOS --- */}
        {/* Usamos bottom-24 (aprox 96px) para que quede ARRIBA del BottomNavBar (que suele medir 80px) */}
        <div className="absolute bottom-24 right-4 flex flex-col space-y-4 z-[400]">

          {/* Botón 1: Ingreso Manual */}
          <button
            onClick={onInputCodeRequest}
            className="bg-gray-700 text-white p-4 rounded-full shadow-lg hover:bg-gray-600 transition-colors border border-gray-500"
            aria-label="Ingresar Código Manualmente"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </button>

          {/* Botón 2: Escáner (Amarillo) */}
          <button
            onClick={onScanRequest}
            className="bg-yellow-500 text-black p-4 rounded-full shadow-lg hover:bg-yellow-400 transition-colors border-2 border-black"
            aria-label="Escanear QR"
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
