import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
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

  // Usamos useRef para mantener el control del escáner sin causar re-renderizados
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Función para iniciar el escáner
    const initializeScanner = async () => {
      // 1. LIMPIEZA PREVIA: Vaciamos el div a la fuerza.
      // Esto elimina cualquier video "fantasma" que haya quedado de un renderizado anterior.
      const element = document.getElementById(SCANNER_ELEMENT_ID);
      if (element) {
        element.innerHTML = "";
      }

      // 2. Instanciamos la librería con configuración de formatos
      const html5QrCode = new Html5Qrcode(SCANNER_ELEMENT_ID, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      });
      scannerRef.current = html5QrCode;

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          async (decodedText) => {
            // --- ÉXITO AL LEER ---
            // Detenemos la cámara inmediatamente para evitar múltiples lecturas
            if (scannerRef.current) {
              await scannerRef.current.stop().catch(err => console.warn("Stop error:", err));
              scannerRef.current.clear();
            }

            if (!isMountedRef.current) return;

            setIsLoading(true);
            setError(null);

            try {
              // Buscamos el item en la base de datos
              const result = await getItemByQrId(decodedText.trim());

              if (!isMountedRef.current) return;

              if (result) {
                onScanComplete(result);
              } else {
                setError('QR no encontrado en la base de datos.');
                setIsLoading(false);
              }
            } catch (err) {
              if (isMountedRef.current) {
                console.error("Error verificando QR:", err);
                setError('No se pudo verificar el QR.');
                setIsLoading(false);
              }
            }
          },
          () => {
            // Ignoramos errores de lectura frame a frame
          }
        );
      } catch (err) {
        if (isMountedRef.current) {
          console.error("Error iniciando cámara:", err);
          setError("No se pudo acceder a la cámara. Verifique permisos.");
        }
      }
    };

    // 3. PEQUEÑO RETRASO: Esperamos 100ms antes de iniciar. 
    // Esto es vital en React para asegurar que el DOM esté listo y limpio.
    const timerId = setTimeout(() => {
      initializeScanner();
    }, 100);

    // 4. CLEANUP: Se ejecuta al cerrar el modal
    return () => {
      isMountedRef.current = false;
      clearTimeout(timerId);

      if (scannerRef.current) {
        // Intentamos detener y limpiar, capturando errores por si ya estaba detenido
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
        }).catch(err => {
          console.warn("Error cleaning up scanner:", err);
        });
      }
    };
  }, [onScanComplete]);

  return (
    <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-[#1e2a47] rounded-lg p-4 text-white text-center relative shadow-2xl">
        <h2 className="text-xl font-bold mb-4 text-yellow-400">ESCANEAR QR</h2>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[300px]">
            <Spinner />
            <p className="mt-4 text-yellow-400 animate-pulse">Verificando item...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[300px]">
            <p className="text-red-500 mb-6 px-4 font-semibold">{error}</p>
            <button onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 text-white py-2 px-8 rounded-lg transition-colors">
              Cerrar
            </button>
          </div>
        ) : (
          <>
            {/* Contenedor del video */}
            <div id={SCANNER_ELEMENT_ID} className="w-full overflow-hidden rounded-lg bg-black border-2 border-gray-700 min-h-[250px]"></div>

            <p className="mt-4 text-gray-400 text-xs">
              Apunta la cámara al código. Si no enfoca, aleja un poco el dispositivo.
            </p>

            <button
              onClick={onCancel}
              className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold transition-colors"
            >
              CANCELAR
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ScanScreen;
