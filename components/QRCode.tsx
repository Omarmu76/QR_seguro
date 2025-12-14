import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface QRCodeProps {
  // Eliminamos qrId porque ahora nos basamos 100% en el código corto visible
  shortId: string;
  canvasId?: string;
}

const QRCode: React.FC<QRCodeProps> = ({ shortId, canvasId = "qr-canvas" }) => {
  // Generamos una URL amigable. 
  // Esto permite que cámaras nativas intenten abrir la web,
  // y nuestro escáner interno interceptará este formato.
  const qrValue = `https://qrseguro.app/ver/${shortId}`;

  return (
    <div className="flex flex-col items-center bg-white p-3 rounded-lg shadow-sm border border-gray-200 w-fit mx-auto">
      <div className="p-1 border-2 border-black rounded">
        <QRCodeCanvas
          id={canvasId}
          value={qrValue}
          size={200}
          bgColor={"#ffffff"}
          fgColor={"#000000"}
          level={"H"} // Alta redundancia (se banca rayaduras)
          includeMargin={true}
        />
      </div>

      {/* Etiqueta de Seguridad Legible */}
      <div className="mt-2 flex flex-col items-center">
        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Código de Seguridad</span>
        <span className="text-2xl font-mono font-black text-black tracking-widest border-b-2 border-yellow-400 leading-none pb-1">
          {shortId}
        </span>
      </div>
    </div>
  );
};

export default QRCode;