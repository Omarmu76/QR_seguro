import {
    collection, addDoc, getDoc, getDocs, query, where, doc, deleteDoc, updateDoc,
    writeBatch, serverTimestamp, Timestamp, onSnapshot, Unsubscribe
} from "firebase/firestore";
import { User } from 'firebase/auth';
import { db } from "../firebaseConfig";
import { Item, ItemStatus, TransferRequest, TransferStatus, PaymentStatus } from '../types';

const generateShortId = (length: number = 6): string => {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (length === 6) {
        return `${result.substring(0, 3)}-${result.substring(3, 6)}`;
    }
    return result;
};

// --- TELEMETRÍA Y RASTREO (NUEVO) ---

/**
 * Actualiza la ubicación de un item de forma ligera para rastreo en vivo.
 */
export const updateItemLocationRealTime = async (itemId: string, lat: number, lng: number) => {
    try {
        const itemRef = doc(db, "Items", itemId);
        await updateDoc(itemRef, {
            location: { lat, lng },
            locationTimestamp: Date.now()
        });
    } catch (error) {
        console.error("Error GPS (RealTime):", error);
    }
};

// --- CREACIÓN ---
export const saveItem = async (
    itemData: Omit<Item, 'qrId' | 'status' | 'ownerId' | 'shortId'>,
    userId: string,
    initialLocation: { lat: number, lng: number } | null
): Promise<Item> => {
    try {
        const shortId = generateShortId(6);
        const newItem: Omit<Item, 'qrId'> = {
            ...itemData,
            status: ItemStatus.EnRegla,
            ownerId: userId,
            shortId: shortId,
            paymentStatus: PaymentStatus.Pending, // Nace pendiente
            location: initialLocation,
            locationTimestamp: initialLocation ? Date.now() : null
        };
        const docRef = await addDoc(collection(db, "Items"), newItem);
        await updateDoc(docRef, { qrId: docRef.id });
        return { ...newItem, qrId: docRef.id };
    } catch (error) {
        console.error("Error saving item:", error);
        throw new Error("Could not save item.");
    }
};

// --- LECTURA ---
export const getItemByQrId = async (qrId: string): Promise<{ item: Item, status: ItemStatus } | null> => {
    try {
        const docRef = doc(db, "Items", qrId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data() as Item;
            return { item: { ...data, qrId: docSnap.id }, status: data.status || ItemStatus.EnRegla };
        } else {
            return null;
        }
    } catch (error) {
        throw new Error("Could not retrieve item.");
    }
};

export const getItemByShortId = async (shortId: string): Promise<{ item: Item, status: ItemStatus } | null> => {
    try {
        // Aseguramos mayúsculas y quitamos espacios por seguridad al buscar
        const cleanId = shortId.trim().toUpperCase();
        const q = query(collection(db, "Items"), where("shortId", "==", cleanId));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return null;
        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data() as Item;
        return { item: { ...data, qrId: docSnap.id }, status: data.status || ItemStatus.EnRegla };
    } catch (error) {
        throw new Error("Could not retrieve item by shortId.");
    }
};

// BLINDAJE: Si falla la lectura, devuelve array vacío en lugar de romper la pantalla.
export const getAllUserItems = async (userId: string): Promise<Item[]> => {
    try {
        const q = query(collection(db, "Items"), where("ownerId", "==", userId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({ ...doc.data(), qrId: doc.id } as Item));
    } catch (error) {
        console.error("Error al traer items del usuario:", error);
        return [];
    }
};

// --- NUEVO: GESTIÓN DE PAGOS ---

export const getItemsInReview = async (): Promise<Item[]> => {
    try {
        const q = query(collection(db, "Items"), where("paymentStatus", "==", PaymentStatus.Review));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({ ...doc.data(), qrId: doc.id } as Item));
    } catch (error) {
        console.error("Error fetching items in review:", error);
        return [];
    }
};

// Función principal para marcar como "En Revisión"
export const markItemAsInReview = async (itemId: string, method: string): Promise<void> => {
    try {
        const docRef = doc(db, "Items", itemId);
        await updateDoc(docRef, {
            paymentStatus: PaymentStatus.Review,
            paymentMethod: method,
            lastPaymentDate: Date.now()
        });
    } catch (error) {
        console.error("Error marking item as review:", error);
        throw error;
    }
};

// --- FIX: ESTA ES LA FUNCIÓN QUE FALTABA Y CAUSABA EL ERROR ---
// Mantenemos esta función para compatibilidad con PaymentScreen.tsx
export const updateItemPaymentStatus = async (itemId: string, status: PaymentStatus): Promise<void> => {
    try {
        const docRef = doc(db, "Items", itemId);
        await updateDoc(docRef, {
            paymentStatus: status,
            lastPaymentDate: Date.now()
        });
    } catch (error) {
        console.error("Error updating payment status:", error);
        throw error;
    }
};

export const approveItemPayment = async (itemId: string): Promise<void> => {
    try {
        const docRef = doc(db, "Items", itemId);
        await updateDoc(docRef, {
            paymentStatus: PaymentStatus.Paid,
            lastPaymentDate: Date.now()
        });
    } catch (error) {
        console.error("Error approving payment:", error);
        throw error;
    }
};

export const rejectItemPayment = async (itemId: string): Promise<void> => {
    try {
        const docRef = doc(db, "Items", itemId);
        await updateDoc(docRef, {
            paymentStatus: PaymentStatus.Pending
        });
    } catch (error) {
        console.error("Error rejecting payment:", error);
        throw error;
    }
};

// ... Resto de funciones auxiliares sin cambios ...
export const getItemById = async (itemId: string): Promise<Item | null> => {
    try {
        const docRef = doc(db, "Items", itemId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { qrId: docSnap.id, ...docSnap.data() } as Item : null;
    } catch (e) { return null; }
};

export const getUserById = async (userId: string): Promise<{ email: string, nombreCompleto: string } | null> => {
    try {
        const docRef = doc(db, "Users", userId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() as { email: string, nombreCompleto: string } : null;
    } catch (e) { return null; }
};

export const updateItemStatus = async (
    itemId: string, userId: string, newStatus: ItemStatus, locationData: { lat: number, lng: number } | null = null
): Promise<void> => {
    try {
        const docRef = doc(db, "Items", itemId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) throw new Error("Item not found.");
        const itemData = docSnap.data() as Item;

        if (itemData.ownerId === userId || userId === "public") {
            let updateData: any = { status: newStatus };
            if (newStatus === ItemStatus.Denunciado) {
                updateData.location = locationData;
                updateData.locationTimestamp = Date.now();
                updateData.recoveryLocation = null;
                updateData.recoveryTimestamp = null;
            } else if (newStatus === ItemStatus.EnRegla) {
                updateData.recoveryLocation = null;
                updateData.recoveryTimestamp = null;
            } else if (newStatus === ItemStatus.Recuperado) {
                updateData.recoveryLocation = locationData;
                updateData.recoveryTimestamp = Date.now();
            }
            if (newStatus === ItemStatus.Vendido) {
                updateData.location = null;
                updateData.locationTimestamp = null;
            }
            await updateDoc(docRef, updateData);
        } else { throw new Error("Permission denied."); }
    } catch (error) { throw error; }
};

export const updateItemLocation = async (itemId: string, userId: string, locationData: { lat: number, lng: number }) => {
    try {
        const docRef = doc(db, "Items", itemId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) throw new Error("Item not found.");
        const itemData = docSnap.data() as Item;
        if (itemData.ownerId !== userId) throw new Error("Permission denied.");
        await updateDoc(docRef, { location: locationData, locationTimestamp: Date.now() });
    } catch (error) { throw error; }
};

export const updateItemDetails = async (itemId: string, userId: string, newData: { tipo: string; marca: string; modelo: string; }): Promise<void> => {
    try {
        const docRef = doc(db, "Items", itemId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) throw new Error("Item not found.");
        const itemData = docSnap.data() as Item;
        if (itemData.ownerId !== userId) throw new Error("Permission denied.");
        await updateDoc(docRef, { tipo: newData.tipo, marca: newData.marca, modelo: newData.modelo });
    } catch (error) { throw error; }
};

export const deleteItem = async (qrId: string, userId: string): Promise<void> => {
    try {
        const docRef = doc(db, "Items", qrId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) throw new Error("Item not found.");
        const itemData = docSnap.data() as Item;
        if (itemData.ownerId !== userId) throw new Error("Permission denied.");
        await deleteDoc(docRef);
    } catch (error) { throw error; }
};

// --- TRANSFERENCIAS (LÓGICA CORREGIDA Y FUNCIONAL) ---

export const createTransferRequest = async (
    item: Item,
    buyer: User,
    location: { lat: number, lng: number } | null = null
): Promise<TransferRequest> => {
    if (!item.qrId || !item.ownerId) throw new Error("Datos del item inválidos.");

    // Evitar duplicados
    const transfersRef = collection(db, "Transfers");
    const q = query(transfersRef,
        where("itemId", "==", item.qrId),
        where("status", "==", TransferStatus.Pending)
    );
    const existingTransfers = await getDocs(q);
    if (!existingTransfers.empty) throw new Error("Ya existe una solicitud pendiente.");

    const newTransferData: Omit<TransferRequest, 'id' | 'createdAt'> = {
        itemId: item.qrId,
        itemDetails: { tipo: item.tipo, marca: item.marca, modelo: item.modelo, identificador: item.identificador },
        sellerId: item.ownerId,
        buyerId: buyer.uid,
        buyerEmail: buyer.email || "Usuario",
        buyerLocation: location || undefined, // <--- GUARDAR UBICACIÓN DEL COMPRADOR
        status: TransferStatus.Pending,
    };

    try {
        const docRef = await addDoc(collection(db, "Transfers"), {
            ...newTransferData,
            createdAt: serverTimestamp(),
        });
        return { ...newTransferData, id: docRef.id, createdAt: Date.now() };
    } catch (error) {
        throw new Error("No se pudo crear la solicitud.");
    }
};

export const getPendingTransfers = async (sellerId: string): Promise<TransferRequest[]> => {
    try {
        const transfersRef = collection(db, "Transfers");
        // FIX: Eliminamos 'orderBy' de la query para evitar error de índice
        const q = query(transfersRef,
            where("sellerId", "==", sellerId),
            where("status", "==", TransferStatus.Pending)
        );
        const querySnapshot = await getDocs(q);

        // Ordenamos en memoria (Javascript)
        const requests = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: (doc.data().createdAt as Timestamp)?.toMillis() || Date.now()
        } as TransferRequest));

        return requests.sort((a, b) => b.createdAt - a.createdAt); // Orden descendente
    } catch (error) {
        console.error(error);
        throw new Error("Error fetching pending transfers.");
    }
};

export const getSentTransfers = async (buyerId: string): Promise<TransferRequest[]> => {
    try {
        const transfersRef = collection(db, "Transfers");
        // FIX: Eliminamos 'orderBy' de la query
        const q = query(transfersRef,
            where("buyerId", "==", buyerId)
        );
        const querySnapshot = await getDocs(q);

        const requests = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: (doc.data().createdAt as Timestamp)?.toMillis() || Date.now()
        } as TransferRequest));

        return requests.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
        console.error(error);
        throw new Error("Error fetching sent transfers.");
    }
};

export const approveTransfer = async (transferId: string, itemId: string, buyerId: string) => {
    const batch = writeBatch(db);

    // 1. Recuperar la ubicación inicial capturada en la solicitud (Handshake)
    const transferRef = doc(db, "Transfers", transferId);
    const transferSnap = await getDoc(transferRef);
    const transferData = transferSnap.exists() ? transferSnap.data() as TransferRequest : null;
    const startLocation = transferData?.buyerLocation || null;

    // 2. Actualizar estado de la solicitud
    batch.update(transferRef, { status: TransferStatus.Approved });

    // 3. Mover el artículo al nuevo dueño aplicando el HANDSHAKE GPS
    const itemRef = doc(db, "Items", itemId);
    const newShortId = generateShortId(6); // Nuevo QR para seguridad

    batch.update(itemRef, {
        ownerId: buyerId,
        status: ItemStatus.EnRegla,
        shortId: newShortId,
        paymentStatus: PaymentStatus.Pending, // <--- EL CANDADO DE NEGOCIO (BLOQUEA MAPA)

        // ASIGNAMOS LA UBICACIÓN DONDE SE HIZO EL TRATO
        location: startLocation,
        locationTimestamp: startLocation ? Date.now() : null,

        recoveryLocation: null,
        recoveryTimestamp: null,
        recoveryLocationTimestamp: null,
    });

    await batch.commit();
};

export const rejectTransfer = async (transferId: string): Promise<void> => {
    try { const transferRef = doc(db, "Transfers", transferId); await updateDoc(transferRef, { status: TransferStatus.Rejected }); } catch (error) { throw new Error("Could not reject transfer."); }
};

export const cancelTransfer = async (transferId: string): Promise<void> => {
    try { const transferRef = doc(db, "Transfers", transferId); await deleteDoc(transferRef); } catch (error) { throw new Error("Could not cancel transfer."); }
};

// --- FIX: RESTAURACIÓN DE FUNCIÓN PARA REPORTES PÚBLICOS ---
export const getPublicReportedItems = async (): Promise<Item[]> => {
    try {
        // Traemos items Denunciados o Recuperados para mostrar en la lista pública
        const q = query(
            collection(db, "Items"),
            where("status", "in", [ItemStatus.Denunciado, ItemStatus.Recuperado])
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({ ...doc.data(), qrId: doc.id } as Item));
    } catch (error) {
        console.error("Error fetching public reported items:", error);
        return [];
    }
};

// --- REAL-TIME SUBSCRIPTIONS (UBER-LIKE) ---

export const subscribeToUserItems = (userId: string, callback: (items: Item[]) => void): Unsubscribe => {
    const q = query(collection(db, "Items"), where("ownerId", "==", userId));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map((doc) => ({ ...doc.data(), qrId: doc.id } as Item));
        callback(items);
    }, (error) => {
        console.error("Error subscribiendo a mis items:", error);
    });
};

export const subscribeToPublicReportedItems = (callback: (items: Item[]) => void): Unsubscribe => {
    const q = query(collection(db, "Items"), where("status", "in", [ItemStatus.Denunciado, ItemStatus.Recuperado]));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map((doc) => ({ ...doc.data(), qrId: doc.id } as Item));
        callback(items);
    }, (error) => {
        console.error("Error subscribiendo a alertas públicas:", error);
    });
};