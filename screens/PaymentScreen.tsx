import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Item, PaymentMethod } from '../types';
import { initiatePayment } from '../services/paymentService';
import Spinner from '../components/Spinner';

interface PaymentScreenProps {
  item: Item;
  user: User;
  onActivationComplete: () => void;
  onCancel: () => void;
}

const PaymentScreen: React.FC<PaymentScreenProps> = ({ item, user, onActivationComplete, onCancel }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleActivate = async () => {
    if (!item.qrId) {
      setError('ID de item no válido.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      // Hardcode MercadoPago as it's the first implementation
      const response = await initiatePayment(item, PaymentMethod.MercadoPago);
      if (response && response.checkoutUrl) {
        window.open(response.checkoutUrl, '_blank', 'noopener,noreferrer');
        // Close the modal as the user is now directed to an external payment page.
        // Activation will happen in the backend via webhook.
        onCancel();
      } else {
        throw new Error('No se pudo obtener la URL de pago.');
      }
    } catch (err: any) {
      setError(err.message || 'No se pudo iniciar el proceso de pago.');
      setIsLoading(false); // Only stop loading on error
    }
  };


  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-sm bg-[#1e2a47] rounded-lg shadow-2xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-4 text-center text-yellow-400">Activar Item</h2>
        <p className="text-center text-gray-300 mb-6">
          Desbloquea todas las funciones de tu item para máxima seguridad.
        </p>
        
        <div className="bg-gray-800/80 p-4 rounded-lg space-y-2 mb-6">
          <p><span className="font-semibold text-gray-400">Item:</span> {item.marca} {item.modelo}</p>
          <p><span className="font-semibold text-gray-400">ID:</span> {item.identificador}</p>
        </div>
        
        <div className="text-center mb-6">
            <p className="text-gray-400">Precio (Pago Único)</p>
            <p className="text-4xl font-bold text-green-400">$1.99 USD</p>
        </div>

        {error && <p className="text-red-500 text-center text-sm mb-4">{error}</p>}

        <div className="space-y-3">
          <button
            onClick={handleActivate}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex justify-center items-center"
          >
            {isLoading ? <Spinner /> : 'Pagar para Activar'}
          </button>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentScreen;