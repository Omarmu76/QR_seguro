import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import Header from '../components/Header';
import { Item, TrackingType } from '../types';
import { saveItem } from '../services/itemService';
import Spinner from '../components/Spinner';
import ConfirmationModal from '../components/common/ConfirmationModal';

// --- SECCIÓN VISUAL (ICONOS SVG) ---
const GpsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const DeviceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

// --- UTILIDAD: IDENTIFICADOR DEL DISPOSITIVO ---
const getDeviceId = (): string => {
  const storedId = localStorage.getItem('qr_device_id');
  if (storedId) return storedId;

  const newId = 'dev_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  localStorage.setItem('qr_device_id', newId);
  return newId;
};

interface GenerateScreenProps {
  onGenerateComplete: (result: Item) => void;
  user: User;
  onMenuClick: () => void;
}

const GenerateScreen: React.FC<GenerateScreenProps> = ({ onGenerateComplete, user, onMenuClick }) => {

  // --- ESTADOS ---
  const [item, setItem] = useState({
    tipo: 'Vehiculo',
    marca: '',
    modelo: '',
    identificador: '',
  });

  const [isSelfDevice, setIsSelfDevice] = useState(false);

  // --- LÓGICA GPS (OPTIMIZADA) ---
  const [bestLocation, setBestLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setBestLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setGpsAccuracy(pos.coords.accuracy);
      },
      (err) => console.warn("Sintonizando GPS...", err),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000
      }
    );

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);

  // --- MANEJADORES ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setItem({ ...item, [e.target.name]: e.target.value });
  };

  const isFormValid = item.marca.trim() !== '' && item.modelo.trim() !== '' && item.identificador.trim() !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setError("Por favor completa todos los campos.");
      return;
    }
    setError('');
    setConfirmModalOpen(true);
  };

  const handleConfirmGenerate = async () => {
    setConfirmModalOpen(false);
    setIsLoading(true);
    setError('');

    try {
      setLoadingMessage('🛰️ Confirmando ubicación...');

      let finalLocation = bestLocation;

      if (!finalLocation) {
        try {
          finalLocation = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              (err) => reject(err),
              { enableHighAccuracy: true, timeout: 10000 }
            );
          });
        } catch (e) {
          console.error(e);
          throw new Error("No se detecta ubicación. Activa el GPS y sal al exterior.");
        }
      }

      if (!finalLocation) throw new Error("Señal GPS débil. Intenta de nuevo.");

      setLoadingMessage('💾 Guardando seguro...');

      let trackingType: TrackingType = 'PASSIVE';
      let linkedDeviceId: string | undefined = undefined;

      if (isSelfDevice) {
        trackingType = 'SELF_DEVICE';
        linkedDeviceId = getDeviceId();
      }

      const rawData = {
        ...item,
        trackingType,
        linkedDeviceId,
      };

      // Limpieza de emergencia por si algo quedó undefined
      const cleanPayload = JSON.parse(JSON.stringify(rawData));

      const savedItem = await saveItem(cleanPayload, user.uid, finalLocation);

      onGenerateComplete(savedItem);

    } catch (err: any) {
      console.error("Error al generar:", err);
      setError(err.message || 'Error desconocido al guardar.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  // --- ESTILOS VISUALES (GLASS UI) ---
  const glassCardClass = "bg-[#111928]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden";
  const labelClass = "block text-xs font-medium text-blue-300/80 mb-1.5 uppercase tracking-wider";
  const inputClass = "w-full bg-[#0d1226]/80 border border-blue-500/20 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all";

  return (
    <div className="flex flex-col h-full bg-[#0d1226] text-white relative overflow-hidden">

      {/* FONDO DECORATIVO */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-cyan-600/20 rounded-full blur-[100px]"></div>
      </div>

      <Header title="NUEVO PROTEGIDO" onMenuClick={onMenuClick} />

      <div className="flex-grow p-4 overflow-y-auto z-10 flex flex-col items-center justify-start pb-20">
        <div className="w-full max-w-md space-y-5">

          <form onSubmit={handleSubmit} className={glassCardClass}>
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"></div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Tipo de Artículo</label>
                <div className="relative">
                  <select
                    name="tipo"
                    value={item.tipo}
                    onChange={handleChange}
                    className={`${inputClass} appearance-none cursor-pointer text-blue-100 font-medium`}
                  >
                    <option>Vehiculo</option>
                    <option>Celular</option>
                    <option>Notebook</option>
                    <option>Bicicleta</option>
                    <option>Documentación</option>
                    <option>Mochila</option>
                    <option>Otro</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-blue-400">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Marca</label>
                  <input
                    type="text"
                    name="marca"
                    value={item.marca}
                    onChange={handleChange}
                    placeholder="Ej: Samsung"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Modelo</label>
                  <input
                    type="text"
                    name="modelo"
                    value={item.modelo}
                    onChange={handleChange}
                    placeholder="Ej: S23"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  {item.tipo === 'Vehiculo' ? 'Patente' : 'Identificador Único (Serie/IMEI)'}
                </label>
                <input
                  type="text"
                  name="identificador"
                  value={item.identificador}
                  onChange={handleChange}
                  placeholder={item.tipo === 'Vehiculo' ? 'AA 123 BB' : 'XJ9-0022...'}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="my-5 border-t border-white/5"></div>

            <div
              onClick={() => setIsSelfDevice(!isSelfDevice)}
              className={`
                relative rounded-xl p-4 transition-all duration-300 border cursor-pointer group
                ${isSelfDevice
                  ? 'bg-blue-600/20 border-blue-500/60 shadow-[0_0_20px_rgba(37,99,235,0.15)]'
                  : 'bg-white/5 border-white/5 hover:bg-white/10'}
              `}
            >
              <div className="flex items-start gap-4">
                <div className={`
                  p-2.5 rounded-lg transition-colors
                  ${isSelfDevice ? 'bg-blue-500 text-white' : 'bg-gray-700/50 text-gray-500'}
                `}>
                  <DeviceIcon />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold text-sm ${isSelfDevice ? 'text-blue-200' : 'text-gray-300'}`}>
                      Este Dispositivo
                    </span>
                    <div className={`w-9 h-5 rounded-full relative transition-colors ${isSelfDevice ? 'bg-blue-500' : 'bg-gray-600/50'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${isSelfDevice ? 'left-5' : 'left-1'}`}></div>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-tight">
                    Actívalo <b>solo</b> si estás usando el dispositivo a registrar. Habilita el rastreo "Vigía".
                  </p>
                </div>
              </div>
            </div>

          </form>

          <div className="space-y-4 pt-2">

            <div className="flex items-center justify-center gap-2 text-xs py-2 rounded-full bg-black/20 border border-white/5 mx-auto w-fit px-4">
              <div className={bestLocation ? "text-green-500" : "text-yellow-500 animate-pulse"}>
                <GpsIcon />
              </div>
              {bestLocation ? (
                <span className="text-gray-300">
                  Señal GPS Estable <span className="text-green-400 font-mono text-[10px] ml-1">±{Math.round(gpsAccuracy || 0)}m</span>
                </span>
              ) : (
                <span className="text-yellow-500/90 font-medium">Buscando satélites...</span>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-3 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2">
                <span className="text-red-400 text-xl">⚠️</span>
                <p className="text-red-200 text-xs font-medium leading-snug">{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isLoading || !isFormValid}
              className={`
                w-full py-4 rounded-xl text-lg font-bold shadow-lg flex items-center justify-center gap-3 transition-all duration-300 transform active:scale-[0.98]
                ${isLoading || !isFormValid
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-blue-500/20 border border-transparent'}
              `}
            >
              {isLoading ? (
                <>
                  <Spinner />
                  <span className="text-sm font-normal animate-pulse">{loadingMessage}</span>
                </>
              ) : (
                <>GENERAR CÓDIGO QR</>
              )}
            </button>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        title="Confirmar Registro"
        message={`¿Generar QR para ${item.marca} ${item.modelo}? Se registrará en tu ubicación actual.`}
        onConfirm={handleConfirmGenerate}
        onCancel={() => setConfirmModalOpen(false)}
        confirmText="Sí, Crear"
      />
    </div>
  );
};

export default GenerateScreen;