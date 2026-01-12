import {
    collection, doc, setDoc, deleteDoc, onSnapshot,
    query, getDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Tipos de datos para el sistema de seguridad
export interface SentryNode {
    userId: string;
    lat: number;
    lng: number;
    status: 'ARMED' | 'ALARM' | 'RESCUE'; // Agregamos 'RESCUE' (Modo Persecución)
    timestamp: number;
    groupCode?: string; // Código de Vigila2 (si es null, es individual)
}

// Estructura del "Círculo Fijo"
export interface SentryGroup {
    pin: string;
    anchorLat: number;
    anchorLng: number;
    createdAt: any;
    activeMembers: number;
}

// --- GESTIÓN DE ESTADO INDIVIDUAL ---

export const updateMySentryStatus = async (
    userId: string,
    lat: number,
    lng: number,
    status: 'ARMED' | 'ALARM' | 'RESCUE',
    groupCode?: string
): Promise<void> => {
    try {
        const sentryRef = doc(db, "sentries", userId);
        await setDoc(sentryRef, {
            userId,
            lat,
            lng,
            status,
            groupCode: groupCode || null, // Guardamos el código si existe
            timestamp: Date.now()
        }, { merge: true });
    } catch (error) {
        console.error("Error updating sentry status:", error);
    }
};

export const removeMySentryStatus = async (userId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, "sentries", userId));
    } catch (error) {
        console.error("Error removing sentry status:", error);
    }
};

// --- GESTIÓN DE GRUPOS VIGILA2 (NUEVO) ---

// Esta función intenta crear el grupo. Si ya existe, devuelve el ancla existente.
// Si no existe, crea uno nuevo con la posición del usuario (El Líder).
export const joinOrCreateVigila2Group = async (pin: string, myLat: number, myLng: number): Promise<{ lat: number, lng: number }> => {
    try {
        const groupRef = doc(db, "SentryGroups", pin);
        const groupSnap = await getDoc(groupRef);

        if (groupSnap.exists()) {
            // El grupo ya existe: Devolvemos el ancla fija original (NO la del usuario actual)
            const data = groupSnap.data() as SentryGroup;
            return { lat: data.anchorLat, lng: data.anchorLng };
        } else {
            // El grupo es nuevo: Tú eres el Líder inicial. Tu posición fija el ancla.
            await setDoc(groupRef, {
                pin,
                anchorLat: myLat,
                anchorLng: myLng,
                createdAt: serverTimestamp(),
                activeMembers: 1
            });
            return { lat: myLat, lng: myLng };
        }
    } catch (error) {
        console.error("Error joining group:", error);
        throw error;
    }
};

// Limpieza de grupos vacíos (Opcional, se puede llamar al salir)
export const leaveVigila2Group = async (_pin: string) => {
    // Lógica futura: reducir contador de miembros y borrar si es 0
    // Por ahora mantenemos el ancla activa para simplicidad
};

// --- SUSCRIPCIONES (LISTENERS) ---

export const subscribeToActiveSentries = (callback: (sentries: SentryNode[]) => void) => {
    const q = query(collection(db, "sentries"));

    // Escuchamos cambios en tiempo real
    return onSnapshot(q, (snapshot) => {
        const sentries: SentryNode[] = [];
        snapshot.forEach((doc) => {
            // Filtramos datos viejos (más de 5 min sin señal) para limpiar fantasmas
            const data = doc.data() as SentryNode;
            if (Date.now() - data.timestamp < 300000) {
                sentries.push(data);
            }
        });
        callback(sentries);
    });
};

