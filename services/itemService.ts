import {
    collection, addDoc, getDoc, getDocs, query, where, doc, deleteDoc, updateDoc,
    writeBatch, serverTimestamp, orderBy, Timestamp, onSnapshot, Unsubscribe, setDoc
} from "firebase/firestore";
import { User } from 'firebase/auth';
import { db } from "../firebaseConfig";
import { Item, ItemStatus, TransferRequest, TransferStatus, PaymentStatus } from '../types';

// ==========================================
// 1. FUNCIONES DE LECTURA
// ==========================================

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
        return null;
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

// ==========================================
// 2. HELPERS E INTERNOS
// ==========================================

const generateShortIdString = (length: number = 6): string => {
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

const getUniqueShortId = async (): Promise<string> => {
    let isUnique = false;
    let newId = '';
    let attempts = 0;

    while (!isUnique && attempts < 5) {
        newId = generateShortIdString(6);
        const existing = await getItemByShortId(newId);
        if (!existing) {
            isUnique = true;
        }
        attempts++;
    }

    if (!isUnique) throw new Error("Error de colisión: No se pudo generar un ID único.");
    return newId;
};

// ==========================================
// 3. FUNCIONES DE ESCRITURA
// ==========================================

export const saveItem = async (
    itemData: any,
    userId: string,
    locationData: { lat: number, lng: number } | null = null
): Promise<Item> => {
    try {
        console.log("🚀 V100: Iniciando registro de PROTEGIDO (Ultra-Defensivo)...");
        const shortId = await getUniqueShortId();

        // 1. CONSTRUCCIÓN INDIVIDUAL (Evita 'undefined' por completo)
        const cleanPayload: any = {
            tipo: String(itemData.tipo || 'Vehiculo'),
            marca: String(itemData.marca || ''),
            modelo: String(itemData.modelo || ''),
            identificador: String(itemData.identificador || ''),
            ownerId: String(userId),
            shortId: String(shortId),
            status: ItemStatus.EnRegla,
            paymentStatus: PaymentStatus.Pending,
            location: locationData ? { lat: Number(locationData.lat), lng: Number(locationData.lng) } : null,
            locationTimestamp: locationData ? Date.now() : null,
            reward: Number(itemData.reward || 0),
            trackingType: String(itemData.trackingType || 'PASSIVE'),
            linkedDeviceId: String(itemData.linkedDeviceId || ""),
            qrId: ""
        };

        console.table(cleanPayload);

        // 2. GUARDADO CON ID PRE-GENERADO (setDoc es más robusto)
        const itemsRef = collection(db, "Items");
        const newDocRef = doc(itemsRef);
        cleanPayload.qrId = newDocRef.id;

        await setDoc(newDocRef, cleanPayload);

        console.log("🚀 V100: Registro Exitoso. ID:", newDocRef.id);
        return cleanPayload as Item;
    } catch (error: any) {
        console.error("❌ V100 ERROR:", error);
        throw new Error(`[V100] Fallo Crítico en Firebase: ${error.message || 'Sin detalles'}`);
    }
};

export const updateItemStatus = async (
    itemId: string,
    userId: string,
    newStatus: ItemStatus,
    locationData: { lat: number, lng: number } | null = null
): Promise<void> => {
    try {
        const docRef = doc(db, "Items", itemId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) throw new Error("Item not found.");
        const itemData = docSnap.data() as Item;

        if (userId === "public") {
            if (newStatus !== ItemStatus.Denunciado) {
                throw new Error("Acceso Denegado: El público solo puede reportar hallazgos.");
            }
        } else if (itemData.ownerId !== userId) {
            throw new Error("Permission denied.");
        }

        let updateData: any = { status: newStatus };
        if (newStatus === ItemStatus.Denunciado) {
            updateData.location = locationData;
            updateData.locationTimestamp = Date.now();
            updateData.recoveryLocation = null;
            updateData.recoveryTimestamp = null;
        } else if (newStatus === ItemStatus.EnRegla || newStatus === ItemStatus.Vendido) {
            updateData.location = null;
            updateData.locationTimestamp = null;
            updateData.recoveryLocation = null;
            updateData.recoveryTimestamp = null;
        } else if (newStatus === ItemStatus.Recuperado) {
            updateData.recoveryLocation = locationData;
            updateData.recoveryTimestamp = Date.now();
        }
        await updateDoc(docRef, updateData);

    } catch (error) {
        throw error;
    }
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

// ==========================================
// 4. TRANSFERENCIAS
// ==========================================

export const createTransferRequest = async (item: Item, buyer: User): Promise<TransferRequest> => {
    if (!item.qrId || !item.ownerId) throw new Error("Datos del item inválidos.");

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
        const q = query(transfersRef,
            where("sellerId", "==", sellerId),
            where("status", "==", TransferStatus.Pending),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: (doc.data().createdAt as Timestamp)?.toMillis() || Date.now() } as TransferRequest));
    } catch (error) {
        throw new Error("Error fetching pending transfers.");
    }
};

export const getSentTransfers = async (buyerId: string): Promise<TransferRequest[]> => {
    try {
        const transfersRef = collection(db, "Transfers");
        const q = query(transfersRef,
            where("buyerId", "==", buyerId),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: (doc.data().createdAt as Timestamp)?.toMillis() || Date.now() } as TransferRequest));
    } catch (error) {
        throw new Error("Error fetching sent transfers.");
    }
};

export const approveTransfer = async (transferId: string, itemId: string, buyerId: string) => {
    const batch = writeBatch(db);
    const transferRef = doc(db, "Transfers", transferId);
    batch.update(transferRef, { status: TransferStatus.Approved });

    const itemRef = doc(db, "Items", itemId);
    const newShortId = await getUniqueShortId();

    batch.update(itemRef, {
        ownerId: buyerId,
        status: ItemStatus.EnRegla,
        shortId: newShortId,
        paymentStatus: PaymentStatus.Pending,
        location: null,
        locationTimestamp: null,
        recoveryLocation: null,
        recoveryTimestamp: null,
    });

    await batch.commit();
};

export const rejectTransfer = async (transferId: string): Promise<void> => {
    try {
        const transferRef = doc(db, "Transfers", transferId);
        await updateDoc(transferRef, { status: TransferStatus.Rejected });
    } catch (error) {
        throw new Error("Could not reject transfer.");
    }
};

export const cancelTransfer = async (transferId: string): Promise<void> => {
    try {
        const transferRef = doc(db, "Transfers", transferId);
        await deleteDoc(transferRef);
    } catch (error) {
        throw new Error("Could not cancel transfer.");
    }
};

// ==========================================
// 5. SOPORTE ADICIONAL (Mapa, Edición, Tiempo Real)
// ==========================================

export const subscribeToUserItems = (userId: string, callback: (items: Item[]) => void): Unsubscribe => {
    const q = query(collection(db, "Items"), where("ownerId", "==", userId));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ ...doc.data(), qrId: doc.id } as Item));
        callback(items);
    });
};

export const subscribeToPublicReportedItems = (callback: (items: Item[]) => void): Unsubscribe => {
    const q = query(collection(db, "Items"), where("status", "in", [ItemStatus.Denunciado, ItemStatus.Recuperado]));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ ...doc.data(), qrId: doc.id } as Item));
        callback(items);
    });
};

export const updateItemLocation = async (qrId: string, lat: number, lng: number): Promise<void> => {
    try {
        const docRef = doc(db, "Items", qrId);
        await updateDoc(docRef, {
            location: { lat, lng },
            locationTimestamp: Date.now()
        });
    } catch (error) {
        console.error("Error updating item location:", error);
    }
};

export const updateItemLocationRealTime = updateItemLocation;

export const updateItem = async (itemId: string, updateData: Partial<Item>): Promise<void> => {
    try {
        const docRef = doc(db, "Items", itemId);
        await updateDoc(docRef, updateData);
    } catch (error) {
        console.error("Error updating item:", error);
        throw error;
    }
};