import React, { useEffect } from 'react';
import { User } from 'firebase/auth';
import { Item, ItemStatus, Screen } from '../types';
import { reportFinding } from '../services/itemService';

/**
 * Interfaz ResultScreenProps
 * Definimos las propiedades necesarias para la lógica de visualización y acciones.
 * @property result - El objeto que contiene el ítem escaneado y su estado.
 * @property currentUser - El usuario autenticado actual.
 * @property onClose - Función para cerrar la pantalla de resultados.
 * @property onNavigate - Función para navegar a otras pantallas (ej: Solicitar Transferencia).
 */
interface ResultScreenProps {
  result: {
    item: Item;
    status: ItemStatus;
    location?: { lat: number; lng: number } | null;
  };
  currentUser: User | null;
  onClose: () => void;
  onNavigate: (screen: Screen, item: Item) => void;
}

const statusConfig = {
  [ItemStatus.Denunciado]: {
    bgColor: 'bg-red-600',
    textColor: 'text-red-400',
    title: 'DENUNCIADO', // Cambiado de ROBADO a DENUNCIADO según Paso 2
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    message: 'Este artículo ha sido reportado. Su ubicación ha sido enviada al dueño de forma segura.',
  },
  [ItemStatus.EnRegla]: {
    bgColor: 'bg-green-600', // Cambiado a VERDE según Paso 2
    textColor: 'text-green-400',
    title: 'EN REGLA',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    message: 'Este artículo se encuentra en regla. No posee denuncias activas.',
  },
  [ItemStatus.Vendido]: {
    bgColor: 'bg-green-600',
    textColor: 'text-green-400',
    title: 'VENDIDO',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    message: 'La transacción de este artículo ha sido completada.',
  },
  [ItemStatus.Recuperado]: {
    bgColor: 'bg-blue-600',
    textColor: 'text-blue-400',
    title: 'RECUPERADO',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    message: 'Este artículo fue denunciado pero ya ha sido recuperado.',
  },
};

const ResultScreen: React.FC<ResultScreenProps> = ({ result, currentUser, onClose, onNavigate }) => {
  const { item, status, location } = result;
  const currentStatus = status || ItemStatus.EnRegla;
  const config = statusConfig[currentStatus] || statusConfig[ItemStatus.EnRegla];

  /**
   * Efecto de Alerta y Reporte (Paso 2)
   * Se ejecuta al cargar el componente si el ítem está denunciado.
   */
  useEffect(() => {
    if (item && currentStatus === ItemStatus.Denunciado) {
      // 1. Sonido corto de error (BEEP) - Regla de Paso 2
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
      audio.play().catch(e => console.log("Audio autoplay bloqueado", e));

      // 2. Reporte Silencioso (Si el escáner capturó el GPS)
      if (location && item.qrId) {
         reportFinding(item.qrId, location.lat, location.lng, currentUser?.uid || 'anon');
      }
    }
  }, [item, currentStatus, location, currentUser]);

  /**
   * Función: renderActionButtons
   * Propósito: Mostrar opciones de transferencia o denuncia según el estado y dueño.
   */
  const renderActionButtons = () => {
    // Si el ítem es mío, no mostramos botones de acción externa
    if (item.ownerId === currentUser?.uid) return null;

    // Si está en regla -> Habilitamos solicitud de transferencia
    if (currentStatus === ItemStatus.EnRegla || currentStatus === ItemStatus.Vendido) {
      return (
        <button 
          onClick={() => onNavigate(Screen.REQUEST_TRANSFER, item)}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 mt-6 animate-pulse"
        >
          🔄 SOLICITAR TRANSFERENCIA
        </button>
      );
    }

    // Si está denunciado -> Mostramos alerta roja y botón de hallazgo
    if (currentStatus === ItemStatus.Denunciado) {
      return (
        <div className="mt-6 w-full bg-red-900/50 p-4 rounded-xl border border-red-500 text-center">
          <p className="text-red-200 font-bold mb-2 uppercase tracking-tighter">⚠️ ESTE ARTÍCULO FUE REPORTADO</p>
          <button 
            onClick={() => alert("Gracias. La ubicación ha sido enviada al dueño de forma segura.")}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-inner transition-colors"
          >
            🚨 REPORTAR HALLAZGO
          </button>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-sm ${config.bgColor} rounded-xl shadow-2xl text-white overflow-hidden border-2 border-white/10`}>
        <div className="p-8 text-center bg-black/10">
            <div className="mb-6 flex justify-center">{config.icon}</div>
            <h2 className="text-3xl font-black tracking-widest mb-2">{config.title}</h2>
        </div>
        
        <div className="bg-[#0d1226]/90 p-6">
            <div className="space-y-3 text-lg border-b border-white/5 pb-4 mb-4">
                <p className="flex justify-between"><span className="font-bold text-blue-400 uppercase text-xs tracking-widest">Tipo</span> <span className="font-medium">{item.tipo}</span></p>
                <p className="flex justify-between"><span className="font-bold text-blue-400 uppercase text-xs tracking-widest">Marca</span> <span className="font-medium">{item.marca}</span></p>
                <p className="flex justify-between"><span className="font-bold text-blue-400 uppercase text-xs tracking-widest">Modelo</span> <span className="font-medium">{item.modelo}</span></p>
                <p className="flex justify-between"><span className="font-bold text-blue-400 uppercase text-xs tracking-widest">ID</span> <span className="font-mono text-sm">{item.identificador}</span></p>
            </div>
            <p className={`text-center text-sm font-bold uppercase ${config.textColor} leading-tight`}>{config.message}</p>
        </div>
      </div>

      {renderActionButtons()}

      <button
        onClick={onClose}
        className="mt-6 bg-white/10 hover:bg-white/20 text-white py-3 px-12 rounded-full text-lg font-bold border border-white/10 transition-all active:scale-95"
      >
        CERRAR
      </button>
    </div>
  );
};

export default ResultScreen;
