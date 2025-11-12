// Archivo: screens/TransfersScreen.tsx
// Esta pantalla reemplaza la antigua 'SellScreen'.
// Actuará como la bandeja de entrada del vendedor para gestionar solicitudes de transferencia.

import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import Header from '../components/Header';
// Importaremos 'Item' por si acaso, aunque 'Transfer' será la interfaz principal aquí.
import { Item } from '../types'; 
// import { getPendingTransfers } from '../services/itemService'; // (Esta función la crearemos más adelante)
import Spinner from '../components/Spinner';

interface TransfersScreenProps {
  user: User;
  onMenuClick: () => void;
}

// (Definiremos una interfaz para la transferencia cuando la necesitemos)
// interface TransferRequest { ... }

const TransfersScreen: React.FC<TransfersScreenProps> = ({ user, onMenuClick }) => {
  // const [pendingTransfers, setPendingTransfers] = useState<any[]>([]); // (Estado futuro)
  const [isLoading, setIsLoading] = useState(true); // Empezamos cargando
  const [error, setError] = useState<string | null>(null);

  // Esta función cargará las transferencias pendientes del vendedor
  const fetchTransfers = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // const transfers = await getPendingTransfers(user.uid); // <<< (Función futura)
      // setPendingTransfers(transfers);
      // Por ahora, simulamos que no hay nada:
      setIsLoading(false); 
    } catch (err) {
      setError("No se pudieron cargar las transferencias pendientes.");
      setIsLoading(false);
    }
  }, [user]);

  // Ejecutamos la carga cuando el componente se monta
  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);
  
  // Esta función la llamará el vendedor para APROBAR una venta (después de recibir el pago)
  const handleApprove = async (transferId: string) => {
    // Aquí irá la lógica de aprobación (Paso futuro)
    console.log("Aprobar transferencia:", transferId);
    // await approveTransfer(transferId);
    // fetchTransfers(); // Recargamos la lista
  };

  // Esta función la llamará el vendedor para RECHAZAR (Cancelar)
  const handleReject = async (transferId: string) => {
    // Esta es tu función de "Cancelar"
    console.log("Rechazar (Cancelar) transferencia:", transferId);
    // await rejectTransfer(transferId);
    // fetchTransfers(); // Recargamos la lista
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1226]">
      {/* El título ahora es 'TRANSFERENCIAS' */}
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
            
            {/* Aquí es donde listaremos las solicitudes pendientes en el futuro */}
            
            {/* Mensaje temporal mientras no haya solicitudes */}
            {/* {pendingTransfers.length === 0 && ( */}
              <div className="p-4 rounded-lg bg-gray-800/80 text-white text-center">
                <p>No tienes solicitudes de transferencia pendientes.</p>
              </div>
            {/* )} */}

            {/* (Aquí iría el .map() de pendingTransfers para renderizar cada solicitud) */}

          </div>
        )}
      </div>
    </div>
  );
};

export default TransfersScreen;