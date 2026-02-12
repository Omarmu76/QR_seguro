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

// --- DICCIONARIO DE AYUDA (V1.0 PROFESIONAL) ---
const HELP_CONTENT = {
  vehiculo: "El VIN (Chasis) suele estar grabado en el parabrisas (abajo a la izquierda) o en el parante de la puerta del conductor. Son 17 dígitos.",
  movilidad: "El número de cuadro suele estar debajo del eje de los pedales o en el poste del manubrio. Limpia la zona para leerlo bien.",
  tecnologia: "📱 Celulares: Marca *#06# en el teclado para ver el IMEI. 💻 Notebooks: Busca la etiqueta S/N o Serial en la base trasera.",
  hogar: "Busca una placa metálica o etiqueta adhesiva en la parte trasera o inferior con las siglas S/N o Serial Number."
};

interface GenerateScreenProps {
  onGenerateComplete: (result: Item) => void;
  user: User;
  onMenuClick: () => void;
}

const GenerateScreen: React.FC<GenerateScreenProps> = ({ onGenerateComplete, user, onMenuClick }) => {

  // --- ESTADOS (Lógica V1.0 PROFESIONAL) ---
  const [category, setCategory] = useState<'vehiculo' | 'movilidad' | 'tecnologia' | 'hogar' | ''>('');
  
  const [item, setItem] = useState({
    tipo: '',        // Categoría (mapeado para itemService)
    subtipo: '',     // Ej: Moto, Notebook
    marca: '',
    modelo: '',
    color: '',
    patente: '',
    chassis: '',
    motor: '',
    imei: '',
    serialNumber: '',
    facturaNro: '',
    pais: 'AR',
    identificador: '', // Mantenemos por compatibilidad con saveItem
  });

  const [helpTitle, setHelpTitle] = useState('');
  const [helpText, setHelpText] = useState('');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
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
    const { name, value } = e.target;
    setItem(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cat = e.target.value as any;
    setCategory(cat);
    setItem(prev => ({ ...prev, tipo: cat, subtipo: '' })); // Reset subtipo al cambiar categoría
  };

  const openHelp = (key: keyof typeof HELP_CONTENT, title: string) => {
    setHelpTitle(title);
    setHelpText(HELP_CONTENT[key]);
    setIsHelpModalOpen(true);
  };

  // VALIDACIÓN LEGAL: categoría, subtipo y al menos UN dato oficial
  const isFormValid = !!category && !!item.subtipo && !!item.marca && 
    (!!item.patente || !!item.imei || !!item.serialNumber || !!item.chassis);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setError("Faltan datos obligatorios para la certificación legal.");
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
    // 1. CONTENEDOR MAESTRO (Fondo Negro - Monitor)
    <div className="w-full h-full bg-black flex justify-center items-center relative overflow-hidden">

      {/* 2. COLUMNA IZQUIERDA (Publicidad PC) */}
      <div id="ad-space-left" className="hidden lg:flex flex-1 h-full items-center justify-center z-0 relative">
        {/* Espacio reservado para Ads */}
      </div>

      {/* 3. COLUMNA CENTRAL (App Flotante) */}
      <div className="w-full h-full lg:max-w-md lg:h-[95dvh] lg:rounded-[2.5rem] lg:border-[8px] lg:border-[#1a1f35] lg:shadow-2xl bg-[#0d1226] flex flex-col relative z-10 overflow-hidden transition-all duration-300">

        {/* FONDO DECORATIVO INTERNO */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-cyan-600/20 rounded-full blur-[100px]"></div>
        </div>

        <Header title="NUEVO PROTEGIDO" onMenuClick={onMenuClick} />

        {/* CONTENIDO SCROLLABLE */}
        <div className="flex-grow p-4 overflow-y-auto custom-scrollbar z-10 flex flex-col items-center justify-start pb-24 relative">
          <div className="w-full max-w-md space-y-3">

            <div className={glassCardClass}>
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"></div>

              <div className="space-y-4">
                {/* 1. SELECCIÓN DE CATEGORÍA */}
                <div>
                  <label className={labelClass}>Categoría de Activo</label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={handleCategoryChange}
                      className={`${inputClass} appearance-none cursor-pointer text-blue-100 font-bold`}
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="vehiculo">🚗 Vehículo (Auto, Moto...)</option>
                      <option value="movilidad">🚲 Movilidad (Bici, Monopatín...)</option>
                      <option value="tecnologia">📱 Tecnología (Celular, PC...)</option>
                      <option value="hogar">📺 Hogar (Electro, TV...)</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-blue-400">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                    </div>
                  </div>
                </div>

                {category && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* 2. SUBTIPO Y MARCA */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Tipo Específico</label>
                        <input
                          type="text"
                          name="subtipo"
                          value={item.subtipo}
                          onChange={handleChange}
                          placeholder="Ej: Moto, Monopatín"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Marca</label>
                        <input
                          type="text"
                          name="marca"
                          value={item.marca}
                          onChange={handleChange}
                          placeholder="Ej: Honda, Apple"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    {/* 3. MODELO Y COLOR */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Modelo</label>
                        <input
                          type="text"
                          name="modelo"
                          value={item.modelo}
                          onChange={handleChange}
                          placeholder="Ej: Wave, iPhone 15"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Color Predominante</label>
                        <input
                          type="text"
                          name="color"
                          value={item.color}
                          onChange={handleChange}
                          placeholder="Ej: Negro Mate"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="my-2 border-t border-white/5"></div>

                    {/* 4. CAMPOS LEGALES SEGÚN CATEGORÍA */}
                    {category === 'vehiculo' && (
                      <div className="space-y-3">
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <label className={labelClass}>Patente (Dominio)</label>
                            <input name="patente" value={item.patente} onChange={handleChange} placeholder="Ej: AA123BB" className={inputClass} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <label className="text-[10px] font-medium text-blue-300/80 uppercase tracking-wider">Nro de Chasis</label>
                              <button type="button" onClick={() => openHelp('vehiculo', '¿Dónde está el Chasis?')} className="text-blue-400 hover:text-blue-300">ⓘ</button>
                            </div>
                            <input name="chassis" value={item.chassis} onChange={handleChange} placeholder="17 dígitos..." className={inputClass} />
                          </div>
                        </div>
                        <div>
                          <label className={labelClass}>Nro de Motor (Opcional)</label>
                          <input name="motor" value={item.motor} onChange={handleChange} placeholder="Ej: ABC12345" className={inputClass} />
                        </div>
                      </div>
                    )}

                    {category === 'movilidad' && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <label className={labelClass}>Número de Cuadro / Serie</label>
                          <button type="button" onClick={() => openHelp('movilidad', '¿Dónde está el Serie?')} className="text-blue-400 hover:text-blue-300">ⓘ</button>
                        </div>
                        <input name="chassis" value={item.chassis} onChange={handleChange} placeholder="Grabado en el cuadro..." className={inputClass} />
                      </div>
                    )}

                    {category === 'tecnologia' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <label className="text-[10px] font-medium text-blue-300/80 uppercase tracking-wider">IMEI (Celulares)</label>
                            <button type="button" onClick={() => openHelp('tecnologia', '¿Cómo ver mi IMEI?')} className="text-blue-400 hover:text-blue-300">ⓘ</button>
                          </div>
                          <input name="imei" value={item.imei} onChange={handleChange} placeholder="15 dígitos..." className={inputClass} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <label className="text-[10px] font-medium text-blue-300/80 uppercase tracking-wider">Número de Serie</label>
                            <button type="button" onClick={() => openHelp('tecnologia', '¿Dónde encontrar Serial?')} className="text-blue-400 hover:text-blue-300">ⓘ</button>
                          </div>
                          <input name="serialNumber" value={item.serialNumber} onChange={handleChange} placeholder="S/N: ..." className={inputClass} />
                        </div>
                      </div>
                    )}

                    {category === 'hogar' && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <label className={labelClass}>Número de Serie</label>
                          <button type="button" onClick={() => openHelp('hogar', '¿Dónde buscar el Serie?')} className="text-blue-400 hover:text-blue-300">ⓘ</button>
                        </div>
                        <input name="serialNumber" value={item.serialNumber} onChange={handleChange} placeholder="Etiqueta trasera..." className={inputClass} />
                      </div>
                    )}

                    {/* BANNER LEGAL OBLIGATORIO */}
                    <div className="mt-4 p-3 bg-red-900/10 border-l-2 border-red-600 rounded-r-lg">
                      <p className="text-[9px] text-gray-300 uppercase font-black tracking-tighter leading-tight">
                        <span className="text-red-500">IMPORTANTE:</span> El registro oficial (IMEI, Chasis, Serie, Patente) 
                        otorga <span className="text-white">AUTENTICIDAD LEGAL</span>. La omisión de estos datos invalida la certificación de propiedad 
                        ante autoridades.
                      </p>
                    </div>

                    {/* MANTENEMOS VIGÍA SÓLO SI APLICA */}
                    <div
                      onClick={() => setIsSelfDevice(!isSelfDevice)}
                      className={`
                        relative rounded-xl p-3 transition-all duration-300 border cursor-pointer group mt-2
                        ${isSelfDevice
                          ? 'bg-blue-600/20 border-blue-500/60 shadow-[0_0_20px_rgba(37,99,235,0.15)]'
                          : 'bg-white/5 border-white/5 hover:bg-white/10'}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg ${isSelfDevice ? 'bg-blue-500 text-white' : 'bg-gray-700/50 text-gray-500'}`}>
                          <DeviceIcon />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`font-bold text-xs ${isSelfDevice ? 'text-blue-200' : 'text-gray-300'}`}>Activar Vigía</span>
                            <div className={`w-7 h-4 rounded-full relative transition-colors ${isSelfDevice ? 'bg-blue-500' : 'bg-gray-600/50'}`}>
                              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isSelfDevice ? 'left-3.5' : 'left-0.5'}`}></div>
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-400 leading-tight">Usa este dispositivo como rastreador GPS.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 pt-1">

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
                  <>GENERAR</>
                )}
              </button>
            </div>
          </div>

          {/* INDICADOR DE SCROLL SUTIL (Posicionado arriba del botón) */}
          <div className="absolute bottom-[100px] left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce opacity-50 pointer-events-none">
            <span className="text-[10px] text-blue-400 uppercase tracking-tighter mb-1 font-bold">Más abajo</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          title="Confirmar Registro"
          message={`¿Generar QR para ${item.marca} ${item.modelo}? Se registrará en tu ubicación actual con certificación legal.`}
          onConfirm={handleConfirmGenerate}
          onCancel={() => setConfirmModalOpen(false)}
          confirmText="Sí, Crear"
        />

        {/* MODAL DE AYUDA CONTEXTUAL (V1.0 PROFESIONAL) */}
        {isHelpModalOpen && (
          <div className="absolute inset-0 z-[3000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-[#111928] border border-blue-500/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 text-center">
              <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">ℹ️</div>
              <h3 className="text-xl font-black text-white mb-2 uppercase tracking-wide">{helpTitle}</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">{helpText}</p>
              <button 
                onClick={() => setIsHelpModalOpen(false)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all uppercase tracking-widest text-xs"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. COLUMNA DERECHA (Publicidad PC) */}
      <div id="ad-space-right" className="hidden lg:flex flex-1 h-full items-center justify-center z-0 relative">
        {/* Espacio reservado para Ads */}
      </div>

    </div>
  );
};

export default GenerateScreen;