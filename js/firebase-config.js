// Configuración de Firebase (REEMPLAZA CON TUS DATOS)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC43NWWCailgWjJrtaOKG5og1w8q47eRkU",
  authDomain: "arcauctions-69c8c.firebaseapp.com",
  projectId: "arcauctions-69c8c",
  storageBucket: "arcauctions-69c8c.firebasestorage.app",
  messagingSenderId: "598785052209",
  appId: "1:598785052209:web:1dc58922d99aef77c10f10"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
