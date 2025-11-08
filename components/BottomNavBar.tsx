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

const RepeatIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 11.667 0l3.181-3.183m-11.667-11.667a8.25 8.25 0 0 1 11.667 0l3.181 3.183m-14.85-3.183L2.985 16.355" />
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
    { screen: Screen.MyItems, label: 'Mis Items', Icon: ListIcon },
    { screen: Screen.Sell, label: 'Vender', Icon: RepeatIcon },
  ];

  return (
    <div className="w-full h-20 bg-[#1e2a47] border-t border-blue-900 flex justify-around items-center absolute bottom-0">
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
