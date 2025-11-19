import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Modal from './Modal';

interface QRScannerModalProps {
    onClose: () => void;
    onScanSuccess: (decodedText: string) => void;
    title: string;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ onClose, onScanSuccess, title }) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const regionId = 'reader-qr-container'; // ID único para el contenedor

    useEffect(() => {
        // Esperamos un poco para asegurar que el modal se haya renderizado en el DOM
        const timer = setTimeout(() => {
            if (!scannerRef.current) {
                const scanner = new Html5QrcodeScanner(
                    regionId,
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                        showTorchButtonIfSupported: true
                    },
                    false
                );

                scanner.render(
                    (text) => {
                        // ¡Éxito! Se leyó el código
                        // Limpiamos el escáner para evitar lecturas múltiples
                        if (scannerRef.current) {
                            scannerRef.current.clear().catch(console.error);
                        }
                        onScanSuccess(text);
                    },
                    (err) => {
                        // Error silencioso mientras busca QR (es normal)
                    }
                );
                scannerRef.current = scanner;
            }
        }, 100);

        // Limpieza al cerrar el componente
        return () => {
            clearTimeout(timer);
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
            }
        };
    }, [onScanSuccess]);

    return (
        <Modal onClose={onClose} title={title}>
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg text-black min-h-[400px]">
                {/* Contenedor donde la librería monta la cámara */}
                <div id={regionId} className="w-full max-w-[350px] overflow-hidden" />

                <p className="text-sm text-gray-600 mt-4 font-bold text-center">
                    Apunta la cámara al código QR
                </p>
                <button
                    onClick={onClose}
                    className="mt-6 px-4 py-2 bg-red-100 text-red-600 rounded-lg font-bold text-sm hover:bg-red-200 transition-colors"
                >
                    Cancelar Escaneo
                </button>
            </div>
        </Modal>
    );
};

export default QRScannerModal;
