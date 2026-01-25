import React, { useState } from 'react';
import Header from '../components/Header';
import QRCode from '../components/QRCode';
import { Item, ItemStatus } from '../types';
import { updateItemStatus, linkDeviceToItem, updateItem } from '../services/itemService';
import Spinner from '../components/Spinner';
import ConfirmationModal from '../components/common/ConfirmationModal';

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

  // Helpers de Estilo
  const isReported = currentItemStatus === ItemStatus.Denunciado;
  const isRecovered = currentItemStatus === ItemStatus.Recuperado;

  let statusBadge = <span className="bg-blue-900/50 text-blue-200 px-4 py-1 rounded-full text-xs font-bold tracking-widest border border-blue-500/30">PROTEGIDO</span>;
  let borderClass = "border-white/10";

  if (isReported) {
    statusBadge = <span className="bg-red-600 text-white px-4 py-1 rounded-full text-xs font-black tracking-widest animate-pulse shadow-lg shadow-red-500/40">🚨 ROBADO</span>;
    borderClass = "border-red-600 shadow-red-900/20";
  } else if (isRecovered) {
    statusBadge = <span className="bg-green-600 text-white px-4 py-1 rounded-full text-xs font-black tracking-widest shadow-lg shadow-green-500/40">✔ RECUPERADO</span>;
    borderClass = "border-green-600 shadow-green-900/20";
  }

  const labelClass = "text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1";
  const valueClass = "text-white font-medium text-sm bg-black/20 px-3 py-2 rounded-lg border border-white/5";

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
    const isReportedAtMoment = currentItemStatus === ItemStatus.Denunciado;
    setConfirmModal({
      isOpen: true,
      title: isReportedAtMoment ? "Confirmar Recuperación" : "🚨 REPORTAR ROBO",
      message: isReportedAtMoment
        ? "¡Qué buena noticia! El artículo volverá a estado 'Seguro' (Verde) en tu mapa y desaparecerá de las alertas públicas."
        : "Esta acción publicará una ALERTA ROJA. Se guardará tu ubicación actual como punto de incidente. ¿Confirmas el reporte?",
      isDestructive: !isReportedAtMoment,
      onConfirm: () => executeToggleStatus(isReportedAtMoment)
    });
  };

  const executeToggleStatus = async (isCurrentlyReported: boolean) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    if (!item.qrId) return;
    setIsProcessing(true);
    try {
      if (isCurrentlyReported) {
        /**
         * Explicación (Paso 3): Limpieza Total al Recuperar.
         * Cuando el usuario confirma que recuperó el objeto, reseteamos todos los
         * campos de seguridad para que el ítem vuelva a estar "En Regla" y privado.
         */
        await updateItem(item.qrId, {
          status: ItemStatus.EnRegla,     // Volver a estado seguro
          alertActive: false,            // Apagar la alarma de hallazgo
          lastSeenLocation: null,        // Borrar el rastro del robo
          lastSeenBy: null,
          lastSeenAt: null,
          isPublic: false                // Sacar del mapa público de denuncias
        });
        setCurrentItemStatus(ItemStatus.EnRegla);
        alert("✅ ¡Qué bueno! Tu artículo está seguro de nuevo.");
      } else {
        /**
         * Lógica de Reporte de Robo.
         * Capturamos la ubicación actual del incidente y marcamos como denunciado.
         */
        let location = null;
        try { location = await getCurrentLocation(); } catch (e) { console.warn("GPS no disponible"); }
        
        await updateItemStatus(item.qrId, item.ownerId, ItemStatus.Denunciado, location);
        setCurrentItemStatus(ItemStatus.Denunciado);
      }
    } catch (e) {
      console.error(e);
      alert("Error al actualizar el estado del artículo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLinkToDevice = async () => {
    if (!item?.qrId) return;
    try {
      const deviceId = localStorage.getItem('qr_device_id') || `dev_${Date.now()}`;
      localStorage.setItem('qr_device_id', deviceId);

      // Usamos el servicio que garantiza un solo imán por dispositivo
      await linkDeviceToItem(item.ownerId, item.qrId, deviceId);

      alert("✅ Vinculado: Este ítem es ahora el IDENTIFICADOR GPS de este celular.");
      if (onDone) onDone();
    } catch (error) {
      console.error("Error al vincular:", error);
      alert("No se pudo vincular el dispositivo.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1226] text-white overflow-hidden">
      <Header title="DETALLE" onMenuClick={() => { }} onBack={onDone} transparent={false} />

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

      <div className="flex-grow overflow-y-auto p-4 flex flex-col items-center">
        {/* TARJETA CENTRADA (No pantalla completa) */}
        <div className={`w-full max-w-sm bg-[#111928] rounded-2xl p-6 shadow-2xl border ${borderClass} animate-fade-in space-y-6 relative overflow-hidden`}>

          {/* Fondo decorativo sutil */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

          {/* CABECERA DE LA FICHA */}
          <div className="text-center space-y-2 border-b border-white/5 pb-6">
            <div className="flex justify-center mb-4">
              {statusBadge}
            </div>
            <h2 className="text-2xl font-black text-white leading-none tracking-tight">{item.marca}</h2>
            <p className="text-blue-400 font-bold text-sm tracking-wide uppercase">{item.modelo}</p>
          </div>

          {/* QR CODE (Centro de atención) */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="p-3 bg-white rounded-xl shadow-lg transform transition-transform hover:scale-105">
              <QRCode shortId={item.shortId || 'error'} canvasId={qrCanvasId} />
            </div>
            <p className="mt-3 text-[10px] font-mono text-gray-500 tracking-[0.3em]">
              ID: <span className="text-blue-400">{item.shortId || '---'}</span>
            </p>
          </div>

          {/* GRILLA DE DATOS */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className={labelClass}>TIPO</p>
              <p className={valueClass}>{item.tipo}</p>
            </div>
            <div>
              <p className={labelClass}>COLOR</p>
              <p className={valueClass}>{item.color || '---'}</p>
            </div>
          </div>

          {/* IDENTIFICADOR (Específico del item) */}
          {item.identificador && (
            <div>
              <p className={labelClass}>IDENTIFICADOR</p>
              <p className={valueClass}>{item.identificador}</p>
            </div>
          )}

          {/* DESCRIPCIÓN */}
          <div>
            <p className={labelClass}>NOTAS / DESCRIPCIÓN</p>
            <div className={`min-h-[60px] ${valueClass} text-gray-300 italic`}>
              {item.description || "Sin descripción adicional."}
            </div>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="pt-4 space-y-3">
            <button
              onClick={initiateToggleStatus}
              disabled={isProcessing}
              className={`w-full py-4 rounded-xl font-black text-xs tracking-widest shadow-lg flex justify-center items-center gap-2 transform active:scale-95 transition-all ${isReported ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/40'}`}
            >
              {isProcessing ? <Spinner /> : (isReported ? "MARCAR COMO RECUPERADO" : "🚨 REPORTAR ROBO")}
            </button>

            <button
              onClick={handleShare}
              className="w-full bg-[#1e2a47] hover:bg-[#25335a] text-white py-3 rounded-xl font-bold text-xs tracking-widest border border-white/5 transition-all active:scale-95"
            >
              COMPARTIR QR
            </button>

            {item?.trackingType !== 'SELF_DEVICE' && (
              <button
                onClick={handleLinkToDevice}
                className="w-full mt-4 py-3 px-4 bg-yellow-500/10 border border-yellow-500/50 rounded-xl flex items-center justify-center gap-2 text-yellow-400 font-bold tracking-wide hover:bg-yellow-500/20 transition-all"
              >
                <span>📍</span> USAR GPS DE ESTE DISPOSITIVO
              </button>
            )}

            <button
              onClick={onDone}
              className="w-full text-gray-500 hover:text-white py-2 text-[10px] font-bold tracking-widest transition-colors"
            >
              VOLVER A LA LISTA
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ItemDetailScreen;