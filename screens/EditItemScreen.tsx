import React, { useState, useEffect } from 'react';
import { Item, PaymentStatus } from '../types';
import { updateItem, deleteItem } from '../services/itemService';
import Header from '../components/Header';
import ConfirmationModal from '../components/common/ConfirmationModal';
import Spinner from '../components/Spinner';

interface EditItemScreenProps {
  item: Item;
  onCancel: () => void;
  onEditComplete: () => void;
}

const EditItemScreen: React.FC<EditItemScreenProps> = ({ item, onCancel, onEditComplete }) => {
  const [marca, setMarca] = useState(item.marca);
  const [modelo, setModelo] = useState(item.modelo);
  const [tipo, setTipo] = useState(item.tipo);
  const [color, setColor] = useState(item.color || '');
  const [description, setDescription] = useState(item.description || '');
  const [status] = useState(item.status);
  const [reward, setReward] = useState(item.reward ? item.reward.toString() : '');

  // ESTADO PARA EL TIPO DE RASTREO
  const [trackingType, setTrackingType] = useState<'PASSIVE' | 'SELF_DEVICE' | 'EXTERNAL_IOT'>(item.trackingType || 'PASSIVE');

  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // --- SOLUCIÓN TÉCNICA: AUTOGENERACIÓN DE ID DE DISPOSITIVO ---
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(localStorage.getItem('qr_device_id'));

  useEffect(() => {
    // Si al cargar la pantalla NO hay un ID guardado, lo generamos al instante.
    if (!localStorage.getItem('qr_device_id')) {
      const newId = 'dev_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem('qr_device_id', newId);
      setCurrentDeviceId(newId);
      console.log("Sistema: ID de dispositivo regenerado automáticamente:", newId);
    }
  }, []);

  const isLinkedToOtherDevice = item.trackingType === 'SELF_DEVICE' && item.linkedDeviceId !== currentDeviceId;
  const isPaid = item.paymentStatus === PaymentStatus.Paid || item.paymentStatus === PaymentStatus.Free;

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateItem(item.qrId!, {
        marca,
        modelo,
        tipo,
        color,
        description,
        status,
        reward: reward ? Number(reward) : 0,
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
      alert("Error crítico: El sistema no pudo asignar una identidad a este dispositivo. Por favor recarga la página.");
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
      await deleteItem(item.qrId!);
      onEditComplete();
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Error al eliminar");
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-gray-50 overflow-hidden">
      <Header title="EDITAR ARTÍCULO" onMenuClick={onCancel} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">

        {isPaid && isLinkedToOtherDevice && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded shadow-sm">
            <div className="flex flex-col">
              <p className="text-sm text-yellow-700 font-bold mb-2">
                ⚠️ GPS Vinculado a otro dispositivo
              </p>
              <p className="text-xs text-yellow-600 mb-3">
                Este ítem está esperando señal de otro equipo.
                Si quieres rastrearlo con ESTE celular, presiona abajo.
              </p>
              <button
                onClick={handleLinkDevice}
                className="bg-blue-600 text-white py-2 px-4 rounded shadow hover:bg-blue-700 transition-colors text-sm font-bold flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                USAR ESTE DISPOSITIVO COMO GPS
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Marca</label>
          <input
            type="text"
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Modelo</label>
          <input
            type="text"
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Artículo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="Vehiculo">Vehiculo</option>
            <option value="Mochila">Mochila</option>
            <option value="Billetera">Billetera</option>
            <option value="Llaves">Llaves</option>
            <option value="Notebook">Notebook</option>
            <option value="Celular">Celular</option>
            <option value="Bicicleta">Bicicleta</option>
            <option value="Moto">Moto</option>
            <option value="Auto">Auto</option>
            <option value="Otros">Otros</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Color</label>
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all h-24 resize-none"
          />
        </div>

        {isPaid && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <label className="block text-sm font-bold text-blue-900 mb-2">Modo de Rastreo</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 p-2 bg-white rounded border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="tracking"
                  checked={trackingType === 'PASSIVE'}
                  onChange={() => setTrackingType('PASSIVE')}
                  className="form-radio text-blue-600"
                />
                <span className="text-sm text-gray-700">Sin Rastreo (Solo QR)</span>
              </label>

              <label className="flex items-center space-x-3 p-2 bg-white rounded border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="tracking"
                  checked={trackingType === 'SELF_DEVICE'}
                  onChange={() => setTrackingType('SELF_DEVICE')}
                  className="form-radio text-blue-600"
                />
                <span className="text-sm text-gray-700">GPS de este Dispositivo (Celular/PC)</span>
              </label>

              <label className="flex items-center space-x-3 p-2 bg-white rounded border border-gray-200 cursor-pointer hover:bg-gray-50 opacity-50 cursor-not-allowed">
                <input
                  type="radio"
                  name="tracking"
                  checked={trackingType === 'EXTERNAL_IOT'}
                  onChange={() => setTrackingType('EXTERNAL_IOT')}
                  disabled
                  className="form-radio text-blue-600"
                />
                <span className="text-sm text-gray-500">QR Sticker (Próximamente)</span>
              </label>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Recompensa ($)</label>
          <input
            type="number"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            placeholder="Opcional"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex-1 bg-red-100 text-red-600 py-3 rounded-xl font-bold hover:bg-red-200 transition-colors"
          >
            Eliminar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-[#0d1226] text-white py-3 rounded-xl font-bold shadow-lg hover:bg-gray-900 transition-transform active:scale-95"
          >
            Guardar Cambios
          </button>
        </div>

      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="¿Eliminar Artículo?"
        message="Esta acción no se puede deshacer. El código QR dejará de funcionar."
        confirmText="Sí, eliminar"
        isDestructive={true}
      />
    </div>
  );
};

export default EditItemScreen;