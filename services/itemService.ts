import { collection, addDoc, getDoc, getDocs, query, where, doc, deleteDoc, updateDoc, writeBatch, serverTimestamp, orderBy, Timestamp, limit } from "firebase/firestore";
import { User } from 'firebase/auth';
import { db } from "../firebaseConfig";
import { Item, ItemStatus, TransferRequest, TransferStatus } from '../types';

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
        const docRef = await addDoc(collection(db, "Items"), newItem);
        
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
        const q = query(collection(db, "Items"), where("shortId", "==", shortId.toUpperCase()));
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
 * AHORA TAMBIÉN GUARDA LA UBICACIÓN.
 */
export const updateItemStatus = async (
    itemId: string, 
    userId: string, 
    newStatus: ItemStatus,
    locationData: { lat: number, lng: number } | null = null
): Promise<void> => {
    try {
        const docRef = doc(db, "Items", itemId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error("Item not found.");
        }
        const itemData = docSnap.data() as Item;

        // "public" es un bypass usado por PublicItemDetailScreen
        if (itemData.ownerId === userId || userId === "public") {
            
            let updateData: any = { status: newStatus };
            
            if (newStatus === ItemStatus.Denunciado) {
                updateData.location = locationData;
                updateData.locationTimestamp = Date.now();
                updateData.recoveryLocation = null; // Limpiar datos de recuperación
                updateData.recoveryTimestamp = null;
            } else if (newStatus === ItemStatus.EnRegla || newStatus === ItemStatus.Vendido) {
                updateData.location = null; // Limpiar datos de denuncia
                updateData.locationTimestamp = null;
                updateData.recoveryLocation = null;
                updateData.recoveryTimestamp = null;
            } else if (newStatus === ItemStatus.Recuperado) {
                // No limpiamos 'location' para mantener el historial
                updateData.recoveryLocation = locationData;
                updateData.recoveryTimestamp = Date.now();
            }
            
            await updateDoc(docRef, updateData);
            
        } else {
             throw new Error("Permission denied.");
        }

    } catch (error) {
        const message = (error instanceof Error) ? error.message : String(error);
        console.error("Error updating item status:", message);
        throw error;
    }
};


// FIX: Added missing updateItemDetails function to resolve import error.
/**
 * Updates the details of an item after verifying ownership. Only allows changing tipo, marca, and modelo.
 */
export const updateItemDetails = async (itemId: string, userId: string, newData: { tipo: string; marca: string; modelo: string; }): Promise<void> => {
    try {
        const docRef = doc(db, "Items", itemId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error("Item not found.");
        }
        const itemData = docSnap.data() as Item;

        if (itemData.ownerId !== userId) {
            throw new Error("Permission denied.");
        }
        
        // Only update allowed fields
        await updateDoc(docRef, { 
            tipo: newData.tipo,
            marca: newData.marca,
            modelo: newData.modelo,
        });

    } catch (error) {
        const message = (error instanceof Error) ? error.message : String(error);
        console.error("Error updating item details:", message);
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
        const q = query(collection(db, "Items"), where("ownerId", "==", userId));
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
        const q = query(collection(db, "Items"), where("status", "in", [ItemStatus.Denunciado, ItemStatus.Recuperado]));
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

/**
 * (ACTUALIZADA) Creates a new transfer request in Firestore and returns it.
 */
export const createTransferRequest = async (item: Item, buyer: User): Promise<TransferRequest> => {
    if (!item.qrId || !item.ownerId) {
        throw new Error("Datos del item inválidos para la transferencia.");
    }

    // 1. Check for existing pending transfers for this item to avoid duplicates
    const transfersRef = collection(db, "Transfers");
    const q = query(transfersRef,
        where("itemId", "==", item.qrId),
        where("status", "==", TransferStatus.Pending)
    );
    const existingTransfers = await getDocs(q);
    if (!existingTransfers.empty) {
        throw new Error("Ya existe una solicitud de transferencia pendiente para este item.");
    }

    // 2. Create the new transfer request object
    const newTransferData: Omit<TransferRequest, 'id' | 'createdAt'> = {
        itemId: item.qrId,
        itemDetails: {
            tipo: item.tipo,
            marca: item.marca,
            modelo: item.modelo,
            identificador: item.identificador,
        },
        sellerId: item.ownerId,
        buyerId: buyer.uid,
        buyerEmail: buyer.email,
        status: TransferStatus.Pending,
    };

    // 3. Save to Firestore
    try {
        const docRef = await addDoc(collection(db, "Transfers"), {
            ...newTransferData,
            createdAt: serverTimestamp(),
        });
        
        // 4. Return the full TransferRequest object
        return {
            ...newTransferData,
            id: docRef.id,
            createdAt: Date.now(), // Return an estimated timestamp for immediate UI update
        };
    } catch (error) {
        const message = (error instanceof Error) ? error.message : String(error);
        console.error("Error creating transfer request:", message);
        throw new Error("No se pudo crear la solicitud de transferencia.");
    }
};

/**
 * (NUEVA) Obtiene la solicitud de transferencia más reciente para un item específico por parte de un comprador.
 */
export const getTransferRequestByItem = async (itemId: string, buyerId: string): Promise<TransferRequest | null> => {
  try {
    const transfersRef = collection(db, "Transfers");
    const q = query(
      transfersRef,
      where("itemId", "==", itemId),
      where("buyerId", "==", buyerId),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    const createdAtTimestamp = data.createdAt as Timestamp;
    return {
        id: doc.id,
        ...data,
        createdAt: createdAtTimestamp ? createdAtTimestamp.toMillis() : Date.now(),
    } as TransferRequest;
  } catch (error) {
    const message = (error instanceof Error) ? error.message : String(error);
    console.error("Error fetching transfer request by item:", message);
    throw new Error("Could not fetch transfer request.");
  }
};


/**
 * Fetches pending transfer requests for a seller.
 */
export const getPendingTransfers = async (sellerId: string): Promise<TransferRequest[]> => {
    try {
        const transfersRef = collection(db, "Transfers");
        const q = query(transfersRef, 
            where("sellerId", "==", sellerId),
            where("status", "==", TransferStatus.Pending),
            orderBy("createdAt", "desc") // Server-side sorting
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            const createdAtTimestamp = data.createdAt as Timestamp;
            return {
                id: doc.id,
                ...data,
                // Convert Firestore Timestamp to number for client-side use
                createdAt: createdAtTimestamp ? createdAtTimestamp.toMillis() : Date.now(),
            } as TransferRequest;
        });
    } catch (error) {
        const message = (error instanceof Error) ? error.message : String(error);
        console.error("Error fetching pending transfers:", message);
        throw new Error("Could not fetch pending transfers.");
    }
};

/**
 * (NUEVA-CORREGIDA) Aprueba una transferencia.
 * Transfiere la propiedad y genera un NUEVO shortId para el comprador,
 * invalidando el código alfanumérico del vendedor.
 */
export const approveTransfer = async (transferId: string, itemId: string, buyerId: string) => {
  const batch = writeBatch(db); // Usamos un batch para que todo falle o todo funcione

  // 1. Referencia al documento de Transferencia
  const transferRef = doc(db, "Transfers", transferId);
  batch.update(transferRef, { status: TransferStatus.Approved });

  // 2. Referencia al Item
  const itemRef = doc(db, "Items", itemId);
  
  // Generamos un nuevo código alfanumérico para el comprador.
  // El qrId (document ID) NO cambia.
  const newShortId = generateShortId(6);

  batch.update(itemRef, {
    ownerId: buyerId,           // Transfiere la propiedad
    status: ItemStatus.EnRegla, // Lo resetea a 'En Regla' para el nuevo dueño
    shortId: newShortId,        // Asigna nuevo código
    // Limpiamos los campos de denuncia/recuperación
    location: null,
    locationTimestamp: null,
    recoveryLocation: null,
    recoveryTimestamp: null,
  });

  // 3. Ejecuta la operación
  await batch.commit();
};

/**
 * Rejects a transfer request.
 */
export const rejectTransfer = async (transferId: string): Promise<void> => {
    try {
        const transferRef = doc(db, "Transfers", transferId);
        await updateDoc(transferRef, { status: TransferStatus.Rejected });
    } catch (error) {
        const message = (error instanceof Error) ? error.message : String(error);
        console.error("Error rejecting transfer:", message);
        throw new Error("Could not reject transfer.");
    }
};
