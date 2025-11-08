
import React from 'react';

interface QRCodeProps {
  id: string;
}

const QRCode: React.FC<QRCodeProps> = ({ id }) => {
  const createPath = (seed: string) => {
    let path = '';
    const size = 21;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const charCode = seed.charCodeAt((x * y + y) % seed.length) || 50;
        if (charCode % (2 + (x % 3)) === 0) {
          path += `M${x},${y}h1v1h-1z `;
        }
      }
    }
    // Add finder patterns for a more QR-like appearance
    path += 'M0,0h7v1h-6v6h-1z M1,1h5v5h-5z ';
    path += 'M14,0h7v1h-6v6h-1z M15,1h5v5h-5z ';
    path += 'M0,14h7v1h-6v6h-1z M1,15h5v5h-5z ';
    return path;
  };

  const qrPath = createPath(id);

  return (
    <div className="bg-white p-4 rounded-lg shadow-inner">
        <svg viewBox="0 0 21 21" className="w-full h-full" shapeRendering="crispEdges">
            <path fill="#000000" d={qrPath} />
        </svg>
    </div>
  );
};

export default QRCode;
