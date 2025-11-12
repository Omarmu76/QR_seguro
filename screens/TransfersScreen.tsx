// Archivo: screens/TransfersScreen.tsx
// (Pantalla del Vendedor)

import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import Header from '../components/Header';
import { TransferRequest } from '../types'; // <<< Usamos la interfaz
import { getPendingTransfers, approveTransfer, rejectTransfer } from '../services/itemService';
import Spinner from '../components/Spinner';

interface TransfersScreenProps {
  user: User;
  onMenuClick: () => void;
}

// (Componente interno para la tarjeta de solicitud)
const TransferCard: React.FC<{ req: TransferRequest; onApprove: () => void; onReject: () => void; }> = ({ req, onApprove, onReject }) => {
  return (
    <div className="p-4 rounded-lg bg-gray-800/80 text-white space-y-3">
      <p className="font-bold text-lg">{req.itemDetails.marca} {req.itemDetails.modelo}</p>
      <p className="text-sm text-gray-300">Tipo: {req.itemDetails.tipo} - ID: {req.itemDetails.identificador}</p>
      <p className="text-sm text-yellow-400">Solicitado por: {req.buyerEmail}</p>
      <p className="text-xs text-gray-500">Fecha: {new Date(req.createdAt).toLocaleString()}</p>
      
      <p className="text-sm text-center pt-3 border-t border-gray-700">
        Confirme que ha recibido el pago por fuera de la app antes de aprobar.
      </p>
      
      <div className="flex space-x-3 pt-2">
        <button
          onClick={onReject}
          className="w-1/2 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors"
        >
          Rechazar
        </button>
        <button
          onClick={onApprove}
          className="w-1/2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors"
        >
          Aprobar
        </button>
      </div>
    </div>
  );
};


const TransfersScreen: React.FC<TransfersScreenProps> = ({ user, onMenuClick }) => {
  const [pendingTransfers, setPendingTransfers] = useState<TransferRequest[]>([]); // <<< Usamos la interfaz
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null); // Para spinners en botones

  // Función de carga (ahora real)
  const fetchTransfers = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const transfers = await getPendingTransfers(user.uid);
      setPendingTransfers(transfers);
    } catch (err) {
      setError("No se pudieron cargar las transferencias pendientes.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);
  
  const handleApprove = async (request: TransferRequest) => {
    if (!request.id) return;
    setLoadingAction(request.id);
    try {
      await approveTransfer(request.id, request.itemId, request.buyerId);
      fetchTransfers(); // Recarga la lista
    } catch (err) {
      setError("Error al aprobar la transferencia.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReject = async (request: TransferRequest) => {
    if (!request.id) return;
    setLoadingAction(request.id);
    try {
      await rejectTransfer(request.id);
      fetchTransfers(); // Recarga la lista
    } catch (err) {
      setError("Error al rechazar la transferencia.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1226]">
      <Header title="TRANSFERENCIAS" onMenuClick={onMenuClick} />
      <div className="flex-grow p-4 overflow-y-auto">
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-3">
             <p className="text-center text-gray-400 mb-4 text-sm">
                Aquí verás las solicitudes de transferencia pendientes de tu aprobación.
            </p>
            
            {pendingTransfers.length === 0 ? (
              <div className="p-4 rounded-lg bg-gray-800/80 text-white text-center">
                <p>No tienes solicitudes de transferencia pendientes.</p>
              </div>
            ) : (
              pendingTransfers.map(req => (
                <div key={req.id}>
                  {loadingAction === req.id ? (
                    <div className="p-4 rounded-lg bg-gray-800/80 flex justify-center items-center h-[250px]">
                      <Spinner />
                    </div>
                  ) : (
                    <TransferCard 
                      req={req}
                      onApprove={() => handleApprove(req)}
                      onReject={() => handleReject(req)}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransfersScreen;