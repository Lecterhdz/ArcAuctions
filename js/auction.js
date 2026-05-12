import { db } from './firebase-config.js';
import { collection, query, addDoc, updateDoc, deleteDoc, doc, onSnapshot, orderBy, limit, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Variable para almacenar timers
const timers = {};

// Función para contar subastas activas
export function listenActiveAuctionsCount(callback) {
  const q = query(collection(db, "auctions"));
  
  return onSnapshot(q, (snapshot) => {
    let activeCount = 0;
    const now = new Date();
    snapshot.forEach(docSnap => {
      const auction = docSnap.data();
      let endTime;
      try {
        endTime = auction.endTime?.toDate?.() || new Date(auction.endTime);
      } catch (e) {
        endTime = new Date(auction.endTime);
      }
      // Solo contar si no ha expirado
      if (endTime > now) {
        activeCount++;
      }
    });
    callback(activeCount);
  });
}

export async function loadAuctions(user) {
  const container = document.getElementById('auctions-container');
  if (!container) return;
  
  container.innerHTML = '<div class="skeleton">🔄 Cargando subastas...</div>';
  
  const q = query(collection(db, "auctions"), orderBy("endTime", "asc"), limit(20));
  
  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      container.innerHTML = '<div class="card-rectangular">📭 No hay subastas activas</div>';
      return;
    }
    
    container.innerHTML = '';
    snapshot.forEach(docSnap => {
      const auction = { id: docSnap.id, ...docSnap.data() };
      container.appendChild(createAuctionCard(auction, user));
    });
  });
}

function createAuctionCard(auction, user) {
  const card = document.createElement('div');
  card.className = 'card-rectangular auction-card';
  card.id = `auction-${auction.id}`;
  
  let endTime;
  try {
    endTime = auction.endTime?.toDate?.() || new Date(auction.endTime);
  } catch (e) {
    endTime = new Date(auction.endTime);
  }
  
  const isExpired = endTime < new Date();
  
  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: start;">
      <h3 style="margin: 0; font-size: 18px;">${auction.title || 'Subasta ARC'}</h3>
      <span class="seller-badge">🏷️ ${auction.seller || 'Stark'}</span>
    </div>
    <div class="auction-price" style="font-size: 28px; font-weight: 800; margin: 10px 0;">
      $${auction.currentPrice || 0}
    </div>
    <div style="display: flex; justify-content: space-between; margin: 10px 0;">
      <span>⏳ <span id="timer-${auction.id}" class="auction-timer ${isExpired ? 'timer-expired' : ''}">
        ${isExpired ? '🔴 FINALIZADA' : '--:--:--'}
      </span></span>
      <span>📊 ${auction.bidsCount || 0} pujas</span>
    </div>
    <div id="last-bidder-${auction.id}" style="font-size: 12px; opacity: 0.7; margin-bottom: 10px;">
      ${auction.lastBidder ? `Última puja: ${auction.lastBidder.split('@')[0]}` : 'Sin pujas aún'}
    </div>
    <button class="btn-rounded bid-button" id="bid-${auction.id}" ${isExpired ? 'disabled style="opacity:0.5;"' : ''}>
      ${isExpired ? '⛔ Finalizada' : '⚡ Pujar +$10'}
    </button>
  `;
  
  if (!isExpired && endTime > new Date()) {
    startTimer(auction.id, endTime);
  }
  
  setTimeout(() => {
    const btn = document.getElementById(`bid-${auction.id}`);
    if (btn && !isExpired) {
      btn.onclick = () => {
        window.placeBid(auction.id, auction.currentPrice);
      };
    }
  }, 0);
  
  return card;
}

function startTimer(auctionId, endTime) {
  if (timers[auctionId]) clearInterval(timers[auctionId]);
  
  function updateTimer() {
    const now = new Date();
    const diff = endTime - now;
    
    const timerSpan = document.getElementById(`timer-${auctionId}`);
    if (!timerSpan) return;
    
    if (diff <= 0) {
      timerSpan.innerHTML = '🔴 FINALIZADA';
      timerSpan.style.color = '#E63946';
      timerSpan.style.fontWeight = 'bold';
      
      const btn = document.getElementById(`bid-${auctionId}`);
      if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.innerHTML = '⛔ Subasta finalizada';
      }
      
      // Actualizar contador de subastas activas
      const event = new CustomEvent('auction-expired');
      window.dispatchEvent(event);
      
      if (timers[auctionId]) clearInterval(timers[auctionId]);
      return;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (3600000)) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    timerSpan.innerHTML = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Cambiar color si queda menos de 1 hora
    if (diff < 3600000) {
      timerSpan.style.color = '#FF6600';
      timerSpan.style.fontWeight = 'bold';
      timerSpan.classList.add('timer-warning');
    }
  }
  
  updateTimer();
  timers[auctionId] = setInterval(updateTimer, 1000);
}

export async function placeBid(user, auctionId, currentPrice) {
  try {
    const auctionRef = doc(db, "auctions", auctionId);
    const auctionSnap = await getDoc(auctionRef);
    
    if (!auctionSnap.exists()) {
      showToast('❌ Subasta no encontrada', 'error');
      return false;
    }
    
    const auction = auctionSnap.data();
    const endTime = auction.endTime?.toDate?.() || new Date(auction.endTime);
    
    if (endTime < new Date()) {
      showToast('🔴 Esta subasta ya finalizó', 'error');
      return false;
    }
    
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data() || { plan: 'demo', bidsToday: 0 };
    const plan = userData.plan;
    let bidsToday = userData.bidsToday || 0;
    
    if (plan === 'demo' && bidsToday >= 3) {
      showToast('⚠️ Límite DEMO alcanzado (3 pujas)', 'warning');
      return false;
    }
    
    const newPrice = (auction.currentPrice || currentPrice) + 10;
    const newBidsCount = (auction.bidsCount || 0) + 1;
    
    await updateDoc(auctionRef, {
      currentPrice: newPrice,
      lastBidder: user.email,
      lastBidTime: new Date(),
      bidsCount: newBidsCount
    });
    
    await addDoc(collection(db, "bids"), {
      auctionId: auctionId,
      userId: user.uid,
      email: user.email,
      amount: newPrice,
      timestamp: new Date()
    });
    
    if (plan === 'demo') {
      await updateDoc(userRef, { bidsToday: bidsToday + 1 });
    }
    
    showToast(`⚡ ¡Puja de $${newPrice} realizada!`, 'success');
    
    const btn = document.getElementById(`bid-${auctionId}`);
    if (btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = '✅ ¡Puja enviada!';
      btn.disabled = true;
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 2000);
    }
    
    return true;
    
  } catch (error) {
    console.error("Error placing bid:", error);
    showToast('❌ Error al realizar la puja', 'error');
    return false;
  }
}

// ========== FUNCIONES DE ADMINISTRACIÓN ==========
export async function addAuction(auctionData) {
  try {
    await addDoc(collection(db, "auctions"), {
      title: auctionData.title,
      currentPrice: auctionData.currentPrice,
      endTime: new Date(auctionData.endTime),
      seller: auctionData.seller || "Stark Industries",
      bidsCount: 0,
      createdAt: new Date()
    });
    showToast(`✅ Subasta "${auctionData.title}" creada`, 'success');
    return true;
  } catch (error) {
    console.error("Error adding auction:", error);
    showToast('❌ Error al crear la subasta', 'error');
    return false;
  }
}

export async function updateAuction(auctionId, auctionData) {
  try {
    const auctionRef = doc(db, "auctions", auctionId);
    await updateDoc(auctionRef, {
      title: auctionData.title,
      currentPrice: auctionData.currentPrice,
      endTime: new Date(auctionData.endTime),
      seller: auctionData.seller || "Stark Industries"
    });
    showToast(`✏️ Subasta "${auctionData.title}" actualizada`, 'success');
    return true;
  } catch (error) {
    console.error("Error updating auction:", error);
    showToast('❌ Error al actualizar la subasta', 'error');
    return false;
  }
}

export async function deleteAuction(auctionId) {
  if (!confirm('¿Estás seguro de eliminar esta subasta?')) return false;
  
  try {
    const auctionRef = doc(db, "auctions", auctionId);
    await deleteDoc(auctionRef);
    showToast(`🗑️ Subasta eliminada`, 'success');
    return true;
  } catch (error) {
    console.error("Error deleting auction:", error);
    showToast('❌ Error al eliminar la subasta', 'error');
    return false;
  }
}

export async function getAllAuctions() {
  const q = query(collection(db, "auctions"), orderBy("endTime", "asc"));
  const snapshot = await getDocs(q);
  const auctions = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    auctions.push({ 
      id: doc.id, 
      ...data,
      endTime: data.endTime
    });
  });
  return auctions;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
