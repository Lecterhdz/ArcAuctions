import { auth, db } from './firebase-config.js';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function loginUser(email, password) {
  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserProfile(userCred.user);
    return userCred.user;
  } catch (error) {
    let mensaje = "Error: ";
    switch (error.code) {
      case 'auth/invalid-email': mensaje += "Email inválido"; break;
      case 'auth/user-disabled': mensaje += "Usuario deshabilitado"; break;
      case 'auth/user-not-found': mensaje += "Usuario no encontrado"; break;
      case 'auth/wrong-password': mensaje += "Contraseña incorrecta"; break;
      default: mensaje += error.message;
    }
    alert(mensaje);
    return null;
  }
}

async function ensureUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      plan: 'demo',
      bidsToday: 0,
      lastBidReset: serverTimestamp(),
      createdAt: serverTimestamp()
    });
    console.log("✅ Perfil creado para:", user.email);
  }
}

export async function initAuth() {
  const form = document.getElementById('login-form');
  const demoBtn = document.getElementById('demo-btn');
  
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const pass = document.getElementById('password').value;
      const user = await loginUser(email, pass);
      if (user) window.location.href = '/ArcAuctions/dashboard.html';
    };
  }
  
  if (demoBtn) {
    demoBtn.onclick = async () => {
      const demoUser = await loginUser("demo@arcauctions.com", "123456");
      if (demoUser) window.location.href = '/ArcAuctions/dashboard.html';
    };
  }
}

// ✅ FUNCIÓN EXPORTADA para verificar autenticación
export async function checkAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = '/ArcAuctions/';
        resolve(null);
      } else {
        resolve(user);
      }
    });
  });
}

export async function logout() {
  await signOut(auth);
  window.location.href = '/ArcAuctions/';
}

export function getCurrentUser() {
  return auth.currentUser;
}
