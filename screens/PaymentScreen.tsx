import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Item } from '../types';
import Spinner from '../components/Spinner';
import { notifyPayment } from '../services/adminService';

interface PaymentScreenProps {
  item: Item;
  user: User;
  onActivationComplete: () => void;
  onCancel: () => void;
}

const PaymentScreen: React.FC<PaymentScreenProps> = ({ item, user, onActivationComplete, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Precio del servicio
  const SERVICE_PRICE = 1500;

  const handlePayment = async () => {
    if (!item.qrId) return;
    setLoading(true);
    setError(null);

    try {
      // AHORA: Solo notifica y pone en revisión
      await notifyPayment(item, user, SERVICE_PRICE, 'PREX_MANUAL');

      // Usar alert nativo o un modal custom si prefieres, para este MVP alert está bien
      alert("¡Aviso enviado! 📨\n\nTu pago está en revisión. El servicio se activará en breve cuando el administrador lo verifique.");
      onActivationComplete();
    } catch (err: any) {
      setError("Error al enviar aviso.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-4 animate-fade-in">
      <div className="w-full max-w-md bg-[#1e2a47] rounded-2xl overflow-hidden shadow-2xl border border-gray-700 relative">

        {/* Header Visual con estilo Prex */}
        <div className="bg-[#462378] p-6 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <h2 className="text-2xl font-bold text-white relative z-10">Activar Servicio</h2>
          <p className="text-purple-200 text-xs uppercase tracking-widest relative z-10 mt-1">QR Seguro Protection</p>
        </div>

        <div className="p-6">
          {/* Detalles */}
          <div className="flex justify-between items-end mb-6 border-b border-gray-600 pb-4">
            <div>
              <p className="text-gray-400 text-[10px] uppercase font-bold">Artículo</p>
              <p className="text-white font-bold text-lg leading-tight">{item.marca}</p>
              <p className="text-gray-300 text-sm">{item.modelo}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-[10px] uppercase">Costo Anual</p>
              <p className="text-yellow-400 font-mono text-2xl font-bold">${SERVICE_PRICE}</p>
            </div>
          </div>

          <p className="text-gray-400 text-xs mb-6 text-center bg-black/20 p-3 rounded-lg">
            Al activar, se desbloqueará el QR, podrás gestionar denuncias y transferencias.
          </p>

          {/* Botonera */}
          <div className="space-y-3">
            {loading ? (
              <div className="py-6 flex flex-col items-center justify-center bg-black/20 rounded-xl">
                <Spinner />
                <p className="text-purple-300 text-xs mt-3 animate-pulse font-bold">Procesando pago seguro...</p>
              </div>
            ) : (
              <>
                <button
                  onClick={handlePayment}
                  className="w-full bg-[#6a35b8] hover:bg-[#7e4cc9] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-purple-900/50 transition-all transform active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {/* Simulación de Logo Prex */}
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-[#462378] font-black text-xs">P</div>
                  <span>Pagar con <span className="font-black italic">PREX</span></span>
                </button>

                <button
                  onClick={onCancel}
                  className="w-full py-3 text-gray-500 hover:text-white text-sm font-bold transition-colors"
                >
                  Cancelar y volver
                </button>
              </>
            )}
          </div>

          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/50 p-3 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-red-200 text-xs">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentScreen;