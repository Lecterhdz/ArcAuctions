import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function loadUserProfile(user) {
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    let plan = 'demo';
    let bidsToday = 0;
    
    if (userSnap.exists()) {
      plan = userSnap.data().plan;
      bidsToday = userSnap.data().bidsToday || 0;
    } else {
      await setDoc(userRef, { 
        email: user.email, 
        plan: 'demo', 
        bidsToday: 0, 
        createdAt: new Date() 
      });
    }
    
    const emailSpan = document.getElementById('user-email');
    const profileEmail = document.getElementById('profile-email');
    const profilePlan = document.getElementById('profile-plan');
    const planBadge = document.getElementById('plan-badge');
    const bidsRemaining = document.getElementById('bids-remaining');
    
    if (emailSpan) emailSpan.innerText = user.email;
    if (profileEmail) profileEmail.innerText = user.email;
    if (profilePlan) profilePlan.innerText = plan.toUpperCase();
    if (planBadge) planBadge.innerText = plan.toUpperCase();
    if (bidsRemaining) bidsRemaining.innerText = plan === 'demo' ? (3 - bidsToday) : 'Ilimitado';
    
  } catch (error) {
    console.error("Error loading profile:", error);
    // Mostrar algo en la UI para que el usuario sepa
    const profilePlan = document.getElementById('profile-plan');
    if (profilePlan) profilePlan.innerText = 'DEMO (error)';
  }
}

export async function upgradeToPro(user) {
  try {
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { 
      plan: 'pro', 
      proExpires: new Date(Date.now() + 86400000) // 24h
    });
    alert("✅ Modo PRO activado por 24 horas. ¡Pujas ilimitadas!");
    location.reload();
  } catch (error) {
    console.error("Error upgrading to PRO:", error);
    alert("Error al actualizar a PRO. Intenta de nuevo.");
  }
}

export async function loadBidHistory(user) {
  try {
    const q = query(collection(db, "bids"), where("userId", "==", user.uid));
    const snapshot = await getDocs(q);
    const container = document.getElementById('history-container');
    if (container) {
      container.innerHTML = '';
      snapshot.forEach(doc => {
        const bid = doc.data();
        container.innerHTML += `<div class="card-rectangular">💰 Pujaste $${bid.amount} - ${new Date(bid.timestamp).toLocaleString()}</div>`;
      });
      if (snapshot.empty) {
        container.innerHTML = '<div class="card-rectangular">📭 No has hecho pujas aún.</div>';
      }
    }
  } catch (error) {
    console.error("Error loading bid history:", error);
  }
}
