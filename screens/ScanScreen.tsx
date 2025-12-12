import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { getItemByShortId, updateItemStatus } from '../services/itemService';
import { Item, ItemStatus } from '../types';
import Spinner from '../components/Spinner';

interface ScanScreenProps {
  onScanComplete: (result: { item: Item; status: ItemStatus }) => void;
  onCancel: () => void;
}

const SCANNER_ELEMENT_ID = 'qr-reader-direct';

const ScanScreen: React.FC<ScanScreenProps> = ({ onScanComplete, onCancel }) => {
  const [statusMsg, setStatusMsg] = useState<string>('Iniciando cámara...');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);
  const isStoppingRef = useRef(false); // Flag para evitar múltiples llamadas a stop()

  // Helper para obtener GPS (copiado de versión anterior, mantienedo funcionalidad)
  const getCollaborativeLocation = (): Promise<{ lat: number, lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject("No GPS");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  };

  // Función SAFE STOP: Intenta detener el escáner sin explotar
  const safeStopScanner = async () => {
    if (isStoppingRef.current || !scannerRef.current) return;

    isStoppingRef.current = true;
    try {
      // Solo intentamos parar si el escáner cree que está corriendo
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      scannerRef.current.clear();
    } catch (err) {
      console.warn("Error seguro al detener escáner (ignorable):", err);
    } finally {
      isStoppingRef.current = false;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    isStoppingRef.current = false;

    const startCamera = async () => {
      // 1. Instanciación ÚNICA
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(SCANNER_ELEMENT_ID, {
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
        });
      }

      try {
        // Doble check por si se desmontó mientras cargaba
        if (!isMountedRef.current) return;

        await scannerRef.current.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          async (decodedText) => {
            // --- DETECCIÓN ---
            if (!isMountedRef.current || isProcessing) return;

            // IMPORTANTE: Pausar video inmediatamente para 'congelar' la imagen y evitar redetecciones
            // No hacemos stop() todavía para evitar flasheos o errores de estado
            try {
              scannerRef.current?.pause(true);
            } catch (e) { /* Ignorar si ya estaba pausado */ }

            setIsProcessing(true);
            setStatusMsg('Código detectado. Verificando...');

            try {
              // 1. Lógica de limpieza de URL
              let shortId = decodedText;
              if (decodedText.includes('/ver/')) {
                const parts = decodedText.split('/ver/');
                shortId = parts[1].replace('/', '');
              }

              // 2. Consulta DB
              const result = await getItemByShortId(shortId.trim());

              if (result) { // Item encontrado

                // --- RASTREO COLABORATIVO ---
                if (result.status === ItemStatus.Denunciado) {
                  setStatusMsg('⚠️ ¡ARTÍCULO DENUNCIADO! ⚠️\nEnviando ubicación segura...');
                  try {
                    const location = await getCollaborativeLocation();
                    await updateItemStatus(result.item.qrId!, "public", ItemStatus.Denunciado, location);
                    alert("¡GRACIAS! 🛡️\n\nEste artículo fue reportado como robado.\nTu escaneo ha enviado la ubicación actual al dueño.");
                  } catch (gpsError) {
                    console.warn("GPS error:", gpsError);
                  }
                }

                // SI TODO SALIÓ BIEN, AHORA SÍ DETENEMOS Y NAVEGAMOS
                if (isMountedRef.current) {
                  await safeStopScanner();
                  onScanComplete(result);
                }

              } else {
                throw new Error("Código no registrado.");
              }

            } catch (err: any) {
              console.error(err);
              setError(err.message || "Código inválido");

              // Si falló, reanudamos el escáner después de un delay
              setTimeout(() => {
                if (isMountedRef.current) {
                  setIsProcessing(false);
                  setError(null);
                  setStatusMsg('Escaneando...');
                  try {
                    scannerRef.current?.resume();
                  } catch (resumeError) {
                    console.warn("Error resuming:", resumeError);
                    // Si no puede reanudar, quizás convenga reiniciar, pero resume suele ser seguro
                  }
                }
              }, 2000);
            }
          },
          (errorMessage) => { /* Ignorar errores de frame vacío */ }
        );

        if (isMountedRef.current) {
          setStatusMsg('Escaneando...');
        } else {
          // Si se desmontó justo después de start, paramos.
          safeStopScanner();
        }

      } catch (err) {
        console.error("Start camera error:", err);
        if (isMountedRef.current) {
          setError("No se pudo acceder a la cámara.");
        }
      }
    };

    // Delay inicial para asegurar montaje DOM
    const timer = setTimeout(startCamera, 100);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      // Limpieza robusta al desmontar
      safeStopScanner();
    };
  }, [onScanComplete]); // Dependencias vacías o estables idealmente, pero onScanComplete suele ser prop

  return (
    <div className="absolute inset-0 bg-black z-50 flex flex-col">
      <div id={SCANNER_ELEMENT_ID} className="flex-grow w-full bg-black relative">
        <div className="absolute inset-0 border-[50px] border-black/60 z-10 pointer-events-none flex items-center justify-center">
          <div className="w-64 h-64 border-2 border-yellow-400 relative opacity-80 animate-pulse">
            <div className="absolute top-0 left-0 w-4 h-4 border-l-4 border-t-4 border-yellow-400 -mt-1 -ml-1"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-r-4 border-t-4 border-yellow-400 -mt-1 -mr-1"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-l-4 border-b-4 border-yellow-400 -mb-1 -ml-1"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-r-4 border-b-4 border-yellow-400 -mb-1 -mr-1"></div>
          </div>
        </div>
      </div>

      <div className="bg-[#1e2a47] p-6 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.5)] relative z-20">
        <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4"></div>

        {error ? (
          <div className="text-center">
            <p className="text-red-500 font-bold mb-2">Error</p>
            <p className="text-sm text-gray-300 mb-4">{error}</p>
            <button onClick={onCancel} className="bg-gray-600 w-full py-3 rounded-xl font-bold text-white">Cerrar</button>
          </div>
        ) : (
          <div className="text-center">
            <h3 className="text-xl font-bold text-white mb-1">{isProcessing ? 'Procesando...' : 'Escáner Activo'}</h3>
            <p className="text-sm text-yellow-400 mb-6 whitespace-pre-wrap">{statusMsg}</p>

            {isProcessing ? (
              <div className="flex justify-center"><Spinner /></div>
            ) : (
              <button onClick={onCancel} className="bg-red-600/90 hover:bg-red-600 text-white w-full py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg border border-red-500/50">
                DETENER ESCANEO
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanScreen;
