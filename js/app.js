import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function loadUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  let plan = 'demo';
  let bidsToday = 0;
  
  if (userSnap.exists()) {
    plan = userSnap.data().plan;
    bidsToday = userSnap.data().bidsToday || 0;
  } else {
    await setDoc(userRef, { email: user.email, plan: 'demo', bidsToday: 0, createdAt: new Date() });
  }
  
  document.getElementById('user-email').innerText = user.email;
  document.getElementById('profile-email').innerText = user.email;
  document.getElementById('profile-plan').innerText = plan.toUpperCase();
  document.getElementById('plan-badge').innerText = plan.toUpperCase();
  document.getElementById('bids-remaining').innerText = plan === 'demo' ? (3 - bidsToday) : 'Ilimitado';
}

export async function upgradeToPro(user) {
  const userRef = doc(db, "users", user.uid);
  await updateDoc(userRef, { plan: 'pro', proExpires: new Date(Date.now() + 86400000) }); // 24h demo PRO
  alert("✅ Modo PRO activado por 24 horas. ¡Pujas ilimitadas!");
  location.reload();
}

export async function loadBidHistory(user) {
  const q = query(collection(db, "bids"), where("userId", "==", user.uid));
  const snapshot = await getDocs(q);
  const container = document.getElementById('history-container');
  container.innerHTML = '';
  snapshot.forEach(doc => {
    const bid = doc.data();
    container.innerHTML += `<div class="card-rectangular">💰 Pujaste $${bid.amount} - ${new Date(bid.timestamp).toLocaleString()}</div>`;
  });
}
