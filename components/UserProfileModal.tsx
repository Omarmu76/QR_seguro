import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { sendVerificationEmail, updateUserPassword } from '../services/authService';
import { auth } from '../firebaseConfig'; // Importamos auth para acceder al usuario actualizado

interface UserProfileModalProps {
    user: User;
    onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ user: initialUser, onClose }) => {
    const [newPass, setNewPass] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [verificationSent, setVerificationSent] = useState(false);

    // ESTADO LOCAL PARA REFLEJAR CAMBIOS EN TIEMPO REAL
    const [isVerified, setIsVerified] = useState(initialUser.emailVerified);

    // EFECTO DE AUTO-RECARGA AL ABRIR
    useEffect(() => {
        const checkStatus = async () => {
            if (auth.currentUser) {
                try {
                    await auth.currentUser.reload(); // Fuerza actualización desde Firebase
                    setIsVerified(auth.currentUser.emailVerified); // Actualiza la UI local
                } catch (e) {
                    console.error("Error recargando usuario", e);
                }
            }
        };
        checkStatus();
    }, []);

    const handleSendVerification = async () => {
        setLoading(true);
        try {
            await sendVerificationEmail(initialUser);
            alert("Correo de verificación enviado.\n\nRevisa tu bandeja de entrada (y Spam). Una vez confirmado, vuelve aquí.");
            setVerificationSent(true);
        } catch (e) {
            console.error(e);
            alert("Error al enviar el correo. Intenta más tarde.");
        } finally {
            setLoading(false);
        }
    };

    // Botón manual para verificar si el usuario ya hizo clic en el link
    const handleManualRefresh = async () => {
        setLoading(true);
        if (auth.currentUser) {
            await auth.currentUser.reload();
            if (auth.currentUser.emailVerified) {
                setIsVerified(true);
                alert("¡Verificado correctamente!");
            } else {
                alert("Aún no detectamos la verificación. Asegúrate de hacer clic en el enlace del correo.");
            }
        }
        setLoading(false);
    };

    const handleChangePass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPass.length < 6) {
            alert("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        setLoading(true);
        try {
            await updateUserPassword(initialUser, newPass);
            alert("Contraseña actualizada correctamente.");
            setNewPass('');
        } catch (e: any) {
            console.error(e);
            if (e.code === 'auth/requires-recent-login') {
                alert("Por seguridad, debes cerrar sesión y volver a entrar para cambiar la clave.");
            } else {
                alert("Error al cambiar la clave: " + e.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[2000] backdrop-blur-sm">
            <div className="bg-[#1e2a47] w-full max-w-md rounded-xl overflow-hidden border border-gray-700 relative shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white bg-black/20 rounded-full p-1 w-8 h-8 flex items-center justify-center">✕</button>

                <div className="p-6 space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>👤</span> Mi Perfil
                    </h2>

                    {/* SECCIÓN ESTADO DEL CORREO */}
                    <div className="bg-[#0f162b] p-4 rounded-xl border border-gray-700 shadow-inner">
                        <p className="text-gray-400 text-xs uppercase font-bold mb-1">Cuenta</p>
                        <p className="text-white font-bold text-lg truncate mb-3">{initialUser.email}</p>

                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                {isVerified ? (
                                    <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded text-sm font-bold border border-green-500/50 flex items-center gap-2">
                                        ✅ Email Verificado
                                    </span>
                                ) : (
                                    <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded text-sm font-bold border border-red-500/50 flex items-center gap-2">
                                        ⚠️ No Verificado
                                    </span>
                                )}

                                {/* Botón de refresco manual si no está verificado */}
                                {!isVerified && (
                                    <button onClick={handleManualRefresh} className="text-xs text-gray-400 hover:text-white underline">
                                        ¿Ya confirmaste? Actualizar
                                    </button>
                                )}
                            </div>

                            {/* BOTÓN "REENVIAR" (Solo si no verificado) */}
                            {!isVerified && (
                                <button
                                    onClick={handleSendVerification}
                                    disabled={verificationSent || loading}
                                    className="w-full bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/50 py-2 rounded text-xs font-bold transition-colors disabled:opacity-50"
                                >
                                    {verificationSent ? "Correo Enviado (Revisa Spam)" : "Reenviar Correo de Verificación"}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* SECCIÓN SEGURIDAD */}
                    <div className="bg-[#0d1226] p-4 rounded-xl border border-gray-700">
                        <h4 className="text-yellow-400 font-bold mb-3 text-sm uppercase">Seguridad</h4>
                        <form onSubmit={handleChangePass} className="space-y-3">
                            <label className="text-gray-300 text-xs block">
                                {initialUser.providerData[0]?.providerId === 'google.com' ? 'Crear Contraseña (para acceso sin Google)' : 'Cambiar Contraseña Actual'}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Nueva contraseña (min. 6 caracteres)"
                                    className="w-full bg-[#1e2a47] border border-gray-600 rounded-lg p-3 text-white focus:border-yellow-400 outline-none text-sm placeholder-gray-500"
                                    value={newPass}
                                    onChange={e => setNewPass(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs px-2"
                                >
                                    {showPassword ? "OCULTAR" : "VER"}
                                </button>
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !newPass}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-sm transition-colors disabled:opacity-50 shadow-lg"
                            >
                                {loading ? "Guardando..." : "Actualizar Clave"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;
