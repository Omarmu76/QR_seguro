import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange, signOutUser } from './services/authService';
import { Screen, Item, ItemStatus } from './types';

import HomeScreen from './screens/HomeScreen';
import GenerateScreen from './screens/GenerateScreen';
import MyItemsScreen from './screens/MyItemsScreen';
import ScanScreen from './screens/ScanScreen';
import ResultScreen from './screens/ResultScreen';
import GeneratedQrScreen from './screens/GeneratedQrScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import BottomNavBar from './components/BottomNavBar';
import Spinner from './components/Spinner';
import PublicReportedListScreen from './screens/PublicReportedListScreen';
import PublicItemDetailScreen from './screens/PublicItemDetailScreen';
import SellScreen from './screens/SellScreen';
import SideMenu from './components/SideMenu';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');
  
  const [activeScreen, setActiveScreen] = useState<Screen>(Screen.Home);
  const [modal, setModal] = useState<Screen | null>(null);
  const [scanResult, setScanResult] = useState<{ item: Item; status: ItemStatus } | null>(null);
  const [generatedItem, setGeneratedItem] = useState<Item | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
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
    window.history.pushState({}, '', newPath);
    setPath(newPath);
  };

  const toggleMenu = () => setIsMenuOpen(prev => !prev);

  const handleScanRequest = useCallback(() => setModal(Screen.Scan), []);

  const handleScanComplete = useCallback((result: { item: Item; status: ItemStatus }) => {
    setScanResult(result);
    setModal(Screen.ScanResult);
  }, []);

  const handleGenerateComplete = (result: Item) => {
    setGeneratedItem(result);
    setActiveScreen(Screen.GeneratedQR);
  };

  const closeModal = useCallback(() => {
    setModal(null);
    setScanResult(null);
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
  
  const handleMenuPublicNavigate = (newPath: string) => {
    navigate(newPath);
    setIsMenuOpen(false);
  };

  const handleAppNavigate = (screen: Screen) => {
     setPath('/');
     setActiveScreen(screen);
  };

  const renderActiveScreen = () => {
    if (!user) return null;

    if (generatedItem) {
      return <GeneratedQrScreen item={generatedItem} onDone={closeGeneratedQr} user={user}/>;
    }
    
    switch (activeScreen) {
      case Screen.Home:
        return <HomeScreen onScanRequest={handleScanRequest} onNavigate={handleAppNavigate} onPublicNavigate={navigate} onMenuClick={toggleMenu} />;
      case Screen.Generate:
        return <GenerateScreen onGenerateComplete={handleGenerateComplete} user={user} onMenuClick={toggleMenu} />;
      case Screen.MyItems:
        return <MyItemsScreen user={user} onMenuClick={toggleMenu} />;
      case Screen.Sell:
        return <SellScreen user={user} onMenuClick={toggleMenu} />;
      default:
        return <HomeScreen onScanRequest={handleScanRequest} onNavigate={handleAppNavigate} onPublicNavigate={navigate} onMenuClick={toggleMenu} />;
    }
  };

  const renderModal = () => {
    if (!modal) return null;
    switch (modal) {
      case Screen.Scan:
        return <ScanScreen onScanComplete={handleScanComplete} onCancel={closeModal} />;
      case Screen.ScanResult:
        return scanResult ? <ResultScreen result={scanResult} onClose={closeModal} /> : null;
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
            onPublicNavigate={handleMenuPublicNavigate}
        />
        <div className="flex-shrink-0 bg-[#1e2a47] p-2 flex justify-between items-center text-white border-b border-blue-900">
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
