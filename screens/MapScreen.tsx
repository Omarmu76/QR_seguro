
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
// FIX: The 'pending' status is now managed by `paymentStatus` from the `PaymentStatus` enum.
import { Item, ItemStatus, PaymentStatus } from '../types';
import { getAllUserItems, getPublicReportedItems } from '../services/itemService';
import Header from '../components/Header';
import Spinner from '../components/Spinner';

// Configuración de iconos de Leaflet (SIN CAMBIOS)
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
// ---

interface MapScreenProps {
  user: User;
  onMenuClick: () => void;
}

const MapScreen: React.FC<MapScreenProps> = ({ user, onMenuClick }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const defaultPosition: [number, number] = [-27.3670, -55.8961]; // Posadas, Misiones

  useEffect(() => {
    const fetchMapData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const userItems = await getAllUserItems(user.uid);
        const reportedItems = await getPublicReportedItems();
        
        const allItemsMap = new Map<string, Item>();
        
        // Función para agregar items al mapa si tienen ubicación y NO están pendientes
        const addItemToMap = (item: Item) => {
            // FIX: Check `paymentStatus` to exclude unpaid/pending items from the map.
            if (item.qrId && (item.location || item.recoveryLocation) && item.paymentStatus !== PaymentStatus.Pending) {
                allItemsMap.set(item.qrId, item);
            }
        };

        userItems.forEach(addItemToMap);
        reportedItems.forEach(addItemToMap);
        
        setItems(Array.from(allItemsMap.values()));
        
      } catch (err) {
        setError("No se pudieron cargar los datos del mapa.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMapData();
  }, [user.uid]);

  const renderMarkers = () => {
    return items.map(item => {
      const location = item.recoveryLocation || item.location;
      if (!location || !item.qrId) return null;
      const isOwner = item.ownerId === user.uid;
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
                <p>{item.tipo} - ID: {item.identificador}</p>
                <p className={`font-bold ${isReported ? 'text-red-600' : 'text-blue-600'}`}>
                    {item.status?.replace('_', ' ')}
                </p>
                {isOwner && <p className="text-green-600">(Es tu item)</p>}
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
          <div className="flex justify-center items-center h-full">
            <Spinner />
          </div>
        ) : error ? (
            <p className="text-red-500 text-center m-4">{error}</p>
        ) : (
          <MapContainer center={defaultPosition} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            />
            {renderMarkers()}
          </MapContainer>
        )}
      </div>
    </div>
  );
};

export default MapScreen;
