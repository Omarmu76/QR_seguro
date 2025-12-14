import React, { useState } from 'react';
import { User } from 'firebase/auth';
import Header from '../components/Header';
import QRCode from '../components/QRCode';
// FIX: The 'pending' status is now managed by `paymentStatus` from the `PaymentStatus` enum.
import { Item, ItemStatus, PaymentStatus } from '../types';
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
  
  // FIX: An item's pending state is determined by its `paymentStatus`, not its functional `status`.
  const isPending = item.paymentStatus === PaymentStatus.Pending; // <<< Check for pending status
  const qrCanvasId = "qr-canvas-download";

  const handleReport = async () => {
    if (!item.qrId || isPending) { // <<< Prevent report on pending
      setError("No se puede denunciar un item sin ID o pendiente de activación.");
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

  const handleShare = async () => {
    const canvas = document.getElementById(qrCanvasId) as HTMLCanvasElement;
    if (!canvas) {
      setError("No se pudo encontrar el QR para compartir.");
      return;
    }

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `qr-${item.shortId || 'item'}.png`, { type: blob.type });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `QR Item ${item.marca}`,
          text: `Código de respaldo: ${item.shortId}`,
          files: [file],
        });
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `qr-${item.shortId || 'item'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
         setError("Error al compartir el QR.");
         console.error(err);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1226] text-white">
      <Header title="QR GENERADO" />
      <div className="flex-grow p-6 overflow-y-auto flex flex-col items-center justify-between">
        
        <div className="w-full max-w-xs">
            {item.qrId && item.shortId ? (
                <QRCode
                  qrId={item.qrId}
                  shortId={item.shortId}
                  canvasId={qrCanvasId}
                />
            ) : (
                <div className="w-full h-auto bg-gray-700 flex items-center justify-center p-8">
                    <p>Error al generar QR</p>
                </div>
            )}
            
            <p className="text-center mt-4 text-gray-300">
                Código de respaldo: 
                <strong className="text-yellow-400 text-lg ml-2">{item.shortId || 'N/A'}</strong>
            </p>
            <p className="text-center mt-2 text-xs text-gray-500 break-all">ID Documento: {item.qrId}</p>
        </div>

        <div className="bg-[#1e2a47] p-4 rounded-lg w-full mt-6">
            <h3 className="text-lg font-bold text-yellow-400 mb-2">Detalles del Item</h3>
            <div className="space-y-1 text-md">
                <p><span className="font-semibold text-gray-300">Tipo:</span> {item.tipo}</p>
                <p><span className="font-semibold text-gray-300">Marca:</span> {item.marca}</p>
                <p><span className="font-semibold text-gray-300">Modelo:</span> {item.modelo}</p>
                <p><span className="font-semibold text-gray-300">ID:</span> {item.identificador}</p>
            </div>
            {isPending && (
              <p className="text-center text-yellow-400 mt-3 border-t border-gray-700 pt-3 text-sm">
                ¡Item pendiente! Actívalo desde "Mis Items" para usar todas las funciones.
              </p>
            )}
        </div>

        {error && <p className="text-red-500 text-center text-sm my-2">{error}</p>}
        
        <div className="w-full mt-6 space-y-3">
          <button
            onClick={handleShare}
            className="w-full bg-green-600 text-white py-3 rounded-lg text-lg font-bold hover:bg-green-700 transition-colors"
          >
            COMPARTIR / DESCARGAR
          </button>
          
          <button
            onClick={handleReport}
            disabled={isReported || isLoading || isPending} // <<< DESHABILITADO SI ESTA PENDIENTE
            className={`w-full py-3 rounded-lg text-lg font-bold flex justify-center items-center transition-colors ${isReported || isPending ? 'bg-gray-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
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
