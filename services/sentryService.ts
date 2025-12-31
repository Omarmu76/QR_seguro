import { db } from '../firebaseConfig';
import { collection, doc, setDoc, onSnapshot, query, where, deleteDoc } from 'firebase/firestore';

export interface SentryNode {
    userId: string;
    lat: number;
    lng: number;
    status: 'ARMED' | 'ALARM';
    timestamp: number;
}

export const updateMySentryStatus = async (userId: string, lat: number, lng: number, status: 'ARMED' | 'ALARM') => {
    try {
        const sentryRef = doc(db, 'sentries', userId);
        await setDoc(sentryRef, {
            userId,
            lat,
            lng,
            status,
            timestamp: Date.now()
        }, { merge: true });
    } catch (error) {
        console.error("Error actualizando vigía:", error);
    }
};

export const removeMySentryStatus = async (userId: string) => {
    try {
        const sentryRef = doc(db, 'sentries', userId);
        await deleteDoc(sentryRef);
    } catch (error) {
        console.error("Error removiendo vigía:", error);
    }
};

export const subscribeToActiveSentries = (onUpdate: (sentries: SentryNode[]) => void) => {
    // Escuchar centinelas activos en los últimos 10 minutos
    const q = query(collection(db, 'sentries'), where('timestamp', '>', Date.now() - 600000));
    return onSnapshot(q, (snapshot) => {
        const sentries: SentryNode[] = [];
        snapshot.forEach(doc => sentries.push(doc.data() as SentryNode));
        onUpdate(sentries);
    });
};
