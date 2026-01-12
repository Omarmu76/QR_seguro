import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Item, PaymentStatus } from '../types';
import { updateItem, deleteItem } from '../services/itemService';
import Header from '../components/Header';
import ConfirmationModal from '../components/common/ConfirmationModal';
import Spinner from '../components/Spinner';

interface EditItemScreenProps {
  item: Item;
  user: User;
  onCancel: () => void;
  onEditComplete: () => void;
}

const EditItemScreen: React.FC<EditItemScreenProps> = ({ item, user, onCancel, onEditComplete }) => {
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Estados del formulario
  const [formData, setFormData] = useState({
    marca: item.marca,
    modelo: item.modelo,
    tipo: item.tipo,
    color: item.color || '',
    description: item.description || item.descripcion || '',
    reward: item.reward ? item.reward.toString() : '',
  });

  // ESTADO PARA EL TIPO DE RASTREO (Preservado)
  const [trackingType, setTrackingType] = useState<'PASSIVE' | 'SELF_DEVICE' | 'EXTERNAL_IOT'>(item.trackingType || 'PASSIVE');

  // --- SOLUCIÓN TÉCNICA: AUTOGENERACIÓN DE ID DE DISPOSITIVO (Preservado) ---
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(localStorage.getItem('qr_device_id'));

  useEffect(() => {
    if (!localStorage.getItem('qr_device_id')) {
      const newId = 'dev_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem('qr_device_id', newId);
      setCurrentDeviceId(newId);
      console.log("Sistema: ID de dispositivo regenerado automáticamente:", newId);
    }
  }, []);

  const isLinkedToOtherDevice = item.trackingType === 'SELF_DEVICE' && item.linkedDeviceId !== currentDeviceId;
  const isPaid = item.paymentStatus === PaymentStatus.Paid || item.paymentStatus === PaymentStatus.Free;

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      await updateItem(item.qrId!, {
        marca: formData.marca,
        modelo: formData.modelo,
        tipo: formData.tipo,
        color: formData.color,
        description: formData.description,
        reward: formData.reward ? Number(formData.reward) : 0,
        trackingType: isPaid ? trackingType : 'PASSIVE',
      });
      onEditComplete();
    } catch (error) {
      console.error("Error updating item:", error);
      alert("Error al actualizar el item");
    } finally {
      setLoading(false);
    }
  };

  const handleLinkDevice = async () => {
    const activeId = currentDeviceId || localStorage.getItem('qr_device_id');
    if (!activeId) {
      alert("Error crítico: El sistema no pudo asignar una identidad a este dispositivo.");
      return;
    }

    const confirm = window.confirm("¿Quieres que ESTE dispositivo sea el GPS de este artículo?\n\nEl dispositivo anterior dejará de rastrearlo.");
    if (!confirm) return;

    setLoading(true);
    try {
      await updateItem(item.qrId!, {
        linkedDeviceId: activeId,
        trackingType: 'SELF_DEVICE'
      });
      alert("✅ ¡Vinculado! Ahora este dispositivo controla la ubicación.");
      onEditComplete();
    } catch (error) {
      console.error(error);
      alert("Error al vincular dispositivo.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteItem(item.qrId!, user.uid);
      onEditComplete();
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Error al eliminar");
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  // Estilos de UI (Dark Glass)
  const inputClass = "w-full bg-[#0d1226] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all font-medium text-sm shadow-inner";
  const labelClass = "block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1 ml-1";

  if (loading && !formData.marca) return <div className="h-screen flex items-center justify-center bg-[#0d1226] text-white"><Spinner /></div>;

  return (
    <div className="flex flex-col h-full bg-[#0d1226] text-white overflow-hidden">
      <Header title="EDITAR" onMenuClick={() => { }} onBack={onCancel} transparent={false} />

      <div className="flex-grow overflow-y-auto p-4 flex justify-center pb-20">
        <div className="w-full max-w-sm space-y-6">

          {/* Alerta de GPS (Preservado Visualmente) */}
          {isPaid && isLinkedToOtherDevice && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl backdrop-blur-md animate-pulse">
              <p className="text-yellow-400 font-black text-[10px] uppercase tracking-widest mb-1">⚠️ GPS Vinculado a otro equipo</p>
              <p className="text-gray-300 text-[11px] mb-3 leading-tight">Este ítem espera señal de otro dispositivo. ¿Vincular a este?</p>
              <button
                onClick={handleLinkDevice}
                className="w-full bg-yellow-500 text-black py-2 rounded-lg font-black text-[10px] tracking-widest hover:bg-yellow-400 transition-colors"
              >
                USAR ESTE DISPOSITIVO
              </button>
            </div>
          )}

          <form onSubmit={handleSave} className="bg-[#111928] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4 animate-fade-in relative overflow-hidden">
            {/* Fondo decorativo */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

            <div className="text-center mb-2 pb-4 border-b border-white/5">
              <h3 className="text-white font-bold text-lg">Actualizar Datos</h3>
              <p className="text-xs text-gray-500">Manten tu credencial al día</p>
            </div>

            {/* MARCA */}
            <div>
              <label className={labelClass}>Marca</label>
              <input
                type="text"
                value={formData.marca}
                onChange={(e) => handleChange('marca', e.target.value)}
                className={inputClass}
                placeholder="Ej: Samsung"
                required
              />
            </div>

            {/* MODELO */}
            <div>
              <label className={labelClass}>Modelo</label>
              <input
                type="text"
                value={formData.modelo}
                onChange={(e) => handleChange('modelo', e.target.value)}
                className={inputClass}
                placeholder="Ej: S24 Ultra"
                required
              />
            </div>

            {/* TIPO Y COLOR */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Tipo</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => handleChange('tipo', e.target.value)}
                  className={`${inputClass} appearance-none cursor-pointer`}
                >
                  <option value="Celular">📱 Celular</option>
                  <option value="Vehiculo">🚗 Vehículo</option>
                  <option value="Llaves">🔑 Llaves</option>
                  <option value="Billetera">👛 Billetera</option>
                  <option value="Mochila">🎒 Mochila</option>
                  <option value="Notebook">💻 Notebook</option>
                  <option value="Bicicleta">🚲 Bicicleta</option>
                  <option value="Moto">🏍️ Moto</option>
                  <option value="Auto">🚗 Auto</option>
                  <option value="Otro">📦 Otro</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Color</label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                  className={inputClass}
                  placeholder="Color"
                />
              </div>
            </div>

            {/* DESCRIPCIÓN */}
            <div>
              <label className={labelClass}>Notas / Descripción</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className={`${inputClass} min-h-[80px] resize-none`}
                placeholder="Detalles visibles..."
              />
            </div>

            {/* RASTREO (Solo si es pago) */}
            {isPaid && (
              <div className="p-3 bg-black/30 rounded-xl border border-white/5">
                <label className={labelClass}>Modo de Rastreo</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setTrackingType('PASSIVE')}
                    className={`py-2 rounded-lg text-[9px] font-black tracking-widest border transition-all ${trackingType === 'PASSIVE' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-transparent border-white/5 text-gray-500'}`}
                  >
                    SOLO QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrackingType('SELF_DEVICE')}
                    className={`py-2 rounded-lg text-[9px] font-black tracking-widest border transition-all ${trackingType === 'SELF_DEVICE' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-transparent border-white/5 text-gray-500'}`}
                  >
                    GPS ACTIVO
                  </button>
                </div>
              </div>
            )}

            {/* RECOMPENSA */}
            <div>
              <label className={labelClass}>Recompensa (Opcional)</label>
              <input
                type="number"
                value={formData.reward}
                onChange={(e) => handleChange('reward', e.target.value)}
                className={inputClass}
                placeholder="$ Monto"
              />
            </div>

            {/* BOTONES */}
            <div className="pt-4 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black py-4 rounded-xl shadow-lg active:scale-95 transition-all text-xs tracking-[0.2em]"
              >
                {loading ? <Spinner /> : "GUARDAR CAMBIOS"}
              </button>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="flex-1 text-red-500/70 hover:text-red-500 py-2 text-[10px] font-bold tracking-widest transition-colors"
                >
                  ELIMINAR
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 text-gray-500 hover:text-white py-2 text-[10px] font-bold tracking-widest transition-colors"
                >
                  CANCELAR
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="¿ELIMINAR ARTÍCULO?"
        message="Esta acción es irreversible. El código QR dejará de funcionar y perderás el rastreo."
        confirmText="SÍ, ELIMINAR"
        isDestructive={true}
      />
    </div>
  );
};

export default EditItemScreen;