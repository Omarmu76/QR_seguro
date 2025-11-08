
import React from 'react';
import { Screen } from '../types';
import Header from '../components/Header';

interface HomeScreenProps {
  onScanRequest: () => void;
  onNavigate: (screen: Screen) => void;
  onPublicNavigate: (path: string) => void;
  onMenuClick: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onScanRequest, onNavigate, onPublicNavigate, onMenuClick }) => {
  return (
    <div className="flex flex-col h-full bg-[#0d1226]">
      <Header title="QR SEGURO" onMenuClick={onMenuClick} />
      
      <div className="relative flex-grow">
        <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
            <img src="https://picsum.photos/400/800?grayscale&blur=2" alt="Map background" className="w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-black/50"></div>
            <div className="text-center text-white z-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="mt-2 text-lg font-semibold">Ubicación Actual</p>
                <p className="text-sm text-gray-300">Sistema Activo</p>
            </div>
        </div>

        <div className="absolute bottom-20 left-0 right-0 p-4 pb-8 space-y-4">
          <button
            onClick={onScanRequest}
            className="w-full bg-yellow-500 text-black py-4 rounded-lg text-lg font-bold shadow-lg transform hover:scale-105 transition-transform"
          >
            ESCANEAR QR
          </button>
          
          <button 
            onClick={() => onPublicNavigate('/denuncias')} 
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold shadow-md transition-colors hover:bg-red-700"
          >
            VER LISTA DE DENUNCIAS
          </button>
          
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => onNavigate(Screen.Generate)} className="bg-blue-600 text-white py-3 rounded-lg font-semibold shadow-md transition-colors hover:bg-blue-700">CREAR QR</button>
            <button onClick={() => onNavigate(Screen.Sell)} className="bg-green-600 text-white py-3 rounded-lg font-semibold shadow-md transition-colors hover:bg-green-700">VENDER</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
