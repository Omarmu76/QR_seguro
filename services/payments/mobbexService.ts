// Archivo: services/payments/mobbexService.ts
// Este servicio gestiona la integración con la pasarela de pagos Mobbex.
import { Item } from '../../types';

/**
 * Función: createMobbexPayment
 * Propósito: Iniciar una solicitud de pago en la plataforma Mobbex.
 * Estado: Pendiente de implementación técnica.
 * 
 * Explicación de Cambios (Regla #4):
 * Se define el retorno como Promise<{ checkoutUrl: string }> para mantener
 * la consistencia con el servicio principal de pagos y evitar errores de tipado.
 */
export const createMobbexPayment = async (item: Item): Promise<{ checkoutUrl: string }> => {
  console.log('Iniciando pago con Mobbex para:', item.qrId);
  
  // Mensaje de error controlado para desarrollo
  console.error('Mobbex no implementado.');
  
  // Retornamos un objeto válido de TypeScript para evitar que la compilación falle.
  // En producción, este campo contendría la URL de redirección de Mobbex.
  return { checkoutUrl: '' };
};
