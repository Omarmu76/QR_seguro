import React, { useState } from 'react';
import { signInWithEmail, signInWithGoogle, signUpWithEmail, resetUserPassword } from '../services/authService';
import Spinner from '../components/Spinner';
import { useToast } from '../context/ToastContext';
import TermsModal from '../components/common/TermsModal';

const isValidPassword = (pass: string) => {
  const hasMin = pass.length >= 8;
  const hasUpper = /[A-Z]/.test(pass);
  const hasLower = /[a-z]/.test(pass);
  const hasNum = /[0-9]/.test(pass);
  return { isValid: hasMin && hasUpper && hasLower && hasNum, message: "Mínimo 8 car, 1 May, 1 min, 1 Num." };
};

const LoginScreen: React.FC = () => {
  const { showToast } = useToast();
  const [view, setView] = useState<'LOGIN' | 'REGISTER' | 'RECOVERY'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ESTADOS LEGALES
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (view === 'REGISTER' && !acceptedTerms) {
      showToast("Debes aceptar los términos y condiciones.", 'error');
      return;
    }

    setIsLoading(true);
    try {
      if (view === 'LOGIN') {
        await signInWithEmail(email, password);
        // El bloqueo por emailVerified ya ocurre dentro de signInWithEmail (lanza Error)
      } else if (view === 'REGISTER') {
        const check = isValidPassword(password);
        if (!check.isValid) {
          showToast(check.message, 'error');
          setIsLoading(false);
          return;
        }
        await signUpWithEmail(nombre || 'Usuario', email, password);
        // ÉXITO: Alerta nativa para claridad absoluta (Blindaje)
        alert("✅ ¡Cuenta creada con éxito! Se ha enviado un enlace a tu correo. Por favor, verifícalo para poder ingresar.");
        setView('LOGIN');
      } else if (view === 'RECOVERY') {
        await resetUserPassword(email);
        showToast("Link de recuperación enviado 📧", 'info');
        setView('LOGIN');
      }
    } catch (err: any) {
      let msg = "Error inesperado.";
      const code = err.code;

      // DETECCIÓN DE USUARIO COMPARTIDO (comprAren)
      if (code === 'auth/email-already-in-use') {
        alert("⚠️ Este correo ya está registrado en nuestra red. Por favor, inicia sesión con tus datos habituales (QR Seguro y ComprAren comparten cuentas seguras).");
        setView('LOGIN');
        return;
      }

      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') msg = "Credenciales incorrectas.";
      if (code === 'auth/user-not-found') msg = "Usuario no encontrado.";
      if (code === 'auth/weak-password') msg = "La contraseña debe tener al menos 6 caracteres.";

      // Mensaje de error personalizado de signInWithEmail (Bloqueo Verificación)
      if (err.message && err.message.includes("Debes verificar tu correo")) {
        msg = err.message;
      }

      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      showToast("Error Google", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full bg-[#1e2a47]/50 border border-blue-800/50 rounded-xl p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 text-sm transition-all focus:bg-[#1e2a47]/80";

  return (
    // 1. CONTENEDOR MAESTRO (Fondo Negro Pantalla Completa)
    <div className="w-full h-full bg-black flex justify-center items-center relative overflow-hidden font-sans">

      {/* 2. ESPACIO PUBLICIDAD IZQUIERDA (Solo PC) */}
      <div id="ad-space-left" className="hidden lg:flex flex-1 h-full items-center justify-center z-0 relative">
        {/* Espacio reservado para Ads */}
      </div>

      {/* 3. LA APP (Caja Central Flotante) */}
      <div className="w-full h-full lg:max-w-md lg:h-[95vh] lg:rounded-[2.5rem] lg:border-[8px] lg:border-[#1a1f35] lg:shadow-2xl bg-gradient-to-b from-[#0d1226] via-[#0d1226] to-[#1e3a8a]/20 flex flex-col items-center relative z-10 overflow-hidden transition-all duration-300 p-6 md:p-8 pt-10 no-scrollbar">

        {/* Fondo Decorativo Interno */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-blue-900/10 to-transparent"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="relative z-10 w-full flex flex-col items-center animate-fade-in overflow-y-auto no-scrollbar pb-10 flex-grow">

          {/* --- ZONA DE LOGO --- */}
          <div className="text-center space-y-4 mb-6 shrink-0">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-blue-500/20 transform rotate-3 hover:rotate-0 transition-all duration-500">
              <span className="text-4xl filter drop-shadow-md">🛡️</span>
            </div>

            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-lg leading-tight">
                QR <span className="text-yellow-400">SEGURO</span>
              </h1>
              <p className="text-blue-200/50 text-[10px] font-bold tracking-[0.3em] uppercase mt-2">
                {view === 'LOGIN' ? 'Panel de Control' : view === 'REGISTER' ? 'Crea tu Cuenta' : 'Recuperar Acceso'}
              </p>
            </div>
          </div>

          {/* SELECTOR LOGIN/REGISTER (Solo si no es recuperación) */}
          {view !== 'RECOVERY' && (
            <div className="flex w-full max-w-xs mb-6 bg-[#0f162b] rounded-xl p-1 border border-gray-800 shadow-inner shrink-0">
              <button
                onClick={() => setView('LOGIN')}
                className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${view === 'LOGIN' ? 'bg-yellow-400 text-black shadow-lg scale-100' : 'text-gray-500 hover:text-white scale-95'}`}
              >
                Ingresar
              </button>
              <button
                onClick={() => setView('REGISTER')}
                className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${view === 'REGISTER' ? 'bg-yellow-400 text-black shadow-lg scale-100' : 'text-gray-500 hover:text-white scale-95'}`}
              >
                Registrarse
              </button>
            </div>
          )}

          {/* FORMULARIO DE AUTH */}
          <form onSubmit={handleAuth} className="w-full max-w-xs space-y-4 shrink-0">
            {view === 'REGISTER' && (
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Nombre Completo"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
            )}

            <div className="space-y-1">
              <input
                type="email"
                placeholder="Correo Electrónico"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            {view !== 'RECOVERY' && (
              <div className="space-y-1 relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={inputClass}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-2 text-xs"
                >
                  {showPassword ? "👁️" : "🔒"}
                </button>
              </div>
            )}

            {view === 'REGISTER' && (
              <div className="space-y-3">
                {password && (
                  <p className={`text-[9px] pl-1 font-bold ${isValidPassword(password).isValid ? 'text-green-400' : 'text-gray-500'}`}>
                    {isValidPassword(password).isValid ? '✅ Contraseña Robusta' : '⚠️ 8 car, 1 May, 1 Núm'}
                  </p>
                )}

                {/* --- CHECKBOX LEGALES --- */}
                <div className="flex items-start gap-3 bg-[#11192e] p-3 rounded-xl border border-blue-900/30 shadow-inner">
                  <input
                    type="checkbox"
                    id="terms-check"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-700 text-yellow-500 focus:ring-yellow-500 cursor-pointer"
                  />
                  <label htmlFor="terms-check" className="text-[10px] text-gray-400 leading-tight select-none">
                    He leído y acepto los <button type="button" onClick={() => setShowTermsModal(true)} className="text-yellow-400 font-bold hover:underline">Términos y Condiciones</button> de QR Seguro.
                  </label>
                </div>
              </div>
            )}

            {view === 'LOGIN' && (
              <div className="flex justify-end pr-1">
                <button
                  type="button"
                  onClick={() => setView('RECOVERY')}
                  className="text-[10px] text-blue-400 hover:text-white font-bold tracking-tight transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (view === 'REGISTER' && !acceptedTerms)}
              className="w-full bg-yellow-400 text-black font-black py-4 rounded-xl shadow-2xl shadow-yellow-400/10 flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 hover:bg-yellow-300 disabled:opacity-30 mt-4"
            >
              {isLoading ? <Spinner /> : (view === 'LOGIN' ? 'ENTRAR AL PANEL' : view === 'REGISTER' ? 'CREAR CUENTA' : 'ENVIAR ACCESO')}
            </button>
          </form>

          {/* BOTÓN DE GOOGLE (Solo en Login/Register) */}
          {view !== 'RECOVERY' && (
            <div className="w-full max-w-xs mt-6 shrink-0">
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-800/50"></div>
                </div>
                <div className="relative flex justify-center text-[10px]">
                  <span className="px-3 bg-[#0d1226] text-gray-600 font-bold uppercase tracking-widest italic">o continúa con</span>
                </div>
              </div>

              <button
                onClick={handleGoogle}
                disabled={isLoading}
                className="w-full bg-white text-gray-900 font-bold py-3 rounded-xl shadow-xl flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-95 hover:bg-gray-100 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="text-xs tracking-tight">Google Login</span>
              </button>

              {view === 'LOGIN' && (
                <div className="pt-6 border-t border-white/5 w-full mt-4 flex flex-col gap-3">
                  <button
                    onClick={() => setView('REGISTER')}
                    type="button"
                    className="w-full text-gray-400 text-[10px] hover:text-white transition-colors uppercase tracking-[0.2em] font-bold"
                  >
                    ¿No tienes cuenta? <span className="text-yellow-400">Crear cuenta con Email</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* BOTÓN VOLVER (Solo en Recovery) */}
          {view === 'RECOVERY' && (
            <button
              type="button"
              onClick={() => setView('LOGIN')}
              className="w-full mt-6 text-gray-500 text-xs font-bold hover:text-white underline tracking-tight transition-all shrink-0"
            >
              Volver a Iniciar Sesión
            </button>
          )}

          <p className="mt-8 text-center text-[10px] text-gray-600 font-bold uppercase tracking-tighter max-w-[200px] shrink-0 italic">
            AL INGRESAR ACEPTAS NUESTRA POLÍTICA DE SEGURIDAD Y PRIVACIDAD.
          </p>
        </div>

        {/* FOOTER */}
        <div className="absolute bottom-6 text-center z-10 opacity-20 shrink-0">
          <p className="text-[8px] text-white font-mono tracking-[0.4em] font-black italic">SECURED BY QR PROTECT v7.7</p>
        </div>

      </div>

      {/* 4. ESPACIO PUBLICIDAD DERECHA (Solo PC) */}
      <div id="ad-space-right" className="hidden lg:flex flex-1 h-full items-center justify-center z-0 relative">
        {/* Espacio reservado para Ads */}
      </div>

      {/* MODAL DE TÉRMINOS */}
      {showTermsModal && <TermsModal onClose={() => setShowTermsModal(false)} />}

    </div>
  );
};

export default LoginScreen;