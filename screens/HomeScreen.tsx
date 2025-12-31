import React from 'react';
import { Screen } from '../types';

// [LÓGICA] Definición de las propiedades que recibe este componente.
// No necesitas tocar esto para cambios visuales.
interface HomeScreenProps {
  onScanRequest: () => void;
  onInputCodeRequest: () => void;
  onNavigate: (screen: Screen) => void;
  onPublicNavigate: (path: string) => void;
  onMenuClick: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  onScanRequest,
  onInputCodeRequest,
  onNavigate,
  onPublicNavigate,
  onMenuClick
}) => {

  // [LÓGICA] Manejador de acciones. Aquí se decide qué pasa al hacer clic.
  // Solo toca esto si quieres cambiar A DÓNDE te lleva un botón.
  const handleAction = (action: string) => {
    switch (action) {
      case 'scan':
        onScanRequest();
        break;
      case 'items':
        onNavigate(Screen.MyItems);
        break;
      case 'create':
        onNavigate(Screen.Generate);
        break;
      case 'transfers':
        onNavigate(Screen.TRANSFERS);
        break;
      case 'manual':
        onInputCodeRequest();
        break;
      case 'denuncias':
        onPublicNavigate('/denuncias');
        break;
      default:
        console.warn('Acción no definida:', action);
        break;
    }
  };

  return (
    <div className="home-container">
      {/* ================================================================
          [SECCIÓN DE ESTILOS CSS] - AQUÍ OCURRE LA MAGIA VISUAL
          ================================================================ 
      */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

        /* [FONDO GENERAL] */
        .home-container {
          font-family: 'Poppins', sans-serif;
          
          /* [COLOR DE FONDO] Si quieres cambiar el azul oscuro, edita estos colores HEX (#050b14) */
          background-color: #050b14;
          background-image: radial-gradient(circle at 50% 0%, #1a2c4e 0%, #050b14 60%);
          
          min-height: 100vh;
          width: 100%;
          display: flex;
          justify-content: center; /* Centra todo horizontalmente */
          align-items: flex-start; /* Alinea todo arriba */
          color: white;
          overflow-y: auto;
          
          /* [ESPACIADO GENERAL] Controla qué tan pegado al borde superior e inferior está el contenido */
          padding-top: 5px;    /* Aumenta esto para bajar todo el contenido */
          padding-bottom: 90px; /* Espacio al final para que no se corte el último botón */
          position: relative;
        }

        /* [SCROLLBAR] Esto oculta la barra de desplazamiento para que se vea limpio */
        .home-container::-webkit-scrollbar { display: none; }
        .home-container { -ms-overflow-style: none; scrollbar-width: none; }

        /* [CONTENEDOR MÓVIL] - ¡IMPORTANTE! */
        /* Esta clase limita el ancho de todo. Si los botones no se hacen más anchos es por esto. */
        .mobile-wrapper {
          width: 100%;
          max-width: 400px; /* [ANCHO MÁXIMO] Si quieres la app más ancha en PC, aumenta este 400px */
          padding: 20px;    /* Espacio a los costados de la pantalla */
          display: flex;
          flex-direction: column; /* Organiza los elementos uno debajo del otro */
          gap: 20px;        /* [SEPARACIÓN DE BLOQUES] Espacio entre la Tarjeta, el Botón Scan y la Cuadrícula */
        }

        /* [BOTÓN MENÚ HAMBURGUESA] (Arriba a la izquierda) */
        .menu-toggle {
          position: absolute;
          top: 25px;  /* Posición desde arriba */
          left: 20px; /* Posición desde la izquierda */
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 10px;
          border-radius: 12px;
          cursor: pointer;
          color: white;
          z-index: 100;
          transition: all 0.2s;
        }
        .menu-toggle:active { transform: scale(0.9); }

        /* ================================================================
           [TARJETA DE ESTADO - HEADER] (Donde está el Logo y "Protegido")
           ================================================================ 
        */
        .status-card {
          background: rgba(30, 41, 59, 0.6); /* Fondo semitransparente */
          backdrop-filter: blur(12px);       /* Efecto borroso detrás */
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1); /* Borde fino */
          
          /* [REDONDEADO TARJETA] Cambia esto si quieres la tarjeta más cuadrada o redonda */
          border-radius: 25px; 
          
          /* [TAMAÑO TARJETA] Controla la altura y ancho interno */
          /* El primer valor (50px) es arriba/abajo. El segundo (30px) es izquierda/derecha. */
          padding: 35px 30px; 
          
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5); /* Sombra debajo */
          position: relative;
          overflow: hidden;
          
          /* [SEPARACIÓN SUPERIOR] Espacio extra entre el menú de arriba y esta tarjeta */
          margin-top: 50px;
        }

        /* Efecto de brillo de fondo en la tarjeta */
        .status-card::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 60%);
          pointer-events: none;
        }

        /* TEXTO "Protegido" */
        .status-text h2 {
          font-size: 26px; /* Tamaño letra */
          font-weight: 700; /* Grosor letra (700 es negrita) */
          margin: 0;
          margin-bottom: 6px;
          letter-spacing: 0.5px;
          color: #fff;
        }

        /* TEXTO PEQUEÑO "Estado del sistema" */
        .status-text span {
          font-size: 11px;
          color: #94a3b8; /* Color grisáceo */
          text-transform: uppercase;
          letter-spacing: 1.5px;
          font-weight: 600;
        }

        /* Indicador "MONITOREO ACTIVO" */
        .status-indicator {
          color: #10b981; /* Color verde */
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }

        /* Animación del punto verde */
        .pulsing-dot {
          width: 8px;
          height: 8px;
          background-color: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 10px #10b981;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        /* ================================================================
           [BOTÓN PRINCIPAL - ESCANEAR QR]
           ================================================================ 
        */
        .btn-main {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 15px; /* Espacio entre el ícono y el texto */
          width: 100%;
          
          /* [ALTURA / GROSOR] Cambia este 12px. */
          /* Si pones 20px, el botón será más alto. Si pones 10px, más fino. */
          padding: 12px; 
          
          /* [COLOR DE FONDO] Gradiente azul */
          background: linear-gradient(95deg, #007bff 0%, #0056b3 100%);
          
          /* [REDONDEADO] 35px = Forma de píldora. 10px = Cuadrado con puntas suaves. */
          border-radius: 35px; 
          
          color: white;
          font-size: 18px; /* Tamaño del texto */
          font-weight: 600;
          box-shadow: 0 10px 30px -5px rgba(0, 123, 255, 0.4); /* Sombra azul brillante */
          transition: all 0.2s ease;
          border: none;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .btn-main:active { transform: scale(0.98); } /* Efecto de click */

        /* ================================================================
           [GRID DE BOTONES MEDIANOS] (Mis Items / Crear QR)
           ================================================================ 
        */
        .grid-buttons {
          display: grid;
          /* Define 2 columnas iguales. Si quieres 3, pon '1fr 1fr 1fr' */
          grid-template-columns: 1fr 1fr; 
          gap: 16px; /* [SEPARACIÓN] Espacio entre el botón izquierdo y derecho */
        }

        .btn-medium {
          display: flex;
          flex-direction: row; /* Icono al lado del texto */
          justify-content: center;
          align-items: center;
          gap: 10px;
          
          /* [ALTURA] Igual que el principal para consistencia */
          padding: 12px;
          
          /* [REDONDEADO] */
          border-radius: 35px;
          
          color: white;
          font-weight: 600;
          font-size: 15px;
          transition: transform 0.2s ease;
          border: none;
          cursor: pointer;
          text-align: center;
        }
        .btn-medium:active { transform: scale(0.96); }

        /* Colores específicos de los botones medianos */
        .btn-blue {
          background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); /* Celeste */
          box-shadow: 0 8px 20px -5px rgba(14, 165, 233, 0.4);
        }
        .btn-purple {
          background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); /* Violeta */
          box-shadow: 0 8px 20px -5px rgba(124, 58, 237, 0.4);
        }

        /* ================================================================
           [LISTA INFERIOR] (Transferencias, Denuncias, Manual)
           ================================================================ 
        */
        .list-buttons {
          display: flex;
          flex-direction: column; /* Uno abajo del otro */
          gap: 14px; /* [SEPARACIÓN] Espacio vertical entre cada botón de la lista */
        }

        .btn-list {
          display: flex;
          justify-content: space-between; /* Texto a la izq, flecha a la der */
          align-items: center;
          background: rgba(30, 41, 59, 0.4); /* Fondo oscuro transparente */
          border: 1px solid rgba(255, 255, 255, 0.08); /* Borde sutil */
          
          /* [ALTURA LISTA] 12px arriba/abajo, 24px a los lados */
          padding: 12px 24px;
          
          /* [REDONDEADO] */
          border-radius: 35px;
          
          color: #e2e8f0;
          font-weight: 500;
          font-size: 16px;
          transition: background 0.3s;
          cursor: pointer;
          backdrop-filter: blur(5px);
        }
        .btn-list:hover { background: rgba(30, 41, 59, 0.8); }
        .btn-list:active { background: rgba(30, 41, 59, 1); }

        /* Contenedor del icono y texto dentro de la lista */
        .list-icon-wrapper {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        /* Caja cuadrada/circular del icono amarillo */
        .icon-box {
          width: 40px;  /* Tamaño del círculo del icono */
          height: 40px;
          background: rgba(255,255,255,0.07);
          
          /* [FORMA ICONO] 50% es círculo perfecto. 12px es cuadrado redondeado. */
          border-radius: 50%;
          
          display: flex;
          justify-content: center;
          align-items: center;
          color: #fbbf24; /* Color amarillo del icono */
        }

        .arrow-icon { opacity: 0.5; } /* Flecha derecha semitransparente */

        /* [ICONOS SVG] Ajustes generales de tamaño */
        .svg-icon {
          width: 22px;
          height: 22px;
          fill: currentColor;
        }
        .svg-icon-lg {
          width: 26px;
          height: 26px;
          fill: currentColor;
        }
        
        /* [IMAGEN DEL LOGO/ESCUDO]
           Aquí controlas el tamaño de tu imagen 'escudo_isoqrs.png'
        */
        .isoQRs-img {
          width: 120px;  /* [TAMAÑO LOGO] Aumenta o reduce este número para cambiar el tamaño */
          height: 120px;
          object-fit: contain; /* Asegura que la imagen no se estire feo */
          filter: drop-shadow(0 0 15px rgba(16, 185, 129, 0.3)); /* Brillo verde detrás */
        }

      `}</style>

      {/* ================================================================
          [ESTRUCTURA HTML/JSX] - AQUÍ ESTÁ EL CONTENIDO VISIBLE
          ================================================================ 
      */}

      {/* BOTÓN HAMBURGUESA (Arriba Izquierda) */}
      <button className="menu-toggle" onClick={onMenuClick}>
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '24px', height: '24px' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      <div className="mobile-wrapper">

        {/* 1. TARJETA SUPERIOR (Estado) */}
        <div className="status-card">
          <div className="status-text">
            <span>Estado del sistema</span>
            <h2>Protegido</h2>
            <div className="status-indicator">
              MONITOREO ACTIVO
              <div className="pulsing-dot"></div>
            </div>
          </div>

          {/* IMAGEN DEL LOGO */}
          <img
            src="/images/escudo_isoqrs.png" /* [RUTA IMAGEN] Asegúrate que coincida */
            alt="iso QRs"
            className="isoQRs-img" /* Usa la clase definida arriba */
          />
        </div>

        {/* 2. BOTÓN GRANDE (Escanear) */}
        <button className="btn-main" onClick={() => handleAction('scan')}>
          <svg className="svg-icon-lg" viewBox="0 0 448 512">
            {/* Path del icono QR */}
            <path d="M0 80C0 53.5 21.5 32 48 32h96c26.5 0 48 21.5 48 48v96c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V80zM64 96v64h64V96H64zM0 336c0-26.5 21.5-48 48-48h96c26.5 0 48 21.5 48 48v96c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V336zM64 352v64h64V352H64zM304 32h96c26.5 0 48 21.5 48 48v96c0 26.5-21.5 48-48 48H304c-26.5 0-48-21.5-48-48V80c0-26.5 21.5-48 48-48zm48 64v64h64V96H352zM256 304c0-8.8 7.2-16 16-16h64c8.8 0 16 7.2 16 16s7.2 16 16 16h32c8.8 0 16-7.2 16-16s7.2-16 16-16s16 7.2 16 16v96c0 8.8-7.2 16-16 16H368c-8.8 0-16-7.2-16-16s-7.2-16-16-16s-16 7.2-16 16v64c0 8.8-7.2 16-16 16H272c-8.8 0-16-7.2-16-16V304zM368 480a16 16 0 1 1 0-32 16 16 0 1 1 0 32z" />
          </svg>
          Escanear QR {/* [TEXTO BOTÓN] Cámbialo aquí si deseas */}
        </button>

        {/* 3. BOTONES MEDIANOS (Grid) */}
        <div className="grid-buttons">

          {/* Botón Mis Items (Azul) */}
          <button className="btn-medium btn-blue" onClick={() => handleAction('items')}>
            <svg className="svg-icon" viewBox="0 0 576 512">
              {/* Path caja abierta */}
              <path d="M248 0H208c-26.5 0-48 21.5-48 48V160c0 35.3 28.7 64 64 64H352c35.3 0 64-28.7 64-64V48c0-26.5-21.5-48-48-48H328V80c0 8.8-7.2 16-16 16H264c-8.8 0-16-7.2-16-16V0h0zM64 256c-35.3 0-64 28.7-64 64V448c0 35.3 28.7 64 64 64H224c35.3 0 64-28.7 64-64V320c0-35.3-28.7-64-64-64H184v80c0 8.8-7.2 16-16 16H120c-8.8 0-16-7.2-16-16V256H64zM352 256c-35.3 0-64 28.7-64 64V448c0 35.3 28.7 64 64 64H512c35.3 0 64-28.7 64-64V320c0-35.3-28.7-64-64-64H472v80c0 8.8-7.2 16-16 16H408c-8.8 0-16-7.2-16-16V256H352z" />
            </svg>
            Mis Items
          </button>

          {/* Botón Crear QR (Violeta) */}
          <button className="btn-medium btn-purple" onClick={() => handleAction('create')}>
            <svg className="svg-icon" viewBox="0 0 512 512">
              {/* Path signo más */}
              <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM232 344V280H168c-13.3 0-24-10.7-24-24s10.7-24 24-24h64V168c0-13.3 10.7-24 24-24s24 10.7 24 24v64h64c13.3 0 24 10.7 24 24s-10.7 24-24 24H280v64c0 13.3-10.7 24-24 24s-24-10.7-24-24z" />
            </svg>
            Crear QR
          </button>
        </div>

        {/* 4. LISTA INFERIOR (Botones largos) */}
        <div className="list-buttons">

          {/* Transferencias */}
          <div className="btn-list" onClick={() => handleAction('transfers')}>
            <div className="list-icon-wrapper">
              <div className="icon-box">
                <svg className="svg-icon" viewBox="0 0 512 512" style={{ width: '20px' }}>
                  <path d="M32 96l320 0V32c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l96 96c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-96 96c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V160L32 160c-17.7 0-32-14.3-32-32s14.3-32 32-32zM480 352c17.7 0 32 14.3 32 32s-14.3 32-32 32l-320 0v64c0 12.9-7.8 24.6-19.8 29.6s-25.7 2.2-34.9-6.9l-96-96c-6-6-9.4-14.1-9.4-22.6s3.4-16.6 9.4-22.6l96-96c9.2-9.2 22.9-11.9 34.9-6.9s19.8 16.6 19.8 29.6l0 64 320 0z" />
                </svg>
              </div>
              <span>Transferencias</span>
            </div>
            <svg className="svg-icon arrow-icon" viewBox="0 0 320 512" style={{ width: '12px' }}>
              <path d="M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z" />
            </svg>
          </div>

          {/* Denuncias Públicas (Icono Rojo) */}
          <div className="btn-list" onClick={() => handleAction('denuncias')}>
            <div className="list-icon-wrapper">
              <div className="icon-box" style={{ color: '#ef4444' }}> {/* [COLOR] Aquí se define el rojo del icono */}
                <svg className="svg-icon" viewBox="0 0 512 512" style={{ width: '20px' }}>
                  <path d="M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .3-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24V296c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z" />
                </svg>
              </div>
              <span>Denuncias Públicas</span>
            </div>
            <svg className="svg-icon arrow-icon" viewBox="0 0 320 512" style={{ width: '12px' }}>
              <path d="M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z" />
            </svg>
          </div>

          {/* Ingreso Manual */}
          <div className="btn-list" onClick={() => handleAction('manual')}>
            <div className="list-icon-wrapper">
              <div className="icon-box">
                <svg className="svg-icon" viewBox="0 0 576 512" style={{ width: '20px' }}>
                  <path d="M64 64C28.7 64 0 92.7 0 128V384c0 35.3 28.7 64 64 64H512c35.3 0 64-28.7 64-64V128c0-35.3-28.7-64-64-64H64zm16 64h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V144c0-8.8 7.2-16 16-16zM64 240c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V240zm16 80h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V336c0-8.8 7.2-16 16-16zm80-176c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16V144zm16 80h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16V240c0-8.8 7.2-16 16-16zM160 336c0-8.8 7.2-16 16-16H400c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16V336zM272 128h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H272c-8.8 0-16-7.2-16-16V144c0-8.8 7.2-16 16-16zM256 240c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H272c-8.8 0-16-7.2-16-16V240zM368 128h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H368c-8.8 0-16-7.2-16-16V144c0-8.8 7.2-16 16-16zM352 240c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H368c-8.8 0-16-7.2-16-16V240zM464 128h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H464c-8.8 0-16-7.2-16-16V144c0-8.8 7.2-16 16-16V240zm16 80h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H464c-8.8 0-16-7.2-16-16V336c0-8.8 7.2-16 16-16z" />
                </svg>
              </div>
              <span>Ingreso Manual</span>
            </div>
            <svg className="svg-icon arrow-icon" viewBox="0 0 320 512" style={{ width: '12px' }}>
              <path d="M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z" />
            </svg>
          </div>

        </div>

      </div>
    </div>
  );
};

export default HomeScreen;