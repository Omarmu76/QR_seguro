import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebaseConfig';

// CONTEXTOS Y NUEVOS SCREENS
import { ToastProvider } from './context/ToastContext';
import LoginScreen from './screens/LoginScreen';
import UserProfileModern from './components/UserProfileModern';

// COMPONENTES Y SCREENS EXISTENTES
import HomeScreen from './screens/HomeScreen.tsx';
import MapScreen from './screens/MapScreen';
import MyItemsScreen from './screens/MyItemsScreen';
import ScanScreen from './screens/ScanScreen';
import ResultScreen from './screens/ResultScreen';
import GenerateScreen from './screens/GenerateScreen';
import GeneratedQrScreen from './screens/GeneratedQrScreen';
import EditItemScreen from './screens/EditItemScreen';
import InputCodeScreen from './screens/InputCodeScreen';
import ItemDetailScreen from './screens/ItemDetailScreen';
import PublicReportedListScreen from './screens/PublicReportedListScreen';
import PublicItemDetailScreen from './screens/PublicItemDetailScreen';
import SellScreen from './screens/SellScreen';
import TransfersScreen from './screens/TransfersScreen';
import RequestTransferScreen from './screens/RequestTransferScreen';
import AdminPaymentsScreen from './screens/AdminPaymentsScreen';
import SideMenu from './components/SideMenu';
import BottomNavBar from './components/BottomNavBar';
import Spinner from './components/Spinner';
import TermsModal from './components/common/TermsModal';
import { Item, Screen, ItemStatus } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeScreen, setActiveScreen] = useState<Screen>(Screen.Home);

  // Estados de datos
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [scannedResult, setScannedResult] = useState<{ item: Item; status: ItemStatus } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const renderScreen = () => {
    switch (activeScreen) {
      case Screen.Home:
        return (
          <HomeScreen
            onScanRequest={() => setActiveScreen(Screen.Scan)}
            onInputCodeRequest={() => setActiveScreen(Screen.InputCode)}
            onNavigate={setActiveScreen}
            onPublicNavigate={(p: string) => {
              if (p === '/denuncias') setActiveScreen(Screen.PUBLIC_REPORTED);
              else if (p.startsWith('/denuncias/')) {
                const id = p.split('/denuncias/')[1];
                setSelectedItem({ qrId: id } as any);
                setActiveScreen(Screen.PUBLIC_ITEM_DETAIL);
              }
            }}
            onMenuClick={() => setIsMenuOpen(true)}
          />
        );

      case Screen.Map:
        return (
          <MapScreen
            user={user!}
            onMenuClick={() => setIsMenuOpen(true)}
            onScanRequest={() => setActiveScreen(Screen.Scan)}
            onInputCodeRequest={() => setActiveScreen(Screen.InputCode)}
          />
        );

      case Screen.MyItems:
        return (
          <MyItemsScreen
            user={user!}
            onMenuClick={() => setIsMenuOpen(true)}
            onEditRequest={(item) => { setSelectedItem(item); setActiveScreen(Screen.EditItem); }}
            onViewRequest={(item) => { setSelectedItem(item); setActiveScreen(Screen.ItemDetail); }}
            onActivateRequest={(item) => { setSelectedItem(item); setActiveScreen(Screen.PAYMENT_MODAL); }}
          />
        );

      case Screen.Scan:
        return (
          <ScanScreen
            onScanComplete={(res) => { setScannedResult(res); setActiveScreen(Screen.ScanResult); }}
            onCancel={() => setActiveScreen(Screen.Home)}
          />
        );

      case Screen.ScanResult:
        return (
          <ResultScreen
            result={scannedResult!}
            onClose={() => setActiveScreen(Screen.Home)}
          />
        );

      case Screen.Generate:
        return (
          <GenerateScreen
            user={user!}
            onGenerateComplete={(item) => { setSelectedItem(item); setActiveScreen(Screen.GeneratedQR); }}
            onMenuClick={() => setIsMenuOpen(true)}
          />
        );

      case Screen.GeneratedQR:
        return (
          <GeneratedQrScreen
            item={selectedItem!}
            user={user!}
            onDone={() => setActiveScreen(Screen.MyItems)}
          />
        );

      case Screen.EditItem:
        return (
          <EditItemScreen
            item={selectedItem!}
            user={user!}
            onCancel={() => setActiveScreen(Screen.MyItems)}
            onEditComplete={() => setActiveScreen(Screen.MyItems)}
          />
        );

      case Screen.InputCode:
        return (
          <InputCodeScreen
            onScanComplete={(res) => { setScannedResult(res); setActiveScreen(Screen.ScanResult); }}
            onCancel={() => setActiveScreen(Screen.Home)}
          />
        );

      case Screen.ItemDetail:
        return (
          <ItemDetailScreen
            item={selectedItem!}
            onDone={() => setActiveScreen(Screen.MyItems)}
          />
        );

      case Screen.PUBLIC_REPORTED:
        return (
          <PublicReportedListScreen
            onNavigate={(p) => {
              if (p === '/') setActiveScreen(Screen.Home);
              else if (p.startsWith('/denuncias/')) {
                const id = p.split('/denuncias/')[1];
                setSelectedItem({ qrId: id } as any);
                setActiveScreen(Screen.PUBLIC_ITEM_DETAIL);
              }
            }}
          />
        );

      case Screen.PUBLIC_ITEM_DETAIL:
        return (
          <PublicItemDetailScreen
            itemId={selectedItem?.qrId || ''}
            onNavigate={(p) => {
              if (p === '/denuncias') setActiveScreen(Screen.PUBLIC_REPORTED);
              else if (p === '/') setActiveScreen(Screen.Home);
            }}
          />
        );

      case Screen.TRANSFERS:
        return (
          <TransfersScreen
            user={user!}
            onMenuClick={() => setIsMenuOpen(true)}
            onScanRequest={() => setActiveScreen(Screen.Scan)}
            onInputCodeRequest={() => setActiveScreen(Screen.InputCode)}
          />
        );

      case Screen.REQUEST_TRANSFER:
        return (
          <RequestTransferScreen
            item={selectedItem!}
            user={user!}
            onCancel={() => setActiveScreen(Screen.Home)}
            onRequestSent={() => setActiveScreen(Screen.TRANSFERS)}
          />
        );

      case Screen.SELL:
        return (
          <SellScreen
            user={user!}
            onMenuClick={() => setIsMenuOpen(true)}
          />
        );

      case Screen.ADMIN_PAYMENTS:
        return <AdminPaymentsScreen onMenuClick={() => setIsMenuOpen(true)} />;

      default:
        return <HomeScreen onScanRequest={() => setActiveScreen(Screen.Scan)} onInputCodeRequest={() => setActiveScreen(Screen.InputCode)} onNavigate={setActiveScreen} onPublicNavigate={(_: string) => setActiveScreen(Screen.PUBLIC_REPORTED)} onMenuClick={() => setIsMenuOpen(true)} />;
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0d1226] text-white"><Spinner /></div>;

  return (
    <ToastProvider>
      <div className="h-full w-full bg-[#0d1226] overflow-hidden flex flex-col font-sans text-white fixed inset-0">
        {!user ? (
          <LoginScreen />
        ) : (
          <>
            {/* Header de Usuario Premium (Nombre, Email y Salir) */}
            <div className="bg-[#1e2a47]/80 backdrop-blur-md p-2 px-5 flex justify-between items-center border-b border-white/10 relative z-[1001] shadow-2xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 to-yellow-300 flex items-center justify-center text-black font-black text-xs shrink-0 shadow-inner">
                  {user.displayName?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-black text-white tracking-widest truncate uppercase italic leading-tight">
                    {user.displayName || 'Usuario'}
                  </span>
                  <span className="text-[10px] font-bold text-white/40 tracking-tight truncate italic leading-tight">
                    {user.email}
                  </span>
                </div>
              </div>
              <button
                onClick={() => auth.signOut()}
                className="bg-red-600/90 hover:bg-red-500 text-white text-[11px] font-black px-4 py-2 rounded-lg uppercase transition-all active:scale-90 shadow-[0_0_15px_rgba(220,38,38,0.3)] shrink-0"
              >
                Salir
              </button>
            </div>

            <div className="flex-grow overflow-y-auto overflow-x-hidden relative">
              {renderScreen()}
            </div>

            {/* Navbar oculta solo en scan */}
            {activeScreen !== Screen.Scan && (
              <BottomNavBar
                activeScreen={activeScreen}
                setActiveScreen={setActiveScreen}
              />
            )}

            <SideMenu
              isOpen={isMenuOpen}
              onClose={() => setIsMenuOpen(false)}
              onNavigate={(s) => { setActiveScreen(s); setIsMenuOpen(false); }}
              onScanRequest={() => { setActiveScreen(Screen.Scan); setIsMenuOpen(false); }}
              onInputCodeRequest={() => { setActiveScreen(Screen.InputCode); setIsMenuOpen(false); }}
              onPublicNavigate={(p) => {
                if (p === '/denuncias') setActiveScreen(Screen.PUBLIC_REPORTED);
                else if (p.startsWith('/denuncias/')) {
                  const id = p.split('/denuncias/')[1];
                  setSelectedItem({ qrId: id } as any);
                  setActiveScreen(Screen.PUBLIC_ITEM_DETAIL);
                }
                setIsMenuOpen(false);
              }}
              onProfileRequest={() => { setShowProfile(true); setIsMenuOpen(false); }}
              onTermsRequest={() => { setShowTerms(true); setIsMenuOpen(false); }}
              user={user}
            />

            {showProfile && <UserProfileModern user={user} onClose={() => setShowProfile(false)} />}
            {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
          </>
        )}
      </div>
    </ToastProvider>
  );
};


export default App;
