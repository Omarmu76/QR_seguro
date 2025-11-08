import React, { useState, useEffect, useCallback } from 'react';
import { Item, ItemStatus } from '../types';
import { getPublicReportedItems } from '../services/itemService';
import Spinner from '../components/Spinner';

interface PublicReportedListScreenProps {
  onNavigate: (path: string) => void;
}

const ItemCard: React.FC<{ item: Item; onClick: () => void; }> = ({ item, onClick }) => {
  const isReported = item.status === ItemStatus.Denunciado;
  const isRecovered = item.status === ItemStatus.Recuperado;

  let borderColor = 'border-gray-500';
  if (isReported) borderColor = 'border-red-500';
  if (isRecovered) borderColor = 'border-blue-500';

  return (
    <button onClick={onClick} className={`w-full text-left p-4 rounded-lg border-l-4 ${borderColor} bg-gray-800/80 flex items-center justify-between transition-transform hover:scale-105`}>
      <div>
        <p className="font-bold text-white text-lg">{item.marca} {item.modelo}</p>
        <p className="text-sm text-gray-300">{item.tipo} - ID: {item.identificador}</p>
        <p className={`text-xs font-bold mt-1 ${isReported ? 'text-red-400' : isRecovered ? 'text-blue-400' : 'text-gray-400'}`}>
          ESTADO: {item.status?.replace('_', ' ') || 'DESCONOCIDO'}
        </p>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
};


const PublicReportedListScreen: React.FC<PublicReportedListScreenProps> = ({ onNavigate }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const reportedItems = await getPublicReportedItems();
      // Sort items: Denunciado first, then Recuperado
      reportedItems.sort((a, b) => {
        if (a.status === ItemStatus.Denunciado && b.status !== ItemStatus.Denunciado) return -1;
        if (a.status !== ItemStatus.Denunciado && b.status === ItemStatus.Denunciado) return 1;
        return 0;
      });
      setItems(reportedItems);
    } catch (err) {
      setError("No se pudieron cargar los items denunciados.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);
  
  const handleItemClick = (item: Item) => {
      if (item.qrId) {
          onNavigate(`/denuncias/${item.qrId}`);
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1226] text-white">
      <header className="bg-[#1e2a47] p-4 flex justify-between items-center text-white shadow-md">
        <button onClick={() => onNavigate('/')} className="p-1" aria-label="Volver al inicio">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold uppercase tracking-wider">Lista de Denuncias</h1>
        <div className="w-8"></div> {/* Spacer */}
      </header>
      <div className="flex-grow p-4 overflow-y-auto">
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Spinner />
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => (
              <ItemCard 
                key={item.qrId} 
                item={item} 
                onClick={() => handleItemClick(item)} 
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col justify-center items-center h-full text-center text-gray-400">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg">No hay denuncias activas en este momento.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicReportedListScreen;
