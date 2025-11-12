// Archivo: App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange, signOutUser } from './services/authService';
import { Screen, Item, ItemStatus } from './types'; // Tipos estándar

// Importaciones de Pantallas
import HomeScreen from './screens/HomeScreen';
import GenerateScreen from './screens/GenerateScreen';
import MyItemsScreen from './screens/MyItemsScreen';
import ScanScreen from './screens/ScanScreen';
import ResultScreen from './screens/ResultScreen';
import GeneratedQrScreen from './screens/GeneratedQrScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import PublicReportedListScreen from './screens/PublicReportedListScreen';
import PublicItemDetailScreen from './screens/PublicItemDetailScreen';
import TransfersScreen from './screens/TransfersScreen'; // Pantalla del Vendedor
import InputCodeScreen from './screens/InputCodeScreen';
import EditItemScreen from './screens/EditItemScreen';
import MapScreen from './screens/MapScreen';
import ItemDetailScreen from './screens/ItemDetailScreen';
import RequestTransferScreen from './screens/RequestTransferScreen'; // Pantalla del Comprador

// Importaciones de Componentes
import BottomNavBar from './components/BottomNavBar';
import Spinner from './components/Spinner';
import SideMenu from './components/SideMenu';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');
  
  const [activeScreen, setActiveScreen] = useState<Screen>(Screen.Home);
  const [modal, setModal] = useState<Screen | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Estados para los modales
  const [scanResult, setScanResult] = useState<{ item: Item; status: ItemStatus } | null>(null);
  const [generatedItem, setGeneratedItem] = useState<Item | null>(null);
  const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
  const [itemToView, setItemToView] = useState<Item | null>(null);
  // Estado para el item que se va a transferir (el que ve el comprador)
  const [itemToTransfer, setItemToTransfer] = useState<Item | null>(null); // <<< ESTADO CORREGIDO
  
  const [myItemsKey, setMyItemsKey] = useState(0);
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = (newPath: string) => {
    // window.history.pushState({}, '', newPath); // Comentado por conflicto con iframe
    setPath(newPath);
  };

  const toggleMenu = () => setIsMenuOpen(prev => !prev);

  // --- Handlers para abrir modales ---
  const handleScanRequest = useCallback(() => setModal(Screen.Scan), []);
  const handleInputCodeRequest = useCallback(() => setModal(Screen.InputCode), []);
  
  const handleEditRequest = useCallback((item: Item) => {
    setItemToEdit(item);
    setModal(Screen.EditItem);
  }, []);

  const handleViewRequest = useCallback((item: Item) => {
    setItemToView(item);
    setModal(Screen.ItemDetail);
  }, []);

  // <<< LÓGICA DE INTERCEPCIÓN (CORREGIDA) >>>
  const handleScanComplete = useCallback((result: { item: Item; status: ItemStatus }) => {
    if (!user) return; // Si no hay usuario, no hacer nada (no debería pasar)

    const isOwner = result.item.ownerId === user.uid;
    const status = result.status;
    
    // CASO 1: El item está 'En Regla' Y NO es mío.
    if (!isOwner && status === ItemStatus.EnRegla) {
      // ¡Es un intento de COMPRA!
      setItemToTransfer(result.item); // <<< Guardamos el item para el modal de transferencia
      setModal(Screen.REQUEST_TRANSFER); // <<< Abrimos el modal de solicitud
    } else {
      // CASO 2: Es mío, o está Denunciado, Vendido, etc.
      // Mostramos la pantalla de resultado normal.
      setScanResult(result);
      setModal(Screen.ScanResult);
    }
  }, [user]); // <<< Depende del 'user' para saber si es el dueño

  const handleGenerateComplete = (result: Item) => {
    setGeneratedItem(result);
    setActiveScreen(Screen.GeneratedQR);
  };
  
  const handleEditComplete = useCallback(() => {
    setItemToEdit(null);
    setModal(null);
    setMyItemsKey(c => c + 1); // Refresca 'Mis Items'
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
    setScanResult(null);
    setItemToEdit(null);
    setItemToView(null);
    setItemToTransfer(null); // <<< Limpiamos el item a transferir
  }, []);

  const closeGeneratedQr = () => {
    setGeneratedItem(null);
    setActiveScreen(Screen.Home);
  };

  // ... (Handlers del Menú: handleMenuNavigate, handleMenuScanRequest, etc. no cambian) ...
  const handleMenuNavigate = (screen: Screen) => {
    setPath('/');
    setActiveScreen(screen);
    setIsMenuOpen(false);
  };
  const handleMenuScanRequest = () => {
    handleScanRequest();
    setIsMenuOpen(false);
  };
  const handleMenuInputCodeRequest = () => {
    handleInputCodeRequest();
    setIsMenuOpen(false);
  };
  const handleMenuPublicNavigate = (newPath: string) => {
    navigate(newPath);
    setIsMenuOpen(false);
  };
  const handleAppNavigate = (screen: Screen) => {
     setPath('/');
     setActiveScreen(screen);
  };

  // --- Renders ---
  const renderActiveScreen = () => {
    if (!user) return null;

    if (generatedItem) {
      return <GeneratedQrScreen item={generatedItem} onDone={closeGeneratedQr} user={user}/>;
    }
    
    switch (activeScreen) {
      case Screen.Home:
        return <HomeScreen onScanRequest={handleScanRequest} onInputCodeRequest={handleInputCodeRequest} onNavigate={handleAppNavigate} onPublicNavigate={navigate} onMenuClick={toggleMenu} />;
      case Screen.Map:
        return <MapScreen user={user} onMenuClick={toggleMenu} />;
      case Screen.Generate:
        return <GenerateScreen onGenerateComplete={handleGenerateComplete} user={user} onMenuClick={toggleMenu} />;
      case Screen.MyItems:
        return <MyItemsScreen key={myItemsKey} user={user} onMenuClick={toggleMenu} onEditRequest={handleEditRequest} onViewRequest={handleViewRequest} />;
      case Screen.TRANSFERS: // <<< (Ya actualizado en el paso anterior)
        return <TransfersScreen user={user} onMenuClick={toggleMenu} />;
      default:
        return <HomeScreen onScanRequest={handleScanRequest} onInputCodeRequest={handleInputCodeRequest} onNavigate={handleAppNavigate} onPublicNavigate={navigate} onMenuClick={toggleMenu} />;
    }
  };

  const renderModal = () => {
    if (!modal) return null;
    switch (modal) {
      case Screen.Scan:
        return <ScanScreen onScanComplete={handleScanComplete} onCancel={closeModal} />;
      case Screen.InputCode:
        return <InputCodeScreen onScanComplete={handleScanComplete} onCancel={closeModal} />;
      case Screen.ScanResult:
        return scanResult ? <ResultScreen result={scanResult} onClose={closeModal} /> : null;
      
      // <<< RENDER DEL MODAL DE TRANSFERENCIA (CORREGIDO) >>>
      case Screen.REQUEST_TRANSFER:
        // Usamos 'itemToTransfer' en lugar de 'scanResult'
        return itemToTransfer && user ? ( 
          <RequestTransferScreen 
            item={itemToTransfer} 
            user={user} 
            onCancel={closeModal} // Prop 'onCancel'
            onRequestSent={closeModal} // Prop 'onRequestSent'
          />
        ) : null;
        
      case Screen.EditItem:
        return itemToEdit && user ? <EditItemScreen item={itemToEdit} user={user} onEditComplete={handleEditComplete} onCancel={closeModal} /> : null;
      case Screen.ItemDetail:
        return itemToView ? <ItemDetailScreen item={itemToView} onDone={closeModal} /> : null;
      default:
        return null;
    }
  };

  const renderContent = () => {
    // ... (El resto de la función no cambia)
    if (path.startsWith('/denuncias')) {
      const parts = path.split('/');
      const itemId = parts[2];
      if (itemId) {
        return <PublicItemDetailScreen itemId={itemId} onNavigate={navigate} />;
      }
      return <PublicReportedListScreen onNavigate={navigate} />;
    }
    if (authLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Spinner />
        </div>
      );
    }
    if (!user) {
      return authScreen === 'login' ? (
        <LoginScreen onSwitchToRegister={() => setAuthScreen('register')} />
      ) : (
        <RegisterScreen onSwitchToLogin={() => setAuthScreen('login')} />
      );
    }
    return (
      <>
        <SideMenu 
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            onNavigate={handleMenuNavigate}
            onScanRequest={handleMenuScanRequest}
            onInputCodeRequest={handleMenuInputCodeRequest}
            onPublicNavigate={handleMenuPublicNavigate}
        />
        <div className="relative z-10 flex-shrink-0 bg-[#1e2a47] p-2 flex justify-between items-center text-white border-b border-blue-900">
            <span className="text-xs truncate">{user.email}</span>
            <button onClick={signOutUser} className="text-xs bg-red-600 px-3 py-1 rounded hover:bg-red-700 transition-colors">Salir</button>
        </div>
        <div className="flex-grow overflow-y-auto">
          {renderActiveScreen()}
        </div>
        {!generatedItem && <BottomNavBar activeScreen={activeScreen} setActiveScreen={handleAppNavigate} />}
        {renderModal()}
      </>
    );
  };

  return (
    <div className="bg-gray-900 min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm h-[800px] max-h-[90vh] bg-[#0d1226] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
        {renderContent()}
      </div>
    </div>
  );
};

export default App;
