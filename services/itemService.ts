import {
    collection, addDoc, getDoc, getDocs, query, where, doc, deleteDoc, updateDoc,
    writeBatch, serverTimestamp, orderBy, Timestamp
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

// --- CREACIÓN (AHORA RECIBE Y GUARDA UBICACIÓN INICIAL) ---
export const saveItem = async (
    itemData: Omit<Item, 'qrId' | 'status' | 'ownerId' | 'shortId'>,
    userId: string,
    initialLocation: { lat: number, lng: number } | null // <--- NUEVO: GPS AL NACER
): Promise<Item> => {
    try {
        const shortId = generateShortId(6);
        const newItem: Omit<Item, 'qrId'> = {
            ...itemData,
            status: ItemStatus.EnRegla,
            ownerId: userId,
            shortId: shortId,
            paymentStatus: PaymentStatus.Pending,
            // Guardamos la ubicación inicial para que el pin verde exista desde el día 1
            location: initialLocation,
            locationTimestamp: initialLocation ? Date.now() : null
        };
        const docRef = await addDoc(collection(db, "Items"), newItem);
        await updateDoc(docRef, { qrId: docRef.id });
        return { ...newItem, qrId: docRef.id };
    } catch (error) {
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
        const q = query(collection(db, "Items"), where("shortId", "==", shortId.toUpperCase()));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return null;
        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data() as Item;
        return { item: { ...data, qrId: docSnap.id }, status: data.status || ItemStatus.EnRegla };
    } catch (error) {
        throw new Error("Could not retrieve item by shortId.");
    }
};

export const getAllUserItems = async (userId: string): Promise<Item[]> => {
    try {
        const q = query(collection(db, "Items"), where("ownerId", "==", userId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({ ...doc.data(), qrId: doc.id } as Item));
    } catch (error) {
        return [];
    }
};

export const getPublicReportedItems = async (): Promise<Item[]> => {
    try {
        const q = query(collection(db, "Items"), where("status", "in", [ItemStatus.Denunciado, ItemStatus.Recuperado]));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({ ...doc.data(), qrId: doc.id } as Item));
    } catch (error) {
        return [];
    }
};

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

// --- UPDATE ESTADO (PROTEGIDO PARA NO BORRAR GPS) ---
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
                // Al denunciar, actualizamos a la ubicación del reporte
                updateData.location = locationData;
                updateData.locationTimestamp = Date.now();
                updateData.recoveryLocation = null;
                updateData.recoveryTimestamp = null;
            } else if (newStatus === ItemStatus.EnRegla) {
                // *** IMPORTANTE: NO TOCAR 'location' ***
                // Mantenemos la última ubicación conocida para que el dueño siga viendo el pin verde.
                updateData.recoveryLocation = null;
                updateData.recoveryTimestamp = null;
            } else if (newStatus === ItemStatus.Recuperado) {
                updateData.recoveryLocation = locationData;
                updateData.recoveryTimestamp = Date.now();
            }

            // Solo borramos ubicación si se vende/transfiere (privacidad del nuevo dueño)
            if (newStatus === ItemStatus.Vendido) {
                updateData.location = null;
                updateData.locationTimestamp = null;
            }

            await updateDoc(docRef, updateData);
        } else { throw new Error("Permission denied."); }
    } catch (error) { throw error; }
};

// --- UPDATE SOLO UBICACIÓN ---
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

// --- TRANSFERENCIAS ---
export const createTransferRequest = async (item: Item, buyer: User): Promise<TransferRequest> => {
    if (!item.qrId || !item.ownerId) throw new Error("Datos del item inválidos.");
    const transfersRef = collection(db, "Transfers");
    const q = query(transfersRef, where("itemId", "==", item.qrId), where("status", "==", TransferStatus.Pending));
    const existingTransfers = await getDocs(q);
    if (!existingTransfers.empty) throw new Error("Ya existe una solicitud pendiente.");
    const newTransferData: Omit<TransferRequest, 'id' | 'createdAt'> = {
        itemId: item.qrId, itemDetails: { tipo: item.tipo, marca: item.marca, modelo: item.modelo, identificador: item.identificador },
        sellerId: item.ownerId, buyerId: buyer.uid, buyerEmail: buyer.email || "Usuario", status: TransferStatus.Pending,
    };
    try {
        const docRef = await addDoc(collection(db, "Transfers"), { ...newTransferData, createdAt: serverTimestamp(), }); return { ...newTransferData, id: docRef.id, createdAt: Date.now() };
    } catch (error) { throw new Error("No se pudo crear la solicitud."); }
};

export const getPendingTransfers = async (sellerId: string): Promise<TransferRequest[]> => {
    try {
        const transfersRef = collection(db, "Transfers"); const q = query(transfersRef, where("sellerId", "==", sellerId), where("status", "==", TransferStatus.Pending), orderBy("createdAt", "desc")); const querySnapshot = await getDocs(q); return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: (doc.data().createdAt as Timestamp)?.toMillis() || Date.now() } as TransferRequest));
    } catch (error) { throw new Error("Error fetching pending transfers."); }
};

export const getSentTransfers = async (buyerId: string): Promise<TransferRequest[]> => {
    try {
        const transfersRef = collection(db, "Transfers"); const q = query(transfersRef, where("buyerId", "==", buyerId), orderBy("createdAt", "desc")); const querySnapshot = await getDocs(q); return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: (doc.data().createdAt as Timestamp)?.toMillis() || Date.now() } as TransferRequest));
    } catch (error) { throw new Error("Error fetching sent transfers."); }
};

export const approveTransfer = async (transferId: string, itemId: string, buyerId: string) => {
    const batch = writeBatch(db);
    const transferRef = doc(db, "Transfers", transferId);
    batch.update(transferRef, { status: TransferStatus.Approved });
    const itemRef = doc(db, "Items", itemId);
    const newShortId = generateShortId(6);
    batch.update(itemRef, { ownerId: buyerId, status: ItemStatus.EnRegla, shortId: newShortId, paymentStatus: PaymentStatus.Pending, location: null, locationTimestamp: null, recoveryLocation: null, recoveryTimestamp: null, });
    await batch.commit();
};

export const rejectTransfer = async (transferId: string): Promise<void> => {
    try { const transferRef = doc(db, "Transfers", transferId); await updateDoc(transferRef, { status: TransferStatus.Rejected }); } catch (error) { throw new Error("Could not reject transfer."); }
};

export const cancelTransfer = async (transferId: string): Promise<void> => {
    try { const transferRef = doc(db, "Transfers", transferId); await deleteDoc(transferRef); } catch (error) { throw new Error("Could not cancel transfer."); }
};