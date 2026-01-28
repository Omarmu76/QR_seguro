import {
    collection, addDoc, updateDoc, doc, getDocs, query, where, serverTimestamp, orderBy
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { PaymentStatus, PaymentNotification, Item, ItemStatus } from "../types";

// --- USUARIO: Notifica que pagó ---
export const notifyPayment = async (item: any, user: any, amount: number, method: string, currency: string) => {
    try {
        await addDoc(collection(db, "PaymentNotifications"), {
            itemId: item.qrId,
            userId: user.uid,
            userEmail: user.email,
            amount: amount,
            currency: currency,
            method: method,
            status: 'pending',
            createdAt: serverTimestamp(),
            itemDetails: {
                marca: item.marca,
                modelo: item.modelo
            }
        });

        const itemRef = doc(db, "Items", item.qrId);
        await updateDoc(itemRef, {
            paymentStatus: PaymentStatus.Review,
            paymentMethod: `${method} (${currency})`
        });

        return { success: true };
    } catch (error) {
        console.error("Error notificando:", error);
        throw error;
    }
};

// --- ADMIN: Ver Solicitudes (Prioridad) ---
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

// --- ADMIN: Ver INVENTARIO TOTAL (Control Absoluto) ---
// Antes era getUnpaidItems, ahora trae TODO para que puedas ver lo pagado también.
export const getAllItemsForAdmin = async (): Promise<Item[]> => {
    try {
        // Traemos todos los items ordenados por creación (si tuvieran fecha) o por defecto
        // Como 'Items' puede ser grande, idealmente paginaríamos, pero para empezar traemos todo.
        const itemsRef = collection(db, "Items");
        // No aplicamos where(status) para traer todo.
        const snapshot = await getDocs(itemsRef);
        return snapshot.docs.map(doc => ({ ...doc.data(), qrId: doc.id } as Item));
    } catch (error) {
        console.error("Error fetching all items:", error);
        return [];
    }
};

// --- ADMIN: Aprobar ---
export const approvePayment = async (notificationId: string | null, itemId: string) => {
    try {
        const itemRef = doc(db, "Items", itemId);
        await updateDoc(itemRef, {
            paymentStatus: PaymentStatus.Paid,
            status: ItemStatus.EnRegla, // <--- REPARACIÓN: Activa el ítem inmediatamente
            lastPaymentDate: serverTimestamp(),
            paymentTransactionId: notificationId ? `ADMIN-REF-${notificationId}` : `ADMIN-MANUAL-${Date.now()}`
        });

        if (notificationId) {
            const notifRef = doc(db, "PaymentNotifications", notificationId);
            await updateDoc(notifRef, { status: 'approved' });
        }

        return { success: true };
    } catch (error) {
        throw error;
    }
};

// --- ADMIN: Rechazar ---
export const rejectPayment = async (notificationId: string, itemId: string) => {
    try {
        const itemRef = doc(db, "Items", itemId);
        await updateDoc(itemRef, { paymentStatus: PaymentStatus.Pending });

        const notifRef = doc(db, "PaymentNotifications", notificationId);
        await updateDoc(notifRef, { status: 'rejected' });

        return { success: true };
    } catch (error) { throw error; }
};
