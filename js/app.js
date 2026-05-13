import { db, auth } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function loadUserProfile(user) {
  try {
    const userRef = doc(db, "users", user.uid);
    let userSnap = await getDoc(userRef);
    
    // Si no existe perfil, crearlo
    if (!userSnap.exists()) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7); // 7 días de demo
      
      await setDoc(userRef, {
        email: user.email,
        role: 'demo',
        licenseType: 'demo',
        licenseStatus: 'active',
        licenseExpiry: expiryDate,
        bidsToday: 0,
        totalBids: 0,
        createdAt: new Date()
      });
      userSnap = await getDoc(userRef);
    }
    
    const userData = userSnap.data();
    const role = userData.role || 'demo';
    const licenseType = userData.licenseType || 'demo';
    const licenseExpiry = userData.licenseExpiry?.toDate?.() || userData.licenseExpiry;
    const bidsToday = userData.bidsToday || 0;
    
    // Determinar texto a mostrar según rol
    let displayPlan = '';
    let badgeColor = '';
    
    switch (role) {
      case 'admin':
        displayPlan = '👑 ADMIN';
        badgeColor = '#9C27B0';
        break;
      case 'pro':
        displayPlan = '⭐ PRO';
        badgeColor = '#00C853';
        break;
      default:
        displayPlan = '🎮 DEMO';
        badgeColor = '#FFD700';
    }
    
    // Calcular pujas restantes
    const remainingBids = role === 'demo' ? Math.max(0, 3 - bidsToday) : '∞';
    
    // Actualizar UI
    const elements = {
      'user-email': user.email,
      'profile-email': user.email,
      'profile-plan': displayPlan,
      'plan-badge': displayPlan,
      'bids-remaining': role === 'demo' ? `${remainingBids} / 3 pujas` : 'Ilimitadas',
      'bids-remaining-stats': remainingBids,
      'license-expiry': licenseExpiry ? licenseExpiry.toLocaleDateString() : 'Ilimitada'
    };
    
    for (const [id, value] of Object.entries(elements)) {
      const el = document.getElementById(id);
      if (el) el.innerText = value;
    }
    
    // Cambiar color del badge según rol
    const badge = document.getElementById('plan-badge');
    if (badge) {
      badge.style.background = badgeColor;
      badge.style.color = role === 'demo' ? '#1A1A2E' : 'white';
    }
    
    // Ocultar/mostrar botón de upgrade según rol
    const upgradeBtn = document.getElementById('upgrade-pro');
    if (upgradeBtn) {
      if (role === 'admin') {
        upgradeBtn.style.display = 'none';
      } else if (role === 'pro') {
        upgradeBtn.textContent = '🔄 Renovar PRO (30 días)';
      } else {
        upgradeBtn.textContent = '🚀 Upgrade a PRO (30 días)';
      }
    }
    
    return { role, bidsToday, remainingBids, licenseExpiry };
  } catch (error) {
    console.error("Error loading profile:", error);
    return { role: 'demo', bidsToday: 0, remainingBids: 3 };
  }
}

export async function upgradeToPro(user) {
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const currentRole = userSnap.data()?.role || 'demo';
    
    // Si ya es admin, no puede upgradear
    if (currentRole === 'admin') {
      alert("👑 Los usuarios ADMIN no necesitan upgrade.");
      return false;
    }
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 días
    
    await updateDoc(userRef, {
      role: 'pro',
      licenseType: 'pro',
      licenseStatus: 'active',
      licenseExpiry: expiryDate,
      upgradedAt: new Date()
    });
    
    alert("✅ Modo PRO activado por 30 días. ¡Pujas ilimitadas!");
    location.reload();
    return true;
  } catch (error) {
    console.error("Error upgrading:", error);
    alert("❌ Error al activar PRO. Intenta de nuevo.");
    return false;
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
    
    // Obtener rol y pujas restantes
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data() || { role: 'demo', bidsToday: 0 };
    const role = userData.role || 'demo';
    const bidsToday = userData.bidsToday || 0;
    const remainingBids = role === 'demo' ? Math.max(0, 3 - bidsToday) : '∞';
    
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
