import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// TODO: cole aqui o firebaseConfig copiado do Console do Firebase
// (Configurações do projeto → Geral → Seus apps → objeto firebaseConfig)
const firebaseConfig = {
  apiKey: "TODO_API_KEY",
  authDomain: "TODO_PROJETO.firebaseapp.com",
  projectId: "TODO_PROJETO",
  storageBucket: "TODO_PROJETO.appspot.com",
  messagingSenderId: "TODO_SENDER_ID",
  appId: "TODO_APP_ID",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
