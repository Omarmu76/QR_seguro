import React from 'react';
import Header from '../components/Header';
import QRCode from '../components/QRCode';
import { Item } from '../types';

interface ItemDetailScreenProps {
  item: Item;
  onDone: () => void;
}

const ItemDetailScreen: React.FC<ItemDetailScreenProps> = ({ item, onDone }) => {
  const qrCanvasId = `qr-canvas-${item.qrId || 'detail'}`;

  const handleShare = async () => {
    const canvas = document.getElementById(qrCanvasId) as HTMLCanvasElement;
    if (!canvas) {
      console.error("No se pudo encontrar el QR para compartir.");
      return;
    }
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `qr-${item.shortId || 'item'}.png`, { type: blob.type });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `QR Item ${item.marca}`,
          text: `Código de respaldo: ${item.shortId}`,
          files: [file],
        });
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `qr-${item.shortId || 'item'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
         console.error("Error al compartir el QR.", err);
      }
    }
  };

  return (
    <div className="absolute inset-0 bg-[#0d1226] flex flex-col z-50 text-white">
      <Header title="DETALLE DEL ITEM" onMenuClick={onDone} />
      <div className="flex-grow p-6 overflow-y-auto flex flex-col items-center justify-between">
        <div className="w-full max-w-xs">
          {item.qrId && item.shortId ? (
            <QRCode
              qrId={item.qrId}
              shortId={item.shortId}
              canvasId={qrCanvasId}
            />
          ) : (
            <div className="w-full h-auto bg-gray-700 flex items-center justify-center p-8">
              <p>Error al generar QR</p>
            </div>
          )}
          <p className="text-center mt-4 text-gray-300">
            Código de respaldo:
            <strong className="text-yellow-400 text-lg ml-2">{item.shortId || 'N/A'}</strong>
          </p>
          <p className="text-center mt-2 text-xs text-gray-500 break-all">ID Documento: {item.qrId}</p>
        </div>

        <div className="bg-[#1e2a47] p-4 rounded-lg w-full mt-6">
          <h3 className="text-lg font-bold text-yellow-400 mb-2">Detalles del Item</h3>
          <div className="space-y-1 text-md">
            <p><span className="font-semibold text-gray-300">Tipo:</span> {item.tipo}</p>
            <p><span className="font-semibold text-gray-300">Marca:</span> {item.marca}</p>
            <p><span className="font-semibold text-gray-300">Modelo:</span> {item.modelo}</p>
            <p><span className="font-semibold text-gray-300">ID:</span> {item.identificador}</p>
          </div>
        </div>

        <div className="w-full mt-6 space-y-3">
          <button
            onClick={handleShare}
            className="w-full bg-green-600 text-white py-3 rounded-lg text-lg font-bold hover:bg-green-700 transition-colors"
          >
            COMPARTIR / DESCARGAR
          </button>
          <button
            onClick={onDone}
            className="w-full bg-blue-600 text-white py-3 rounded-lg text-lg font-bold hover:bg-blue-700 transition-colors"
          >
            LISTO
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailScreen;