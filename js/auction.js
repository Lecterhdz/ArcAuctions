import { db } from './firebase-config.js';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot, orderBy, limit, increment, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function loadAuctions(user) {
  const container = document.getElementById('auctions-container');
  if (!container) return;
  
  container.innerHTML = '<div class="card-rectangular">🔄 Cargando subastas...</div>';
  
  const q = query(collection(db, "auctions"), orderBy("endTime", "asc"), limit(10));
  
  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      container.innerHTML = '<div class="card-rectangular">📭 No hay subastas activas. Vuelve pronto!</div>';
      return;
    }
    
    container.innerHTML = '';
    snapshot.forEach(docSnap => {
      const auction = { id: docSnap.id, ...docSnap.data() };
      container.appendChild(createAuctionCard(auction, user));
    });
  }, (error) => {
    console.error("Error loading auctions:", error);
    container.innerHTML = '<div class="card-rectangular" style="border-left-color: red;">❌ Error cargando subastas. ¿Firestore configurado?</div>';
  });
}

function createAuctionCard(auction, user) {
  const card = document.createElement('div');
  card.className = 'card-rectangular';
  card.style.position = 'relative';
  
  // Verificar si la subasta expiró
  const endTime = auction.endTime?.toDate?.() || new Date(auction.endTime);
  const isExpired = endTime < new Date();
  
  card.innerHTML = `
    <h3>${auction.title || 'Subasta'}</h3>
    <p style="font-size: 24px; font-weight: bold;">💰 $${auction.currentPrice || 0}</p>
    <p>⏳ Termina: ${endTime.toLocaleString()}</p>
    <p>🏷️ Vendedor: ${auction.seller || 'Stark Industries'}</p>
    ${isExpired ? '<p style="color: #E63946;">🔴 SUBASTA FINALIZADA</p>' : ''}
    <button class="btn-rounded" id="bid-${auction.id}" ${isExpired ? 'disabled' : ''}>
      ⚡ Pujar +$10
    </button>
  `;
  
  if (!isExpired) {
    setTimeout(() => {
      const btn = document.getElementById(`bid-${auction.id}`);
      if (btn) btn.onclick = () => window.placeBid && window.placeBid(auction.id, auction.currentPrice);
    }, 0);
  }
  
  return card;
}

export async function placeBid(user, auctionId, currentPrice) {
  try {
    // Verificar límite DEMO
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data() || { plan: 'demo', bidsToday: 0 };
    const plan = userData.plan;
    let bidsToday = userData.bidsToday || 0;
    
    if (plan === 'demo' && bidsToday >= 3) {
      alert("⚠️ Límite DEMO alcanzado (3 pujas). ¡Actualiza a PRO para pujar más!");
      return;
    }
    
    const newPrice = currentPrice + 10;
    const auctionRef = doc(db, "auctions", auctionId);
    
    // Actualizar subasta
    await updateDoc(auctionRef, {
      currentPrice: newPrice,
      lastBidder: user.email,
      lastBidTime: new Date()
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
    
    // Feedback visual
    const btn = document.getElementById(`bid-${auctionId}`);
    if (btn) {
      btn.textContent = '✅ ¡Puja realizada!';
      setTimeout(() => {
        btn.textContent = '⚡ Pujar +$10';
      }, 1500);
    }
    
  } catch (error) {
    console.error("Error placing bid:", error);
    alert("❌ Error al realizar la puja. Intenta de nuevo.");
  }
}
