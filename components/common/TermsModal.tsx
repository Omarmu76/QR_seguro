import React from 'react';

interface TermsModalProps {
    onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-white text-gray-900 w-full max-w-lg h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">

                {/* Encabezado */}
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center text-black">
                    <h2 className="text-lg font-black text-gray-800">TÉRMINOS Y CONDICIONES</h2>
                    <button onClick={onClose} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors">
                        ✕
                    </button>
                </div>

                {/* Contenido Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 text-sm leading-relaxed space-y-4 text-gray-700">
                    <p className="font-bold text-gray-500">Última actualización: Diciembre 2025</p>

                    <h3 className="font-bold text-lg mt-2 text-blue-900 uppercase">1. ACEPTACIÓN DE LOS TÉRMINOS</h3>
                    <p>Al descargar, instalar, registrarse o utilizar <strong>QR SEGURO</strong> (en adelante, "LA APLICACIÓN"), usted acepta vincularse jurídicamente por los presentes Términos. El uso implica la aceptación plena de las funcionalidades de rastreo, geolocalización y seguridad aquí descritas.</p>

                    <h3 className="font-bold text-lg mt-2 text-blue-900 uppercase">2. NATURALEZA DE LA HERRAMIENTA</h3>
                    <p>LA APLICACIÓN es una herramienta de gestión de activos. Su función es permitir el registro de bienes, generación de códigos QR y, mediante GPS, rastrear la ubicación en caso de pérdida o sustracción.</p>

                    <h3 className="font-bold text-lg mt-2 text-blue-900 uppercase">3. POLÍTICA DE RASTREO Y "SILENT HUNT"</h3>
                    <p><strong>3.1. Consentimiento:</strong> EL USUARIO consiente que sus dispositivos reporten ubicación en primer y segundo plano a nuestros servidores para fines de seguridad.</p>
                    <p><strong>3.2. Modalidad "Recuperación Silenciosa":</strong> EL USUARIO acepta que, al declarar un dispositivo como "ROBADO":</p>
                    <ul className="list-disc pl-5 space-y-1 bg-yellow-50 p-3 rounded border border-yellow-200 text-gray-800">
                        <li>El dispositivo reportará su ubicación de manera <strong>silenciosa y oculta</strong> al poseedor actual.</li>
                        <li>EL USUARIO declara bajo juramento ser el legítimo propietario.</li>
                        <li>LA APLICACIÓN no se hace responsable por el uso de esta tecnología para espionaje a terceros sin consentimiento.</li>
                    </ul>

                    <h3 className="font-bold text-lg mt-2 text-blue-900 uppercase">4. SEGURIDAD FÍSICA</h3>
                    <p><strong>Prohibición de Justicia por Mano Propia:</strong> LA APLICACIÓN advierte que NO debe intentar recuperar objetos robados por medios propios si implica confrontación. La información es exclusivamente para aportar pruebas a las <strong>Fuerzas de Seguridad</strong>.</p>

                    <h3 className="font-bold text-lg mt-2 text-blue-900 uppercase">5. TRANSFERENCIA Y PRIVACIDAD</h3>
                    <p>Al transferir un ítem, el sistema eliminará permanentemente el QR anterior y generará uno nuevo, disociando el historial de ubicaciones para garantizar la privacidad del nuevo y antiguo propietario.</p>

                    <h3 className="font-bold text-lg mt-2 text-blue-900 uppercase">6. VERIFICACIÓN DE IDENTIDAD</h3>
                    <p>Por seguridad, el acceso requiere obligatoriamente una cuenta con <strong>correo electrónico verificado</strong>. Nos reservamos el derecho de suspender cuentas no verificadas.</p>

                    <h3 className="font-bold text-lg mt-2 text-blue-900 uppercase">7. DISPONIBILIDAD</h3>
                    <p>La eficacia del rastreo depende de factores externos (Internet, GPS, Batería). No garantizamos el éxito en la recuperación del 100% de los bienes.</p>
                </div>

                {/* Pie */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <button onClick={onClose} className="w-full bg-[#0d1226] text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-transform active:scale-95 shadow-lg">
                        ENTENDIDO
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TermsModal;
