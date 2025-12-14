import React, { useEffect, useState } from 'react';
import { getPendingPayments, getAllItemsForAdmin, approvePayment, rejectPayment } from '../services/adminService';
import { deleteItem } from '../services/itemService';
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { PaymentNotification, Item, PaymentStatus } from '../types';
import Spinner from '../components/Spinner';
import Header from '../components/Header';

interface AdminPaymentsScreenProps {
    onMenuClick: () => void;
}

const AdminPaymentsScreen: React.FC<AdminPaymentsScreenProps> = ({ onMenuClick }) => {
    const [activeTab, setActiveTab] = useState<'requests' | 'inventory'>('requests');
    const [filterState, setFilterState] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL'); // Filtro para inventario

    const [requests, setRequests] = useState<PaymentNotification[]>([]);
    const [inventory, setInventory] = useState<Item[]>([]);
    const [filteredData, setFilteredData] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'requests') {
                const data = await getPendingPayments();
                setRequests(data);
                setFilteredData(data);
            } else {
                const data = await getAllItemsForAdmin(); // Trae TODO
                setInventory(data);
                // Aplicar filtro inicial
                filterInventory(data, filterState, searchTerm);
            }
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const filterInventory = (data: Item[], state: string, search: string) => {
        let res = data;

        // 1. Filtro por Estado
        if (state === 'PAID') res = res.filter(i => i.paymentStatus === PaymentStatus.Paid);
        if (state === 'PENDING') res = res.filter(i => i.paymentStatus !== PaymentStatus.Paid);

        // 2. Filtro por Búsqueda
        if (search) {
            const lower = search.toLowerCase();
            res = res.filter(i =>
                (i.ownerId || '').toLowerCase().includes(lower) ||
                (i.marca || '').toLowerCase().includes(lower) ||
                (i.modelo || '').toLowerCase().includes(lower)
            );
        }
        setFilteredData(res);
    };

    useEffect(() => { fetchData(); }, [activeTab]);

    // Reaccionar a cambios en filtros/search (solo para inventario)
    useEffect(() => {
        if (activeTab === 'inventory') {
            filterInventory(inventory, filterState, searchTerm);
        } else {
            // Logica simple para requests
            if (!searchTerm) setFilteredData(requests);
            else {
                const lower = searchTerm.toLowerCase();
                setFilteredData(requests.filter(r => r.userEmail.toLowerCase().includes(lower)));
            }
        }
    }, [searchTerm, filterState, requests, inventory, activeTab]);


    const handleApprove = async (id: string | null, itemId: string, isRequest: boolean) => {
        if (!window.confirm("¿Confirmas la activación del servicio?")) return;
        setProcessingId(id || itemId);
        try {
            await approvePayment(isRequest ? id : null, itemId);
            alert("✅ Servicio Activado.");
            fetchData();
        } catch (error) { alert("Error."); } finally { setProcessingId(null); }
    };

    const handleReject = async (notifId: string, itemId: string) => {
        if (!window.confirm("¿Rechazar solicitud?")) return;
        setProcessingId(notifId);
        try {
            await rejectPayment(notifId, itemId);
            fetchData();
        } catch (error) { alert("Error."); } finally { setProcessingId(null); }
    };

    const handleDelete = async (itemId: string, userId: string, notifId?: string) => {
        if (!window.confirm("🚨 ¿ELIMINAR ÍTEM DEL SISTEMA?")) return;
        setProcessingId(itemId);
        try {
            await deleteItem(itemId, userId);
            if (notifId) await deleteDoc(doc(db, "PaymentNotifications", notifId));
            alert("🗑️ Eliminado.");
            fetchData();
        } catch (error) { alert("Error al eliminar."); } finally { setProcessingId(null); }
    };

    return (
        <div className="flex flex-col h-full bg-[#0d1226]">
            <Header title="ADMINISTRACIÓN" onMenuClick={onMenuClick} />

            {/* TABS SUPERIORES */}
            <div className="flex border-b border-gray-700 bg-[#0f1523]">
                <button
                    onClick={() => { setActiveTab('requests'); setSearchTerm(''); }}
                    className={`flex-1 py-4 text-sm font-bold tracking-wide transition-colors ${activeTab === 'requests' ? 'text-yellow-400 border-b-2 border-yellow-400 bg-white/5' : 'text-gray-500'}`}
                >
                    SOLICITUDES ({requests.length})
                </button>
                <button
                    onClick={() => { setActiveTab('inventory'); setSearchTerm(''); }}
                    className={`flex-1 py-4 text-sm font-bold tracking-wide transition-colors ${activeTab === 'inventory' ? 'text-blue-400 border-b-2 border-blue-400 bg-white/5' : 'text-gray-500'}`}
                >
                    INVENTARIO ({inventory.length})
                </button>
            </div>

            <div className="p-4 bg-[#1e2a47]">
                <input
                    type="text" placeholder="Buscar email, ID, marca..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-black/30 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:border-yellow-500 mb-3"
                />

                {/* SUB-FILTROS PARA INVENTARIO */}
                {activeTab === 'inventory' && (
                    <div className="flex gap-2">
                        <button onClick={() => setFilterState('ALL')} className={`px-3 py-1 rounded text-[10px] font-bold ${filterState === 'ALL' ? 'bg-white text-black' : 'bg-gray-700 text-gray-300'}`}>TODOS</button>
                        <button onClick={() => setFilterState('PAID')} className={`px-3 py-1 rounded text-[10px] font-bold ${filterState === 'PAID' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}>PAGADOS</button>
                        <button onClick={() => setFilterState('PENDING')} className={`px-3 py-1 rounded text-[10px] font-bold ${filterState === 'PENDING' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}>DEUDORES</button>
                    </div>
                )}
            </div>

            <div className="flex-grow p-4 overflow-y-auto">
                {loading ? <div className="flex justify-center mt-10"><Spinner /></div> : filteredData.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10"><p>Sin datos.</p></div>
                ) : (
                    <div className="space-y-4">
                        {filteredData.map(item => (
                            <div key={item.id || item.qrId} className="bg-[#1e2a47] p-4 rounded-xl border border-gray-600 shadow-md relative">
                                {activeTab === 'requests' ? (
                                    // --- VISTA SOLICITUDES ---
                                    <>
                                        <div className="absolute top-4 right-4 bg-yellow-600 text-white text-[10px] px-2 py-1 rounded font-bold animate-pulse">NUEVO PAGO</div>
                                        <p className="text-white font-bold">{item.userEmail}</p>
                                        <p className="text-gray-400 text-sm">{item.itemDetails?.marca} - ${item.amount} {item.currency}</p>
                                        <div className="flex gap-2 mt-3">
                                            <button onClick={() => handleApprove(item.id, item.itemId, true)} disabled={!!processingId} className="flex-1 bg-green-600 text-white py-2 rounded font-bold text-xs disabled:opacity-50">APROBAR</button>
                                            <button onClick={() => handleReject(item.id, item.itemId)} disabled={!!processingId} className="bg-yellow-600 text-white px-4 rounded font-bold text-xs disabled:opacity-50">RECHAZAR</button>
                                            <button onClick={() => handleDelete(item.itemId, item.userId, item.id)} disabled={!!processingId} className="bg-red-900/50 text-red-400 px-3 rounded font-bold text-xs disabled:opacity-50">🗑️</button>
                                        </div>
                                    </>
                                ) : (
                                    // --- VISTA INVENTARIO GLOBAL ---
                                    <>
                                        <div className={`absolute top-4 right-4 text-[10px] px-2 py-1 rounded font-bold ${item.paymentStatus === PaymentStatus.Paid ? 'bg-green-600 text-white' : item.paymentStatus === PaymentStatus.Review ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
                                            {item.paymentStatus === PaymentStatus.Paid ? 'PAGADO' : item.paymentStatus === PaymentStatus.Review ? 'EN REVISIÓN' : 'IMPAGO'}
                                        </div>
                                        <p className="text-white font-bold text-lg">{item.marca} {item.modelo}</p>
                                        <p className="text-gray-400 text-xs mb-1">Dueño ID: <span className="text-blue-300 font-mono">{item.ownerId.substring(0, 10)}...</span></p>
                                        <p className="text-gray-500 text-[10px]">QR ID: {item.shortId || 'N/A'}</p>

                                        <div className="flex gap-2 mt-3">
                                            {item.paymentStatus !== PaymentStatus.Paid && (
                                                <button onClick={() => handleApprove(null, item.qrId!, false)} disabled={!!processingId} className="flex-1 bg-blue-600 text-white py-2 rounded font-bold text-xs disabled:opacity-50">ACTIVAR MANUAL</button>
                                            )}
                                            <button onClick={() => handleDelete(item.qrId!, item.ownerId)} disabled={!!processingId} className="bg-red-900/50 text-red-400 px-4 rounded font-bold text-xs border border-red-900/50 hover:bg-red-900 disabled:opacity-50">ELIMINAR</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPaymentsScreen;
