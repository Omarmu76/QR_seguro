// Archivo: services/payments/pixService.ts
// Puerta preparada para la integración con PIX (Brasil)
import { Item } from '../../types';
export const createPixCharge = async (item: Item) => {
  console.log('Iniciando pago con PIX para:', item.qrId);
  // --- EN ESPERA: Aquí se conectará la API de PIX ---
  console.error('PIX no implementado.');
  throw new Error('El método de pago PIX (Brasil) aún no está implementado.');
};
