import React, { useState } from 'react';
import { getItemByShortId } from '../services/itemService';
import { Item, ItemStatus } from '../types';
import Spinner from '../components/Spinner';

interface InputCodeScreenProps {
  onScanComplete: (result: { item: Item; status: ItemStatus; location?: { lat: number, lng: number } | null }) => void;
  onCancel: () => void;
}

const InputCodeScreen: React.FC<InputCodeScreenProps> = ({ onScanComplete, onCancel }) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Por favor, ingrese un código.');
      return;
    }
    setIsLoading(true);
    setError(null);
    
    try {
      // Usamos la función que creamos en el paso anterior
      const result = await getItemByShortId(code.trim().toUpperCase());
      
      if (result) {
        onScanComplete(result); // ¡Éxito! Lanza la pantalla de resultado
      } else {
        setError('Código no encontrado. Verifique e intente de nuevo.');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Error al buscar el código. Intente de nuevo.');
      setIsLoading(false);
    }
  };

  const inputClass = "w-full bg-[#1e2a47] border border-blue-800 rounded-md p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400";

  return (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-[#1e2a47] rounded-lg p-6 text-white text-center">
        <h2 className="text-2xl font-bold mb-4">INGRESAR CÓDIGO</h2>
        <form onSubmit={handleSearch}>
          <p className="text-gray-300 text-sm mb-4">
            Ingrese el código de respaldo (ej: ABC-123)
          </p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC-123"
            className={inputClass + " text-center text-lg tracking-widest"}
            autoCapitalize="characters"
          />
          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
          <div className="mt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-yellow-500 text-black py-3 rounded-lg text-lg font-bold flex justify-center items-center"
            >
              {isLoading ? <Spinner /> : 'BUSCAR'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="mt-3 w-full bg-gray-600 text-white py-2 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InputCodeScreen;