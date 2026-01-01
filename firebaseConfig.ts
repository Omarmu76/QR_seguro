// 1. IMPORTACIONES MODERNAS (MODULARES)
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// 2. TUS LLAVES DE ACCESO (CONFIGURACIÓN)
const firebaseConfig = {
  apiKey: "AIzaSyCDfuS3pO2xAf4yfjfFN-0MuZRq6pVjcrk",
  authDomain: "qrseguro-106ba.firebaseapp.com",
  projectId: "qrseguro-106ba",
  storageBucket: "qrseguro-106ba.appspot.com",
  messagingSenderId: "953476288560",
  appId: "1:953476288560:web:754b1888d2e7469210ddf5"
};

// 3. INICIALIZACIÓN
const app = initializeApp(firebaseConfig);

// 4. EXPORTACIÓN DE HERRAMIENTAS
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
