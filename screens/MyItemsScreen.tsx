import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { getAllUserItems, deleteItem, updateItemStatus, updateItem } from '../services/itemService';
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

// --- FUNCIÓN GPS ROBUSTA (INTACTA) ---
const getRobustLocation = (): Promise<{ lat: number, lng: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Sin soporte GPS"));
      return;
    }
    const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        console.warn("Fallo GPS intento 1, reintentando...", err);
        setTimeout(() => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (_errFinal) => reject(new Error("No se pudo obtener GPS. Intenta activar WiFi o salir al exterior.")),
            { enableHighAccuracy: false, timeout: 20000, maximumAge: 0 }
          );
        }, 1000);
      },
      options
    );
  });
};

const MyItemsScreen: React.FC<MyItemsScreenProps> = ({ user, onMenuClick, onEditRequest, onViewRequest, onActivateRequest }) => {
  // --- LÓGICA DE ESTADO (INTACTA) ---
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
        try { location = await getRobustLocation(); } catch (e) {
          alert("⚠️ Error: Se necesita GPS para reportar el robo.");
          setProcessingId(null);
          return;
        }
      }
      const newStatus = isReported ? ItemStatus.Recuperado : ItemStatus.Denunciado;
      await updateItemStatus(item.qrId, user.uid, newStatus, location);
      await fetchItems();
    } catch (error) { alert("Error de conexión."); } finally { setProcessingId(null); }
  };

  const handleUpdateLocation = async (item: Item) => {
    if (!item.qrId) return;
    if (!window.confirm("¿Actualizar la ubicación de este artículo a tu posición actual?")) return;
    setProcessingId(item.qrId);
    try {
      const location = await getRobustLocation();
      const currentDeviceId = localStorage.getItem('qr_device_id') || `dev_${Date.now()}`;
      localStorage.setItem('qr_device_id', currentDeviceId);

      if (item.qrId) {
        // Actualizamos ubicación Y el ID del dispositivo vinculado para "mudarlo" al cúmulo actual
        await updateItem(item.qrId, {
          location: { lat: location.lat, lng: location.lng },
          locationTimestamp: Date.now(),
          linkedDeviceId: currentDeviceId
        });
        alert("📍 Ubicación actualizada y vinculado a este dispositivo.");
        await fetchItems();
      }
    } catch (error: any) { alert(error.message || "Error de GPS."); } finally { setProcessingId(null); }
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

  // --- UI CONSTANTS ---
  const glassCardBase = "relative rounded-2xl overflow-hidden transition-all duration-300 shadow-xl backdrop-blur-md border";

  return (
    <div className="flex flex-col h-full bg-[#0d1226]">
      {/* HEADER SIN TRANSPARENCIA AQUÍ (Para que se vea sólido y limpio) */}
      <Header title="MIS ARTÍCULOS" onMenuClick={onMenuClick} transparent={false} />

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

      <div className="flex-grow p-4 overflow-y-auto pb-28">
        {loading ? (
          <div className="flex justify-center items-center h-full"><Spinner /></div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60%] text-gray-400 opacity-60 text-center">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-lg font-medium">Tu bóveda está vacía.</p>
            <p className="text-xs">Usa el botón "+" para proteger algo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((item) => {
              // Estados lógicos
              const isLocked = item.paymentStatus === PaymentStatus.Pending;
              const isInReview = item.paymentStatus === PaymentStatus.Review;
              const isReported = item.status === ItemStatus.Denunciado;
              const isRecovered = item.status === ItemStatus.Recuperado;
              const isExpanded = expandedItemId === item.qrId;
              const actionsDisabled = isLocked || isInReview;

              // Estilos dinámicos de borde y fondo
              let cardStyle = "bg-[#111928] border-white/10 hover:border-blue-500/50";
              let statusBadge = null;

              if (isReported) {
                cardStyle = "bg-[#1a0505] border-red-600 shadow-red-500/20";
                statusBadge = <span className="bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest animate-pulse shadow-lg shadow-red-500/40">🚨 ROBADO</span>;
              } else if (isRecovered) {
                cardStyle = "bg-[#061809] border-green-600 shadow-green-500/20";
                statusBadge = <span className="bg-green-600 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest shadow-lg shadow-green-500/40">✔ RECUPERADO</span>;
              } else if (isLocked) {
                cardStyle = "bg-[#1a1500] border-yellow-500 shadow-yellow-500/20";
                statusBadge = <span className="bg-yellow-500 text-black px-3 py-1 rounded-full text-[10px] font-black tracking-widest">⚠ PAGO PENDIENTE</span>;
              } else if (isInReview) {
                cardStyle = "bg-[#0d1226] border-blue-400 animate-pulse";
                statusBadge = <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest">⏳ EN REVISIÓN</span>;
              }

              return (
                <div key={item.qrId} className={`${glassCardBase} ${cardStyle}`}>
                  {/* CABECERA DE TARJETA (Siempre visible) */}
                  <div
                    onClick={() => toggleExpand(item.qrId!)}
                    className="p-5 flex justify-between items-start cursor-pointer active:bg-white/5 transition-colors"
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {statusBadge}
                        {!statusBadge && <span className="bg-blue-900/50 text-blue-200 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border border-blue-500/30">PROTEGIDO</span>}
                      </div>

                      <h3 className="text-white font-extrabold text-xl leading-tight mb-1">
                        {item.marca}
                      </h3>
                      <p className="text-gray-400 font-medium text-sm">{item.modelo}</p>
                      <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mt-2 border-l-2 border-blue-500 pl-2">
                        {item.tipo}
                      </p>
                    </div>

                    <div className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-white/10 text-white' : ''}`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* CONTENIDO EXPANDIBLE (Detalles y Acciones) */}
                  {isExpanded && (
                    <div className="bg-black/20 p-5 border-t border-white/5 animate-fade-in space-y-5">

                      {/* 1. ÁREA DE QR (Credencial) */}
                      <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-white/5 relative overflow-hidden group">
                        <div className={`transition-all duration-300 transform group-hover:scale-105 ${actionsDisabled ? 'blur-sm opacity-30 grayscale' : ''}`}>
                          <QRCode shortId={item.shortId || '---'} />
                        </div>
                        <p className="mt-3 text-[10px] font-mono text-gray-500 tracking-[0.2em]">{item.shortId || "SIN ID"}</p>

                        {/* Overlay de Bloqueo (Si aplica) */}
                        {actionsDisabled && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            {isLocked ? (
                              <button onClick={() => onActivateRequest(item)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-black py-2 px-6 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 text-xs">
                                ACTIVAR AHORA
                              </button>
                            ) : (
                              <div className="bg-blue-600 px-4 py-2 rounded-full shadow-lg">
                                <p className="text-white font-bold text-xs">Verificando...</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 2. BOTONES DE ACCIÓN (Grid) */}
                      {!actionsDisabled && (
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => onViewRequest(item)} className="col-span-1 bg-[#1e2a47] hover:bg-[#2a3b5e] border border-white/10 text-blue-200 py-3 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-2">
                            📄 DETALLES
                          </button>
                          <button onClick={() => onEditRequest(item)} className="col-span-1 bg-[#1e2a47] hover:bg-[#2a3b5e] border border-white/10 text-gray-200 py-3 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-2">
                            ✏️ EDITAR
                          </button>

                          {/* Botón Actualizar GPS */}
                          <button onClick={() => handleUpdateLocation(item)} disabled={!!processingId} className="col-span-2 bg-gradient-to-r from-blue-900/50 to-cyan-900/50 hover:from-blue-800/50 hover:to-cyan-800/50 border border-blue-500/30 text-blue-300 py-3 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            ACTUALIZAR UBICACIÓN
                          </button>

                          {/* BOTÓN DE EMERGENCIA (ROJO/VERDE) */}
                          <button
                            onClick={() => initiateToggleStatus(item)}
                            disabled={!!processingId}
                            className={`col-span-2 py-4 rounded-xl font-black text-sm shadow-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-2 border border-white/20
                              ${isReported
                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-green-500/20'
                                : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-500/20'}`}
                          >
                            {processingId === item.qrId ? <Spinner /> : (
                              <>
                                <span className="text-xl">{isReported ? "👍" : "🚨"}</span>
                                {isReported ? "YA LO TENGO (RECUPERADO)" : "DENUNCIAR ROBO"}
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Botón Eliminar (Discreto) */}
                      <div className="pt-2 border-t border-white/5 flex justify-center">
                        <button onClick={() => initiateDelete(item)} className="text-red-500/40 hover:text-red-400 text-[10px] uppercase font-bold tracking-[0.2em] transition-colors">
                          ELIMINAR DEL SISTEMA
                        </button>
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