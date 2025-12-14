import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { PaymentStatus } from "../../types";

/**
 * Servicio de Pagos PREX (Simulado)
 * Este archivo aísla la lógica de pago. Hoy simula éxito,
 * mañana aquí pondremos la conexión real sin romper el resto de la app.
 */
export const processPrexPayment = async (itemId: string, userId: string, amount: number): Promise<{ success: boolean; message: string }> => {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(`💸 Iniciando pago PREX | Item: ${itemId} | Usuario: ${userId} | Monto: $${amount}`);

            // 1. Simulación de espera de red (2.5 segundos)
            setTimeout(async () => {

                // 2. Desbloqueo Real en Firebase
                const itemRef = doc(db, "Items", itemId);

                await updateDoc(itemRef, {
                    paymentStatus: PaymentStatus.Paid, // <--- ¡LIBERAMOS EL ÍTEM!
                    lastPaymentDate: serverTimestamp(),
                    paymentMethod: 'PREX',
                    paymentAmount: amount,
                    paymentTransactionId: `SIM-PREX-${Date.now()}`
                });

                console.log("✅ Pago simulado exitoso. Ítem desbloqueado.");

                resolve({
                    success: true,
                    message: "Pago aprobado exitosamente. Tu servicio está activo."
                });

            }, 2500);

        } catch (error) {
            console.error("❌ Error en pago Prex:", error);
            reject({ success: false, message: "Error de conexión. Intenta nuevamente." });
        }
    });
};
