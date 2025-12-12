import {
    collection, addDoc, updateDoc, doc, getDocs, query, where, serverTimestamp, orderBy
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { PaymentStatus, PaymentNotification } from "../types";

/**
 * USUARIO: Notifica que realizó un pago.
 * Pone el ítem en "Review" y crea una alerta para el admin.
 */
export const notifyPayment = async (item: any, user: any, amount: number, method: string) => {
    try {
        // 1. Crear Notificación en colección separada
        await addDoc(collection(db, "PaymentNotifications"), {
            itemId: item.qrId,
            userId: user.uid,
            userEmail: user.email,
            amount: amount,
            method: method,
            status: 'pending',
            createdAt: serverTimestamp(),
            itemDetails: {
                marca: item.marca,
                modelo: item.modelo
            }
        });

        // 2. Actualizar estado del Item a "En Revisión"
        const itemRef = doc(db, "Items", item.qrId);
        await updateDoc(itemRef, {
            paymentStatus: PaymentStatus.Review,
            paymentMethod: method
        });

        return { success: true };
    } catch (error) {
        console.error("Error notificando pago:", error);
        throw error;
    }
};

/**
 * ADMIN: Obtiene todas las solicitudes pendientes.
 */
export const getPendingPayments = async (): Promise<PaymentNotification[]> => {
    try {
        const q = query(
            collection(db, "PaymentNotifications"),
            where("status", "==", "pending"),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toMillis() || Date.now()
        } as PaymentNotification));
    } catch (error) {
        console.error("Error fetching payments:", error);
        return [];
    }
};

/**
 * ADMIN: Aprueba un pago.
 * Libera el ítem y cierra la notificación.
 */
export const approvePayment = async (notification: PaymentNotification) => {
    try {
        // 1. Liberar el Ítem (Ponerlo en PAID)
        const itemRef = doc(db, "Items", notification.itemId);
        await updateDoc(itemRef, {
            paymentStatus: PaymentStatus.Paid,
            lastPaymentDate: serverTimestamp(),
            paymentTransactionId: `ADMIN-${notification.id}`
        });

        // 2. Marcar notificación como aprobada
        const notifRef = doc(db, "PaymentNotifications", notification.id);
        await updateDoc(notifRef, { status: 'approved' });

        return { success: true };
    } catch (error) {
        console.error("Error approving:", error);
        throw error;
    }
};

/**
 * ADMIN: Rechaza un pago.
 * Devuelve el ítem a PENDING.
 */
export const rejectPayment = async (notification: PaymentNotification) => {
    try {
        // 1. Devolver ítem a PENDING
        const itemRef = doc(db, "Items", notification.itemId);
        await updateDoc(itemRef, {
            paymentStatus: PaymentStatus.Pending
        });

        // 2. Marcar notificación como rechazada
        const notifRef = doc(db, "PaymentNotifications", notification.id);
        await updateDoc(notifRef, { status: 'rejected' });

        return { success: true };
    } catch (error) {
        throw error;
    }
};
