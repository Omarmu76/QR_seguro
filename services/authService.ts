
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged as onFirebaseAuthStateChanged,
  sendEmailVerification,
  updatePassword,
  sendPasswordResetEmail,
  User,
  updateProfile
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from '../firebaseConfig';

export const signUpWithEmail = async (nombre: string, email: string, password: string): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Guardar nombre en el perfil de Auth
    await updateProfile(user, { displayName: nombre });

    // Guardar información en Firestore (QR Seguro)
    await setDoc(doc(db, "Users", user.uid), {
      userId: user.uid,
      email: user.email,
      nombreCompleto: nombre,
    }, { merge: true });

    // ENVIAR VERIFICACIÓN AUTOMÁTICA
    await sendEmailVerification(user);

    // CERRAR SESIÓN para obligar re-ingreso verificado (Blindaje ComprAren)
    await signOut(auth);

    return user;
  } catch (error) {
    throw error;
  }
};

export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // LOGIN CON FILTRO DE VERIFICACIÓN (Solo para QR seguro)
    if (!user.emailVerified) {
      await signOut(auth);
      throw new Error("🔒 Debes verificar tu correo electrónico para acceder a QR Seguro.");
    }

    return user;
  } catch (error) {
    throw error;
  }
};

const provider = new GoogleAuthProvider();
export const signInWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    // Save user info to Firestore if they are new
    await setDoc(doc(db, "Users", user.uid), {
      userId: user.uid,
      email: user.email,
      nombreCompleto: user.displayName,
    }, { merge: true }); // Merge to avoid overwriting existing data
    return user;
  } catch (error) {
    const code = (error as any).code || 'UNKNOWN_GOOGLE_SIGNIN_ERROR';
    const message = (error instanceof Error) ? error.message : String(error);
    console.error(`Error signing in with Google: [${code}] ${message}`);
    throw error;
  }
};

export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    const code = (error as any).code || 'UNKNOWN_SIGNOUT_ERROR';
    const message = (error instanceof Error) ? error.message : String(error);
    console.error(`Error signing out: [${code}] ${message}`);
    throw error;
  }
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onFirebaseAuthStateChanged(auth, callback);
};

// --- NUEVAS FUNCIONES PARA PERFIL Y VERIFICACIÓN ---

export const sendVerificationEmail = async (user: User): Promise<void> => {
  try {
    await sendEmailVerification(user);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
};

export const updateUserPassword = async (user: User, newPass: string): Promise<void> => {
  try {
    await updatePassword(user, newPass);
  } catch (error) {
    console.error("Error updating password:", error);
    throw error;
  }
};

export const resetUserPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

export const updateUserProfileDisplayName = async (user: User, displayName: string): Promise<void> => {
  try {
    await updateProfile(user, { displayName });
    await setDoc(doc(db, "Users", user.uid), {
      nombreCompleto: displayName,
    }, { merge: true });
  } catch (error) {
    console.error("Error updating profile display name:", error);
    throw error;
  }
};

// --- HOOK DE COMPATIBILIDAD ---

export const useAuth = () => {
  return {
    loginWithGoogle: signInWithGoogle,
    // Agrega aquí más funciones si el diseño las requiere a futuro
  };
};
