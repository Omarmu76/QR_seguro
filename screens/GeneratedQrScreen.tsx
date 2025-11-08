
import React, { useState } from 'react';
import { User } from 'firebase/auth';
import Header from '../components/Header';
import QRCode from '../components/QRCode';
import { Item, ItemStatus } from '../types';
import { updateItemStatus } from '../services/itemService';
import Spinner from '../components/Spinner';

interface GeneratedQrScreenProps {
  item: Item;
  user: User;
  onDone: () => void;
}

const GeneratedQrScreen: React.FC<GeneratedQrScreenProps> = ({ item, user, onDone }) => {
  const [isReported, setIsReported] = useState(item.status === ItemStatus.Denunciado);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReport = async () => {
    if (!item.qrId) {
      setError("No se puede denunciar un item sin ID.");
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await updateItemStatus(item.qrId, user.uid, ItemStatus.Denunciado);
      setIsReported(true);
    } catch (err) {
      setError("Error al denunciar el item.");
    } finally {
      setIsLoading(false);
    }
  };
    
  return (
    <div className="flex flex-col h-full bg-[#0d1226] text-white">
      <Header title="QR GENERADO" />
      <div className="flex-grow p-6 overflow-y-auto flex flex-col items-center justify-between">
        
        <div className="w-full max-w-xs">
            {item.qrId && <QRCode id={item.qrId} />}
            <p className="text-center mt-2 text-xs text-gray-400 break-all">{item.qrId}</p>
        </div>

        <div className="bg-[#1e2a47] p-4 rounded-lg w-full mt-6">
            <h3 className="text-lg font-bold text-yellow-400 mb-2">Detalles del Item</h3>
            <div className="space-y-1 text-md">
                <p><span className="font-semibold text-gray-300">Tipo:</span> {item.tipo}</p>
                <p><span className="font-semibold text-gray-300">Marca:</span> {item.marca}</p>
                <p><span className="font-semibold text-gray-300">Modelo:</span> {item.modelo}</p>
                <p><span className="font-semibold text-gray-300">ID:</span> {item.identificador}</p>
            </div>
        </div>

        {error && <p className="text-red-500 text-center text-sm my-2">{error}</p>}

        <div className="w-full mt-6 space-y-3">
          <button
            onClick={handleReport}
            disabled={isReported || isLoading}
            className={`w-full py-3 rounded-lg text-lg font-bold flex justify-center items-center transition-colors ${isReported ? 'bg-gray-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {isLoading ? <Spinner /> : (isReported ? 'DENUNCIADO' : 'DENUNCIAR ROBO')}
          </button>
           <button
            onClick={onDone}
            className="w-full bg-blue-600 text-white py-3 rounded-lg text-lg font-bold hover:bg-blue-700 transition-colors"
          >
            LISTO
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeneratedQrScreen;
