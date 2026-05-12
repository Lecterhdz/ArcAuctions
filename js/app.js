import { db, auth } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function loadUserProfile(user) {
  try {
    const userRef = doc(db, "users", user.uid);
    let userSnap = await getDoc(userRef);
    
    // Si no existe perfil, crearlo
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        plan: 'demo',
        bidsToday: 0,
        createdAt: new Date()
      });
      userSnap = await getDoc(userRef);
    }
    
    const userData = userSnap.data();
    const plan = userData.plan || 'demo';
    const bidsToday = userData.bidsToday || 0;
    
    // Actualizar UI
    const elements = {
      'user-email': user.email,
      'profile-email': user.email,
      'profile-plan': plan.toUpperCase(),
      'plan-badge': plan.toUpperCase(),
      'bids-remaining': plan === 'demo' ? (3 - bidsToday) : '∞ Ilimitado'
    };
    
    for (const [id, value] of Object.entries(elements)) {
      const el = document.getElementById(id);
      if (el) el.innerText = value;
    }
    
    // Cambiar color del badge según plan
    const badge = document.getElementById('plan-badge');
    if (badge) {
      badge.style.background = plan === 'pro' ? '#00C853' : '#FFD700';
    }
    
    return { plan, bidsToday };
  } catch (error) {
    console.error("Error loading profile:", error);
    return { plan: 'demo', bidsToday: 0 };
  }
}

export async function upgradeToPro(user) {
  try {
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      plan: 'pro',
      proExpires: new Date(Date.now() + 86400000),
      upgradedAt: new Date()
    });
    alert("✅ Modo PRO activado por 24 horas. ¡Pujas ilimitadas!");
    location.reload();
  } catch (error) {
    console.error("Error upgrading:", error);
    alert("❌ Error al activar PRO. Intenta de nuevo.");
  }
}

export async function loadBidHistory(user) {
  try {
    const q = query(
      collection(db, "bids"),
      where("userId", "==", user.uid),
      where("amount", ">", 0)
    );
    const snapshot = await getDocs(q);
    const container = document.getElementById('history-container');
    
    if (container) {
      if (snapshot.empty) {
        container.innerHTML = '<div class="card-rectangular">📭 No has hecho pujas aún. ¡Participa!</div>';
      } else {
        container.innerHTML = '';
        const bids = [];
        snapshot.forEach(doc => {
          bids.push(doc.data());
        });
        // Ordenar por timestamp descendente
        bids.sort((a, b) => b.timestamp?.toDate() - a.timestamp?.toDate());
        
        bids.forEach(bid => {
          const date = bid.timestamp?.toDate() || new Date();
          container.innerHTML += `
            <div class="card-rectangular">
              <strong>💰 $${bid.amount}</strong> - 
              ${date.toLocaleDateString()} ${date.toLocaleTimeString()}
            </div>
          `;
        });
      }
    }
  } catch (error) {
    console.error("Error loading history:", error);
  }
}
