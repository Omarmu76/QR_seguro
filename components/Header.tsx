import React from 'react';

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
  transparent?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, onMenuClick, transparent }) => {
  const headerClass = transparent
    ? "bg-transparent p-4 flex justify-between items-center text-white relative z-10"
    : "bg-[#1e2a47] p-4 flex justify-between items-center text-white shadow-md relative z-10";

  return (
    <header className={headerClass}>
      <button onClick={onMenuClick} className="p-1 hover:bg-white/10 rounded-lg transition-colors" aria-label="Abrir menú">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <h1 className={`text-xl font-bold uppercase tracking-wider ${transparent ? 'drop-shadow-md' : ''}`}>{title}</h1>
      <div className="w-8"></div> {/* Spacer */}
    </header>
  );
};

export default Header;