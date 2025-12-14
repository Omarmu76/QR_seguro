import React, { useState } from 'react';
import { User } from 'firebase/auth';
import Header from '../components/Header';
import { Item } from '../types';
import { saveItem } from '../services/itemService';
import Spinner from '../components/Spinner';
import ConfirmationModal from '../components/common/ConfirmationModal';

interface GenerateScreenProps {
  onGenerateComplete: (result: Item) => void;
  user: User;
  onMenuClick: () => void;
}

// Helper para capturar GPS (Estricto)
const getCurrentLocation = (): Promise<{ lat: number, lng: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("El dispositivo no soporta GPS."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 } // Aumenté a 10s para dar tiempo al celular
    );
  });
};

const GenerateScreen: React.FC<GenerateScreenProps> = ({ onGenerateComplete, user, onMenuClick }) => {
  const [item, setItem] = useState<Omit<Item, 'qrId' | 'status' | 'ownerId'>>({
    tipo: 'Vehiculo',
    marca: '',
    modelo: '',
    identificador: '',
  });

  // Estado para mensajes de carga específicos
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setItem({ ...item, [e.target.name]: e.target.value });
  };

  const isFormValid = item.marca && item.modelo && item.identificador;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    setError('');
    setConfirmModalOpen(true);
  };

  const handleConfirmGenerate = async () => {
    setConfirmModalOpen(false);
    setIsLoading(true);
    setError(''); // Limpiamos errores previos

    try {
      // --- PASO 1: OBTENER GPS OBLIGATORIO ---
      setLoadingMessage('🛰️ Buscando satélites GPS...');

      // Esta línea espera (await). Si falla, salta directo al catch de abajo.
      // No pasará a saveItem si esto no devuelve coordenadas reales.
      const location = await getCurrentLocation();

      // --- PASO 2: GUARDAR EN BD SOLO SI TENEMOS GPS ---
      setLoadingMessage('💾 Guardando artículo...');

      // Si llegamos aquí, location existe "sí o sí"
      const savedItem = await saveItem(item, user.uid, location);

      onGenerateComplete(savedItem);

    } catch (err: any) {
      console.error("Error en proceso:", err);
      // Filtramos el mensaje de error para el usuario
      if (err.code === 1) { // Permission denied
        setError('❌ Permiso de ubicación denegado. Actívalo en ajustes.');
      } else if (err.code === 2 || err.code === 3) { // Position unavailable / Timeout
        setError('⚠️ No se pudo obtener señal GPS. Intenta en un lugar abierto.');
      } else if (err.message === "El dispositivo no soporta GPS.") {
        setError(err.message);
      } else {
        setError('Error al guardar. Verifica tu conexión y el GPS.');
      }
      // IMPORTANTE: Al fallar, NO guardamos nada. El usuario debe reintentar.
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleCancelGenerate = () => {
    setConfirmModalOpen(false);
  };

  const inputClass = "w-full bg-[#1e2a47] border border-blue-800 rounded-md p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400";

  return (
    <div className="flex flex-col h-full bg-[#0d1226] text-white">
      <Header title="GENERAR QR" onMenuClick={onMenuClick} />
      <div className="flex-grow p-6 overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Formulario Estándar */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">Tipo</label>
            <select name="tipo" value={item.tipo} onChange={handleChange} className={inputClass}>
              <option>Vehiculo</option>
              <option>Celular</option>
              <option>Notebook</option>
              <option>Otro</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">Marca</label>
            <input type="text" name="marca" value={item.marca} onChange={handleChange} placeholder="Ej: Ford" className={inputClass} />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">Modelo</label>
            <input type="text" name="modelo" value={item.modelo} onChange={handleChange} placeholder="Ej: Focus" className={inputClass} />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">
              {item.tipo === 'Vehiculo' ? 'Patente' : 'Número de Serie'}
            </label>
            <input type="text" name="identificador" value={item.identificador} onChange={handleChange} placeholder="Ej: AB 123 CD" className={inputClass} />
          </div>

          <div className="bg-blue-900/30 p-3 rounded border border-blue-800">
            <p className="text-xs text-blue-200 text-center">
              📍 <b>Requisito:</b> Se requiere GPS activo para registrar la ubicación segura inicial.
            </p>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 p-3 rounded text-center">
              <p className="text-white font-bold text-sm">{error}</p>
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="w-full bg-green-600 text-white py-4 rounded-lg text-lg font-bold shadow-lg disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center transition-colors hover:bg-green-700"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Spinner />
                  <span className="text-xs font-normal animate-pulse">{loadingMessage || 'Procesando...'}</span>
                </div>
              ) : 'GENERAR CÓDIGO'}
            </button>
          </div>
        </form>
      </div>
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        title="Confirmar Datos"
        message="¿Estás seguro? Se validará tu GPS antes de guardar."
        onConfirm={handleConfirmGenerate}
        onCancel={handleCancelGenerate}
        confirmText="Sí, generar"
      />
    </div>
  );
};

export default GenerateScreen;