// FIX: Use the compat library for initialization to support older Firebase SDK versions,
// while still exporting v9 modular services for the rest of the app to use.
import firebase from "firebase/compat/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCDfuS3pO2xAf4yfjfFN-0MuZRq6pVjcrk",
  authDomain: "qrseguro-106ba.firebaseapp.com",
  projectId: "qrseguro-106ba",
  storageBucket: "qrseguro-106ba.appspot.com",
  messagingSenderId: "953476288560",
  appId: "1:953476288560:web:754b1888d2e7469210ddf5"
};

// Initialize Firebase using the compat API
firebase.initializeApp(firebaseConfig);

// Get a Firestore instance using the modular API. It will use the default app.
export const db = getFirestore();

// Get an Auth instance using the modular API. It will use the default app.
export const auth = getAuth();
