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
import PaymentScreen from './screens/PaymentScreen'; // <<< NUEVA PANTALLA DE PAGO

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
  const [itemToTransfer, setItemToTransfer] = useState<Item | null>(null);
  const [itemToActivate, setItemToActivate] = useState<Item | null>(null); // <<< NUEVO ESTADO PARA PAGO
  
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
  
  // <<< NUEVO HANDLER PARA ACTIVAR ITEM >>>
  const handleActivateRequest = useCallback((item: Item) => {
    setItemToActivate(item);
    // FIX: Property 'Payment' does not exist on type 'typeof Screen'. Use 'PAYMENT_MODAL' instead.
    setModal(Screen.PAYMENT_MODAL);
  }, []);
  
  // <<< NUEVO HANDLER PARA CIERRE DE PAGO >>>
  const handleActivationComplete = useCallback(() => {
    setItemToActivate(null);
    setModal(null);
    setMyItemsKey(c => c + 1); // Refresca 'Mis Items'
  }, []);

  const handleScanComplete = useCallback((result: { item: Item; status: ItemStatus }) => {
    if (!user) return;

    const isOwner = result.item.ownerId === user.uid;
    const status = result.status;
    
    if (!isOwner && status === ItemStatus.EnRegla) {
      setItemToTransfer(result.item);
      setModal(Screen.REQUEST_TRANSFER);
    } else {
      setScanResult(result);
      setModal(Screen.ScanResult);
    }
  }, [user]);

  const handleGenerateComplete = (result: Item) => {
    setGeneratedItem(result);
    setActiveScreen(Screen.GeneratedQR);
  };
  
  const handleEditComplete = useCallback(() => {
    setItemToEdit(null);
    setModal(null);
    setMyItemsKey(c => c + 1);
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
    setScanResult(null);
    setItemToEdit(null);
    setItemToView(null);
    setItemToTransfer(null);
    setItemToActivate(null); // <<< Limpiamos el item a activar
  }, []);

  const closeGeneratedQr = () => {
    setGeneratedItem(null);
    setActiveScreen(Screen.Home);
  };

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
        return <MyItemsScreen key={myItemsKey} user={user} onMenuClick={toggleMenu} onEditRequest={handleEditRequest} onViewRequest={handleViewRequest} onActivateRequest={handleActivateRequest} />;
      case Screen.TRANSFERS:
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
      
      case Screen.REQUEST_TRANSFER:
        return itemToTransfer && user ? ( 
          <RequestTransferScreen 
            item={itemToTransfer} 
            user={user} 
            onCancel={closeModal}
            onRequestSent={closeModal}
          />
        ) : null;
        
      case Screen.EditItem:
        return itemToEdit && user ? <EditItemScreen item={itemToEdit} user={user} onEditComplete={handleEditComplete} onCancel={closeModal} /> : null;
      case Screen.ItemDetail:
        return itemToView ? <ItemDetailScreen item={itemToView} onDone={closeModal} /> : null;
      
      // <<< RENDER DEL MODAL DE PAGO >>>
      // FIX: Property 'Payment' does not exist on type 'typeof Screen'. Use 'PAYMENT_MODAL' instead.
      case Screen.PAYMENT_MODAL:
        return itemToActivate && user ? (
            <PaymentScreen
                item={itemToActivate}
                user={user}
                onActivationComplete={handleActivationComplete}
                onCancel={closeModal}
            />
        ) : null;
        
      default:
        return null;
    }
  };

  const renderContent = () => {
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
