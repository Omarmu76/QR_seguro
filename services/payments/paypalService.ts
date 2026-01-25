// Archivo: services/payments/paypalService.ts
// Este servicio prepara la orden de pago para usuarios que prefieren PayPal.
import { Item } from '../../types';

/**
 * Función: createPaypalOrder
 * Propósito: Crear una orden de compra en PayPal y obtener la URL de aprobación.
 * Estado: En desarrollo (Esqueleto técnico).
 * 
 * Explicación de Código (Regla #2):
 * - Define el contrato de retorno esperado por paymentService.ts.
 * - Retorna un objeto con checkoutUrl para cumplir con la Regla #4 de calidad.
 */
export const createPaypalOrder = async (item: Item): Promise<{ checkoutUrl: string }> => {
  console.log('Iniciando orden de PayPal para:', item.qrId);
  
  // LOG: Indica que la funcionalidad está pendiente de integración con el SDK oficial.
  console.error('PayPal no implementado.');
  
  // Retorno de compatibilidad.
  return { checkoutUrl: '' };
};
