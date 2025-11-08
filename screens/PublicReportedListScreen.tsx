
import React, { useState, useEffect, useCallback } from 'react';
import Spinner from '../components/Spinner';
import { getPublicReportedItems } from '../services/itemService';
import { Item, ItemStatus } from '../types';

interface PublicReportedListScreenProps {
  onNavigate: (path: string) => void;
}

const MOCK_LOCATIONS = [
  'POSADAS MISIONES ARGENTINA',
  'CABA BUENOS AIRES ARGENTINA',
  'PARANA ENTRE RIOS ARGENTINA',
  'CORDOBA CORDOBA ARGENTINA',
  'LA PLATA BUENOS AIRES ARGENTINA',
  'TIERRA DEL FUEGO ARGENTINA'
];

const QrIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h4v4H4zM4 10h4v4H4zM4 16h4v4H4zM10 4h4v4h-4zM10 10h4v4h-4zM10 16h4v4h-4zM16 4h4v4h-4zM16 10h4v4h-4zM16 16h4v4h-4z"/>
  </svg>
);

const MapPinIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ItemCard: React.FC<{ item: Item; onNavigate: (path: string) => void }> = ({ item, onNavigate }) => {
  const isRecovered = item.status === ItemStatus.Recuperado;
  const cardBg = isRecovered ? 'bg-blue-600' : 'bg-yellow-400';
  const textColor = isRecovered ? 'text-white' : 'text-black';

  return (
  <button
    onClick={() => onNavigate(`/denuncias/${item.qrId}`)}
    className={`w-full text-left rounded-lg flex items-stretch hover:opacity-90 transition-opacity ${cardBg} ${textColor}`}
  >
      <div className="p-2 flex items-center justify-center">
          <QrIcon />
      </div>
      <div className="flex-grow p-2 border-l border-r border-black/20">
          <p className="font-bold uppercase text-sm">{item.tipo}</p>
          <p className="text-xs">{item.location}</p>
          {isRecovered && <p className="font-bold text-xs mt-1">RECUPERADO</p>}
      </div>
      <div className="p-2 flex items-center justify-center bg-white/70">
          <MapPinIcon />
      </div>
  </button>
)};

const PublicReportedListScreen: React.FC<PublicReportedListScreenProps> = ({ onNavigate }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    const reportedItems = await getPublicReportedItems();
    const itemsWithLocation = reportedItems.map((item, index) => ({
      ...item,
      location: MOCK_LOCATIONS[index % MOCK_LOCATIONS.length]
    }));
    setItems(itemsWithLocation);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filteredItems = items.filter(item => 
    item.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-red-600">
      <header className="bg-black/20 p-4 flex justify-between items-center text-white shadow-lg">
          <button onClick={() => onNavigate('/')} className="p-1" aria-label="Volver al inicio">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold uppercase tracking-wider">Denuncias</h1>
          <div className="w-8"></div>
      </header>
      <div className="p-4">
        <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="w-full p-2 pl-10 rounded-md text-black" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        </div>
      </div>
      <div className="flex-grow p-4 pt-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Spinner />
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <ItemCard key={item.qrId} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center h-full text-center text-white">
            <p>{items.length === 0 ? "No hay items denunciados actualmente." : "No se encontraron resultados."}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicReportedListScreen;
