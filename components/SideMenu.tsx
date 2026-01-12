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
  onProfileRequest: () => void;
  onTermsRequest: () => void;
  user: User | null;
}

// --- LISTA BLANCA DE ADMINS ---
const ADMIN_EMAILS = [
  'magritted12@gmail.com',
  'admin@qrseguro.com'
];

const SideMenu: React.FC<SideMenuProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onScanRequest,
  onInputCodeRequest,
  onPublicNavigate,
  onProfileRequest,
  onTermsRequest,
  user
}) => {

  // Estilo de botón aún más compactado
  const menuBtnClass = "w-full text-left py-1.5 px-3 text-gray-400 hover:bg-white/10 hover:text-white rounded-lg transition-all duration-200 flex items-center gap-3 text-sm font-medium";
  const iconClass = "text-base filter drop-shadow-sm w-5 text-center"; // Iconos alineados y más pequeños

  // Verificamos si es admin
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  return (
    <>
      {/* Estilos para Scrollbar Sutil */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>

      {/* Backdrop con Blur suave */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Menú Deslizable (Glassmorphism) */}
      <div className={`fixed top-0 left-0 h-full w-[80%] max-w-[280px] bg-[#0d1226]/95 backdrop-blur-xl shadow-2xl transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) z-[1001] border-r border-white/10 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* HEADER */}
        <div className="p-5 bg-gradient-to-r from-blue-900/20 to-transparent border-b border-white/5">
          <h2 className="text-xl font-black text-white tracking-tighter italic">
            QR<span className="text-blue-500">SEGURO</span>
          </h2>
          <p className="text-[9px] text-blue-200/60 uppercase tracking-widest mt-1 font-bold">Menú Principal</p>
        </div>

        {/* LISTA DE OPCIONES (Scrollable) */}
        <div className="flex-grow overflow-y-auto py-2 px-3 custom-scrollbar space-y-0.5">

          {/* PERFIL CARD (Compacto) */}
          <button onClick={() => { onProfileRequest(); onClose(); }} className="w-full text-left p-2 mb-3 bg-blue-600/10 border border-blue-500/20 rounded-xl hover:bg-blue-600/20 transition-all flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center font-bold text-xs shadow-lg group-hover:scale-105 transition-transform">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-white text-xs group-hover:text-blue-200 transition-colors">Mi Perfil</span>
              <span className="text-[9px] text-gray-500 truncate w-full opacity-70 italic">{user?.email}</span>
            </div>
          </button>

          {/* NAVEGACIÓN PRINCIPAL */}
          <button onClick={() => onNavigate(Screen.Home)} className={menuBtnClass}>
            <span className={iconClass}>🏠</span> INICIO
          </button>
          <button onClick={() => onNavigate(Screen.MyItems)} className={menuBtnClass}>
            <span className={iconClass}>📦</span> MIS ARTÍCULOS
          </button>
          <button onClick={() => onNavigate(Screen.Map)} className={menuBtnClass}>
            <span className={iconClass}>🗺️</span> RADAR GLOBAL
          </button>
          <button onClick={() => onNavigate(Screen.TRANSFERS)} className={menuBtnClass}>
            <span className={iconClass}>🤝</span> TRANSFERENCIAS
          </button>
          <button onClick={() => onNavigate(Screen.SELL)} className={menuBtnClass}>
            <span className={iconClass}>💰</span> VENDER ARTÍCULO
          </button>

          {/* DIVISOR SUTIL */}
          <div className="h-px bg-white/5 my-1.5 mx-2"></div>

          {/* ACCIONES RÁPIDAS */}
          <p className="px-3 text-[8px] text-gray-600 font-bold uppercase tracking-widest mb-1 mt-2">Acciones</p>
          <button onClick={onScanRequest} className={menuBtnClass}>
            <span className={iconClass}>📷</span> ESCANEAR QR
          </button>
          <button onClick={onInputCodeRequest} className={menuBtnClass}>
            <span className={iconClass}>⌨️</span> INGRESAR CÓDIGO
          </button>
          <button onClick={() => onNavigate(Screen.Generate)} className={menuBtnClass}>
            <span className={iconClass}>✚</span> NUEVO ÍTEM
          </button>

          {/* COMUNIDAD */}
          <p className="px-3 text-[8px] text-gray-600 font-bold uppercase tracking-widest mb-1 mt-2">Comunidad</p>
          <button onClick={() => { onPublicNavigate('/denuncias'); onClose(); }} className={menuBtnClass}>
            <span className={iconClass}>📢</span> ALERTAS PÚBLICAS
          </button>

          {/* LEGALES */}
          <div className="h-px bg-white/5 my-1.5 mx-2"></div>
          <button onClick={() => { onTermsRequest(); onClose(); }} className={menuBtnClass}>
            <span className={iconClass}>⚖️</span> LEGALES Y PRIVACIDAD
          </button>

          {/* ADMIN */}
          {isAdmin && (
            <div className="mt-3 pt-1.5 border-t border-purple-500/20">
              <button onClick={() => onNavigate(Screen.ADMIN_PAYMENTS)} className="w-full text-left py-1.5 px-3 text-purple-300 hover:bg-purple-500/10 rounded-lg flex items-center gap-3 transition-colors">
                <span className={iconClass}>🛡️</span>
                <div className="flex flex-col">
                  <span className="font-bold text-[10px]">PANEL ADMIN</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-3 border-t border-white/5 bg-[#0a0e1e]/50">
          <button onClick={onClose} className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-500 text-[10px] font-medium transition-colors border border-white/5">
            Cerrar Menú
          </button>
          <p className="text-center text-[8px] text-gray-700 mt-2 font-mono">v7.8 STABLE</p>
        </div>
      </div>
    </>
  );
};

export default SideMenu;