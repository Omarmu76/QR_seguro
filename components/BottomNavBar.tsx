import React from 'react';
import { Screen } from '../types';

interface NavIconProps {
  Icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const NavIcon: React.FC<NavIconProps> = ({ Icon, label, isActive, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-1/4 transition-colors duration-200 ${isActive ? 'text-yellow-400' : 'text-gray-400 hover:text-white'}`}>
    <Icon className="w-7 h-7 mb-1" />
    <span className="text-xs font-medium">{label}</span>
  </button>
);

const HomeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955a1.125 1.125 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" />
  </svg>
);

const MapIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m0 0v-8.25m0 8.25h.375c.621 0 1.125-.504 1.125-1.125V6.75m-1.5 8.25S8.84 15 8.25 15c-.6 0-1.125-.504-1.125-1.125V6.75m1.5 8.25v-8.25m0 0H6.75m0 0v8.25m0 0v0m0 0H9m1.5-8.25v8.25m0 0c.621 0 1.125-.504 1.125-1.125V6.75m0 0H12m4.5 0v8.25m0 0v0m0 0c-.6 0-1.125-.504-1.125-1.125V6.75m0 0h.375c.621 0 1.125.504 1.125 1.125V15m0 0S16.84 15 16.25 15c-.6 0-1.125-.504-1.125-1.125V6.75m1.5 8.25v-8.25" />
  </svg>
);

const QrCodeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5h16.5M3.75 9h16.5m-16.5 5.25h16.5M3.75 19.5h16.5" />
  </svg>
);

const ListIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h7.5M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0z" />
  </svg>
);

interface BottomNavBarProps {
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeScreen, setActiveScreen }) => {
  const navItems = [
    { screen: Screen.Home, label: 'Inicio', Icon: HomeIcon },
    { screen: Screen.Generate, label: 'Generar QR', Icon: QrCodeIcon },
    { screen: Screen.Map, label: 'Mapa', Icon: MapIcon },
    { screen: Screen.MyItems, label: 'Mis Items', Icon: ListIcon },
  ];

  return (
    <div className="w-full h-20 bg-[#1e2a47] border-t border-blue-900 flex justify-around items-center absolute bottom-0 z-10">
      {navItems.map((item) => (
        <NavIcon
          key={item.screen}
          Icon={item.Icon}
          label={item.label}
          isActive={activeScreen === item.screen}
          onClick={() => setActiveScreen(item.screen)}
        />
      ))}
    </div>
  );
};

export default BottomNavBar;