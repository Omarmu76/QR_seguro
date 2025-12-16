import React from 'react';
import { Screen } from '../types';
import { User } from 'firebase/auth';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: Screen) => void;
  onScanRequest: () => void;
  onInputCodeRequest: () => void;
  onPublicNavigate: (path: string) => void;
  user: User | null;
}

// --- LISTA BLANCA DE ADMINS ---
const ADMIN_EMAILS = [
  'magritted12@gmail.com', // <--- IMPORTANTE: PON TU CORREO AQUÍ
  'admin@qrseguro.com'
];

const SideMenu: React.FC<SideMenuProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onScanRequest,
  onInputCodeRequest,
  onPublicNavigate,
  user
}) => {

  const menuBtnClass = "w-full text-left py-2.5 px-4 text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-3 border-b border-gray-800/50";

  // Verificamos si es admin
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  return (
    <>
      {isOpen && (
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[1000]"
          onClick={onClose}
        />
      )}

      <div className={`absolute top-0 left-0 h-full w-3/4 max-w-xs bg-[#0f1523] shadow-2xl transform transition-transform duration-300 ease-out z-[1001] border-r border-gray-700 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        <div className="p-5 border-b border-gray-700 bg-gradient-to-r from-[#1e2a47] to-[#0f1523]">
          <h2 className="text-xl font-black text-white tracking-wider">QR<span className="text-yellow-400">SEGURO</span></h2>
          <p className="text-xs text-gray-400 mt-1">Menú Principal</p>
        </div>

        <div className="flex-grow overflow-y-auto py-2">
          <button onClick={() => onNavigate(Screen.Home)} className={menuBtnClass}>
            <span className="text-xl">🏠</span> INICIO
          </button>
          <button onClick={() => onNavigate(Screen.MyItems)} className={menuBtnClass}>
            <span className="text-xl">📦</span> MIS ARTÍCULOS
          </button>
          <button onClick={() => onNavigate(Screen.Map)} className={menuBtnClass}>
            <span className="text-xl">🗺️</span> MAPA GLOBAL
          </button>
          <button onClick={() => onNavigate(Screen.TRANSFERS)} className={menuBtnClass}>
            <span className="text-xl">🤝</span> TRANSFERENCIAS
          </button>

          <div className="my-2 border-t border-gray-700 mx-4"></div>
          <p className="px-4 text-[10px] text-gray-500 font-bold uppercase mb-1">Acciones Rápidas</p>

          <button onClick={onScanRequest} className={menuBtnClass}>
            <span className="text-xl">📷</span> ESCANEAR QR
          </button>
          <button onClick={onInputCodeRequest} className={menuBtnClass}>
            <span className="text-xl">⌨️</span> INGRESAR CÓDIGO
          </button>
          <button onClick={() => onNavigate(Screen.Generate)} className={menuBtnClass}>
            <span className="text-xl">➕</span> NUEVO ITEM
          </button>

          <div className="my-2 border-t border-gray-700 mx-4"></div>
          <p className="px-4 text-[10px] text-gray-500 font-bold uppercase mb-1">Comunidad</p>

          <button onClick={() => { onPublicNavigate('/denuncias'); onClose(); }} className={menuBtnClass}>
            <span className="text-xl">📢</span> ALERTAS PÚBLICAS
          </button>

          {/* --- SECCIÓN ADMIN (SOLO VISIBLE SI ES ADMIN) --- */}
          {isAdmin && (
            <>
              <div className="my-2 border-t border-gray-700 mx-4"></div>
              <button onClick={() => onNavigate(Screen.ADMIN_PAYMENTS)} className="w-full text-left py-3 px-4 text-purple-400 hover:bg-purple-900/20 hover:text-purple-300 flex items-center gap-3 transition-colors bg-purple-900/10">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">PANEL ADMIN</span>
                  <span className="text-[9px] text-gray-500">Gestión de Pagos</span>
                </div>
              </button>
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-800 bg-[#0f1523]">
          <button onClick={onClose} className="w-full py-2 bg-gray-800 rounded text-gray-400 text-sm hover:text-white hover:bg-gray-700">
            Cerrar Menú
          </button>
        </div>
      </div>
    </>
  );
};

export default SideMenu;