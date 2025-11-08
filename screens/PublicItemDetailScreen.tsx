
import React, { useState, useEffect, useCallback } from 'react';
import Spinner from '../components/Spinner';
import QRCode from '../components/QRCode';
import { getItemById, getUserById, updateItemStatus } from '../services/itemService';
import { Item, ItemStatus } from '../types';

interface PublicItemDetailScreenProps {
  itemId: string;
  onNavigate: (path: string) => void;
}

interface FullItemDetails extends Item {
  ownerContact: {
    email: string;
    nombreCompleto: string;
  };
}

const PublicItemDetailScreen: React.FC<PublicItemDetailScreenProps> = ({ itemId, onNavigate }) => {
  const [details, setDetails] = useState<FullItemDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');

  const fetchDetails = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const itemData = await getItemById(itemId);
      if (!itemData || !itemData.ownerId) {
        setError('El item no fue encontrado o está incompleto.');
        setIsLoading(false);
        return;
      }

      const ownerData = await getUserById(itemData.ownerId);
      if (!ownerData) {
        setError('No se pudo encontrar la información de contacto del dueño.');
        setIsLoading(false);
        return;
      }
      
      setDetails({
        ...itemData,
        ownerContact: ownerData,
      });

    } catch (e) {
      setError('Ocurrió un error al cargar los detalles.');
    } finally {
      setIsLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);
  
  const handleRecoverItem = async () => {
      if (!details || !details.ownerId || !details.qrId) return;
      setIsUpdating(true);
      try {
          await updateItemStatus(details.qrId, "public", ItemStatus.Recuperado);
          setDetails(prev => prev ? {...prev, status: ItemStatus.Recuperado} : null);
      } catch (e) {
          setError("Error al actualizar el estado.");
      } finally {
          setIsUpdating(false);
      }
  };


  return (
    <div className="flex flex-col h-full bg-red-600 text-white">
        <header className="bg-black/20 p-4 flex justify-between items-center text-white shadow-lg">
            <button onClick={() => onNavigate('/denuncias')} className="p-1" aria-label="Volver a la lista">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </button>
            <h1 className="text-xl font-bold uppercase tracking-wider">Detalle Denuncia</h1>
            <div className="w-8"></div>
        </header>
      <div className="flex-grow p-4 overflow-y-auto flex flex-col items-center">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Spinner />
          </div>
        ) : error ? (
          <div className="text-center text-yellow-300 bg-black/30 p-4 rounded-lg">{error}</div>
        ) : details ? (
          <>
            <div className="w-full max-w-[200px] mt-4">
                <QRCode id={details.qrId || 'error'} />
            </div>

            <p className="font-bold text-2xl my-3 tracking-widest">
                {details.status === ItemStatus.Recuperado ? 'RECUPERADO' : 'DENUNCIADO'}
            </p>

            <div className="w-full bg-yellow-300 text-black p-4 rounded-lg border-4 border-black/50 space-y-2">
                <p className="font-bold text-lg">Contacto: {details.ownerContact.nombreCompleto}</p>
                <p>Email: {details.ownerContact.email}</p>
                <p className="font-semibold">{details.tipo.toUpperCase()}</p>
                <p className="text-sm">ID: {details.identificador}</p>
                <p className="text-sm">MARCA: {details.marca} / {details.modelo}</p>
            </div>
            
            <div className="my-4 w-full h-24 bg-gray-500 rounded-lg flex items-center justify-center opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className='ml-2'>Ubicación (placeholder)</span>
            </div>

            <button
                onClick={handleRecoverItem}
                disabled={isUpdating || details.status === ItemStatus.Recuperado}
                className="w-full bg-blue-800 text-white py-2 rounded-lg font-bold border-2 border-blue-900 shadow-lg disabled:bg-gray-500 disabled:opacity-70 flex justify-center"
            >
                {isUpdating ? <Spinner/> : 'MARCAR COMO RECUPERADO'}
            </button>
            <button onClick={() => onNavigate('/')} className="mt-3 bg-gray-700/50 border-2 border-gray-200/50 px-8 py-1 rounded-md font-semibold">
              INICIO
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default PublicItemDetailScreen;
