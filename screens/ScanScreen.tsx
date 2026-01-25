import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { getItemByShortId } from '../services/itemService';
import { Item, ItemStatus } from '../types';
import Spinner from '../components/Spinner';
import Header from '../components/Header';

interface ScanScreenProps {
  onScanComplete: (result: { item: Item; status: ItemStatus; location?: { lat: number, lng: number } | null }) => void;
  onCancel: () => void;
  onInputCodeRequest?: () => void; // NUEVO: Para el botón de ingreso manual
  onMenuClick: () => void;         // NUEVO: Para el layout de 3 columnas
}

const SCANNER_ELEMENT_ID = 'qr-reader-direct';

const ScanScreen: React.FC<ScanScreenProps> = ({ onScanComplete, onCancel, onInputCodeRequest, onMenuClick }) => {
  const [statusMsg, setStatusMsg] = useState<string>('Iniciando cámara...');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(true);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);
  const isStoppingRef = useRef(false);

  // Helper GPS
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

  /**
   * Lógica Centralizada de Procesamiento (REGLA #2)
   * Esta función procesa el texto decodificado (sea de cámara o archivo).
   */
  const handleScanSuccess = async (decodedText: string) => {
    if (!isMountedRef.current || isProcessing) return;

    // Pausar UI visualmente
    try { scannerRef.current?.pause(true); } catch (e) { }

    setIsProcessing(true);
    setStatusMsg('Código detectado. Verificando...');

    try {
      let shortId = decodedText;
      if (decodedText.includes('/ver/')) {
        const parts = decodedText.split('/ver/');
        shortId = parts[1].replace('/', '');
      }

      const result = await getItemByShortId(shortId.trim());

      if (result) {
        let location: { lat: number, lng: number } | null = null;

        // Capturamos ubicación si el ítem está denunciado
        if (result.status === ItemStatus.Denunciado) {
          setStatusMsg('Verificando seguridad...');
          try {
            location = await getCollaborativeLocation();
          } catch (gpsError) {
            console.warn("GPS no disponible.");
          }
        }

        if (isMountedRef.current) {
          await safeStopScanner();
          onScanComplete({ ...result, location });
        }
      } else {
        throw new Error("Código no registrado.");
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Código inválido");

      setTimeout(() => {
        if (isMountedRef.current) {
          setIsProcessing(false);
          setError(null);
          setStatusMsg('Escaneando...');
          try { scannerRef.current?.resume(); } catch (resumeError) { }
        }
      }, 2000);
    }
  };

  // Función SAFE STOP
  const safeStopScanner = async () => {
    if (isStoppingRef.current || !scannerRef.current) return;
    isStoppingRef.current = true;
    try {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      scannerRef.current.clear();
    } catch (err) {
      console.warn("Scanner stop warning:", err);
    } finally {
      isStoppingRef.current = false;
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !scannerRef.current) return;

    setIsProcessing(true);
    setStatusMsg('Escaneando imagen...');
    
    try {
      const decodedText = await scannerRef.current.scanFile(file, true);
      handleScanSuccess(decodedText);
    } catch (err) {
      setError("No se encontró código QR en la imagen.");
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    isStoppingRef.current = false;

    const startCamera = async () => {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(SCANNER_ELEMENT_ID, {
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
        });
      }

      try {
        if (!isMountedRef.current) return;
        setHasPermission(true);

        await scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          handleScanSuccess,
          () => { }
        );

        if (isMountedRef.current) {
          setStatusMsg('Escaneando...');
        } else {
          safeStopScanner();
        }

      } catch (err) {
        console.error("Camera error:", err);
        setHasPermission(false);
        setError("No se pudo acceder a la cámara.");
      }
    };

    const timer = setTimeout(startCamera, 100);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      safeStopScanner();
    };
  }, [onScanComplete]);

  // --- UI HELPERS ---
  const glassCardClass = "bg-[#111928]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col items-center gap-4 w-full";
  const btnGlass = "w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all active:scale-95";

  return (
    <div className="w-full h-full bg-black flex justify-center items-center relative overflow-hidden font-sans">
      
      {/* 1. COLUMNA IZQUIERDA (Ads/Espacio) */}
      <div className="hidden lg:flex flex-1 h-full bg-[#050b14] border-r border-white/5 relative items-center justify-center">
        <div className="text-white/20 font-black tracking-widest text-3xl rotate-90 italic">PUBLICIDAD</div>
      </div>

      {/* 2. COLUMNA CENTRAL (App) */}
      <div className="w-full h-full lg:max-w-md bg-[#0d1226] flex flex-col relative z-10 shadow-2xl border-x border-white/5">
        
        {/* HEADER ESTÁNDAR */}
        <Header title="ESCANEAR QR" onMenuClick={onMenuClick} onBack={onCancel} />

        <div className="flex-1 flex flex-col items-center justify-start p-6 gap-8 relative overflow-y-auto custom-scrollbar">
          
          {/* VISOR DE CÁMARA TECNOLÓGICO */}
          <div className="w-full aspect-square max-w-[320px] relative rounded-[2.5rem] overflow-hidden border-4 border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.3)] bg-black">
            {/* Esquinas del Visor */}
            <div className="absolute top-5 left-5 w-10 h-10 border-t-4 border-l-4 border-blue-500 z-20 rounded-tl-2xl opacity-90 drop-shadow-[0_0_10px_#3b82f6]"></div>
            <div className="absolute top-5 right-5 w-10 h-10 border-t-4 border-r-4 border-blue-500 z-20 rounded-tr-2xl opacity-90 drop-shadow-[0_0_10px_#3b82f6]"></div>
            <div className="absolute bottom-5 left-5 w-10 h-10 border-b-4 border-l-4 border-blue-500 z-20 rounded-bl-2xl opacity-90 drop-shadow-[0_0_10px_#3b82f6]"></div>
            <div className="absolute bottom-5 right-5 w-10 h-10 border-b-4 border-r-4 border-blue-500 z-20 rounded-br-2xl opacity-90 drop-shadow-[0_0_10px_#3b82f6]"></div>
            
            {/* Scanner Area */}
            <div id={SCANNER_ELEMENT_ID} className="w-full h-full relative z-10 scale-110"></div>
            
            {/* Línea de Escaneo Animada */}
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_30px_#3b82f6] z-30 animate-scan-line"></div>
            
            {!hasPermission && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-40 text-center p-6 gap-4">
                <span className="text-4xl text-red-500">🚫</span>
                <div>
                    <p className="text-white font-black uppercase text-sm">Falta permiso de cámara</p>
                    <p className="text-gray-500 text-[10px] mt-1 font-bold">Actívalo en los ajustes del navegador</p>
                </div>
              </div>
            )}

            {isProcessing && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-40">
                  <Spinner />
               </div>
            )}
          </div>

          <div className="text-center space-y-2">
            <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
                {statusMsg}
            </p>
            <p className="text-gray-500 text-[9px] font-medium uppercase tracking-widest">
                Enfoca el código dentro del marco
            </p>
          </div>

          {/* TARJETA DE ACCIONES INFERIOR */}
          <div className={glassCardClass}>
            {error && (
               <div className="w-full p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-2">
                  <p className="text-red-500 text-center font-bold text-[10px] uppercase">⚠️ {error}</p>
               </div>
            )}

            <div className="w-full grid grid-cols-2 gap-4">
              {/* Botón Subir Imagen */}
              <label className={`${btnGlass} cursor-pointer group`}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
                <span className="text-xl group-hover:scale-110 transition-transform">🖼️</span>
                <span className="text-[10px] uppercase tracking-wider font-black">Imagen</span>
              </label>

              {/* Botón Ingreso Manual */}
              <button 
                onClick={onInputCodeRequest} 
                className={`${btnGlass} group`}
              >
                <span className="text-xl group-hover:scale-110 transition-transform">⌨️</span>
                <span className="text-[10px] uppercase tracking-wider font-black">Manual</span>
              </button>
            </div>

            <div className="w-full border-t border-white/5 pt-4">
                <p className="text-[9px] text-gray-600 text-center font-mono tracking-tighter">
                    RADAR GLOBAL ID SYSTEM v7.2 • ENCRYPTED
                </p>
            </div>
          </div>

        </div>
      </div>

      {/* 3. COLUMNA DERECHA (Ads/Espacio) */}
      <div className="hidden lg:flex flex-1 h-full bg-[#050b14] border-l border-white/5 relative items-center justify-center">
        <div className="text-white/20 font-black tracking-widest text-3xl -rotate-90 italic">PUBLICIDAD</div>
      </div>

      {/* Estilo para la animación de escaneo */}
      <style>{`
        @keyframes scan-line {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-line {
          animation: scan-line 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e2a47; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ScanScreen;
