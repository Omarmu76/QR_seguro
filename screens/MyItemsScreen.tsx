import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { getAllUserItems, deleteItem, updateItemStatus, updateItemLocation } from '../services/itemService';
import { Item, PaymentStatus, ItemStatus } from '../types';
import Spinner from '../components/Spinner';
import QRCode from '../components/QRCode';
import Header from '../components/Header';
import ConfirmationModal from '../components/common/ConfirmationModal';

interface MyItemsScreenProps {
  user: User;
  onMenuClick: () => void;
  onEditRequest: (item: Item) => void;
  onViewRequest: (item: Item) => void;
  onActivateRequest: (item: Item) => void;
}

// --- FUNCIÓN GPS ROBUSTA ---
// Intenta varias veces obtener la posición para evitar fallos de "inicio en frío"
const getRobustLocation = (): Promise<{ lat: number, lng: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Sin soporte GPS"));
      return;
    }

    const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

    // Intento 1
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        console.warn("Fallo GPS intento 1, reintentando...", err);
        // Intento 2 (Reintento automático)
        setTimeout(() => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (_errFinal) => reject(new Error("No se pudo obtener GPS. Intenta activar WiFi o salir al exterior.")),
            { enableHighAccuracy: false, timeout: 20000, maximumAge: 0 } // <--- ESTO SOLUCIONA EL ERROR EN PC
          );
        }, 1000);
      },
      options
    );
  });
};

const MyItemsScreen: React.FC<MyItemsScreenProps> = ({ user, onMenuClick, onEditRequest, onViewRequest, onActivateRequest }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  const initiateToggleStatus = (item: Item) => {
    const isReported = item.status === ItemStatus.Denunciado;
    setConfirmModal({
      isOpen: true,
      title: isReported ? "Confirmar Recuperación" : "🚨 REPORTAR ROBO",
      message: isReported
        ? "El artículo volverá a estado 'Seguro'. Se mantendrá en el mapa para ti."
        : "Se activará la ALERTA ROJA. Tu ubicación actual será el punto del robo. ¿Confirmar?",
      isDestructive: !isReported,
      onConfirm: () => executeToggleStatus(item, isReported)
    });
  };

  const executeToggleStatus = async (item: Item, isReported: boolean) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    if (!item.qrId) return;
    setProcessingId(item.qrId);
    try {
      let location = null;
      if (!isReported) {
        // Si voy a denunciar, necesito GPS obligatorio
        try { location = await getRobustLocation(); } catch (e) {
          alert("⚠️ Error: Se necesita GPS para reportar el robo (ubicación del incidente).");
          setProcessingId(null);
          return;
        }
      }
      const newStatus = isReported ? ItemStatus.EnRegla : ItemStatus.Denunciado;
      await updateItemStatus(item.qrId, user.uid, newStatus, location);
      await fetchItems();
    } catch (error) { alert("Error de conexión."); } finally { setProcessingId(null); }
  };

  const handleUpdateLocation = async (item: Item) => {
    if (!item.qrId) return;
    // Confirmación simple del navegador para agilidad
    if (!window.confirm("¿Actualizar la ubicación de este artículo a tu posición actual?")) return;

    setProcessingId(item.qrId);
    try {
      const location = await getRobustLocation(); // Usamos la nueva función robusta
      if (item.qrId) {
        await updateItemLocation(item.qrId, user.uid, location);
        alert("📍 Ubicación actualizada exitosamente.");
        await fetchItems();
      }
    } catch (error: any) {
      alert(error.message || "Error de GPS.");
    } finally {
      setProcessingId(null);
    }
  };

  const initiateDelete = (item: Item) => {
    setConfirmModal({
      isOpen: true,
      title: "Eliminar Artículo",
      message: "¿Eliminar definitivamente?",
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (item.qrId) { await deleteItem(item.qrId, user.uid); fetchItems(); }
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
          : items.length === 0 ? <div className="flex flex-col items-center justify-center h-[60%] text-gray-500 opacity-60"><p>No tienes artículos registrados.</p></div>
            : (
              <div className="space-y-4 pb-24">
                {items.map((item) => {
                  const isLocked = item.paymentStatus === PaymentStatus.Pending;
                  const isInReview = item.paymentStatus === PaymentStatus.Review;
                  const isExpanded = expandedItemId === item.qrId;
                  const isReported = item.status === ItemStatus.Denunciado;
                  const actionsDisabled = isLocked || isInReview;

                  return (
                    <div key={item.qrId} className={`relative rounded-xl overflow-hidden transition-all duration-300 ${isReported ? 'border-2 border-red-600 shadow-red-900/20' : isLocked ? 'border border-yellow-600' : 'border border-gray-700'} bg-[#1e2a47] shadow-lg`}>
                      <div onClick={() => toggleExpand(item.qrId!)} className={`p-4 flex justify-between items-center cursor-pointer ${isReported ? 'bg-red-900/20' : 'active:bg-white/5'}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white text-lg leading-none">{item.marca} {item.modelo}</h3>
                            {isReported && <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded animate-pulse">ROBADO</span>}
                            {isLocked && <span className="bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded">IMPAGO</span>}
                            {isInReview && <span className="bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded animate-pulse">REVISIÓN</span>}
                          </div>
                          <p className="text-xs text-blue-300 uppercase font-bold tracking-wider">{item.tipo}</p>
                        </div>
                        <div className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
                      </div>

                      {isExpanded && (
                        <div className="bg-[#151c32] p-4 border-t border-gray-700 animate-fade-in">
                          <div className="relative mb-5 flex justify-center">
                            <div className={`transition-all duration-500 ${actionsDisabled ? 'blur-md opacity-20 grayscale pointer-events-none' : ''}`}><QRCode shortId={item.shortId || '---'} /></div>
                            {actionsDisabled && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 animate-slide-up">
                                {isLocked ? (
                                  <button onClick={() => onActivateRequest(item)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-black py-2 px-6 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 whitespace-nowrap">ACTIVAR SERVICIO</button>
                                ) : (
                                  <div className="bg-blue-900/90 p-3 rounded-xl text-center border border-blue-500 shadow-xl"><p className="text-white font-bold text-xs">⏳ Verificando Pago</p></div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-3">
                              <button onClick={() => onViewRequest(item)} className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/50 py-3 rounded-lg font-bold text-xs transition-colors">VER DETALLES</button>
                              <button
                                onClick={() => !actionsDisabled && onEditRequest(item)}
                                disabled={actionsDisabled}
                                className={`py-3 rounded-lg font-bold text-xs transition-colors ${actionsDisabled ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
                              >
                                {actionsDisabled ? 'EDITAR (Bloq.)' : 'EDITAR'}
                              </button>
                            </div>

                            {!actionsDisabled && (
                              <>
                                <button onClick={() => handleUpdateLocation(item)} disabled={!!processingId} className="w-full py-3 bg-blue-900/40 border border-blue-500/30 hover:bg-blue-900/60 text-blue-300 rounded-lg font-bold text-xs flex justify-center items-center gap-2 transition-colors">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                  ACTUALIZAR UBICACIÓN (PARA MAPA)
                                </button>
                                <button onClick={() => initiateToggleStatus(item)} disabled={!!processingId} className={`w-full py-4 rounded-xl font-black text-sm shadow-lg transition-transform active:scale-[0.98] flex justify-center items-center gap-2 ${isReported ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}>
                                  {processingId === item.qrId ? <Spinner /> : (isReported ? "MARCAR COMO RECUPERADO" : "🚨 DENUNCIAR ROBO")}
                                </button>
                              </>
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
