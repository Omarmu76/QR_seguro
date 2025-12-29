import React, { useState } from 'react';
import { signInWithEmail, signInWithGoogle } from '../services/authService';
import Spinner from '../components/Spinner';
import { auth } from '../firebaseConfig';

interface LoginScreenProps {
  onSwitchToRegister: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await signInWithEmail(email, password);

      // BLOQUEO DE SEGURIDAD: Solo permite entrar si el email está verificado
      // Nota: onAuthStateChange en App.tsx reaccionará al login, pero aquí forzamos la salida si no cumple.
      const currentUser = auth.currentUser;
      if (currentUser && !currentUser.emailVerified) {
        setError('⛔ Cuenta no verificada. Revisa tu email (Bandeja o Spam) para activar el acceso.');
        setIsLoading(false);
        await auth.signOut(); // Expulsar inmediatamente
        return;
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
        setError('Email o contraseña incorrectos. Por favor, verifique sus datos.');
      } else {
        setError('Ocurrió un error inesperado al iniciar sesión.');
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
      console.error("Google Login Error:", err); // Log the full error for debugging
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Inicio de sesión cancelado.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('El dominio de esta app no está autorizado. Contacta al administrador.');
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
      <h1 className="text-4xl font-bold text-center mb-8 text-yellow-400">QR Seguro</h1>
      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-300">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className={inputClass} required />
        </div>
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-300">Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" className={inputClass} required />
        </div>
        {error && <p className="text-red-500 text-center text-sm">{error}</p>}
        <div className="pt-2">
          <button type="submit" disabled={isLoading} className="w-full bg-yellow-500 text-black py-3 rounded-lg text-lg font-bold shadow-lg disabled:bg-gray-500 flex justify-center hover:bg-yellow-600 transition-colors">
            {isLoading ? <Spinner /> : 'Iniciar Sesión'}
          </button>
        </div>
      </form>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-[#0d1226] text-gray-400">o</span>
        </div>
      </div>
      <button onClick={handleGoogleLogin} disabled={isLoading} className="w-full bg-white text-gray-700 py-3 rounded-lg font-semibold shadow-lg flex items-center justify-center space-x-2 hover:bg-gray-200 disabled:bg-gray-400 transition-colors">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google icon" className="w-5 h-5" />
        <span>Entrar con Google</span>
      </button>
      <p className="mt-8 text-center text-gray-400">
        ¿No tienes cuenta?{' '}
        <button onClick={onSwitchToRegister} className="font-semibold text-yellow-400 hover:underline">
          Regístrate
        </button>
      </p>
    </div>
  );
};

export default LoginScreen;