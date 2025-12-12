import React, { useEffect, useState } from 'react';
import { getPendingPayments, approvePayment, rejectPayment } from '../services/adminService';
import { PaymentNotification } from '../types';
import Spinner from '../components/Spinner';
import Header from '../components/Header';

interface AdminPaymentsScreenProps {
    onMenuClick: () => void;
}

const AdminPaymentsScreen: React.FC<AdminPaymentsScreenProps> = ({ onMenuClick }) => {
    const [payments, setPayments] = useState<PaymentNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchPayments = async () => {
        setLoading(true);
        const data = await getPendingPayments();
        setPayments(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    const handleApprove = async (notif: PaymentNotification) => {
        if (!window.confirm(`¿Confirmas que recibiste $${notif.amount} de ${notif.userEmail}?`)) return;
        setProcessingId(notif.id);
        await approvePayment(notif);
        await fetchPayments();
        setProcessingId(null);
    };

    const handleReject = async (notif: PaymentNotification) => {
        if (!window.confirm("¿Rechazar este pago?")) return;
        setProcessingId(notif.id);
        await rejectPayment(notif);
        await fetchPayments();
        setProcessingId(null);
    };

    return (
        <div className="flex flex-col h-full bg-[#0d1226]">
            <Header title="ADMINISTRACIÓN PAGOS" onMenuClick={onMenuClick} />

            <div className="flex-grow p-4 overflow-y-auto">
                <div className="bg-gradient-to-r from-purple-900 to-blue-900 p-4 rounded-xl mb-6 shadow-lg">
                    <h2 className="text-white font-bold text-lg">Panel de Control</h2>
                    <p className="text-purple-200 text-sm">Verifica las transferencias de Prex antes de aprobar.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center"><Spinner /></div>
                ) : payments.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10">
                        <p>✅ No hay pagos pendientes de revisión.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {payments.map(p => (
                            <div key={p.id} className="bg-[#1e2a47] p-4 rounded-xl border border-gray-600 shadow-md">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-yellow-400 font-bold text-xl">${p.amount}</p>
                                        <p className="text-gray-300 text-xs uppercase font-bold">{p.method}</p>
                                    </div>
                                    <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-1 rounded">
                                        {new Date(p.createdAt).toLocaleDateString()}
                                    </span>
                                </div>

                                <div className="mb-4 text-sm text-gray-300 bg-black/20 p-3 rounded">
                                    <p><span className="text-gray-500">Usuario:</span> {p.userEmail}</p>
                                    <p><span className="text-gray-500">Item:</span> {p.itemDetails?.marca} {p.itemDetails?.modelo}</p>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleApprove(p)}
                                        disabled={!!processingId}
                                        className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-bold shadow-lg transition-colors"
                                    >
                                        {processingId === p.id ? '...' : 'APROBAR'}
                                    </button>
                                    <button
                                        onClick={() => handleReject(p)}
                                        disabled={!!processingId}
                                        className="px-4 bg-red-900/40 text-red-400 border border-red-900/50 rounded-lg hover:bg-red-900/60"
                                    >
                                        X
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPaymentsScreen;
