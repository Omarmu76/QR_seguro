📂 BACKUP: QRseguro - Versión Funcional(Transferencias + Google Auth)
Fecha del Respaldo: 17 de Diciembre de 2025 Origen: Carpeta "para Gemini x Transf" Estado: ✅ Funcional(Referencia para restauración)

Nota: Este código contiene la lógica probada donde las transferencias aparecían correctamente en el panel del usuario y el Login de Google funcionaba sin errores.

1. 🧠 Lógica de Transferencias(El Corazón del Sistema)
📄 services / itemService.ts
Punto Clave: Aquí está la función approveTransfer que realiza el "pase de mando" del artículo(cambia el ownerId) y regenera el QR(shortId) por seguridad.También se ve la consulta getPendingTransfers que filtra correctamente por vendedor.

    TypeScript

import {
    collection, addDoc, getDoc, getDocs, query, where, doc, deleteDoc, updateDoc,
    writeBatch, serverTimestamp, orderBy, Timestamp
} from "firebase/firestore";
import { User } from 'firebase/auth';
import { db } from "../firebaseConfig";
import { Item, ItemStatus, TransferRequest, TransferStatus, PaymentStatus } from '../types';

// ... (Otras funciones de creación y lectura de items) ...

// --- TRANSFERENCIAS (LÓGICA CORREGIDA Y FUNCIONAL) ---

export const createTransferRequest = async (item: Item, buyer: User): Promise<TransferRequest> => {
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
        // NOTA: Si esto falla, verificar índices en Firebase Console (sellerId + status + createdAt)
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

/**
 * APRUEBA TRANSFERENCIA Y BLOQUEA EL ITEM
 * 1. Cambia dueño (ownerId).
 * 2. Genera QR nuevo (shortId) para que el código viejo deje de servir.
 * 3. Pone paymentStatus = PENDING (Bloqueo de servicio hasta que el nuevo dueño pague).
 */
export const approveTransfer = async (transferId: string, itemId: string, buyerId: string) => {
    const batch = writeBatch(db);

    // 1. Actualizar estado de la solicitud
    const transferRef = doc(db, "Transfers", transferId);
    batch.update(transferRef, { status: TransferStatus.Approved });

    // 2. Mover el artículo al nuevo dueño
    const itemRef = doc(db, "Items", itemId);
    const newShortId = generateShortId(6); // Nuevo QR para seguridad

    batch.update(itemRef, {
        ownerId: buyerId,
        status: ItemStatus.EnRegla,
        shortId: newShortId,
        paymentStatus: PaymentStatus.Pending, // <--- EL CANDADO DE NEGOCIO
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
2. 🔐 Autenticación(Google Login)
📄 services / authService.ts
Punto Clave: Esta versión usa signInWithPopup y guarda correctamente los datos del usuario en la colección Users usando merge: true para no borrar datos si el usuario ya existía.

    TypeScript

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged as onFirebaseAuthStateChanged,
    User
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from '../firebaseConfig';

export const signUpWithEmail = async (nombre: string, email: string, password: string): Promise<User> => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await setDoc(doc(db, "Users", user.uid), {
            userId: user.uid,
            email: user.email,
            nombreCompleto: nombre,
        });
        return user;
    } catch (error) {
        throw error;
    }
};

export const signInWithEmail = async (email: string, password: string): Promise<User> => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        throw error;
    }
};

// --- LOGIN CON GOOGLE FUNCIONAL ---
const provider = new GoogleAuthProvider();

export const signInWithGoogle = async (): Promise<User> => {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Guardar o actualizar usuario en Firestore
        await setDoc(doc(db, "Users", user.uid), {
            userId: user.uid,
            email: user.email,
            nombreCompleto: user.displayName,
        }, { merge: true }); // Merge es vital para no sobrescribir si ya existe

        return user;
    } catch (error) {
        console.error("Error signing in with Google:", error);
        throw error;
    }
};

export const signOutUser = async (): Promise<void> => {
    try {
        await signOut(auth);
    } catch (error) {
        throw error;
    }
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
    return onFirebaseAuthStateChanged(auth, callback);
};
3. 🤝 Pantalla de Gestión(UI)
📄 screens / TransfersScreen.tsx
Punto Clave: Esta pantalla consume las funciones de arriba.Observa cómo maneja los estados received y sent.

    TypeScript

import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { TransferRequest, TransferStatus } from '../types';
import { getPendingTransfers, getSentTransfers, approveTransfer, rejectTransfer, cancelTransfer } from '../services/itemService';
import Spinner from '../components/Spinner';

interface TransfersScreenProps {
    user: User;
    onMenuClick: () => void;
    onScanRequest: () => void;
    onInputCodeRequest: () => void;
}

const TransfersScreen: React.FC<TransfersScreenProps> = ({ user, onMenuClick, onScanRequest, onInputCodeRequest }) => {
    const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
    const [receivedRequests, setReceivedRequests] = useState<TransferRequest[]>([]);
    const [sentRequests, setSentRequests] = useState<TransferRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const [rec, sent] = await Promise.all([
                getPendingTransfers(user.uid),
                getSentTransfers(user.uid)
            ]);
            setReceivedRequests(rec);
            setSentRequests(sent);
        } catch (error) {
            console.error("Error cargando transferencias:", error);
        } finally {
            setLoading(false);
        }
    }, [user.uid]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleApprove = async (req: TransferRequest) => {
        if (!window.confirm("¿Confirmas que recibiste el pago y deseas transferir la propiedad?")) return;
        setProcessingId(req.id);
        try {
            await approveTransfer(req.id, req.itemId, req.buyerId);
            await fetchRequests();
            alert("¡Transferencia exitosa!");
        } catch (e) {
            alert("Error al aprobar.");
        } finally {
            setProcessingId(null);
        }
    };

    // ... (Resto de funciones handleReject, handleCancel iguales a versiones previas)

    return (
        <div className= "flex flex-col h-full bg-[#0d1226] text-white" >
        {/* ... Header y Tabs ... */ }

        < div className = "flex-grow overflow-y-auto p-4" >
        {
            loading?(
          <div className = "flex justify-center mt-10" > <Spinner /></div >
        ): activeTab === 'received' ? (
            // Renderizado de lista de recibidos
            receivedRequests.length === 0 ? <p className= "text-center text-gray-500" > Sin solicitudes.</p> :
    receivedRequests.map(req => (
        <div key= { req.id } className = "bg-[#1e2a47] p-4 rounded-xl border border-gray-700 mb-4" >
        {/* ... Detalles del item ... */ }
        < button onClick = {() => handleApprove(req)} disabled = {!!processingId} className = "bg-green-600 text-white py-2 px-4 rounded" >
            CONFIRMAR PAGO
                </button>
                </div>
             ))
        ) : (
    // Renderizado de lista de enviados
    sentRequests.length === 0 ? <p className= "text-center text-gray-500" > No has enviado solicitudes.</p> :
sentRequests.map(req => (
    <div key= { req.id } className = "bg-[#1e2a47] p-4 rounded-xl border border-gray-700 mb-4 opacity-80" >
    {/* ... Detalles ... */ }
    < span className = "text-yellow-400" > { req.status } </span>
    </div>
))
        )}
</div>
    </div>
  );
};

export default TransfersScreen;