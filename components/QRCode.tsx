import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface QRCodeProps {
  qrId: string; // El ID del documento, va DENTRO del QR
  shortId: string; // El código corto, va EN EL CENTRO
  canvasId: string; // <<< AÑADE ESTA PROP
}

const QRCode: React.FC<QRCodeProps> = ({ qrId, shortId, canvasId }) => { // <<< AÑADE canvasId AQUÍ
  return (
    <div className="bg-white p-4 rounded-lg shadow-inner relative">
      <QRCodeCanvas
        id={canvasId} // <<< APLICA EL ID AQUÍ
        value={qrId} // El scanner leerá el qrId
        size={256} // Tamaño del canvas
        bgColor={"#ffffff"}
        fgColor={"#000000"}
        level={"H"} // Nivel alto de corrección de errores (bueno para logos)
        includeMargin={false}
        className="w-full h-full"
      />
      {/* Overlay con el código corto */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="bg-white bg-opacity-90 px-3 py-1 border-2 border-black rounded-md text-black text-xl font-bold tracking-widest">
          {shortId}
        </span>
      </div>
    </div>
  );
};

export default QRCode;