import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getAuth, onAuthStateChanged, User, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { killSession, registerSession } from '../services/sessionService';
import Header from '../components/Header';

const ActiveSessionsScreen = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Estados para el Modal de Seguridad
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [sessionToKill, setSessionToKill] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const currentDeviceId = localStorage.getItem('qr_device_id');

  // 1. ESCUCHAR AUTH
  useEffect(() => {
    const auth = getAuth();
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        if (currentDeviceId) registerSession(currentDeviceId);
      }
    });
    return () => unsubAuth();
  }, [currentDeviceId]);

  // 2. ESCUCHAR BASE DE DATOS
  useEffect(() => {
    if (!currentUser) return;
    const db = getDatabase();
    const sessionsRef = ref(db, `users/${currentUser.uid}/sessions`);
    
    const unsubDb = onValue(sessionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        list.sort((a, b) => (a.id === currentDeviceId ? -1 : 1));
        setSessions(list);
      } else {
        setSessions([]);
      }
    });
    return () => unsubDb();
  }, [currentUser, currentDeviceId]);

  // --- LÓGICA DE SEGURIDAD ---

  const initiateKill = (sessionId: string) => {
    setSessionToKill(sessionId);
    setPasswordInput("");
    setShowSecurityModal(true);
  };

  const confirmKill = async () => {
    if (!currentUser || !currentUser.email || !sessionToKill) return;
    if (!passwordInput) return alert("Ingresa tu contraseña");

    setIsProcessing(true);
    const auth = getAuth();

    try {
      // 1. Crear credencial con la contraseña ingresada
      const credential = EmailAuthProvider.credential(currentUser.email, passwordInput);
      
      // 2. Re-autenticar (Si la clave está mal, esto falla y va al catch)
      await reauthenticateWithCredential(currentUser, credential);

      // 3. Si pasó, ejecutamos la expulsión
      await killSession(sessionToKill);
      
      // 4. Limpieza y Éxito
      setShowSecurityModal(false);
      setSessionToKill(null);
      setPasswordInput("");
      alert("✅ Dispositivo expulsado correctamente.");

    } catch (error: any) {
      console.error("Error de seguridad:", error);
      if (error.code === 'auth/wrong-password') {
        alert("⛔ CONTRASEÑA INCORRECTA. No tienes permiso para cerrar esta sesión.");
      } else {
        alert("Error de autenticación: " + error.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // --- UI ---
  const glassCardClass = "bg-[#111928]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center animate-fade-in";

  return (
    <div className="w-full h-full bg-black flex justify-center items-center relative overflow-hidden">
      <div className="hidden lg:flex flex-1 bg-[#050b14] border-r border-white/5" />
      
      <div className="w-full h-full lg:max-w-md bg-[#0d1226] flex flex-col relative z-10">
        <Header title="SESIONES ACTIVAS" onMenuClick={onMenuClick} />
        
        <div className="p-4 space-y-4 overflow-y-auto flex-1 relative">
           
           {/* MODAL DE SEGURIDAD (PASSWORD CHECK) */}
           {showSecurityModal && (
             <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
               <div className={glassCardClass + " border-red-500/50"}>
                 <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4 border-2 border-red-500 text-3xl">
                   🔒
                 </div>
                 <h3 className="text-xl font-black text-white mb-2 text-center">CONFIRMAR IDENTIDAD</h3>
                 <p className="text-gray-400 text-xs text-center mb-6">
                   Por seguridad, ingresa tu contraseña para expulsar este dispositivo.
                 </p>
                 
                 <input 
                   type="password" 
                   value={passwordInput}
                   onChange={(e) => setPasswordInput(e.target.value)}
                   placeholder="Tu contraseña actual"
                   className="w-full bg-black/50 border border-red-500/30 rounded-lg py-3 px-4 text-white text-center mb-4 focus:border-red-500 outline-none"
                   autoFocus
                 />

                 <div className="flex gap-3 w-full">
                   <button 
                     onClick={() => setShowSecurityModal(false)}
                     className="flex-1 py-3 bg-white/5 text-gray-300 rounded-xl font-bold"
                     disabled={isProcessing}
                   >
                     CANCELAR
                   </button>
                   <button 
                     onClick={confirmKill}
                     className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-[0_0_15px_red]"
                     disabled={isProcessing}
                   >
                     {isProcessing ? 'VERIFICANDO...' : 'EXPULSAR'}
                   </button>
                 </div>
               </div>
             </div>
           )}

           <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl mb-4 flex gap-3 items-start">
              <span className="text-2xl">🛡️</span>
              <div>
                <h4 className="text-yellow-400 font-bold text-sm">Centro de Seguridad</h4>
                <p className="text-yellow-200/70 text-xs mt-1">
                  Aquí verás todos los dispositivos que tienen acceso a tu cuenta.
                </p>
              </div>
           </div>

           {sessions.length === 0 ? (
             <div className="text-center p-8 opacity-50"><p className="text-white">Cargando...</p></div>
           ) : (
             sessions.map(s => (
               <div key={s.id} className={`p-4 rounded-xl border flex justify-between items-center transition-all ${s.id === currentDeviceId ? 'bg-green-900/10 border-green-500/50' : 'bg-[#111928] border-white/10'}`}>
                  <div className="flex items-center gap-3">
                     <div className={`w-2 h-2 rounded-full ${s.id === currentDeviceId ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                     <div>
                        <h3 className="text-white font-bold text-sm">{s.deviceName || 'Dispositivo'}</h3>
                        <p className={`text-xs ${s.id === currentDeviceId ? 'text-green-400 font-bold' : 'text-gray-400'}`}>
                          {s.id === currentDeviceId ? '🔵 ESTE DISPOSITIVO' : `Activo: ${new Date(s.lastSeen).toLocaleTimeString()}`}
                        </p>
                     </div>
                  </div>
                  
                  {s.id !== currentDeviceId && (
                     <button 
                       onClick={() => initiateKill(s.id)}
                       className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-4 py-2 rounded-lg text-xs font-bold border border-red-600/30 transition-all flex items-center gap-1"
                     >
                       <span className="text-lg">✕</span> ECHAR
                     </button>
                  )}
               </div>
             ))
           )}
        </div>
      </div>
      <div className="hidden lg:flex flex-1 bg-[#050b14] border-l border-white/5" />
    </div>
  );
};
export default ActiveSessionsScreen;
