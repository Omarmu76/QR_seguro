
import React, { useState } from 'react';
import { User } from 'firebase/auth';
import Header from '../components/Header';
import { Item } from '../types';
import { saveItem } from '../services/itemService';
import Spinner from '../components/Spinner';
import ConfirmationModal from '../components/ConfirmationModal';

interface GenerateScreenProps {
  onGenerateComplete: (result: Item) => void;
  user: User;
  onMenuClick: () => void;
}

const GenerateScreen: React.FC<GenerateScreenProps> = ({ onGenerateComplete, user, onMenuClick }) => {
  const [item, setItem] = useState<Omit<Item, 'qrId' | 'status' | 'ownerId'>>({
    tipo: 'Vehiculo',
    marca: '',
    modelo: '',
    identificador: '',
  });
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
    try {
      const savedItem = await saveItem(item, user.uid);
      onGenerateComplete(savedItem);
    } catch (err) {
      setError('Error al guardar en la base de datos. Intente de nuevo.');
    } finally {
        setIsLoading(false);
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
          {error && <p className="text-red-500 text-center">{error}</p>}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="w-full bg-green-600 text-white py-4 rounded-lg text-lg font-bold shadow-lg disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center transition-colors hover:bg-green-700"
            >
              {isLoading ? <Spinner /> : 'GENERAR'}
            </button>
          </div>
        </form>
      </div>
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        title="Confirmar Datos"
        message="¿Estás seguro de que los datos son correctos? No podrás modificarlos luego."
        onConfirm={handleConfirmGenerate}
        onCancel={handleCancelGenerate}
        confirmText="Sí, generar"
      />
    </div>
  );
};

export default GenerateScreen;
