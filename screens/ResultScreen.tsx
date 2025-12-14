
import React from 'react';
import { Item, ItemStatus } from '../types';

interface ResultScreenProps {
  result: {
    item: Item;
    status: ItemStatus;
  };
  onClose: () => void;
}

const statusConfig = {
  [ItemStatus.Denunciado]: {
    bgColor: 'bg-red-600',
    textColor: 'text-red-400',
    title: '¡ALERTA! ROBADO',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    message: 'Este item ha sido denunciado como robado. No continuar con la transacción y notificar a las autoridades.',
  },
  [ItemStatus.EnRegla]: {
    bgColor: 'bg-yellow-500',
    textColor: 'text-yellow-400',
    title: 'EN REGLA',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    message: 'Este item se encuentra en regla. No posee denuncias activas.',
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
    message: 'La transacción de este item ha sido completada.',
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
    message: 'Este item fue denunciado pero ya ha sido recuperado.',
  },
};

const ResultScreen: React.FC<ResultScreenProps> = ({ result, onClose }) => {
  const currentStatus = result.status || ItemStatus.EnRegla;
  const config = statusConfig[currentStatus] || statusConfig[ItemStatus.EnRegla];
  const { item } = result;

  return (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4">
      <div className={`w-full max-w-sm ${config.bgColor} rounded-xl shadow-2xl text-white overflow-hidden`}>
        <div className="p-8 text-center">
            <div className="mb-6 flex justify-center">{config.icon}</div>
            <h2 className="text-3xl font-bold tracking-wider mb-4">{config.title}</h2>
        </div>
        <div className="bg-[#0d1226]/80 p-6">
            <div className="space-y-3 text-lg">
                <p><span className="font-bold text-gray-400">Tipo:</span> {item.tipo}</p>
                <p><span className="font-bold text-gray-400">Marca:</span> {item.marca}</p>
                <p><span className="font-bold text-gray-400">Modelo:</span> {item.modelo}</p>
                <p><span className="font-bold text-gray-400">ID:</span> {item.identificador}</p>
            </div>
            <p className={`mt-6 text-center text-sm ${config.textColor}`}>{config.message}</p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="mt-6 bg-white text-black py-2 px-8 rounded-full text-lg font-bold"
      >
        CERRAR
      </button>
    </div>
  );
};

export default ResultScreen;
