import React from 'react';
import { Screen } from '../types';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: Screen) => void;
  onScanRequest: () => void;
  onInputCodeRequest: () => void;
  onPublicNavigate: (path: string) => void;
}

const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onClose, onNavigate, onScanRequest, onInputCodeRequest, onPublicNavigate }) => {
  if (!isOpen) return null;

  const menuItems = [
    { label: 'Inicio', action: () => onNavigate(Screen.Home) },
    { label: 'Escanear QR', action: onScanRequest },
    { label: 'Ingresar Código', action: onInputCodeRequest },
    { label: 'Generar QR', action: () => onNavigate(Screen.Generate) },
    { label: 'Mis Items', action: () => onNavigate(Screen.MyItems) },
    // Modificamos la antigua 'Vender' por 'Transferencias'
    { label: 'Transferencias', action: () => onNavigate(Screen.TRANSFERS) }, // <<< MODIFICAR ESTA LÍNEA
    { label: 'Ver Lista de Denuncias', action: () => onPublicNavigate('/denuncias') },
  ];

  return (
    <div className="absolute inset-0 z-50 flex" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="w-3/4 max-w-xs h-full bg-[#1e2a47] text-white shadow-2xl p-6 animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <style>
          {`
          @keyframes slide-in {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
          .animate-slide-in { animation: slide-in 0.3s ease-out; }
        `}
        </style>
        <h2 className="text-2xl font-bold text-yellow-400 mb-8 border-b border-blue-800 pb-4">Menú</h2>
        <nav>
          <ul>
            {menuItems.map((item, index) => (
              <li key={index} className="mb-4">
                <button
                  onClick={item.action}
                  className="w-full text-left text-lg text-gray-300 hover:text-white hover:bg-blue-900/50 p-3 rounded-lg transition-colors"
                >
                  {item.label}
                </button>
              </li>
            ))}

            {/* Solo visible si quieres acceder al panel */}
            <li className="mt-4 border-t border-gray-700 pt-2">
              <button onClick={() => onNavigate(Screen.ADMIN_PAYMENTS)} className="w-full text-left py-3 px-4 text-purple-400 hover:bg-white/5 flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                Admin Pagos
              </button>
            </li>
          </ul>
        </nav>
      </div>
      <div className="flex-grow bg-black/70"></div>
    </div>
  );
};

export default SideMenu;