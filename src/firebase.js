// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // TAMBAHAN

const firebaseConfig = {
  // ... (PASTE KONFIGURASI FIREBASE ANDA DI SINI SEPERTI BIASA)
  apiKey: "AIzaSyAlUMAyfdogcEeONF2wXkS8DDXJOYmFRnA",
  authDomain: "takziran.firebaseapp.com",
  projectId: "takziran",
  storageBucket: "takziran.firebasestorage.app",
  messagingSenderId: "631652028292",
  appId: "1:631652028292:web:012460490c44ea65db17d1"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); // TAMBAHAN
export const googleProvider = new GoogleAuthProvider(); // TAMBAHAN