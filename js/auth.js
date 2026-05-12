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
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuración de licencias
const LICENSE_CONFIG = {
  demo: { maxBids: 3, duration: null, canCreateAuctions: false },
  pro: { maxBids: Infinity, duration: 30, canCreateAuctions: false }, // 30 días
  admin: { maxBids: Infinity, duration: null, canCreateAuctions: true }
};

// Login con verificación de licencia
export async function loginUser(email, password) {
  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const isValid = await checkLicenseStatus(userCred.user);
    
    if (!isValid) {
      await signOut(auth);
      alert("⚠️ Tu licencia ha expirado o está inactiva. Contacta con soporte.");
      return null;
    }
    
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

// Verificar estado de la licencia
export async function checkLicenseStatus(user) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) return true; // Usuario nuevo, se creará con demo
  
  const userData = userSnap.data();
  const licenseStatus = userData.licenseStatus || 'active';
  const licenseExpiry = userData.licenseExpiry?.toDate?.() || userData.licenseExpiry;
  
  if (licenseStatus === 'blocked') return false;
  
  if (licenseExpiry && licenseExpiry < new Date()) {
    // Licencia expirada
    await updateDoc(userRef, { licenseStatus: 'expired' });
    return false;
  }
  
  return true;
}

// Crear/actualizar perfil con licencia
async function ensureUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    // Usuario nuevo - asignar licencia DEMO
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // 7 días de prueba
    
    await setDoc(userRef, {
      email: user.email,
      role: 'demo',
      licenseType: 'demo',
      licenseStatus: 'active',
      licenseExpiry: expiryDate,
      bidsToday: 0,
      totalBids: 0,
      createdAt: serverTimestamp()
    });
    console.log("✅ Licencia DEMO creada para:", user.email);
  }
}

// Agregar esta función en js/auth.js
export async function getUserLicense(user) {
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return { type: 'demo', status: 'active', expiry: null, maxBids: 3, canCreateAuctions: false };
    }
    
    const data = userSnap.data();
    const LICENSE_CONFIG = {
      demo: { maxBids: 3, canCreateAuctions: false },
      pro: { maxBids: Infinity, canCreateAuctions: false },
      admin: { maxBids: Infinity, canCreateAuctions: true }
    };
    
    return {
      type: data.role || 'demo',
      status: data.licenseStatus || 'active',
      expiry: data.licenseExpiry?.toDate?.() || data.licenseExpiry,
      maxBids: LICENSE_CONFIG[data.role || 'demo']?.maxBids || 3,
      canCreateAuctions: LICENSE_CONFIG[data.role || 'demo']?.canCreateAuctions || false
    };
  } catch (error) {
    console.error("Error getting user license:", error);
    return { type: 'demo', status: 'active', expiry: null, maxBids: 3, canCreateAuctions: false };
  }
}

export async function canCreateAuctions(user) {
  const license = await getUserLicense(user);
  return license.canCreateAuctions === true;
}

// Activar licencia PRO (para admin, o por pago)
export async function activateProLicense(user, durationDays = 30) {
  try {
    const userRef = doc(db, "users", user.uid);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + durationDays);
    
    await updateDoc(userRef, {
      role: 'pro',
      licenseType: 'pro',
      licenseStatus: 'active',
      licenseExpiry: expiryDate,
      upgradedAt: serverTimestamp()
    });
    
    return { success: true, expiry: expiryDate };
  } catch (error) {
    console.error("Error activating pro license:", error);
    return { success: false, error: error.message };
  }
}

// Bloquear usuario (admin)
export async function blockUser(userId, reason = '') {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      licenseStatus: 'blocked',
      blockReason: reason,
      blockedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error("Error blocking user:", error);
    return { success: false };
  }
}

// Verificar si el usuario puede crear subastas
export async function canCreateAuctions(user) {
  const license = await getUserLicense(user);
  return license?.canCreateAuctions === true;
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

export async function checkAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = '/ArcAuctions/';
        resolve(null);
      } else {
        const isValid = await checkLicenseStatus(user);
        if (!isValid) {
          await signOut(auth);
          alert("⚠️ Licencia expirada o bloqueada");
          window.location.href = '/ArcAuctions/';
          resolve(null);
        }
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
