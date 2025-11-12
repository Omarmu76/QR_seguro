import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import Header from '../components/Header';
import { Item, ItemStatus } from '../types';
import { getAllUserItems, deleteItem, updateItemStatus } from '../services/itemService';
import Spinner from '../components/Spinner';
import ConfirmationModal from '../components/ConfirmationModal';

const QrViewIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5A.75.75 0 0 1 4.5 3.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Zm0 4.5a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Zm0 4.5a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Zm4.5-.75a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5h-1.5Zm4.5 0a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5h-1.5Zm4.5 0a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5h-1.5Zm-13.5-4.5a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5h-1.5Zm4.5 0a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5h-1.5Zm9-3.75a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Zm-4.5 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Zm-4.5 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Zm-4.5-4.5a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 3.75 4.5Zm4.5 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Zm4.5 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Zm4.5 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Z" />
  </svg>
);

const PencilIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);

const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.077-2.09.921-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);

const AlertIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
);

const ShieldCheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 2.625-3.01 6.25-9 8.375-5.99-2.125-9-5.75-9-8.375s3.01-6.25 9-8.375C17.99 5.75 21 9.375 21 12Z" />
  </svg>
);

// --- Helper de Geolocalización ---
const getCurrentLocation = (): Promise<{ lat: number, lng: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalización no es soportada por este navegador."));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => {
        if (err.code === 1) { // 1: PERMISSION_DENIED
            reject(new Error("Permiso de GPS denegado. Habilítelo para denunciar."));
        } else {
            reject(new Error("No se pudo obtener la ubicación."));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
};
// --- Fin Helper ---


const ItemCard: React.FC<{ item: Item; onUnreport: () => void; onReport: () => void; onDelete: () => void; onEdit: () => void; onView: () => void; }> = ({ item, onUnreport, onReport, onDelete, onEdit, onView }) => {
  const isReported = item.status === ItemStatus.Denunciado;
  const isSold = item.status === ItemStatus.Vendido;
  let borderColor = 'border-green-500';
  if(isReported) borderColor = 'border-red-500';
  if(isSold) borderColor = 'border-gray-400';
  
  return (
    <div className={`p-4 rounded-lg border-l-4 ${borderColor} bg-gray-800/80 flex items-center justify-between`}>
      <div>
        <p className="font-bold text-white text-lg">{item.marca} {item.modelo}</p>
        <p className="text-sm text-gray-300">{item.tipo} - ID: {item.identificador}</p>
        <p className={`text-xs font-bold mt-1 ${isReported ? 'text-red-400' : isSold ? 'text-gray-400' : 'text-green-400'}`}>
          ESTADO: {item.status?.replace('_', ' ') || 'EN REGLA'}
        </p>
      </div>
      <div className="flex items-center space-x-1">
          <button 
            onClick={onView}
            className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            aria-label="Ver QR"
          >
              <QrViewIcon className="h-6 w-6"/>
          </button>
          <button 
            onClick={onEdit}
            disabled={isSold}
            className="p-2 rounded-full text-gray-400 hover:bg-blue-900/50 hover:text-blue-400 transition-colors disabled:opacity-50"
            aria-label="Editar item"
          >
              <PencilIcon className="h-6 w-6"/>
          </button>
          {isReported ? (
               <button 
                  onClick={onUnreport}
                  className="p-2 rounded-full text-gray-400 hover:bg-green-900/50 hover:text-green-400 transition-colors"
                  aria-label="Quitar denuncia"
              >
                  <ShieldCheckIcon className="h-6 w-6"/>
              </button>
          ) : (
              <button 
                  onClick={onReport}
                  disabled={isSold}
                  className="p-2 rounded-full text-gray-400 hover:bg-yellow-900/50 hover:text-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Denunciar item"
              >
                  <AlertIcon className="h-6 w-6"/>
              </button>
          )}
          <button 
              onClick={onDelete}
              className="p-2 rounded-full text-gray-400 hover:bg-red-900/50 hover:text-red-400 transition-colors"
              aria-label="Eliminar item"
          >
              <TrashIcon className="h-6 w-6"/>
          </button>
      </div>
    </div>
  );
};

interface MyItemsScreenProps {
  user: User;
  onMenuClick: () => void;
  onEditRequest: (item: Item) => void;
  onViewRequest: (item: Item) => void;
}

const MyItemsScreen: React.FC<MyItemsScreenProps> = ({ user, onMenuClick, onEditRequest, onViewRequest }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

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

  const handleDeleteRequest = (item: Item) => {
    setItemToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !itemToDelete.qrId) return;
    
    try {
      await deleteItem(itemToDelete.qrId, user.uid);
      setItems(prevItems => prevItems.filter(item => item.qrId !== itemToDelete.qrId));
    } catch (err) {
        setError("Error al eliminar el item. Intente de nuevo.");
    } finally {
        setItemToDelete(null);
    }
  };
  
  const handleReportItem = async (item: Item) => {
      if (!item.qrId) return;
      setLoadingItemId(item.qrId);
      setError(null);
      
      let location = null;
      try {
        location = await getCurrentLocation();
      } catch (err: any) {
        setError(err.message || "Error de GPS. No se pudo denunciar.");
        setLoadingItemId(null);
        return;
      }

      try {
        await updateItemStatus(item.qrId, user.uid, ItemStatus.Denunciado, location);
        setItems(prevItems => prevItems.map(i => i.qrId === item.qrId ? { 
            ...i, 
            status: ItemStatus.Denunciado,
            location: location,
            locationTimestamp: Date.now()
        } : i));
      } catch (err) {
          setError("Error al denunciar el item. Intente de nuevo.");
      } finally {
          setLoadingItemId(null);
      }
  };

  const handleUnreportItem = async (item: Item) => {
      if (!item.qrId) return;
      setLoadingItemId(item.qrId);
      setError(null);
      
      try {
        await updateItemStatus(item.qrId, user.uid, ItemStatus.EnRegla, null);
        setItems(prevItems => prevItems.map(i => i.qrId === item.qrId ? { 
            ...i, 
            status: ItemStatus.EnRegla, 
            location: null, 
            locationTimestamp: null 
        } : i));
      } catch (err) {
          setError("Error al quitar denuncia del item. Intente de nuevo.");
      } finally {
          setLoadingItemId(null);
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1226]">
      <Header title="MIS ITEMS" onMenuClick={onMenuClick} />
      <div className="flex-grow p-4 overflow-y-auto">
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Spinner />
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => (
              <React.Fragment key={item.qrId}>
                {loadingItemId === item.qrId ? (
                  <div className="p-4 rounded-lg bg-gray-800/80 flex items-center justify-center h-[92px]">
                    <Spinner />
                  </div>
                ) : (
                  <ItemCard 
                    item={item}
                    onReport={() => handleReportItem(item)}
                    onUnreport={() => handleUnreportItem(item)}
                    onDelete={() => handleDeleteRequest(item)}
                    onEdit={() => onEditRequest(item)}
                    onView={() => onViewRequest(item)}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center h-full text-center text-gray-400">
            <p>Aún no has generado ningún QR.</p>
          </div>
        )}
      </div>
      <ConfirmationModal
        isOpen={!!itemToDelete}
        title="Eliminar Item"
        message={`¿Estás seguro de que quieres eliminar "${itemToDelete?.marca} ${itemToDelete?.modelo}"? Esta acción no se puede deshacer.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setItemToDelete(null)}
        confirmText="Sí, eliminar"
      />
    </div>
  );
};

export default MyItemsScreen;