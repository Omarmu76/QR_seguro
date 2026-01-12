import React from 'react';

interface HeaderProps {
  title: string;
  onMenuClick: () => void; // Se usa para el menú hamburguesa
  transparent?: boolean;   // Para el efecto Glass en el mapa
  onBack?: () => void;     // NUEVO: Función para la flecha de volver
}

const Header: React.FC<HeaderProps> = ({ title, onMenuClick, transparent = false, onBack }) => {

  // Estilos de contenedor (Sólido o Transparente)
  const containerClasses = transparent
    ? "bg-gradient-to-b from-[#0d1226]/90 to-transparent pt-4 pb-8 border-none"
    : "bg-[#0d1226] border-b border-white/10 shadow-lg py-4";

  return (
    <header className={`w-full px-4 flex items-center justify-between z-50 transition-all duration-300 ${containerClasses}`}>

      {/* Botón Izquierdo (Menú o Volver) */}
      <button
        onClick={onBack || onMenuClick}
        className="p-2 rounded-xl hover:bg-white/10 active:scale-95 transition-all text-white"
        aria-label={onBack ? "Volver" : "Abrir menú"}
      >
        {onBack ? (
          // ÍCONO FLECHA (VOLVER) - Se muestra si existe onBack
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        ) : (
          // ÍCONO HAMBURGUESA (MENÚ) - Se muestra por defecto
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Título Central */}
      <h1 className="text-lg font-bold tracking-widest text-white uppercase text-center flex-1 pr-10 drop-shadow-md truncate">
        {title}
      </h1>

      {/* Espaciador (Mantiene el título centrado) */}
      <div className="w-7"></div>
    </header>
  );
};

export default Header;