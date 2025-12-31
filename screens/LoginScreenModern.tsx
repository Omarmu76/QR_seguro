import React, { useState } from 'react';
import { signInWithEmail, signInWithGoogle, signUpWithEmail, resetUserPassword } from '../services/authService';
import { auth } from '../firebaseConfig';
import Spinner from '../components/Spinner';
import { useToast } from '../context/ToastContext';

const isValidPassword = (pass: string) => {
    const hasMin = pass.length >= 8;
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNum = /[0-9]/.test(pass);
    return { isValid: hasMin && hasUpper && hasLower && hasNum, message: "Mínimo 8 car, 1 May, 1 min, 1 Num." };
};

const LoginScreenModern: React.FC = () => {
    const { showToast } = useToast();
    const [view, setView] = useState<'LOGIN' | 'REGISTER' | 'RECOVERY'>('LOGIN');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nombre, setNombre] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (view === 'LOGIN') {
                await signInWithEmail(email, password);
                if (auth.currentUser && !auth.currentUser.emailVerified) {
                    await auth.signOut();
                    showToast("⛔ Cuenta no verificada. Revisa tu email.", 'error');
                    setIsLoading(false);
                    return;
                }
            } else if (view === 'REGISTER') {
                const check = isValidPassword(password);
                if (!check.isValid) { showToast(check.message, 'error'); setIsLoading(false); return; }
                await signUpWithEmail(nombre || 'Usuario', email, password);
                showToast("¡Cuenta creada! Verifica tu email.", 'success');
                setView('LOGIN');
            } else if (view === 'RECOVERY') {
                await resetUserPassword(email);
                showToast("Link de recuperación enviado 📧", 'info');
                setView('LOGIN');
            }
        } catch (err: any) {
            let msg = "Error inesperado.";
            if (err.code === 'auth/wrong-password') msg = "Contraseña incorrecta.";
            if (err.code === 'auth/user-not-found') msg = "Usuario no encontrado.";
            if (err.code === 'auth/email-already-in-use') msg = "Email ya registrado.";
            showToast(msg, 'error');
        } finally { setIsLoading(false); }
    };

    const handleGoogle = async () => {
        setIsLoading(true);
        try { await signInWithGoogle(); } catch (e) { showToast("Error Google", 'error'); } finally { setIsLoading(false); }
    };

    const inputClass = "w-full bg-[#1e2a47] border border-blue-800 rounded-md p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm transition-all";

    return (
        <div className="flex flex-col h-full bg-[#0d1226] text-white p-6 justify-center items-center">
            <div className="w-full max-w-sm animate-fade-in">
                <h1 className="text-4xl font-bold text-center mb-2 text-yellow-400 tracking-wider">QR Seguro</h1>
                <p className="text-center text-gray-400 mb-8 text-sm">{view === 'LOGIN' ? 'Panel de Control' : view === 'REGISTER' ? 'Crear Cuenta' : 'Recuperar Acceso'}</p>

                {view !== 'RECOVERY' && (
                    <div className="flex w-full mb-6 bg-[#0f162b] rounded-lg p-1 border border-gray-700">
                        <button onClick={() => setView('LOGIN')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${view === 'LOGIN' ? 'bg-yellow-400 text-black shadow-md' : 'text-gray-400 hover:text-white'}`}>INGRESAR</button>
                        <button onClick={() => setView('REGISTER')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${view === 'REGISTER' ? 'bg-yellow-400 text-black shadow-md' : 'text-gray-400 hover:text-white'}`}>REGISTRARSE</button>
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    {view === 'REGISTER' && <input type="text" placeholder="Tu Nombre" value={nombre} onChange={e => setNombre(e.target.value)} className={inputClass} required />}
                    <input type="email" placeholder="Correo electrónico" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} required />
                    {view !== 'RECOVERY' && (
                        <div className="relative">
                            <input type={showPassword ? "text" : "password"} placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} required />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-2">{showPassword ? "👁️" : "🔒"}</button>
                        </div>
                    )}
                    {view === 'REGISTER' && password && (
                        <p className={`text-[10px] pl-1 ${isValidPassword(password).isValid ? 'text-green-400' : 'text-gray-400'}`}>{isValidPassword(password).isValid ? '✅ Contraseña segura' : '⚠️ Min 8 car, 1 May, 1 Num'}</p>
                    )}
                    {view === 'LOGIN' && (<div className="flex justify-end"><button type="button" onClick={() => setView('RECOVERY')} className="text-xs text-blue-400 hover:text-blue-300 font-semibold">¿Olvidaste tu contraseña?</button></div>)}
                    <button type="submit" disabled={isLoading} className="w-full bg-yellow-500 text-black py-3 rounded-lg text-lg font-bold shadow-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 mt-4">{isLoading ? <Spinner /> : (view === 'LOGIN' ? 'Entrar' : view === 'REGISTER' ? 'Crear Cuenta' : 'Enviar Link')}</button>
                </form>

                {view !== 'RECOVERY' && (
                    <>
                        <div className="relative my-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-600"></div></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-[#0d1226] text-gray-400">o</span></div></div>
                        <button onClick={handleGoogle} disabled={isLoading} className="w-full bg-white text-gray-700 py-3 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors">
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5" /> <span>Continuar con Google</span>
                        </button>
                    </>
                )}
                {view === 'RECOVERY' && <button type="button" onClick={() => setView('LOGIN')} className="w-full mt-6 text-gray-400 text-sm hover:text-white underline">Volver a Iniciar Sesión</button>}
            </div>
        </div>
    );
};
export default LoginScreenModern;
