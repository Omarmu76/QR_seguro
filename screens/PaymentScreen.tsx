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
  const [currency, setCurrency] = useState<string>('ARS'); // Default ARS
  /**
   * Explicación (Regla #4):
   * Se elimina la variable 'rate' ya que, aunque se calculaba el valor de cambio,
   * no se estaba utilizando para renderizado ni cálculos posteriores.
   * Esto soluciona la advertencia TS6133 y permite una compilación limpia.
   */
  const [, setRate] = useState<number>(1);
  const [finalPrice, setFinalPrice] = useState<number>(0);

  // Estado para el Modal de Confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('');

  const BASE_PRICE_USD = 2; // Precio Base: 2 Dólares

  // LISTA DE MONEDAS SOPORTADAS Y ENDPOINTS
  const currencies = [
    { code: 'ARS', name: '🇦🇷 Peso Argentino', apiEndpoint: 'dolares/blue' },
    { code: 'USD', name: '🇺🇸 Dólar Estadounidense', apiEndpoint: null },
    { code: 'BRL', name: '🇧🇷 Real Brasileño', apiEndpoint: 'cotizaciones/brl' },
    { code: 'UYU', name: '🇺🇾 Peso Uruguayo', apiEndpoint: 'cotizaciones/uyu' },
    { code: 'CLP', name: '🇨🇱 Peso Chileno', apiEndpoint: 'cotizaciones/clp' },
    { code: 'PYG', name: '🇵🇾 Guaraní', apiEndpoint: null }
  ];

  // --- 1. LÓGICA DE COTIZACIÓN CRUZADA ---
  useEffect(() => {
    const fetchRates = async () => {
      setLoading(true);
      try {
        if (currency === 'USD') {
          setRate(1);
          setFinalPrice(BASE_PRICE_USD);
          setLoading(false);
          return;
        }

        // A. Obtener valor pivote (Dólar Blue Venta)
        const resBlue = await fetch('https://dolarapi.com/v1/dolares/blue');
        const dataBlue = await resBlue.json();
        const blueVenta = dataBlue.venta || 1200;

        // B. Calcular según moneda seleccionada
        if (currency === 'ARS') {
          setRate(blueVenta);
          setFinalPrice(BASE_PRICE_USD * blueVenta);
        }
        else if (currency === 'PYG') {
          // Fallback manual para Guaraníes (aprox 7500 PYG x USD)
          const manualRate = 7550;
          setRate(manualRate);
          setFinalPrice(BASE_PRICE_USD * manualRate);
        }
        else {
          // Lógica Cruzada para BRL, UYU, CLP
          // DolarApi devuelve "cuántos pesos argentinos cuesta 1 unidad de moneda extranjera"
          const target = currencies.find(c => c.code === currency);
          if (target?.apiEndpoint) {
            const resCurrency = await fetch(`https://dolarapi.com/v1/${target.apiEndpoint}`);
            const dataCurrency = await resCurrency.json();
            const valEnPesos = dataCurrency.venta || 1; // Ej: 1 Real = 220 ARS

            // Fórmula: (2 USD * ValorBlue) / ValorMonedaEnPesos
            // Ej: (2 * 1200) / 220 = 10.9 Reales
            const calculatedAmount = (BASE_PRICE_USD * blueVenta) / valEnPesos;

            setRate(valEnPesos);
            setFinalPrice(calculatedAmount);
          }
        }
      } catch (e) {
        console.error("Error API Cotización", e);
        // Fallbacks de emergencia si falla la API
        if (currency === 'ARS') setFinalPrice(BASE_PRICE_USD * 1200);
        if (currency === 'BRL') setFinalPrice(BASE_PRICE_USD * 6);
        if (currency === 'UYU') setFinalPrice(BASE_PRICE_USD * 42);
        if (currency === 'CLP') setFinalPrice(BASE_PRICE_USD * 980);
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, [currency]);

  // --- 2. PREPARAR NOTIFICACIÓN ---
  const handlePreNotify = (method: string) => {
    setSelectedMethod(method);
    setShowConfirmModal(true);
  };

  // --- 3. PROCESO FINAL ---
  const executeNotification = async (channel: 'WHATSAPP' | 'EMAIL' | 'APP_ONLY') => {
    setLoading(true);
    try {
      await notifyPayment(item, user, finalPrice, selectedMethod, currency);

      const message = `Hola QRseguro! 🛡️\nEnvío comprobante de pago.\n\nUsuario: ${user.email}\nItem: ${item.marca} ${item.modelo}\nMonto: ${finalPrice.toFixed(2)} ${currency}\nID Item: ${item.qrId}`;

      if (channel === 'WHATSAPP') {
        const url = `https://wa.me/5493743416347?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
      } else if (channel === 'EMAIL') {
        const subject = `Comprobante de Pago - ${user.email}`;
        const url = `mailto:magritted12@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
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

      {/* MODAL CONFIRMACIÓN */}
      {showConfirmModal && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[60]">
          <div className="bg-[#1e2a47] p-6 rounded-xl border border-blue-500 w-11/12 max-w-sm shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-2 text-center">🧾 Enviar Comprobante</h3>
            <p className="text-gray-300 text-sm text-center mb-6">
              Para activar el servicio más rápido, envíanos el comprobante por WhatsApp.
            </p>
            <div className="space-y-3">
              <button onClick={() => executeNotification('WHATSAPP')} className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2">
                <span className="text-xl">📱</span> Enviar por WhatsApp
              </button>
              <button onClick={() => executeNotification('EMAIL')} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2">
                <span className="text-xl">📧</span> Enviar por Email
              </button>
              <button onClick={() => executeNotification('APP_ONLY')} className="w-full bg-gray-700 text-gray-300 py-2 rounded-lg text-xs font-bold mt-2">
                Solo avisar (Ya envié)
              </button>
            </div>
            <button onClick={() => setShowConfirmModal(false)} className="w-full mt-4 text-red-400 text-xs underline">Cancelar</button>
          </div>
        </div>
      )}

      {loading && <div className="absolute inset-0 bg-black/50 z-[70] flex justify-center items-center"><Spinner /></div>}

      <div className="w-full max-w-md bg-[#0f1523] rounded-2xl overflow-hidden shadow-2xl border border-gray-700 flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="bg-[#1e3a8a] p-5 text-center relative shadow-lg">
          <h2 className="text-xl font-bold text-white tracking-wide">ACTIVAR SERVICIO</h2>
          <p className="text-blue-200 text-xs mt-1">Suscripción Mensual</p>
          <button onClick={onCancel} className="absolute top-4 right-4 text-white/70 hover:text-white">✕</button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-6">

          {/* CONVERSOR DE MONEDA (MENU DESPLEGABLE) */}
          <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-500/30 text-center">
            <p className="text-gray-400 text-xs uppercase mb-2 font-bold">Selecciona Moneda de Pago</p>

            <div className="relative mb-4">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-[#0d1226] text-white border border-blue-500 rounded-lg p-3 appearance-none font-bold text-center focus:ring-2 focus:ring-yellow-400 focus:outline-none cursor-pointer"
              >
                {currencies.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              {/* Flecha Custom */}
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-yellow-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
              </div>
            </div>

            <p className="text-gray-300 text-xs">Valor del Servicio: 2 USD</p>
            <div className="flex flex-col items-center justify-center mt-2">
              <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Total a Transferir</span>
              <div className="flex items-baseline gap-2">
                <p className="text-yellow-400 font-mono text-5xl font-black shadow-black drop-shadow-md">
                  {currency === 'USD' ? `$${finalPrice}` : `$${Math.ceil(finalPrice).toLocaleString()}`}
                </p>
                <span className="text-xl font-bold text-white">{currency}</span>
              </div>
            </div>
            {currency !== 'USD' && <p className="text-[10px] text-gray-500 mt-2 italic">Cotización actualizada en tiempo real</p>}
          </div>

          <p className="text-center text-gray-400 text-xs px-4">
            Cuentas habilitadas para recibir transferencias internacionales y locales.
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
              <span className="font-bold text-white text-lg">Banco Nación (Solo ARS)</span>
            </div>
            <div className="space-y-3 text-sm">
              <div onClick={() => copyToClipboard("muzzioo")} className="cursor-pointer group">
                <p className="text-gray-500 text-[10px] uppercase">Alias</p>
                <p className="text-blue-300 font-mono font-bold flex justify-between items-center group-hover:text-white transition-colors">muzzioo <span>📋</span></p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase">Titular</p>
                <p className="text-white font-bold text-xs">MUZZIO OMAR</p>
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