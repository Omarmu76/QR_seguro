// Archivo: services/payments/mercadoPagoService.ts
import { Item } from '../../types';

// Leemos la configuración del entorno
const MERCADO_PAGO_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY;
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const createMercadoPagoPreference = async (item: Item) => {
  console.log('1. Iniciando solicitud de preferencia para:', item.qrId);

  if (!MERCADO_PAGO_PUBLIC_KEY) {
    throw new Error('Falta VITE_MP_PUBLIC_KEY en .env.local');
  }

  try {
    // CONEXIÓN REAL AL BACKEND
    const response = await fetch(`${API_URL}/create_preference`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `Activación Item: ${item.qrId}`, // Título que verá el usuario
        quantity: 1,
        unit_price: Number(import.meta.env.VITE_PRICE || 1.99), // Precio desde .env
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error del servidor:', errorData);
      throw new Error('El servidor rechazó la creación de la preferencia');
    }

    const data = await response.json();
    console.log('2. Preferencia creada con éxito:', data);

    // Mercado Pago devuelve un ID de preferencia (preferenceId)
    // Retornamos el ID para que el componente 'Wallet' lo use, 
    // o la URL si decidimos redirigir (init_point).
    return {
      preferenceId: data.id,
      init_point: data.init_point // Por si decides redirigir
    };

  } catch (error) {
    console.error('3. Error fatal creando preferencia:', error);
    throw error;
  }
};