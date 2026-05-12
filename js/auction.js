import { db } from './firebase-config.js';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function loadAuctions(user) {
  const q = query(collection(db, "auctions"), orderBy("endTime"), limit(10));
  onSnapshot(q, (snapshot) => {
    const container = document.getElementById('auctions-container');
    container.innerHTML = '';
    snapshot.forEach(docSnap => {
      const auction = { id: docSnap.id, ...docSnap.data() };
      container.appendChild(createAuctionCard(auction, user));
    });
  });
}

function createAuctionCard(auction, user) {
  const card = document.createElement('div');
  card.className = 'card-rectangular';
  card.innerHTML = `
    <h3>${auction.title}</h3>
    <p>💰 Precio actual: $${auction.currentPrice}</p>
    <p>⏳ Fin: ${new Date(auction.endTime).toLocaleTimeString()}</p>
    <button class="btn-rounded" id="bid-${auction.id}">+ Pujar +$10</button>
  `;
  setTimeout(() => {
    const btn = document.getElementById(`bid-${auction.id}`);
    if (btn) btn.onclick = () => window.placeBid(auction.id, auction.currentPrice);
  }, 0);
  return card;
}

export async function placeBid(user, auctionId, currentPrice) {
  // Verificar límite DEMO
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const plan = userSnap.data()?.plan || 'demo';
  let bidsToday = userSnap.data()?.bidsToday || 0;
  
  if (plan === 'demo' && bidsToday >= 3) {
    alert("Límite DEMO alcanzado (3 pujas/hora). ¡Actualiza a PRO!");
    return;
  }
  
  const newPrice = currentPrice + 10;
  const auctionRef = doc(db, "auctions", auctionId);
  await updateDoc(auctionRef, { currentPrice: newPrice, lastBidder: user.email });
  
  // Registrar puja
  await addDoc(collection(db, "bids"), {
    auctionId,
    userId: user.uid,
    email: user.email,
    amount: newPrice,
    timestamp: new Date()
  });
  
  if (plan === 'demo') {
    await updateDoc(userRef, { bidsToday: bidsToday + 1 });
  }
}
