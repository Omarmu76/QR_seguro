import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Item } from '../types';
import { requestItemTransfer } from '../services/itemService';
import Spinner from '../components/Spinner';

interface RequestTransferScreenProps {
  item: Item;
  user: User;
  onCancel: () => void;
  onRequestSent: () => void;
}

const RequestTransferScreen: React.FC<RequestTransferScreenProps> = ({ item, user, onCancel, onRequestSent }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRequest = async () => {
    setIsLoading(true);
    setError('');
    try {
      await requestItemTransfer(item, user);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al enviar la solicitud.');
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-sm bg-green-600 rounded-lg shadow-2xl p-6 text-white text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold mb-3">¡Solicitud Enviada!</h2>
          <p className="text-gray-200 mb-6">El vendedor ha sido notificado. Verás el item en "Mis Items" cuando la apruebe.</p>
          <button
            onClick={onRequestSent}
            className="w-full bg-white text-black py-2 px-4 rounded-lg font-semibold transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-sm bg-[#1e2a47] rounded-lg shadow-2xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-4 text-center text-yellow-400">Solicitar Transferencia</h2>
        <p className="text-center text-gray-300 mb-6">Estás a punto de solicitar la propiedad de este item.</p>
        
        <div className="bg-gray-800/80 p-4 rounded-lg space-y-2 mb-6">
          <p><span className="font-semibold text-gray-400">Tipo:</span> {item.tipo}</p>
          <p><span className="font-semibold text-gray-400">Marca:</span> {item.marca}</p>
          <p><span className="font-semibold text-gray-400">Modelo:</span> {item.modelo}</p>
          <p><span className="font-semibold text-gray-400">ID:</span> {item.identificador}</p>
        </div>
        
        {error && <p className="text-red-500 text-center text-sm mb-4">{error}</p>}
        
        <div className="space-y-3">
          <button
            onClick={handleRequest}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex justify-center items-center"
          >
            {isLoading ? <Spinner /> : 'Confirmar Solicitud'}
          </button>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestTransferScreen;
