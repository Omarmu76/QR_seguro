import React, { useState, useEffect } from 'react';
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
  const [currency, setCurrency] = useState<'USD' | 'ARS' | 'BRL' | 'PYG'>('ARS');
  const [rate, setRate] = useState<number>(1);
  const [finalPrice, setFinalPrice] = useState<number>(0);

  // Estado para el Modal de Confirmación de Envío
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('');

  const BASE_PRICE_USD = 2; // 2 Dólares Mensuales

  // --- 1. LÓGICA DE COTIZACIÓN ---
  useEffect(() => {
    const fetchRates = async () => {
      if (currency === 'USD') {
        setRate(1);
        setFinalPrice(BASE_PRICE_USD);
        return;
      }

      if (currency === 'ARS') {
        try {
          // API Dolar Blue Argentina
          const response = await fetch('https://dolarapi.com/v1/dolares/blue');
          const data = await response.json();
          const blueVenta = data.venta || 1200; // Fallback si falla api
          setRate(blueVenta);
          setFinalPrice(BASE_PRICE_USD * blueVenta);
        } catch (e) {
          console.error("Error API Dolar", e);
          setRate(1200); // Valor fallback seguro
          setFinalPrice(BASE_PRICE_USD * 1200);
        }
      } else if (currency === 'BRL') {
        // Tasa fija aproximada (Actualizable)
        const manualRate = 5.5;
        setRate(manualRate);
        setFinalPrice(BASE_PRICE_USD * manualRate);
      } else if (currency === 'PYG') {
        // Tasa fija aproximada (Guaraníes)
        const manualRate = 7500;
        setRate(manualRate);
        setFinalPrice(BASE_PRICE_USD * manualRate);
      }
    };

    fetchRates();
  }, [currency]);

  // --- 2. PREPARAR NOTIFICACIÓN ---
  const handlePreNotify = (method: string) => {
    setSelectedMethod(method);
    setShowConfirmModal(true); // Abrimos modal de "¿Cómo envías el comprobante?"
  };

  // --- 3. PROCESO FINAL (Firebase + WhatsApp/Mail) ---
  const executeNotification = async (channel: 'WHATSAPP' | 'EMAIL' | 'APP_ONLY') => {
    setLoading(true);
    try {
      // A. Guardar en Firebase
      await notifyPayment(item, user, finalPrice, selectedMethod, currency);

      // B. Redirigir externamente si corresponde
      const message = `Hola QRseguro! 🛡️\nEnvío comprobante de pago.\n\nUsuario: ${user.email}\nItem: ${item.marca} ${item.modelo}\nMonto: ${finalPrice} ${currency}\nID Item: ${item.qrId}`;

      if (channel === 'WHATSAPP') {
        const url = `https://wa.me/5493743416347?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
      } else if (channel === 'EMAIL') {
        const subject = `Comprobante de Pago - ${user.email}`;
        const url = `mailto:magritted12gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
      }

      alert("✅ Aviso registrado. Tu servicio se activará en breve tras la verificación.");
      onActivationComplete();

    } catch (err) {
      alert("Error al registrar el aviso. Intenta de nuevo.");
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copiado: " + text);
  };

  return (
    <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-50 p-4 animate-fade-in">

      {/* --- MODAL CONFIRMACIÓN DE ENVÍO --- */}
      {showConfirmModal && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[60]">
          <div className="bg-[#1e2a47] p-6 rounded-xl border border-blue-500 w-11/12 max-w-sm shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-2 text-center">🧾 Enviar Comprobante</h3>
            <p className="text-gray-300 text-sm text-center mb-6">
              Ya registramos tu intención de pago. <br />
              Para acelerar la activación, envíanos la foto del comprobante ahora.
            </p>

            <div className="space-y-3">
              <button onClick={() => executeNotification('WHATSAPP')} className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2">
                <span className="text-xl">📱</span> Enviar por WhatsApp
              </button>
              <button onClick={() => executeNotification('EMAIL')} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2">
                <span className="text-xl">📧</span> Enviar por Email
              </button>
              <button onClick={() => executeNotification('APP_ONLY')} className="w-full bg-gray-700 text-gray-300 py-2 rounded-lg text-xs font-bold mt-2">
                Ya lo envié antes / Solo avisar
              </button>
            </div>
            <button onClick={() => setShowConfirmModal(false)} className="w-full mt-4 text-red-400 text-xs underline">Cancelar</button>
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 bg-black/50 z-[70] flex justify-center items-center">
          <Spinner />
        </div>
      )}

      <div className="w-full max-w-md bg-[#0f1523] rounded-2xl overflow-hidden shadow-2xl border border-gray-700 flex flex-col max-h-[90vh]">

        {/* HEADER */}
        <div className="bg-[#1e3a8a] p-5 text-center relative shadow-lg">
          <h2 className="text-xl font-bold text-white tracking-wide">ACTIVAR SERVICIO</h2>
          <p className="text-blue-200 text-xs mt-1">Suscripción Mensual</p>
          <button onClick={onCancel} className="absolute top-4 right-4 text-white/70 hover:text-white">✕</button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-6">

          {/* CONVERSOR DE MONEDA */}
          <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-500/30 text-center">
            <p className="text-gray-400 text-xs uppercase mb-2 font-bold">Selecciona tu Moneda</p>

            <div className="flex justify-center gap-2 mb-4">
              {['ARS', 'USD', 'BRL', 'PYG'].map(c => (
                <button
                  key={c}
                  onClick={() => setCurrency(c as any)}
                  className={`px-3 py-1 rounded text-xs font-bold border transition-all ${currency === c ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-transparent text-gray-400 border-gray-600'}`}
                >
                  {c}
                </button>
              ))}
            </div>

            <p className="text-gray-300 text-xs">Valor Base: 2 USD</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <p className="text-yellow-400 font-mono text-4xl font-bold">
                {currency === 'USD' ? `$${finalPrice}` : `$${Math.ceil(finalPrice).toLocaleString()}`}
              </p>
              <span className="text-white font-bold text-sm mt-2">{currency}</span>
            </div>
            {currency === 'ARS' && <p className="text-[10px] text-gray-500 mt-1">Cotización Blue: ${rate}</p>}
          </div>

          <p className="text-center text-gray-400 text-xs px-4">
            Realiza la transferencia a cualquiera de estas cuentas y luego informa el pago.
          </p>

          {/* OPCIÓN 1: PREX */}
          <div className="bg-[#1e2a47] p-4 rounded-xl border border-gray-600 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-purple-600 px-3 py-1 rounded-bl-lg text-[10px] font-bold text-white">RECOMENDADO</div>
            <div className="mb-3 border-b border-gray-600 pb-2">
              <span className="font-bold text-white text-lg">Cuenta Prex</span>
            </div>
            <div className="space-y-3 text-sm">
              <div onClick={() => copyToClipboard("13378518")} className="cursor-pointer group">
                <p className="text-gray-500 text-[10px] uppercase">Nro. Cuenta</p>
                <p className="text-purple-300 font-mono font-bold flex justify-between items-center group-hover:text-white transition-colors">13378518 <span>📋</span></p>
              </div>
              <div onClick={() => copyToClipboard("0000013000032133785185")} className="cursor-pointer group">
                <p className="text-gray-500 text-[10px] uppercase">CVU</p>
                <p className="text-purple-300 font-mono text-xs flex justify-between items-center group-hover:text-white transition-colors">0000013000032133785185 <span>📋</span></p>
              </div>
              <div onClick={() => copyToClipboard("25237805.PREX")} className="cursor-pointer group">
                <p className="text-gray-500 text-[10px] uppercase">Alias</p>
                <p className="text-purple-300 font-mono font-bold flex justify-between items-center group-hover:text-white transition-colors">25237805.PREX <span>📋</span></p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase">Titular</p>
                <p className="text-white font-bold text-xs">OMAR MUZZIO</p>
              </div>
            </div>
            <button onClick={() => handlePreNotify('PREX')} className="w-full mt-4 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg font-bold text-sm transition-colors shadow-lg">
              INFORMAR PAGO A PREX
            </button>
          </div>

          {/* OPCIÓN 2: BANCO NACIÓN */}
          <div className="bg-[#1e2a47] p-4 rounded-xl border border-gray-600">
            <div className="mb-3 border-b border-gray-600 pb-2">
              <span className="font-bold text-white text-lg">Banco Nación</span>
            </div>
            <div className="space-y-3 text-sm">
              <div onClick={() => copyToClipboard("0110417630041712848051")} className="cursor-pointer group">
                <p className="text-gray-500 text-[10px] uppercase">CBU</p>
                <p className="text-blue-300 font-mono text-xs flex justify-between items-center group-hover:text-white transition-colors">0110417630041712848051 <span>📋</span></p>
              </div>
              <div onClick={() => copyToClipboard("muzzioo")} className="cursor-pointer group">
                <p className="text-gray-500 text-[10px] uppercase">Alias</p>
                <p className="text-blue-300 font-mono font-bold flex justify-between items-center group-hover:text-white transition-colors">muzzioo <span>📋</span></p>
              </div>
              <div onClick={() => copyToClipboard("4171284805")} className="cursor-pointer group">
                <p className="text-gray-500 text-[10px] uppercase">Cuenta</p>
                <p className="text-blue-300 font-mono font-bold flex justify-between items-center group-hover:text-white transition-colors">4171284805 <span>📋</span></p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase">Titular / CUIT</p>
                <p className="text-white font-bold text-xs">MUZZIO OMAR (20-25237805-8)</p>
              </div>
            </div>
            <button onClick={() => handlePreNotify('NACION')} className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold text-sm transition-colors shadow-lg">
              INFORMAR PAGO A NACIÓN
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PaymentScreen;