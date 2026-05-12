import { db, auth } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
      badge.style.color = plan === 'pro' ? 'white' : '#1A1A2E';
    }
    
    // Actualizar estadísticas de pujas restantes en el perfil
    const bidsRemainingProfile = document.getElementById('bids-remaining');
    if (bidsRemainingProfile) {
      bidsRemainingProfile.innerText = plan === 'demo' ? (3 - bidsToday) : '∞ Ilimitado';
    }
    
    // Actualizar las tarjetas de estadísticas
    const bidsRemainingStats = document.getElementById('bids-remaining-stats');
    if (bidsRemainingStats) {
      bidsRemainingStats.innerText = plan === 'demo' ? (3 - bidsToday) : '∞';
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
  const container = document.getElementById('history-container');
  if (!container) return;
  
  try {
    // Intentar con orderBy (requiere índice)
    const q = query(
      collection(db, "bids"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc")
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      container.innerHTML = '<div class="card-rectangular">📭 No has hecho pujas aún. ¡Participa!</div>';
    } else {
      container.innerHTML = '';
      snapshot.forEach(doc => {
        const bid = doc.data();
        const date = bid.timestamp?.toDate() || new Date();
        container.innerHTML += `
          <div class="card-rectangular">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span><strong>💰 $${bid.amount}</strong></span>
              <span style="font-size: 12px; opacity: 0.7;">📅 ${date.toLocaleDateString()} ${date.toLocaleTimeString()}</span>
            </div>
          </div>
        `;
      });
    }
  } catch (error) {
    console.error("Error loading history with order:", error);
    
    // Si falla por el índice, intentar sin orderBy
    if (error.code === 'failed-precondition' || error.message?.includes('index')) {
      try {
        const q = query(
          collection(db, "bids"),
          where("userId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          container.innerHTML = '<div class="card-rectangular">📭 No has hecho pujas aún. ¡Participa!</div>';
        } else {
          // Ordenar manualmente
          const bids = [];
          snapshot.forEach(doc => {
            bids.push({ ...doc.data(), id: doc.id });
          });
          bids.sort((a, b) => {
            const dateA = a.timestamp?.toDate() || new Date(0);
            const dateB = b.timestamp?.toDate() || new Date(0);
            return dateB - dateA;
          });
          
          container.innerHTML = '';
          bids.forEach(bid => {
            const date = bid.timestamp?.toDate() || new Date();
            container.innerHTML += `
              <div class="card-rectangular">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span><strong>💰 $${bid.amount}</strong></span>
                  <span style="font-size: 12px; opacity: 0.7;">📅 ${date.toLocaleDateString()} ${date.toLocaleTimeString()}</span>
                </div>
              </div>
            `;
          });
          
          // Mostrar advertencia suave
          container.innerHTML += '<div class="card-rectangular" style="border-left-color: #FF9800; font-size: 12px;">⚠️ Sugerencia: Crea un índice en Firebase para mejor rendimiento</div>';
        }
      } catch (fallbackError) {
        console.error("Fallback error:", fallbackError);
        container.innerHTML = '<div class="card-rectangular" style="border-left-color: #E63946;">❌ Error cargando historial. Intenta recargar la página.</div>';
      }
    } else {
      container.innerHTML = '<div class="card-rectangular" style="border-left-color: #E63946;">❌ Error cargando historial. Intenta de nuevo.</div>';
    }
  }
}

// Función para actualizar las 3 tarjetas de estadísticas
export async function updateStatsCards(user) {
  try {
    // Contar pujas del usuario
    const bidsQuery = query(collection(db, "bids"), where("userId", "==", user.uid));
    const bidsSnap = await getDocs(bidsQuery);
    const totalBids = bidsSnap.size;
    
    // Obtener plan y pujas restantes
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data() || { plan: 'demo', bidsToday: 0 };
    const plan = userData.plan;
    const bidsToday = userData.bidsToday || 0;
    const remainingBids = plan === 'demo' ? Math.max(0, 3 - bidsToday) : '∞';
    
    // Contar subastas activas (no expiradas)
    const auctionsSnap = await getDocs(collection(db, "auctions"));
    let activeAuctions = 0;
    const now = new Date();
    auctionsSnap.forEach(doc => {
      const auction = doc.data();
      let endTime;
      try {
        endTime = auction.endTime?.toDate?.() || new Date(auction.endTime);
      } catch (e) {
        endTime = new Date(auction.endTime);
      }
      if (endTime > now) {
        activeAuctions++;
      }
    });
    
    // Actualizar UI
    const totalBidsEl = document.getElementById('total-bids');
    const remainingStatsEl = document.getElementById('bids-remaining-stats');
    const activeAuctionsEl = document.getElementById('active-auctions');
    const activeAuctionsCountEl = document.getElementById('active-auctions-count');
    
    if (totalBidsEl) totalBidsEl.textContent = totalBids;
    if (remainingStatsEl) remainingStatsEl.textContent = remainingBids;
    if (activeAuctionsEl) activeAuctionsEl.textContent = activeAuctions;
    if (activeAuctionsCountEl) activeAuctionsCountEl.textContent = activeAuctions;
    
    // Actualizar perfil
    const profileBidsEl = document.getElementById('profile-bids-count');
    if (profileBidsEl) profileBidsEl.textContent = totalBids;
    
    return { totalBids, remainingBids, activeAuctions };
  } catch (error) {
    console.error("Error updating stats cards:", error);
    return null;
  }
}
