import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { getAllUserItems, deleteItem, updateItemStatus } from '../services/itemService';
import { Item, PaymentStatus, ItemStatus } from '../types';
import Spinner from '../components/Spinner';
import QRCode from '../components/QRCode';
import Header from '../components/Header';
import ConfirmationModal from '../components/common/ConfirmationModal'; // <--- RUTA CORREGIDA

interface MyItemsScreenProps {
  user: User;
  onMenuClick: () => void;
  onEditRequest: (item: Item) => void;
  onViewRequest: (item: Item) => void;
  onActivateRequest: (item: Item) => void;
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

const MyItemsScreen: React.FC<MyItemsScreenProps> = ({ user, onMenuClick, onEditRequest, onViewRequest, onActivateRequest }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Estado del Modal
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; isDestructive: boolean }>({
    isOpen: false, title: '', message: '', onConfirm: () => { }, isDestructive: false
  });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const userItems = await getAllUserItems(user.uid);
      const sortedItems = userItems.sort((a, b) => {
        if (a.paymentStatus === PaymentStatus.Pending && b.paymentStatus !== PaymentStatus.Pending) return -1;
        return 0;
      });
      setItems(sortedItems);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [user.uid]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  const toggleExpand = (id: string) => setExpandedItemId(expandedItemId === id ? null : id);

  // --- BOTÓN DE PÁNICO ---
  const initiateToggleStatus = (item: Item) => {
    const isReported = item.status === ItemStatus.Denunciado;

    setConfirmModal({
      isOpen: true,
      title: isReported ? "Confirmar Recuperación" : "🚨 REPORTAR ROBO",
      message: isReported
        ? "¡Qué buena noticia! El artículo volverá a estado 'Seguro' (Verde) y se retirará de las alertas públicas."
        : "Esta acción publicará una ALERTA ROJA en la comunidad. Se activará el rastreo colaborativo. ¿Deseas proceder?",
      isDestructive: !isReported, // Rojo si denuncia, normal si recupera
      onConfirm: () => executeToggleStatus(item, isReported)
    });
  };

  const executeToggleStatus = async (item: Item, isReported: boolean) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false })); // Cerrar modal
    if (!item.qrId) return;
    setProcessingId(item.qrId);

    try {
      let location = null;
      if (!isReported) {
        try { location = await getCurrentLocation(); } catch (e) { }
      }
      const newStatus = isReported ? ItemStatus.EnRegla : ItemStatus.Denunciado;

      // updateItemStatus YA se encargará de no borrar la ubicación si es EnRegla
      await updateItemStatus(item.qrId, user.uid, newStatus, location);

      await fetchItems();
    } catch (error) {
      alert("Error de conexión al actualizar estado.");
    } finally {
      setProcessingId(null);
    }
  };

  const initiateDelete = (item: Item) => {
    setConfirmModal({
      isOpen: true,
      title: "Eliminar Artículo",
      message: "¿Estás seguro? Esta acción es irreversible. El QR dejará de funcionar.",
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (item.qrId) {
          await deleteItem(item.qrId, user.uid);
          fetchItems();
        }
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1226]">
      <Header title="MIS ARTÍCULOS" onMenuClick={onMenuClick} />

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

      <div className="flex-grow p-4 overflow-y-auto">
        {loading ? <div className="flex justify-center items-center h-full"><Spinner /></div>
          : items.length === 0 ? <div className="flex flex-col items-center justify-center h-[60%] text-gray-500 opacity-60"><p>No tienes artículos aún.</p></div>
            : (
              <div className="space-y-4 pb-24">
                {items.map((item) => {
                  const isLocked = item.paymentStatus === PaymentStatus.Pending;
                  const isInReview = item.paymentStatus === PaymentStatus.Review;
                  const isExpanded = expandedItemId === item.qrId;
                  const isReported = item.status === ItemStatus.Denunciado;
                  const isProcessing = processingId === item.qrId;

                  return (
                    <div key={item.qrId} className={`relative rounded-xl overflow-hidden transition-all duration-300 ${isReported ? 'border-2 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)]' : isLocked ? 'border border-yellow-600' : 'border border-gray-700'} bg-[#1e2a47]`}>
                      {/* HEADER CARD */}
                      <div onClick={() => toggleExpand(item.qrId!)} className={`p-4 flex justify-between items-center cursor-pointer ${isReported ? 'bg-red-900/30' : 'active:bg-white/5'}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white text-lg leading-none">{item.marca} {item.modelo}</h3>
                            {isReported && <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded animate-pulse">ROBADO</span>}
                            {isLocked && <span className="bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded">IMPAGO</span>}
                          </div>
                          <p className="text-xs text-blue-300 uppercase font-bold tracking-wider">{item.tipo}</p>
                        </div>
                        <div className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
                      </div>

                      {/* BODY CARD */}
                      {isExpanded && (
                        <div className="bg-[#151c32] p-4 border-t border-gray-700 animate-fade-in">
                          <div className="relative mb-5 flex justify-center">
                            <div className={`transition-all duration-500 ${(isLocked || isInReview) ? 'blur-md opacity-20 grayscale pointer-events-none' : ''}`}><QRCode shortId={item.shortId || '---'} /></div>
                            {(isLocked || isInReview) && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 animate-slide-up">
                                {isLocked ? (
                                  <button onClick={() => onActivateRequest(item)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-black py-2 px-6 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 whitespace-nowrap">ACTIVAR AHORA</button>
                                ) : (
                                  <div className="bg-blue-900/90 p-3 rounded-xl text-center border border-blue-500 shadow-xl"><p className="text-white font-bold text-xs">⏳ Pago en Revisión</p></div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-3">
                            {/* Botones de Gestión */}
                            <div className="grid grid-cols-2 gap-3">
                              <button onClick={() => onViewRequest(item)} className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/50 py-3 rounded-lg font-bold text-xs transition-colors flex justify-center items-center gap-2">VER DETALLES</button>
                              <button onClick={() => onEditRequest(item)} className="bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-bold text-xs transition-colors">EDITAR</button>
                            </div>

                            {/* Botón Pánico */}
                            {!(isLocked || isInReview) && (
                              <button onClick={() => initiateToggleStatus(item)} disabled={isProcessing} className={`w-full py-4 rounded-xl font-black text-sm shadow-lg transition-transform active:scale-[0.98] flex justify-center items-center gap-2 ${isReported ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}>
                                {isProcessing ? <Spinner /> : (isReported ? "MARCAR COMO RECUPERADO" : "🚨 REPORTAR ROBO")}
                              </button>
                            )}

                            <button onClick={() => initiateDelete(item)} className="mt-2 text-red-500/50 hover:text-red-500 text-[10px] uppercase font-bold tracking-widest text-center py-2">Eliminar del sistema</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
      </div>
    </div>
  );
};

export default MyItemsScreen;
