import React, { useState } from 'react';
import { User } from 'firebase/auth';
import Header from '../components/Header';
import { Item } from '../types';
import { updateItemDetails } from '../services/itemService';
import Spinner from '../components/Spinner';
import ConfirmationModal from '../components/ConfirmationModal';

interface EditItemScreenProps {
  item: Item;
  user: User;
  onEditComplete: () => void;
  onCancel: () => void;
}

const EditItemScreen: React.FC<EditItemScreenProps> = ({ item, user, onEditComplete, onCancel }) => {
  const [formData, setFormData] = useState({
    tipo: item.tipo,
    marca: item.marca,
    modelo: item.modelo,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const isFormValid = formData.marca && formData.modelo;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
        setError("Marca y Modelo son obligatorios.");
        return;
    }
    setError('');
    setConfirmModalOpen(true);
  };

  const handleConfirmEdit = async () => {
    if (!item.qrId) return;
    setConfirmModalOpen(false);
    setIsLoading(true);
    try {
      await updateItemDetails(item.qrId, user.uid, formData);
      onEditComplete();
    } catch (err) {
      setError('Error al actualizar. Intente de nuevo.');
    } finally {
        setIsLoading(false);
    }
  };

  const inputClass = "w-full bg-[#1e2a47] border border-blue-800 rounded-md p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400";
  
  return (
    <div className="absolute inset-0 bg-[#0d1226] flex flex-col z-50">
      <Header title="EDITAR ITEM" onMenuClick={onCancel} />
      <div className="flex-grow p-6 overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">Tipo</label>
            <select name="tipo" value={formData.tipo} onChange={handleChange} className={inputClass}>
              <option>Vehiculo</option>
              <option>Celular</option>
              <option>Notebook</option>
              <option>Otro</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">Marca</label>
            <input type="text" name="marca" value={formData.marca} onChange={handleChange} placeholder="Ej: Ford" className={inputClass} />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">Modelo</label>
            <input type="text" name="modelo" value={formData.modelo} onChange={handleChange} placeholder="Ej: Focus" className={inputClass} />
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg space-y-2">
            <p className="text-sm text-gray-400">Campos no editables:</p>
            <p><span className="font-semibold text-gray-300">ID (Patente/Serie):</span> {item.identificador}</p>
            <p><span className="font-semibold text-gray-300">Código:</span> {item.shortId}</p>
          </div>

          {error && <p className="text-red-500 text-center">{error}</p>}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="w-full bg-green-600 text-white py-4 rounded-lg text-lg font-bold shadow-lg disabled:bg-gray-500"
            >
              {isLoading ? <Spinner /> : 'GUARDAR CAMBIOS'}
            </button>
          </div>
        </form>
      </div>
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        title="Confirmar Cambios"
        message="¿Estás seguro de que quieres guardar estos cambios?"
        onConfirm={handleConfirmEdit}
        onCancel={() => setConfirmModalOpen(false)}
        confirmText="Sí, guardar"
      />
    </div>
  );
};

export default EditItemScreen;