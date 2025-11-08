import React, { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { getItemByQrId } from '../services/itemService';
import { Item, ItemStatus } from '../types';
import Spinner from '../components/Spinner';

interface ScanScreenProps {
  onScanComplete: (result: { item: Item; status: ItemStatus }) => void;
  onCancel: () => void;
}

const SCANNER_ELEMENT_ID = 'qr-reader';

const ScanScreen: React.FC<ScanScreenProps> = ({ onScanComplete, onCancel }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    if (!isScanning) return;

    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
    let isMounted = true;

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText: string) => {
            if (isMounted && scanner.isScanning) {
              setIsScanning(false);
              await scanner.stop();
              
              setIsLoading(true);
              setError(null);
              
              try {
                const result = await getItemByQrId(decodedText.trim());
                if (isMounted) {
                    if (result) {
                        onScanComplete(result);
                    } else {
                        setError('QR no encontrado en la base de datos.');
                        setIsLoading(false);
                    }
                }
              } catch (err) {
                if(isMounted) {
                    setError('No se pudo verificar el QR. Intente de nuevo.');
                    setIsLoading(false);
                }
              }
            }
          },
          (errorMessage: string) => {
            // This callback can be ignored.
          }
        );
      } catch (err) {
        if (isMounted) {
            setError('No se pudo iniciar la cámara. Verifique los permisos.');
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(err => console.error("Error stopping the scanner:", err));
      }
    };
  }, [onScanComplete, isScanning]);

  const handleRetry = () => {
    setError(null);
    setIsLoading(false);
    setIsScanning(true);
  };

  return (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-[#1e2a47] rounded-lg p-6 text-white text-center">
        <h2 className="text-2xl font-bold mb-4">ESCANEAR QR</h2>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[300px]">
            <Spinner />
            <p className="mt-4 text-yellow-400">Verificando...</p>
          </div>
        ) : error ? (
           <div className="flex flex-col items-center justify-center h-[300px]">
             <p className="text-red-500 mb-4">{error}</p>
             <button
               onClick={handleRetry}
               className="w-full bg-yellow-500 text-black py-3 rounded-lg text-lg font-bold mb-2"
             >
               REINTENTAR
             </button>
             <button
               onClick={onCancel}
               className="w-full bg-gray-600 text-white py-2 rounded-lg"
             >
               Cancelar
             </button>
           </div>
        ) : (
          <>
            <div id={SCANNER_ELEMENT_ID} className="w-full rounded-lg overflow-hidden border-2 border-gray-600 bg-gray-900"></div>
            <p className="mt-4 text-gray-300 text-sm">Apunte la cámara al código QR.</p>
            <button
              onClick={onCancel}
              className="mt-4 w-full bg-gray-600 text-white py-2 rounded-lg"
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ScanScreen;
