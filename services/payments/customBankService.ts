// Archivo: services/payments/customBankService.ts
// Gestiona métodos de pago personalizados (transferencia bancaria, efectivo, etc).
import { Item } from '../../types';

/**
 * Función: handleCustomPayment
 * Propósito: Proveer instrucciones de pago manuales al usuario.
 * 
 * Explicación detallada (Regla #2):
 * - Este método es útil para pagos fuera de línea o transferencias directas.
 * - Retorna una URL (que podría ser una página de instrucciones) para cumplir
 *   con la arquitectura de tipos estandarizada.
 */
export const handleCustomPayment = async (item: Item): Promise<{ checkoutUrl: string }> => {
  console.log('Gestionando pago personalizado para:', item.qrId);
  
  // LOG: Indica que el proceso manual debe ser configurado según el país.
  console.warn('Pago personalizado requiere configuración de instrucciones.');
  
  // Retorna un string vacío como checkoutUrl para satisfacer al compilador.
  return { checkoutUrl: '' };
};
