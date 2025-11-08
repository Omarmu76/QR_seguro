
import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import Header from '../components/Header';
import { Item, ItemStatus } from '../types';
import { getAllUserItems, updateItemStatus } from '../services/itemService';
import Spinner from '../components/Spinner';

interface SellScreenProps {
  user: User;
  onMenuClick: () => void;
}

const RepeatIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 11.667 0l3.181-3.183m-11.667-11.667a8.25 8.25 0 0 1 11.667 0l3.181 3.183m-14.85-3.183L2.985 16.355" />
  </svg>
);

const ItemCard: React.FC<{ item: Item; onSell: () => void; }> = ({ item, onSell }) => {
  const isSold = item.status === ItemStatus.Vendido;
  const isReported = item.status === ItemStatus.Denunciado;
  
  let borderColor = 'border-green-500';
  if (isReported) borderColor = 'border-red-500';
  if (isSold) borderColor = 'border-gray-500';
  
  return (
    <div className={`p-4 rounded-lg border-l-4 ${borderColor} bg-gray-800/80 flex items-center justify-between`}>
      <div>
        <p className="font-bold text-white text-lg">{item.marca} {item.modelo}</p>
        <p className="text-sm text-gray-300">{item.tipo} - ID: {item.identificador}</p>
        <p className={`text-xs font-bold mt-1 ${isReported ? 'text-red-400' : isSold ? 'text-gray-400' : 'text-green-400'}`}>
          ESTADO: {item.status?.replace('_', ' ') || 'EN REGLA'}
        </p>
      </div>
      <div className="flex items-center space-x-2">
          <button 
              onClick={onSell}
              disabled={isSold || isReported}
              className="p-2 rounded-full text-gray-400 hover:bg-green-900/50 hover:text-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Marcar como vendido"
          >
              <RepeatIcon className="h-6 w-6"/>
          </button>
      </div>
    </div>
  );
};

const SellScreen: React.FC<SellScreenProps> = ({ user, onMenuClick }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userItems = await getAllUserItems(user.uid);
      setItems(userItems);
    } catch (err) {
      setError("No se pudieron cargar los items.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);
  
  const handleSellItem = async (item: Item) => {
      if (!item.qrId) return;
      try {
        await updateItemStatus(item.qrId, user.uid, ItemStatus.Vendido);
        setItems(prevItems => prevItems.map(i => i.qrId === item.qrId ? { ...i, status: ItemStatus.Vendido } : i));
      } catch (err) {
          setError("Error al marcar como vendido. Intente de nuevo.");
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1226]">
      <Header title="VENDER ITEM" onMenuClick={onMenuClick} />
      <div className="flex-grow p-4 overflow-y-auto">
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Spinner />
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-3">
             <p className="text-center text-gray-400 mb-4 text-sm">
                Selecciona un item para marcarlo como vendido.
            </p>
            {items.map((item) => (
              <ItemCard key={item.qrId} item={item} onSell={() => handleSellItem(item)} />
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center h-full text-center text-gray-400">
            <p>No tienes items disponibles para vender.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellScreen;
