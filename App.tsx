import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange, signOutUser } from './services/authService';
import { Screen, Item, ItemStatus } from './types';

// Pantallas
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
import TransfersScreen from './screens/TransfersScreen'; // <<< PANTALLA MEJORADA
import InputCodeScreen from './screens/InputCodeScreen';
import EditItemScreen from './screens/EditItemScreen';
import MapScreen from './screens/MapScreen';
import ItemDetailScreen from './screens/ItemDetailScreen';
import RequestTransferScreen from './screens/RequestTransferScreen';
import PaymentScreen from './screens/PaymentScreen';
import AdminPaymentsScreen from './screens/AdminPaymentsScreen';

// Componentes
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

  // Estados de Memoria
  const [scanResult, setScanResult] = useState<{ item: Item; status: ItemStatus } | null>(null);
  const [generatedItem, setGeneratedItem] = useState<Item | null>(null);
  const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
  const [itemToView, setItemToView] = useState<Item | null>(null);
  const [itemToTransfer, setItemToTransfer] = useState<Item | null>(null);
  const [itemToActivate, setItemToActivate] = useState<Item | null>(null);
  const [myItemsKey, setMyItemsKey] = useState(0);
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((u) => { setUser(u); setAuthLoading(false); });
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => { unsubscribe(); window.removeEventListener('popstate', handlePopState); };
  }, []);

  const navigate = (newPath: string) => setPath(newPath);
  const toggleMenu = () => setIsMenuOpen(p => !p);

  // --- HANDLERS ---
  const handleScanRequest = useCallback(() => setModal(Screen.Scan), []);
  const handleInputCodeRequest = useCallback(() => setModal(Screen.InputCode), []);

  const handleEditRequest = useCallback((item: Item) => { setItemToEdit(item); setModal(Screen.EditItem); }, []);
  const handleViewRequest = useCallback((item: Item) => { setItemToView(item); setModal(Screen.ItemDetail); }, []);
  const handleActivateRequest = useCallback((item: Item) => { setItemToActivate(item); setModal(Screen.PAYMENT_MODAL); }, []);

  const handleActivationComplete = useCallback(() => {
    setItemToActivate(null);
    setModal(null);
    setMyItemsKey(c => c + 1);
  }, []);

  // <<< CEREBRO DE ESCANEO >>>
  const handleScanComplete = useCallback((result: { item: Item; status: ItemStatus }) => {
    if (!user) return;

    const isOwner = result.item.ownerId === user.uid;
    const isReported = result.status === ItemStatus.Denunciado;

    if (isOwner) {
      // Si escaneo lo mío -> Lo veo
      handleViewRequest(result.item);
      setModal(null); // Cierro escáner
    } else if (isReported) {
      // Si es robado -> Ya se reportó en ScanScreen, solo mostramos ficha pública
      // O podríamos mostrar ResultScreen. Vamos a la ficha pública para más impacto.
      navigate(`/denuncias/${result.item.qrId}`);
      setModal(null);
    } else {
      // Si no es mío y está "En Regla" -> ES UNA COMPRA/TRANSFERENCIA
      setItemToTransfer(result.item);
      setModal(Screen.REQUEST_TRANSFER);
    }
  }, [user, handleViewRequest]);

  const handleGenerateComplete = (res: Item) => { setGeneratedItem(res); setActiveScreen(Screen.GeneratedQR); };
  const handleEditComplete = useCallback(() => { setItemToEdit(null); setModal(null); setMyItemsKey(c => c + 1); }, []);

  const closeModal = useCallback(() => {
    setModal(null); setScanResult(null); setItemToEdit(null);
    setItemToView(null); setItemToTransfer(null); setItemToActivate(null);
  }, []);

  const closeGeneratedQr = () => { setGeneratedItem(null); setActiveScreen(Screen.Home); };
  const handleMenuNavigate = (s: Screen) => { setPath('/'); setActiveScreen(s); setIsMenuOpen(false); };
  const handleMenuScanRequest = () => { handleScanRequest(); setIsMenuOpen(false); };
  const handleMenuInputCodeRequest = () => { handleInputCodeRequest(); setIsMenuOpen(false); };
  const handleAppNavigate = (s: Screen) => { setPath('/'); setActiveScreen(s); };

  // --- RENDER ---
  const renderActiveScreen = () => {
    if (generatedItem) return <GeneratedQrScreen item={generatedItem} onDone={closeGeneratedQr} user={user!} />;

    switch (activeScreen) {
      case Screen.Home:
        return <HomeScreen onScanRequest={handleScanRequest} onInputCodeRequest={handleInputCodeRequest} onNavigate={handleAppNavigate} onPublicNavigate={navigate} onMenuClick={toggleMenu} />;
      case Screen.Map:
        return <MapScreen user={user!} onMenuClick={toggleMenu} onScanRequest={handleScanRequest} onInputCodeRequest={handleInputCodeRequest} />;
      case Screen.Generate:
        return <GenerateScreen onGenerateComplete={handleGenerateComplete} user={user!} onMenuClick={toggleMenu} />;
      case Screen.MyItems:
        return <MyItemsScreen key={myItemsKey} user={user!} onMenuClick={toggleMenu} onEditRequest={handleEditRequest} onViewRequest={handleViewRequest} onActivateRequest={handleActivateRequest} />;
      case Screen.TRANSFERS:
        return <TransfersScreen user={user!} onMenuClick={toggleMenu} onScanRequest={handleScanRequest} onInputCodeRequest={handleInputCodeRequest} />;
      case Screen.ADMIN_PAYMENTS:
        return <AdminPaymentsScreen onMenuClick={toggleMenu} />;
      default:
        return <HomeScreen onScanRequest={handleScanRequest} onInputCodeRequest={handleInputCodeRequest} onNavigate={handleAppNavigate} onPublicNavigate={navigate} onMenuClick={toggleMenu} />;
    }
  };

  const renderModal = () => {
    if (!modal) return null;
    switch (modal) {
      case Screen.Scan: return <ScanScreen onScanComplete={handleScanComplete} onCancel={closeModal} />;
      case Screen.InputCode: return <InputCodeScreen onScanComplete={handleScanComplete} onCancel={closeModal} />;
      case Screen.ScanResult: return scanResult ? <ResultScreen result={scanResult} onClose={closeModal} /> : null;
      case Screen.REQUEST_TRANSFER: return itemToTransfer ? <RequestTransferScreen item={itemToTransfer} user={user!} onCancel={closeModal} onRequestSent={closeModal} /> : null;
      case Screen.EditItem: return itemToEdit ? <EditItemScreen item={itemToEdit} user={user!} onEditComplete={handleEditComplete} onCancel={closeModal} /> : null;
      case Screen.ItemDetail: return itemToView ? <ItemDetailScreen item={itemToView} onDone={closeModal} /> : null;
      case Screen.PAYMENT_MODAL: return itemToActivate ? <PaymentScreen item={itemToActivate} user={user!} onActivationComplete={handleActivationComplete} onCancel={closeModal} /> : null;
      default: return null;
    }
  };

  if (path.startsWith('/denuncias')) {
    const itemId = path.split('/')[2];
    return itemId ? <PublicItemDetailScreen itemId={itemId} onNavigate={navigate} /> : <PublicReportedListScreen onNavigate={navigate} />;
  }
  if (authLoading) return <div className="flex items-center justify-center h-full"><Spinner /></div>;
  if (!user) return authScreen === 'login' ? <LoginScreen onSwitchToRegister={() => setAuthScreen('register')} /> : <RegisterScreen onSwitchToLogin={() => setAuthScreen('login')} />;

  return (
    <div className="bg-gray-900 min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm h-[800px] max-h-[90vh] bg-[#0d1226] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
        <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} onNavigate={handleMenuNavigate} onScanRequest={handleMenuScanRequest} onInputCodeRequest={handleMenuInputCodeRequest} onPublicNavigate={navigate} />
        <div className="relative z-10 flex-shrink-0 bg-[#1e2a47] p-2 flex justify-between items-center text-white border-b border-blue-900">
          <span className="text-xs truncate">{user.email}</span>
          <button onClick={signOutUser} className="text-xs bg-red-600 px-3 py-1 rounded hover:bg-red-700 transition-colors">Salir</button>
        </div>
        <div className="flex-grow overflow-y-auto">{renderActiveScreen()}</div>
        {!generatedItem && <BottomNavBar activeScreen={activeScreen} setActiveScreen={handleAppNavigate} />}
        {renderModal()}
      </div>
    </div>
  );
};

export default App;
