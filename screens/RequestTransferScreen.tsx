// Archivo: screens/RequestTransferScreen.tsx
// (Pantalla del Comprador)

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Item, TransferRequest, TransferStatus } from '../types'; // <<< Importamos TransferRequest y TransferStatus
import { createTransferRequest, getTransferRequestByItem } from '../services/itemService'; // <<< Actualizamos funciones
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
  const [existingRequest, setExistingRequest] = useState<TransferRequest | null>(null);
  const [isChecking, setIsChecking] = useState(true); // Para verificar si ya hay una solicitud

  // Al abrir el modal, verificamos si ya existe una solicitud para este item
  useEffect(() => {
    if (!item.qrId || !user.uid) {
      setIsChecking(false);
      return;
    };
    
    // Usamos la nueva función del servicio
    getTransferRequestByItem(item.qrId, user.uid)
      .then(request => {
        setExistingRequest(request); // Guardamos la solicitud si existe
      })
      .catch((err) => setError("Error al verificar solicitud existente."))
      .finally(() => setIsChecking(false));
  }, [item.qrId, user.uid]);

  const handleRequest = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Usamos la nueva función del servicio
      const newRequest = await createTransferRequest(item, user);
      setExistingRequest(newRequest); // Actualizamos la UI para mostrar que está pendiente
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al enviar la solicitud.');
    } finally {
      setIsLoading(false);
    }
  };

  // Esta función decide qué mostrar:
  // 1. Cargando (verificando)
  // 2. Ya existe una solicitud (pendiente o aprobada)
  // 3. Botón para crear la solicitud
  const renderContent = () => {
    if (isChecking) {
      return (
        <div className="flex justify-center items-center h-24">
          <Spinner />
        </div>
      );
    }
    
    if (existingRequest) {
      // El usuario YA hizo una solicitud para este item
      let statusMessage = 'Solicitud Enviada';
      if(existingRequest.status === TransferStatus.Approved) statusMessage = 'Solicitud Aprobada';
      if(existingRequest.status === TransferStatus.Rejected) statusMessage = 'Solicitud Rechazada';

      return (
        <div className="text-center">
          <p className={`text-lg ${existingRequest.status === TransferStatus.Approved ? 'text-green-400' : existingRequest.status === TransferStatus.Rejected ? 'text-red-400' : 'text-yellow-400'} font-bold mb-4`}>
            {statusMessage}
          </p>
          <p className="text-gray-300 text-sm">
            {existingRequest.status === TransferStatus.Pending && "El vendedor ha sido notificado. Verás el item en 'Mis Items' cuando la apruebe."}
            {existingRequest.status === TransferStatus.Approved && "¡Transferencia completada! Revisa 'Mis Items'."}
            {existingRequest.status === TransferStatus.Rejected && "El vendedor ha rechazado esta solicitud."}
          </p>
          <button
            onClick={onRequestSent} // Cierra el modal
            className="w-full bg-blue-600 text-white py-3 rounded-lg text-lg font-bold hover:bg-blue-700 transition-colors mt-6"
          >
            Entendido
          </button>
        </div>
      );
    }

    // El usuario NO ha hecho una solicitud. Mostramos el botón para solicitar.
    return (
      <>
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
      </>
    );
  };

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
        
        {renderContent()}
      </div>
    </div>
  );
};

export default RequestTransferScreen;