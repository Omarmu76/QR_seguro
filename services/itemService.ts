
import { collection, addDoc, getDoc, getDocs, query, where, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Item, ItemStatus } from '../types';

const itemsCollection = collection(db, "Items");

/**
 * Genera un ID corto legible.
 * NOTA: Para producción, se debería verificar la unicidad en la DB.
 */
const generateShortId = (length: number = 6): string => {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; // Excluimos O, 0, I, L
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Formato XXX-XXX para legibilidad
    if (length === 6) {
        return `${result.substring(0, 3)}-${result.substring(3, 6)}`;
    }
    return result;
};


/**
 * Saves a new item to the Firestore "Items" collection with an owner ID.
 */
export const saveItem = async (itemData: Omit<Item, 'qrId' | 'status' | 'ownerId' | 'shortId'>, userId: string): Promise<Item> => {
    try {
        // Generar el nuevo ID corto
        const shortId = generateShortId(6);

        const newItem: Omit<Item, 'qrId'> = {
            ...itemData,
            status: ItemStatus.EnRegla,
            ownerId: userId,
            shortId: shortId,
        };
        const docRef = await addDoc(itemsCollection, newItem);
        
        // Actualizar el documento con su propio qrId (que es el docRef.id)
        // Esto es útil si alguna vez necesitamos el qrId DENTRO del documento
        await updateDoc(docRef, { qrId: docRef.id });

        return {
            ...newItem,
            qrId: docRef.id,
        };
    } catch (error) {
        const message = (error instanceof Error) ? error.message : String(error);
        console.error("Error saving item to Firestore:", message);
        throw new Error("Could not save item.");
    }
};

/**
 * Retrieves a single item and its status from Firestore using its document ID.
 */
export const getItemByQrId = async (qrId: string): Promise<{ item: Item, status: ItemStatus } | null> => {
    try {
        const docRef = doc(db, "Items", qrId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as Item;
            return {
                item: {
                    qrId: docSnap.id,
                    tipo: data.tipo,
                    marca: data.marca,
                    modelo: data.modelo,
                    identificador: data.identificador,
                    ownerId: data.ownerId,
                    status: data.status,
                    shortId: data.shortId,
                },
                status: data.status || ItemStatus.EnRegla,
            };
        } else {
            return null;
        }
    } catch (error) {
        const message = (error instanceof Error) ? error.message : String(error);
        console.error("Error getting item from Firestore:", message);
        throw new Error("Could not retrieve item.");
    }
};

/**
 * NUEVA FUNCIÓN: Recupera un ítem usando el shortId (para búsqueda manual).
 */
export const getItemByShortId = async (shortId: string): Promise<{ item: Item, status: ItemStatus } | null> => {
    try {
        const q = query(itemsCollection, where("shortId", "==", shortId.toUpperCase()));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return null; // No se encontró
        }
        
        const docSnap = querySnapshot.docs[0]; // Tomar el primer resultado
        const data = docSnap.data() as Item;
        
        return {
            item: {
                qrId: docSnap.id,
                tipo: data.tipo,
                marca: data.marca,
                modelo: data.modelo,
                identificador: data.identificador,
                ownerId: data.ownerId,
                status: data.status,
                shortId: data.shortId,
            },
            status: data.status || ItemStatus.EnRegla,
        };

    } catch (error) {
        const message = (error instanceof Error) ? error.message : String(error);
        console.error("Error getting item by shortId:", message);
        throw new Error("Could not retrieve item by shortId.");
    }
};

/**
 * Updates the status of an item after verifying ownership.
 */
export const updateItemStatus = async (itemId: string, userId: string, newStatus: ItemStatus): Promise<void> => {
    try {
        const docRef = doc(db, "Items", itemId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error("Item not found.");
        }
        const itemData = docSnap.data() as Item;

        if (itemData.ownerId === userId || newStatus === ItemStatus.Recuperado) {
            await updateDoc(docRef, { status: newStatus });
        } else {
             throw new Error("Permission denied.");
        }

    } catch (error) {
        const message = (error instanceof Error) ? error.message : String(error);
        console.error("Error updating item status:", message);
        throw error;
    }
};


/**
 * Deletes an item from Firestore after verifying ownership.
 */
export const deleteItem = async (qrId: string, userId: string): Promise<void> => {
    try {
        const docRef = doc(db, "Items", qrId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) throw new Error("Item not found.");
        const itemData = docSnap.data() as Item;
        if (itemData.ownerId !== userId) throw new Error("Permission denied.");
        await deleteDoc(docRef);
    } catch (error) {
        const message = (error instanceof Error) ? error.message : String(error);
        console.error("Error deleting item from Firestore:", message);
        throw error;
    }
};

/**
 * Fetches all items from Firestore belonging to a specific user.
 */
export const getAllUserItems = async (userId: string): Promise<Item[]> => {
    try {
        const q = query(itemsCollection, where("ownerId", "==", userId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => {
            const data = doc.data() as Item;
            return {
                ...data,
                qrId: doc.id,
            };
        });
    } catch (error) {
        const message = (error instanceof Error) ? error.message : String(error);
        console.error("Error getting user items from Firestore:", message);
        return [];
    }
};

/**
 * Fetches all publicly reported items (status = DENUNCIADO o RECUPERADO).
 */
export const getPublicReportedItems = async (): Promise<Item[]> => {
    try {
        const q = query(itemsCollection, where("status", "in", [ItemStatus.Denunciado, ItemStatus.Recuperado]));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => {
             const data = doc.data() as Item;
             return {
                ...data,
                qrId: doc.id,
             };
        });
    } catch (error) {
        const message = (error instanceof Error) ? error.message : String(error);
        console.error("Error getting public reported items:", message);
        return [];
    }
};


/**
 * Retrieves a single item by its ID.
 */
export const getItemById = async (itemId: string): Promise<Item | null> => {
    try {
        const docRef = doc(db, "Items", itemId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { qrId: docSnap.id, ...docSnap.data() } as Item;
        }
        return null;
    } catch(e) {
        const message = (e instanceof Error) ? e.message : String(e);
        console.error("Error fetching item by ID", message);
        return null;
    }
};

/**
 * Retrieves a user's profile by their ID.
 */
export const getUserById = async (userId: string): Promise<{email: string, nombreCompleto: string} | null> => {
     try {
        const docRef = doc(db, "Users", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as {email: string, nombreCompleto: string};
        }
        return null;
    } catch(e) {
        const message = (e instanceof Error) ? e.message : String(e);
        console.error("Error fetching user by ID", message);
        return null;
    }
};
