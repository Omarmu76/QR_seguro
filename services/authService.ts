
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
    // Save user info to Firestore
    await setDoc(doc(db, "Users", user.uid), {
      userId: user.uid,
      email: user.email,
      nombreCompleto: nombre,
    });
    return user;
  } catch (error) {
    const code = (error as any).code || 'UNKNOWN_SIGNUP_ERROR';
    const message = (error instanceof Error) ? error.message : String(error);
    console.error(`Error signing up: [${code}] ${message}`);
    throw error;
  }
};

export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    const code = (error as any).code || 'UNKNOWN_SIGNIN_ERROR';
    const message = (error instanceof Error) ? error.message : String(error);
    console.error(`Error signing in: [${code}] ${message}`);
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
