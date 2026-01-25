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

    /**
     * Descripción del Retorno:
     * Para cumplir con la Regla #4 (sin errores de TS), transformamos la respuesta
     * de Mercado Pago al formato estándar { checkoutUrl: string }.
     * - init_point: Es la URL oficial de Mercado Pago para procesar el pago.
     */
    return {
      checkoutUrl: data.init_point, // Mapeamos init_point a checkoutUrl para consistencia global
      preferenceId: data.id        // Mantenemos el ID por si la UI lo requiere
    };

  } catch (error) {
    console.error('3. Error fatal creando preferencia:', error);
    throw error;
  }
};