import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { TransferRequest, TransferStatus, Item, ItemStatus } from '../types';
import { approveTransfer, rejectTransfer, cancelTransfer, getAllUserItems, subscribeToIncomingTransfers, subscribeToOutgoingTransfers } from '../services/itemService';
import Spinner from '../components/Spinner';

interface TransfersScreenProps {
  user: User;
  onMenuClick: () => void;
  onScanRequest: () => void;
  onInputCodeRequest: () => void;
}

const TransfersScreen: React.FC<TransfersScreenProps> = ({ user, onMenuClick, onScanRequest, onInputCodeRequest }) => {
  const [activeTab, setActiveTab] = useState<'items' | 'received' | 'sent'>('items');
  const [receivedRequests, setReceivedRequests] = useState<TransferRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Para forzar re-suscripción

  // --- LÓGICA DE COMPARTIR ---
  const [selectedForShare, setSelectedForShare] = useState<Item | null>(null);
  const [myItems, setMyItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!user) return;
    setErrorMsg(null);

    const handleError = (err: any) => {
      console.error("DEBUG TRANSFER ERROR:", err);
      if (err.message?.includes("index")) {
        setErrorMsg("⚠️ Falta un índice en Firebase. Por favor, revisa la consola del navegador y haz clic en el enlace azul para generarlo.");
      } else {
        setErrorMsg(`Error: ${err.message || 'No se pudo conectar con el servidor.'}`);
      }
    };

    // A. Suscripción a Solicitudes ENTRANTES (Ventas)
    const unsubIn = subscribeToIncomingTransfers(user.uid, (data) => {
      console.log("📥 Solicitudes recibidas:", data.length);
      setReceivedRequests(data);
      if (loading) setLoading(false);
    }, handleError);

    // B. Suscripción a Solicitudes SALIENTES (Compras)
    const unsubOut = subscribeToOutgoingTransfers(user.uid, (data) => {
      console.log("📤 Solicitudes enviadas:", data.length);
      setSentRequests(data);
      if (loading) setLoading(false);
    }, handleError);

    return () => {
      unsubIn();
      unsubOut();
    };
  }, [user.uid, refreshKey]);

  useEffect(() => {
    const fetchMyItems = async () => {
      try {
        const items = await getAllUserItems(user.uid);
        setMyItems(items.filter(i => i.status === ItemStatus.EnRegla));
      } catch (e) {
        console.error("Error fetching my items:", e);
      }
    };
    fetchMyItems();
  }, [user.uid]);

  const handleApprove = async (req: TransferRequest) => {
    if (!window.confirm("¿Confirmas que recibiste el pago y deseas transferir la propiedad?")) return;
    setProcessingId(req.id);
    try {
      await approveTransfer(req.id, req.itemId, req.buyerId);
      alert("¡Transferencia exitosa!");
    } catch (e) {
      alert("Error al aprobar.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm("¿Rechazar esta solicitud?")) return;
    setProcessingId(id);
    try {
      await rejectTransfer(id);
      alert("Solicitud rechazada.");
    } catch (e) {
      alert("Error al rechazar.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm("¿Cancelar esta solicitud?")) return;
    setProcessingId(id);
    try {
      await cancelTransfer(id);
    } catch (e) {
      alert("Error al cancelar.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleShareWhatsApp = (item: Item) => {
    const text = `Hola, para recibir mi ${item.marca}, ingresa el código: ${item.shortId} en la sección Transferencias de la App QRSEGURO.`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="w-full h-full bg-black flex justify-center items-center relative overflow-hidden font-sans">
      {/* Columna Izquierda (Espacio Premium) */}
      <div className="hidden lg:flex flex-1 h-full bg-gradient-to-br from-gray-900 to-black border-r border-white/10 items-center justify-center p-12">
        <div className="max-w-xs text-center">
            <h2 className="text-4xl font-black text-white/20 italic tracking-tighter uppercase">Transferir</h2>
            <p className="text-gray-600 mt-4 text-sm font-medium uppercase tracking-widest italic">Seguridad en cada paso</p>
        </div>
      </div>

      {/* Columna Central (App) */}
      <div className="w-full h-full lg:max-w-md bg-[#050b14] flex flex-col relative z-10 border-x border-white/5 shadow-2xl">
        <div className="bg-[#1e2a47]/80 backdrop-blur-md p-4 flex justify-between items-center border-b border-white/10">
          <button onClick={onMenuClick} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black uppercase tracking-widest text-white italic">Transferencias</h1>
            <button 
              onClick={() => setRefreshKey(prev => prev + 1)} 
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 active:scale-90 transition-all text-xs"
              title="Refrescar Solicitudes"
            >
              🔄
            </button>
          </div>
          <div className="w-10"></div>
        </div>

        {/* ACCIONES RÁPIDAS (Comprar/Recibir) - Visibles pero pequeñas */}
        <div className="p-3 bg-blue-900/10 border-b border-white/5 flex gap-2">
           <button 
             onClick={onScanRequest} 
             className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-black py-2 rounded-lg text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-widest"
           >
             <span className="text-sm">📷</span> ESCANEAR
           </button>
           <button 
             onClick={onInputCodeRequest}
             className="flex-[0.8] bg-white/5 hover:bg-white/10 text-white font-black py-2 rounded-lg text-[10px] border border-white/10 transition-all active:scale-95 uppercase tracking-widest"
           >
             CÓDIGO
           </button>
        </div>

        {/* PESTAÑAS DE NAVEGACIÓN */}
        <div className="flex bg-[#0d1226] border-b border-white/5">
           <button 
             onClick={() => setActiveTab('items')}
             className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'items' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500'}`}
           >
             📦 Artículos
           </button>
           <button 
             onClick={() => setActiveTab('received')}
             className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'received' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-gray-500'}`}
           >
             📥 Recibidas ({receivedRequests.length})
           </button>
           <button 
             onClick={() => setActiveTab('sent')}
             className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'sent' ? 'text-gray-300 border-b-2 border-gray-300' : 'text-gray-500'}`}
           >
             📤 Enviadas
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          
          {errorMsg && (
            <div className="mx-2 p-3 bg-red-900/20 border border-red-500/30 rounded-xl text-[10px] text-red-200 font-bold animate-fade-in">
              {errorMsg}
            </div>
          )}

          {/* CONTENIDO SEGÚN PESTAÑA */}
          {activeTab === 'items' && (
            <section className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <span className="text-lg">💸</span>
                </div>
                <h3 className="font-black text-white italic text-sm tracking-widest uppercase">Para Vender / Transferir</h3>
              </div>
              
              <div className="space-y-3">
                {myItems.length === 0 ? (
                  <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">No tienes artículos en regla</p>
                  </div>
                ) : (
                  myItems.map(item => (
                    <div key={item.qrId} className="bg-[#111928]/95 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-lg group">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h4 className="font-bold text-white text-base">{item.marca} {item.modelo}</h4>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.tipo}</p>
                        </div>
                        <div className="bg-green-500/20 text-green-400 text-[9px] font-black px-2 py-1 rounded-full uppercase">EN REGLA</div>
                      </div>
                      <button 
                        onClick={() => setSelectedForShare(item)}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/20 uppercase tracking-widest"
                      >
                        📲 Compartir Datos
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {activeTab === 'received' && (
            <section className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-500 font-bold">
                  <span className="text-lg">📥</span>
                </div>
                <h3 className="font-black text-white italic text-sm tracking-widest uppercase">Solicitudes Recibidas</h3>
              </div>

              {loading ? (
                <div className="flex justify-center p-8"><Spinner /></div>
              ) : receivedRequests.length === 0 ? (
                <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/5 opacity-50">
                  <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">Sin solicitudes por el momento</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {receivedRequests.map(req => (
                    <div key={req.id} className="bg-gradient-to-br from-[#1e2a47] to-[#0d1226] p-5 rounded-2xl border border-blue-500/20 shadow-xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3">
                         <span className="bg-yellow-500 text-black text-[8px] font-black px-2 py-1 rounded-full ring-2 ring-yellow-500/20 uppercase tracking-widest">Pendiente</span>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-blue-400 text-[9px] font-black uppercase tracking-widest mb-1">Artículo a transferir</p>
                        <h4 className="text-white font-black text-lg">{req.itemDetails.marca} {req.itemDetails.modelo}</h4>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px]">👤</div>
                          <p className="text-xs text-gray-300 font-medium">{req.buyerEmail}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleApprove(req)}
                          disabled={!!processingId}
                          className="flex-[2] bg-green-600 hover:bg-green-500 text-black py-3 rounded-xl font-black text-[10px] transition-all active:scale-95 shadow-lg shadow-green-900/20 uppercase tracking-widest"
                        >
                          {processingId === req.id ? '...' : '✅ Confirmar Venta'}
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={!!processingId}
                          className="flex-1 bg-red-900/30 hover:bg-red-900/50 text-red-500 py-3 rounded-xl font-black text-[10px] border border-red-900/50 transition-all uppercase tracking-widest"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'sent' && (
            <section className="space-y-4 animate-fade-in pb-12">
               <div className="flex items-center gap-3 px-2">
                  <div className="w-8 h-8 rounded-lg bg-gray-500/20 flex items-center justify-center text-gray-400">
                    <span className="text-lg">📤</span>
                  </div>
                  <h3 className="font-black text-white italic text-sm tracking-widest uppercase opacity-50 underline decoration-blue-500/30">Mis Compras / Pedidos</h3>
              </div>
              
              {sentRequests.length === 0 ? (
                 <div className="p-4 text-center opacity-30">
                    <p className="text-[10px] font-bold uppercase tracking-widest">No has enviado solicitudes</p>
                 </div>
              ) : (
                  <div className="space-y-3">
                     {sentRequests.map(req => (
                        <div key={req.id} className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center justify-between group">
                           <div>
                              <p className="text-xs font-bold text-gray-200">{req.itemDetails.marca} {req.itemDetails.modelo}</p>
                              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-tighter mt-1">{new Date(req.createdAt).toLocaleDateString()}</p>
                           </div>
                           <div className="flex items-center gap-3">
                              <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest
                                            ${req.status === TransferStatus.Pending ? 'bg-yellow-500/10 text-yellow-500' :
                                              req.status === TransferStatus.Rejected ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                {req.status === TransferStatus.Pending ? 'Esperando' : req.status}
                              </span>
                              {req.status === TransferStatus.Pending && (
                                 <button onClick={() => handleCancel(req.id)} className="w-6 h-6 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors">×</button>
                              )}
                           </div>
                        </div>
                     ))}
                  </div>
              )}
            </section>
          )}

        </div>
      </div>

      {/* Columna Derecha (Espacio Premium) */}
      <div className="hidden lg:flex flex-1 h-full bg-gradient-to-bl from-gray-900 to-black border-l border-white/10 items-center justify-center p-12">
        <div className="max-w-xs text-center">
            <h2 className="text-4xl font-black text-white/20 italic tracking-tighter uppercase">Vender</h2>
            <p className="text-gray-600 mt-4 text-sm font-medium uppercase tracking-widest italic">Digitalizando la confianza</p>
        </div>
      </div>

      {/* MODAL: COMPARTIR DATOS */}
      {selectedForShare && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fade-in">
          <div className="w-full max-w-sm bg-[#1e2a47] rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-scale-up">
             <div className="p-6 text-center border-b border-white/5">
                <h3 className="text-xl font-black text-white tracking-widest uppercase italic">Datos del Artículo</h3>
                <p className="text-blue-400 text-[10px] font-bold mt-2 uppercase tracking-widest">Listo para vender</p>
             </div>
             
             <div className="p-8 space-y-6">
                <div className="text-center">
                   <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-1">CÓDIGO DE TRANSFERENCIA</p>
                   <div className="bg-black/40 py-4 rounded-2xl border border-blue-500/30 flex items-center justify-center gap-3">
                      <span className="text-3xl font-black text-yellow-400 tracking-widest">{selectedForShare.shortId}</span>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(selectedForShare.shortId!); alert("Código copiado"); }}
                        className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center active:bg-blue-500 transition-colors"
                      >📋</button>
                   </div>
                </div>

                <div className="flex flex-col gap-3">
                   <button 
                      onClick={() => handleShareWhatsApp(selectedForShare)}
                      className="w-full bg-[#25D366] hover:bg-[#128C7E] text-black font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-green-900/20 transition-all active:scale-95 uppercase tracking-widest text-xs"
                   >
                     <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" className="w-5 h-5" alt="WA" />
                     WhatsApp
                   </button>
                   <button 
                      onClick={() => setSelectedForShare(null)}
                      className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors uppercase tracking-widest text-[10px]"
                   >
                     Cerrar
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default TransfersScreen;