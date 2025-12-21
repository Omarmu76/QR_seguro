import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Item } from '../types';
import { createTransferRequest } from '../services/itemService';
import Spinner from '../components/Spinner';

interface RequestTransferScreenProps {
  item: Item;
  user: User;
  onCancel: () => void;
  onRequestSent: () => void;
}

const RequestTransferScreen: React.FC<RequestTransferScreenProps> = ({ item, user, onCancel, onRequestSent }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRequest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. CAPTURA DE GPS (Handshake Inicial)
      let location = null;
      if ("geolocation" in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 7000,
              maximumAge: 0
            });
          });
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
        } catch (e) {
          console.log("GPS no disponible o denegado, enviando sin ubicación");
        }
      }

      // 2. ENVIAR CON GPS
      await createTransferRequest(item, user, location);
      setSuccess(true);
      // Esperamos un poco para que el usuario lea el mensaje de éxito
      setTimeout(() => {
        onRequestSent();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al solicitar la transferencia.");
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-6 text-center">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">¡Solicitud Enviada!</h2>
        <p className="text-gray-300">El dueño recibirá tu petición.</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-4 animate-fade-in">
      <div className="w-full max-w-md bg-[#1e2a47] rounded-xl p-6 text-white border border-gray-700 shadow-2xl relative">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-900/50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
          </div>
          <h2 className="text-xl font-bold">Solicitar Transferencia</h2>
          <p className="text-sm text-gray-400 mt-1">Este artículo pertenece a otro usuario.</p>
        </div>

        {/* Info del Item */}
        <div className="bg-black/30 p-4 rounded-lg mb-6 border border-white/5">
          <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">{item.tipo}</p>
          <h3 className="text-lg font-bold text-white">{item.marca} {item.modelo}</h3>
          <p className="text-sm text-gray-400 mt-1">ID Visible: <span className="font-mono text-white">{item.shortId}</span></p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 p-3 rounded-lg mb-4 text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleRequest}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-lg shadow-lg transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Spinner /> : "SOLICITAR PROPIEDAD"}
          </button>

          <button
            onClick={onCancel}
            disabled={isLoading}
            className="w-full bg-transparent border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 font-bold py-3 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>

        <p className="text-[10px] text-gray-500 text-center mt-4 px-4">
          Al solicitar, el dueño actual deberá aprobar la transferencia desde su panel.
        </p>
      </div>
    </div>
  );
};

export default RequestTransferScreen;