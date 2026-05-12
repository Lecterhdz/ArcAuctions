import { db } from './firebase-config.js';
import { collection, query, getDocs, addDoc, updateDoc, doc, onSnapshot, orderBy, limit, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Variable para almacenar timers
const timers = {};

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
  
  const endTime = auction.endTime?.toDate?.() || new Date(auction.endTime);
  
  // Crear estructura básica
  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: start;">
      <h3 style="margin: 0; font-size: 18px;">${auction.title || 'Subasta ARC'}</h3>
      <span class="seller-badge">🏷️ ${auction.seller || 'Stark'}</span>
    </div>
    <div class="auction-price" style="font-size: 28px; font-weight: 800; margin: 10px 0;">
      $${auction.currentPrice || 0}
    </div>
    <div style="display: flex; justify-content: space-between; margin: 10px 0;">
      <span>⏳ <span id="timer-${auction.id}" class="auction-timer">--:--:--</span></span>
      <span>📊 ${auction.bidsCount || 0} pujas</span>
    </div>
    <div id="last-bidder-${auction.id}" style="font-size: 12px; opacity: 0.7; margin-bottom: 10px;">
      ${auction.lastBidder ? `Última puja: ${auction.lastBidder.split('@')[0]}` : 'Sin pujas aún'}
    </div>
    <button class="btn-rounded bid-button" id="bid-${auction.id}" data-auction-id="${auction.id}" data-price="${auction.currentPrice}">
      ⚡ Pujar +$10
    </button>
  `;
  
  // Iniciar timer para esta subasta
  startTimer(auction.id, endTime, card);
  
  // Configurar botón de puja
  setTimeout(() => {
    const btn = document.getElementById(`bid-${auction.id}`);
    if (btn) {
      btn.onclick = () => {
        const isExpired = endTime < new Date();
        if (isExpired) {
          showToast('🔴 Esta subasta ya finalizó', 'error');
          return;
        }
        window.placeBid(auction.id, auction.currentPrice);
      };
    }
  }, 0);
  
  return card;
}

function startTimer(auctionId, endTime, cardElement) {
  // Limpiar timer existente
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
      
      // Deshabilitar botón
      const btn = document.getElementById(`bid-${auctionId}`);
      if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.innerHTML = '⛔ Subasta finalizada';
      }
      
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
    }
  }
  
  updateTimer();
  timers[auctionId] = setInterval(updateTimer, 1000);
}

export async function placeBid(user, auctionId, currentPrice) {
  try {
    // Verificar si la subasta sigue activa
    const auctionRef = doc(db, "auctions", auctionId);
    const auctionSnap = await getDoc(auctionRef);
    
    if (!auctionSnap.exists()) {
      showToast('❌ Subasta no encontrada', 'error');
      return;
    }
    
    const auction = auctionSnap.data();
    const endTime = auction.endTime?.toDate?.() || new Date(auction.endTime);
    
    if (endTime < new Date()) {
      showToast('🔴 Esta subasta ya finalizó', 'error');
      return;
    }
    
    // Verificar límite DEMO
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data() || { plan: 'demo', bidsToday: 0 };
    const plan = userData.plan;
    let bidsToday = userData.bidsToday || 0;
    
    if (plan === 'demo' && bidsToday >= 3) {
      showToast('⚠️ Límite DEMO alcanzado (3 pujas). ¡Actualiza a PRO!', 'warning');
      return;
    }
    
    const newPrice = (auction.currentPrice || currentPrice) + 10;
    const newBidsCount = (auction.bidsCount || 0) + 1;
    
    // Actualizar subasta
    await updateDoc(auctionRef, {
      currentPrice: newPrice,
      lastBidder: user.email,
      lastBidTime: new Date(),
      bidsCount: newBidsCount
    });
    
    // Registrar puja
    await addDoc(collection(db, "bids"), {
      auctionId: auctionId,
      userId: user.uid,
      email: user.email,
      amount: newPrice,
      timestamp: new Date()
    });
    
    // Actualizar contador DEMO
    if (plan === 'demo') {
      await updateDoc(userRef, { bidsToday: bidsToday + 1 });
    }
    
    showToast(`⚡ ¡Puja de $${newPrice} realizada!`, 'success');
    
    // Feedback visual en el botón
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
    
  } catch (error) {
    console.error("Error placing bid:", error);
    showToast('❌ Error al realizar la puja', 'error');
  }
}

// Función global para toasts
window.showToast = function(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

function showToast(message, type = 'info') {
  window.showToast(message, type);
}
