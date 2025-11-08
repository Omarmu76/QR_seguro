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
    { label: 'Vender', action: () => onNavigate(Screen.Sell) },
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
          </ul>
        </nav>
      </div>
      <div className="flex-grow bg-black/70"></div>
    </div>
  );
};

export default SideMenu;