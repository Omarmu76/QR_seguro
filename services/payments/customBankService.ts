// Archivo: services/payments/customBankService.ts
// Puerta preparada para tu futuro sistema propio (ej: CBU/Alias manual)
import { Item } from '../../types';
export const handleCustomPayment = async (item: Item) => {
  console.log('Iniciando pago manual para:', item.qrId);
  // --- EN ESPERA: Aquí irá la lógica para el sistema propio ---
  console.error('Sistema de pago propio no implementado.');
  throw new Error('El sistema de pago propio aún no está implementado.');
};
