import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { getAllUserItems, deleteItem } from '../services/itemService';
import { Item, PaymentStatus } from '../types';
import Spinner from '../components/Spinner';
import QRCode from '../components/QRCode';
import Header from '../components/Header';

interface MyItemsScreenProps {
  user: User;
  onMenuClick: () => void;
  onEditRequest: (item: Item) => void;
  onViewRequest: (item: Item) => void;
  onActivateRequest: (item: Item) => void; // Para pagar el servicio
}

const MyItemsScreen: React.FC<MyItemsScreenProps> = ({ user, onMenuClick, onEditRequest, onViewRequest, onActivateRequest }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const userItems = await getAllUserItems(user.uid);
      setItems(userItems);
    } catch (error) {
      console.error("Error al cargar items:", error);
    } finally {
      setLoading(false);
    }
  }, [user.uid]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const toggleExpand = (id: string) => {
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  const handleDelete = async (item: Item) => {
    if (!item.qrId) return;
    if (window.confirm("¿Estás seguro de eliminar este item? Esta acción no se puede deshacer.")) {
      try {
        await deleteItem(item.qrId, user.uid);
        fetchItems();
      } catch (error) {
        alert("Error al eliminar.");
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1226]">
      <Header title="MIS ARTÍCULOS" onMenuClick={onMenuClick} />

      <div className="flex-grow p-4 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-full"><Spinner /></div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            <p>No tienes artículos registrados.</p>
            <p className="text-sm mt-2">Usa el botón "+" para agregar uno.</p>
          </div>
        ) : (
          <div className="space-y-4 pb-20">
            {items.map((item) => {
              // VERIFICAMOS SI ESTÁ BLOQUEADO POR FALTA DE PAGO
              const isLocked = item.paymentStatus === PaymentStatus.Pending;
              const isExpanded = expandedItemId === item.qrId;

              return (
                <div key={item.qrId} className={`bg-[#1e2a47] rounded-xl overflow-hidden border ${isLocked ? 'border-yellow-600' : 'border-gray-700'} shadow-lg transition-all duration-300`}>

                  {/* HEADER DEL CARD */}
                  <div
                    onClick={() => toggleExpand(item.qrId!)}
                    className="p-4 flex justify-between items-center cursor-pointer bg-gradient-to-r from-[#1e2a47] to-[#2a3b61]"
                  >
                    <div>
                      <h3 className="font-bold text-white text-lg">{item.marca} {item.modelo}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-blue-300 uppercase font-bold tracking-wider">{item.tipo}</span>
                        {isLocked && <span className="text-[10px] bg-yellow-600 text-white px-2 py-0.5 rounded-full animate-pulse">PAGO PENDIENTE</span>}
                      </div>
                    </div>
                    <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>

                  {/* CONTENIDO EXPANDIBLE */}
                  {isExpanded && (
                    <div className="p-4 bg-[#161f36] border-t border-gray-700 flex flex-col items-center">

                      {/* ZONA DE QR (CON BLOQUEO VISUAL) */}
                      <div className="relative mb-4">
                        <div className={isLocked ? 'blur-sm opacity-30 select-none pointer-events-none' : ''}>
                          <QRCode shortId={item.shortId || '???'} />
                        </div>

                        {isLocked && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            <svg className="w-12 h-12 text-yellow-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            <button
                              onClick={() => onActivateRequest(item)}
                              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-6 rounded-full shadow-lg transition-transform hover:scale-105"
                            >
                              ACTIVAR SERVICIO
                            </button>
                          </div>
                        )}
                      </div>

                      {/* BOTONERA DE ACCIONES */}
                      <div className="grid grid-cols-2 gap-3 w-full">
                        {/* Botones de gestión estándar */}
                        <button
                          onClick={() => onEditRequest(item)}
                          className="bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-bold text-sm"
                        >
                          EDITAR
                        </button>
                        <button
                          onClick={() => onViewRequest(item)} // Cambiado a onViewRequest (Ver detalles/Denunciar)
                          disabled={isLocked} // No puede denunciar si no paga
                          className={`py-2 rounded-lg font-bold text-sm text-white ${isLocked ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-red-900/80 hover:bg-red-800'}`}
                        >
                          GESTIONAR / DENUNCIAR
                        </button>

                        {/* Botón de Eliminación (Siempre disponible por si quiere borrarlo) */}
                        <button
                          onClick={() => handleDelete(item)}
                          className="col-span-2 mt-2 text-xs text-red-500 hover:text-red-400 underline"
                        >
                          Eliminar artículo del sistema
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
