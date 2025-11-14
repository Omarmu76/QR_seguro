// Archivo: services/payments/paypalService.ts
// Puerta preparada para la integración con PayPal
import { Item } from '../../types';
export const createPaypalOrder = async (item: Item) => {
  console.log('Iniciando pago con PayPal para:', item.qrId);
  // --- EN ESPERA: Aquí se conectará la API de PayPal ---
  console.error('PayPal no implementado.');
  throw new Error('El método de pago PayPal aún no está implementado.');
};
