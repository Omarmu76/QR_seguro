
import { initializeApp } from "firebase/app";
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a Firestore instance
export const db = getFirestore(app);

// Get an Auth instance
export const auth = getAuth(app);
