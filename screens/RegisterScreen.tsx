import React, { useState } from 'react';
import { signUpWithEmail, signInWithGoogle } from '../services/authService';
import Spinner from '../components/Spinner';
import TermsModal from '../components/common/TermsModal';

interface RegisterScreenProps {
  onSwitchToLogin: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onSwitchToLogin }) => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ESTADOS NUEVOS PARA LEGALES
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setError("Debes aceptar los términos y condiciones.");
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await signUpWithEmail(nombre, email, password);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este email ya está registrado. Si tienes cuenta en ComprAren, usa las mismas credenciales para Iniciar Sesión aquí.');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setError('Ocurrió un error al registrarse. Intenta nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Google Login Error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Inicio de sesión cancelado.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('El dominio de esta app no está autorizado. Revisa Firebase.');
      } else {
        setError('No se pudo iniciar sesión con Google.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full bg-[#1e2a47] border border-blue-800 rounded-md p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400";

  return (
    <div className="flex flex-col h-full bg-[#0d1226] text-white p-6 justify-center">
      <h1 className="text-4xl font-bold text-center mb-8 text-yellow-400 uppercase tracking-tighter">Crear Cuenta</h1>
      <form onSubmit={handleRegister} className="space-y-6">
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-300">Nombre Completo</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" className={inputClass} required />
        </div>
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-300">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className={inputClass} required />
        </div>
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-300">Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className={inputClass} required />
        </div>

        {/* --- CHECKBOX LEGALES (NUEVO) --- */}
        <div className="flex items-start gap-3 my-2 bg-[#1a233a] p-3 rounded-lg border border-gray-700 shadow-inner">
          <input
            type="checkbox"
            id="terms"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500 cursor-pointer"
          />
          <label htmlFor="terms" className="text-xs text-gray-300 leading-tight">
            He leído y acepto los <button type="button" onClick={() => setShowTerms(true)} className="text-yellow-400 font-bold underline hover:text-yellow-300">Términos y Condiciones</button> y la Política de Privacidad y Rastreo "Silent Hunt".
          </label>
        </div>

        {error && <p className="text-red-500 text-center text-sm font-semibold">{error}</p>}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading || !acceptedTerms}
            className={`w-full py-3 rounded-lg text-lg font-bold shadow-lg flex justify-center transition-all ${!acceptedTerms || isLoading ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50' : 'bg-yellow-500 text-black hover:bg-yellow-600 active:scale-95'}`}
          >
            {isLoading ? <Spinner /> : 'Registrarse'}
          </button>
        </div>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-600/50"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-[#0d1226] text-gray-500 font-bold">o</span>
        </div>
      </div>

      <button onClick={handleGoogleLogin} disabled={isLoading} className="w-full bg-white text-gray-700 py-3 rounded-lg font-bold shadow-lg flex items-center justify-center space-x-3 hover:bg-gray-200 disabled:bg-gray-400 transition-all active:scale-95">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
        <span>Entrar con Google</span>
      </button>

      <p className="mt-8 text-center text-gray-400 text-sm">
        ¿Ya tienes cuenta?{' '}
        <button onClick={onSwitchToLogin} className="font-bold text-yellow-400 hover:text-yellow-300 transition-colors">
          Inicia Sesión
        </button>
      </p>

      {/* MODAL LEGALES */}
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </div>
  );
};

export default RegisterScreen;
