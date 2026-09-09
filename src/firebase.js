import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDQP739dg32HEZ_RbkmaRGxgMtsS7LHpIM",
  authDomain: "simulador-de-nota-fiscal.firebaseapp.com",
  projectId: "simulador-de-nota-fiscal",
  storageBucket: "simulador-de-nota-fiscal.firebasestorage.app",
  messagingSenderId: "604957784302",
  appId: "1:604957784302:web:3ba10390a7d792433d9bff",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
