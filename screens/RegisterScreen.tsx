import React, { useState } from 'react';
import { signUpWithEmail, signInWithGoogle } from '../services/authService';
import Spinner from '../components/Spinner';

interface RegisterScreenProps {
  onSwitchToLogin: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onSwitchToLogin }) => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await signUpWithEmail(nombre, email, password);
    } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
            setError('Este email ya está registrado.');
        } else if (err.code === 'auth/weak-password') {
            setError('La contraseña debe tener al menos 6 caracteres.');
        } else {
            setError('Ocurrió un error al registrarse.');
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
    } catch (err) {
      setError('No se pudo iniciar sesión con Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full bg-[#1e2a47] border border-blue-800 rounded-md p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400";

  return (
    <div className="flex flex-col h-full bg-[#0d1226] text-white p-6 justify-center">
      <h1 className="text-4xl font-bold text-center mb-8 text-yellow-400">Crear Cuenta</h1>
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
        {error && <p className="text-red-500 text-center text-sm">{error}</p>}
        <div className="pt-2">
          <button type="submit" disabled={isLoading} className="w-full bg-yellow-500 text-black py-3 rounded-lg text-lg font-bold shadow-lg disabled:bg-gray-500 flex justify-center hover:bg-yellow-600 transition-colors">
            {isLoading ? <Spinner /> : 'Registrarse'}
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
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google icon" className="w-5 h-5"/>
        <span>Entrar con Google</span>
      </button>
      <p className="mt-8 text-center text-gray-400">
        ¿Ya tienes cuenta?{' '}
        <button onClick={onSwitchToLogin} className="font-semibold text-yellow-400 hover:underline">
          Inicia Sesión
        </button>
      </p>
    </div>
  );
};

export default RegisterScreen;
