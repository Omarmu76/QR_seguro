import React, { useState } from 'react';
import { User, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { sendVerificationEmail, updateUserPassword, updateUserProfileDisplayName } from '../services/authService';
import { useToast } from '../context/ToastContext';

interface UserProfileModalProps {
    user: User;
    onClose: () => void;
}

const UserProfileModern: React.FC<UserProfileModalProps> = ({ user: initialUser, onClose }) => {
    const { showToast } = useToast();
    const [displayName, setDisplayName] = useState(initialUser.displayName || '');
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [verificationSent, setVerificationSent] = useState(false);
    const [isVerified] = useState(initialUser.emailVerified);

    const isGoogleUser = initialUser.providerData.some(p => p.providerId === 'google.com');


    const handleUpdateName = async () => {
        if (!displayName.trim()) return;
        setLoading(true);
        try {
            await updateUserProfileDisplayName(initialUser, displayName);
            await initialUser.reload();
            // Disparar actualización manual si es necesario, aunque reload() + render suele bastar si el objeto cambia
            if (auth.currentUser) {
                // Truco para disparar onAuthStateChanged en App.tsx
                await auth.updateCurrentUser(auth.currentUser);
            }
            showToast("Nombre actualizado con éxito.", 'success');
        } catch (e) {
            showToast("Error al actualizar nombre.", 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSendVerification = async () => {
        setLoading(true);
        try {
            await sendVerificationEmail(initialUser);
            showToast("Enlace de verificación enviado.", 'success');
            setVerificationSent(true);
        } catch (e) {
            showToast("Error al enviar correo.", 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPass.length < 6) {
            showToast("La nueva clave debe tener al menos 6 caracteres.", 'error');
            return;
        }
        if (newPass !== confirmPass) {
            showToast("Las contraseñas no coinciden.", 'error');
            return;
        }

        setLoading(true);
        try {
            // Si no es Google User, re-autenticar si se proporcionó clave actual
            if (!isGoogleUser && currentPass) {
                const credential = EmailAuthProvider.credential(initialUser.email!, currentPass);
                await reauthenticateWithCredential(initialUser, credential);
            }

            await updateUserPassword(initialUser, newPass);
            await initialUser.reload();
            if (auth.currentUser) await auth.updateCurrentUser(auth.currentUser);

            showToast("Contraseña actualizada con éxito.", 'success');
            setNewPass('');
            setCurrentPass('');
            setConfirmPass('');
        } catch (e: any) {
            if (e.code === 'auth/wrong-password') {
                showToast("La contraseña actual es incorrecta.", 'error');
            } else if (e.code === 'auth/requires-recent-login') {
                showToast("Por seguridad, re-ingresa para realizar este cambio.", 'error');
            } else {
                showToast("Error al actualizar contraseña.", 'error');
                console.error(e);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[2000] backdrop-blur-[12px] animate-fade-in overflow-hidden">
            {/* Dynamic Background Auras */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[130px] rounded-full animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-yellow-500/5 blur-[130px] rounded-full animate-pulse decoration-delay-2000"></div>

            <div className="relative w-full max-w-2xl bg-[#13192b]/50 backdrop-blur-[25px] rounded-[3rem] border border-white/10 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.9)] overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">

                {/* Header Section */}
                <div className="relative p-10 pb-4 flex items-center justify-between border-b border-white/5">
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tight uppercase italic">
                            Mi <span className="text-yellow-400">Perfil</span>
                        </h2>
                        <p className="text-white/40 text-[11px] font-bold tracking-[0.3em] uppercase mt-2">Gestión de Seguridad & Alertas</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/30 hover:text-white bg-white/5 hover:bg-white/10 p-3 rounded-full transition-all duration-300"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-grow p-10 pt-6 space-y-8 overflow-y-auto custom-scrollbar">

                    {/* GRID: Account & Name */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Identidad Card */}
                        <div className="group relative bg-white/5 border border-white/10 p-6 rounded-[2rem] transition-all duration-300">
                            <p className="text-white/20 text-[9px] uppercase font-black tracking-widest mb-3">Identidad Digital</p>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-full flex items-center justify-center text-xl shadow-lg border border-white/20">
                                    {initialUser.email?.charAt(0).toUpperCase()}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-white font-bold text-sm truncate">{initialUser.email}</p>
                                    {isVerified ? (
                                        <span className="text-[10px] text-green-400 font-black flex items-center gap-1 mt-1">
                                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> VERIFICADO
                                        </span>
                                    ) : (
                                        <button onClick={handleSendVerification} disabled={verificationSent || loading} className="text-[10px] text-red-400 font-black flex items-center gap-1 mt-1 animate-pulse">
                                            {verificationSent ? "✓ ENVIADO" : "⚠ VERIFICAR AHORA"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Nombre Visible Card */}
                        <div className="bg-white/[0.03] border border-white/10 p-6 rounded-[2rem]">
                            <p className="text-white/20 text-[9px] uppercase font-black tracking-widest mb-3">Nombre Visible</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-grow bg-[#0f162b]/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-yellow-400/50 outline-none transition-all font-medium"
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                />
                                <button
                                    onClick={handleUpdateName}
                                    disabled={loading || displayName === initialUser.displayName}
                                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-black px-4 py-2 rounded-xl text-[10px] transition-all active:scale-[0.95] disabled:opacity-30 disabled:grayscale"
                                >
                                    {loading ? "..." : "GUARDAR"}
                                </button>
                            </div>
                        </div>
                    </div>


                    {/* Seguridad Avanzada */}
                    <div className="bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 p-8 rounded-[3rem]">
                        <div className="mb-6">
                            <h4 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
                                <span className="text-yellow-400">🔐</span> Seguridad
                            </h4>
                            {isGoogleUser && (
                                <p className="text-blue-400 text-[11px] font-medium leading-relaxed bg-blue-500/5 p-3 rounded-xl border border-blue-500/20">
                                    Iniciaste sesión con Google. Puedes crear una contraseña para acceder también con tu correo y contraseña.
                                </p>
                            )}
                        </div>

                        <form onSubmit={handleChangePass} className="space-y-6">
                            {!isGoogleUser && (
                                <div className="group">
                                    <label className="text-white/30 text-[9px] uppercase font-black tracking-widest ml-4 mb-2 block">Contraseña Actual</label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white placeholder-white/10 focus:bg-white/10 focus:border-white/30 outline-none transition-all text-sm"
                                        value={currentPass}
                                        onChange={e => setCurrentPass(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="group">
                                    <label className="text-white/30 text-[9px] uppercase font-black tracking-widest ml-4 mb-2 block">Nueva Contraseña</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Clave nueva"
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-6 pr-12 text-white placeholder-white/10 focus:bg-white/10 focus:border-yellow-400/50 outline-none transition-all text-sm"
                                            value={newPass}
                                            onChange={e => setNewPass(e.target.value)}
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors">
                                            {showPassword ? "🙈" : "👁️"}
                                        </button>
                                    </div>
                                </div>
                                <div className="group">
                                    <label className="text-white/30 text-[9px] uppercase font-black tracking-widest ml-4 mb-2 block">Confirmar Nueva</label>
                                    <input
                                        type="password"
                                        placeholder="Repetir clave"
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white placeholder-white/10 focus:bg-white/10 focus:border-yellow-400/50 outline-none transition-all text-sm"
                                        value={confirmPass}
                                        onChange={e => setConfirmPass(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !newPass || (!isGoogleUser && !currentPass)}
                                className="w-full bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-600 hover:to-blue-400 text-white font-black py-5 rounded-2xl text-xs tracking-[0.2em] uppercase transition-all duration-300 shadow-xl active:scale-[0.98] disabled:opacity-30 disabled:grayscale"
                            >
                                {loading ? "SINCRONIZANDO..." : "ACTUALIZAR CONTRASEÑA"}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Footer info */}
                <div className="p-10 pt-4 flex justify-between items-center bg-white/[0.02]">
                    <p className="text-white/10 text-[9px] font-black uppercase tracking-[0.4em]">QR SEGURO PREMIUM v7.2.1</p>
                    <div className="flex gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                        <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse decoration-delay-2000"></div>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.2; } }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        .animate-slide-up { animation: slide-up 0.7s cubic-bezier(0.16, 1, 0.3, 1); }
        .decoration-delay-2000 { animation-delay: 2s; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
      `}</style>
        </div>
    );
};

export default UserProfileModern;
