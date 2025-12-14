import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { TransferRequest, TransferStatus } from '../types';
import { getPendingTransfers, getSentTransfers, approveTransfer, rejectTransfer, cancelTransfer } from '../services/itemService';
import Spinner from '../components/Spinner';

interface TransfersScreenProps {
  user: User;
  onMenuClick: () => void;
  // Nuevas props para iniciar transferencia desde aquí
  onScanRequest: () => void;
  onInputCodeRequest: () => void;
}

const TransfersScreen: React.FC<TransfersScreenProps> = ({ user, onMenuClick, onScanRequest, onInputCodeRequest }) => {
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [receivedRequests, setReceivedRequests] = useState<TransferRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const [rec, sent] = await Promise.all([
        getPendingTransfers(user.uid),
        getSentTransfers(user.uid)
      ]);
      setReceivedRequests(rec);
      setSentRequests(sent);
    } catch (error) {
      console.error("Error cargando transferencias:", error);
    } finally {
      setLoading(false);
    }
  }, [user.uid]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (req: TransferRequest) => {
    if (!window.confirm("¿Confirmas que recibiste el pago y deseas transferir la propiedad? Esta acción es irreversible.")) return;
    setProcessingId(req.id);
    try {
      await approveTransfer(req.id, req.itemId, req.buyerId);
      await fetchRequests();
      alert("¡Transferencia exitosa! El ítem ya no te pertenece.");
    } catch (e) {
      alert("Error al aprobar transferencia.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm("¿Rechazar solicitud?")) return;
    setProcessingId(id);
    try {
      await rejectTransfer(id);
      await fetchRequests();
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
      await fetchRequests();
    } catch (e) {
      alert("Error al cancelar.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1226] text-white">
      {/* HEADER */}
      <div className="bg-[#1e2a47] p-4 flex justify-between items-center shadow-md">
        <button onClick={onMenuClick} className="p-2">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <h1 className="text-lg font-bold uppercase tracking-wider text-yellow-400">Transferencias</h1>
        <div className="w-8"></div>
      </div>

      {/* BOTÓN DE ACCIÓN RÁPIDA (COMPRAR) */}
      <div className="p-4 bg-gradient-to-r from-blue-900 to-[#0d1226] border-b border-gray-700">
        <h3 className="text-sm text-gray-400 mb-2 uppercase font-bold text-center">¿Quieres recibir/comprar un artículo?</h3>
        <div className="flex gap-3">
          <button onClick={onScanRequest} className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
            ESCANEAR QR
          </button>
          <button onClick={onInputCodeRequest} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
            ABC-123
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('received')}
          className={`flex-1 py-3 font-bold text-sm ${activeTab === 'received' ? 'text-yellow-400 border-b-2 border-yellow-400 bg-white/5' : 'text-gray-400'}`}
        >
          RECIBIDAS ({receivedRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`flex-1 py-3 font-bold text-sm ${activeTab === 'sent' ? 'text-blue-400 border-b-2 border-blue-400 bg-white/5' : 'text-gray-400'}`}
        >
          ENVIADAS ({sentRequests.length})
        </button>
      </div>

      {/* LISTA */}
      <div className="flex-grow overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center mt-10"><Spinner /></div>
        ) : activeTab === 'received' ? (
          // LISTA DE VENDEDOR
          receivedRequests.length === 0 ? (
            <p className="text-center text-gray-500 mt-10">No tienes solicitudes pendientes.</p>
          ) : (
            <div className="space-y-4">
              {receivedRequests.map(req => (
                <div key={req.id} className="bg-[#1e2a47] p-4 rounded-xl border border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-white text-lg">{req.itemDetails.marca} {req.itemDetails.modelo}</p>
                      <p className="text-xs text-blue-300">{req.itemDetails.tipo}</p>
                    </div>
                    <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded">PENDIENTE</span>
                  </div>
                  <p className="text-sm text-gray-300 mb-4">
                    Comprador: <span className="text-white font-bold">{req.buyerEmail}</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={!!processingId}
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg font-bold text-sm transition-colors"
                    >
                      {processingId === req.id ? '...' : '✅ CONFIRMAR PAGO'}
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      disabled={!!processingId}
                      className="px-4 bg-red-900/50 text-red-400 border border-red-900 rounded-lg font-bold text-sm hover:bg-red-900/80"
                    >
                      RECHAZAR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // LISTA DE COMPRADOR
          sentRequests.length === 0 ? (
            <p className="text-center text-gray-500 mt-10">No has enviado solicitudes.</p>
          ) : (
            <div className="space-y-4">
              {sentRequests.map(req => (
                <div key={req.id} className="bg-[#1e2a47] p-4 rounded-xl border border-gray-700 opacity-80">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-white">{req.itemDetails.marca} {req.itemDetails.modelo}</p>
                      <p className="text-xs text-gray-400">Solicitado el: {new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded font-bold 
                                    ${req.status === TransferStatus.Pending ? 'bg-yellow-500/20 text-yellow-400' :
                        req.status === TransferStatus.Rejected ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                      {req.status === TransferStatus.Pending ? 'ESPERANDO APROBACIÓN' : req.status}
                    </span>
                  </div>
                  {req.status === TransferStatus.Pending && (
                    <button
                      onClick={() => handleCancel(req.id)}
                      disabled={!!processingId}
                      className="w-full mt-2 border border-gray-600 text-gray-400 py-2 rounded-lg text-sm hover:text-white hover:border-white transition-colors"
                    >
                      CANCELAR SOLICITUD
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default TransfersScreen;