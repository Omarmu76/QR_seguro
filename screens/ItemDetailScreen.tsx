import React, { useState } from 'react';
import Header from '../components/Header';
import QRCode from '../components/QRCode';
import { Item, ItemStatus } from '../types';
import { updateItemStatus } from '../services/itemService';
import Spinner from '../components/Spinner';
import ConfirmationModal from '../components/common/ConfirmationModal'; // <--- RUTA CORREGIDA

interface ItemDetailScreenProps {
  item: Item;
  onDone: () => void;
}

const getCurrentLocation = (): Promise<{ lat: number, lng: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("Sin GPS")); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err), { enableHighAccuracy: true, timeout: 5000 }
    );
  });
};

const ItemDetailScreen: React.FC<ItemDetailScreenProps> = ({ item, onDone }) => {
  const qrCanvasId = `qr-canvas-${item.qrId || 'detail'}`;
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentItemStatus, setCurrentItemStatus] = useState(item.status);

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; isDestructive: boolean }>({
    isOpen: false, title: '', message: '', onConfirm: () => { }, isDestructive: false
  });

  const handleShare = async () => {
    const canvas = document.getElementById(qrCanvasId) as HTMLCanvasElement;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `qr-${item.shortId || 'item'}.png`, { type: blob.type });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: `QR Item ${item.marca}`, text: `Código: ${item.shortId}`, files: [file] });
      } else {
        const link = document.createElement('a'); link.href = dataUrl; link.download = `qr-${item.shortId}.png`; document.body.appendChild(link); link.click(); document.body.removeChild(link);
      }
    } catch (err) { console.error(err); }
  };

  const initiateToggleStatus = () => {
    const isReported = currentItemStatus === ItemStatus.Denunciado;
    setConfirmModal({
      isOpen: true,
      title: isReported ? "Confirmar Recuperación" : "🚨 REPORTAR ROBO",
      message: isReported
        ? "El artículo volverá a estado seguro."
        : "Se publicará una alerta en la comunidad. ¿Deseas proceder?",
      isDestructive: !isReported,
      onConfirm: () => executeToggleStatus(isReported)
    });
  };

  const executeToggleStatus = async (isReported: boolean) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    if (!item.qrId) return;
    setIsProcessing(true);
    try {
      let location = null;
      if (!isReported) { try { location = await getCurrentLocation(); } catch (e) { } }
      const newStatus = isReported ? ItemStatus.EnRegla : ItemStatus.Denunciado;

      await updateItemStatus(item.qrId, item.ownerId, newStatus, location);
      setCurrentItemStatus(newStatus);
    } catch (e) {
      alert("Error al actualizar estado.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-[#0d1226] flex flex-col z-50 text-white">
      <Header title="DETALLE DEL ITEM" onMenuClick={onDone} />

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.isDestructive ? "CONFIRMAR" : "ACEPTAR"}
        cancelText="Cancelar"
        isDestructive={confirmModal.isDestructive}
      />

      <div className="flex-grow p-6 overflow-y-auto flex flex-col items-center">
        <div className="w-full max-w-xs mb-6">
          {item.qrId && item.shortId ? <QRCode shortId={item.shortId} canvasId={qrCanvasId} /> : <div className="w-full h-40 bg-gray-700 flex items-center justify-center rounded"><p>QR No disponible</p></div>}
          <p className="text-center mt-4 text-gray-300">Código: <strong className="text-yellow-400 text-lg ml-2">{item.shortId || 'N/A'}</strong></p>
        </div>

        <div className={`p-4 rounded-lg w-full mb-6 border ${currentItemStatus === ItemStatus.Denunciado ? 'bg-red-900/30 border-red-500' : 'bg-[#1e2a47] border-gray-700'}`}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-white">Datos</h3>
            {currentItemStatus === ItemStatus.Denunciado && <span className="bg-red-600 text-xs px-2 py-1 rounded font-bold animate-pulse">ROBADO</span>}
          </div>
          <div className="space-y-1 text-sm text-gray-300">
            <p>Tipo: <span className="text-white">{item.tipo}</span></p>
            <p>Marca: <span className="text-white">{item.marca}</span></p>
            <p>Modelo: <span className="text-white">{item.modelo}</span></p>
            <p>ID: <span className="text-white">{item.identificador}</span></p>
          </div>
        </div>

        <div className="w-full space-y-3 mt-auto">
          <button onClick={initiateToggleStatus} disabled={isProcessing} className={`w-full py-4 rounded-xl font-black text-sm shadow-lg flex justify-center items-center gap-2 ${currentItemStatus === ItemStatus.Denunciado ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}>
            {isProcessing ? <Spinner /> : (currentItemStatus === ItemStatus.Denunciado ? "MARCAR RECUPERADO" : "🚨 REPORTAR ROBO")}
          </button>
          <button onClick={handleShare} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-500 transition-colors">COMPARTIR QR</button>
          <button onClick={onDone} className="w-full bg-transparent border border-gray-600 text-gray-400 py-3 rounded-lg hover:text-white">Volver</button>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailScreen;