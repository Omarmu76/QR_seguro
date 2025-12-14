// Archivo: services/paymentService.ts
// Este es el "enchufe" principal. Actúa como un router.
// La UI solo hablará con este archivo, nunca con los servicios específicos.

import { Item, PaymentMethod } from '../types';
import { createMercadoPagoPreference } from './payments/mercadoPagoService';
import { createPixCharge } from './payments/pixService';
import { createMobbexPayment } from './payments/mobbexService';
import { createPaypalOrder } from './payments/paypalService';
import { handleCustomPayment } from './payments/customBankService';

/**
 * Inicia un flujo de pago para un item específico usando el método elegido.
 * Devuelve la información necesaria para que la UI continúe (ej. un link de pago).
 */
export const initiatePayment = async (item: Item, method: PaymentMethod): Promise<{ checkoutUrl: string }> => {
  
  console.log(`Iniciando pago para ${item.qrId} usando ${method}`);

  // --- CONFIGURACIÓN DE PRECIOS Y COMISIONES ---
  //
  // NOTA: El precio final SEGURO se define en el BACKEND (Cloud Function).
  // La lógica aquí es solo para referencia o simulación.
  // El backend debe recalcular el precio + comisión (ej: 6%)
  //
  // --- FIN DE CONFIGURACIÓN ---

  switch (method) {
    
    case PaymentMethod.MercadoPago:
      // Llama al servicio específico de Mercado Pago
      return await createMercadoPagoPreference(item);
    
    case PaymentMethod.Pix:
      // Puerta lista para PIX
      return await createPixCharge(item);
      
    case PaymentMethod.Mobbex:
      // Puerta lista para Mobbex
      return await createMobbexPayment(item);

    case PaymentMethod.Paypal:
      // Puerta lista para PayPal
      return await createPaypalOrder(item);

    case PaymentMethod.Custom:
      // Puerta lista para tu sistema
      return await handleCustomPayment(item);

    default:
      console.error(`Método de pago no soportado: ${method}`);
      throw new Error(`Método de pago no soportado: ${method}`);
  }
};

// NOTA: La lógica para *recibir* los webhooks de pago (la confirmación)
// vivirá en Firebase Cloud Functions, no aquí en la app cliente.