import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function loginUser(email, password) {
  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    return userCred.user;
  } catch (error) {
    alert("Error: " + error.message);
    return null;
  }
}

export async function initAuth() {
  const form = document.getElementById('login-form');
  const demoBtn = document.getElementById('demo-btn');
  
  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const user = await loginUser(email, pass);
    if (user) window.location.href = './dashboard.html';
  };
  
  demoBtn.onclick = async () => {
    const demoUser = await loginUser("demo@stark.com", "123456");
    if (demoUser) window.location.href = './dashboard.html';
  };
}

export async function checkAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = '/';
        resolve(null);
      }
      resolve(user);
    });
  });
}

export async function logout() {
  await signOut(auth);
  window.location.href = '/';
}
