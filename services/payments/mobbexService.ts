// Archivo: services/payments/mobbexService.ts
// Puerta preparada para la integración con Mobbex
import { Item } from '../../types';
export const createMobbexPayment = async (item: Item) => {
  console.log('Iniciando pago con Mobbex para:', item.qrId);
  // --- EN ESPERA: Aquí se conectará la API de Mobbex ---
  console.error('Mobbex no implementado.');
  throw new Error('El método de pago Mobbex aún no está implementado.');
};
