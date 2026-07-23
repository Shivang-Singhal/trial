import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- Firebase Config ---
 const firebaseConfig = {
    apiKey: "AIzaSyBG8kvloJvV0eFjAJDvd5DDNyoGq9yuwt0",
    authDomain: "trial-2-afa59.firebaseapp.com",
    projectId: "trial-2-afa59",
    storageBucket: "trial-2-afa59.firebasestorage.app",
    messagingSenderId: "435311403093",
    appId: "1:435311403093:web:fcb1a249f3bfb6ebba74dc",
    measurementId: "G-FX4VCD11VF"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Global Chart Instances
let locationChart, browserChart;

// --- STEP 1: Realtime Site Visits Listener ---
onSnapshot(collection(db, "site_visits"), (snapshot) => {
  const visits = [];
  snapshot.forEach((doc) => visits.push(doc.data()));

  // 1. Update Metrics Count
  document.getElementById('totalVisits').textContent = visits.length;

  // 2. Aggregate Country Data
  const countryCounts = {};
  visits.forEach(v => {
    const c = v.country || "Unknown";
    countryCounts[c] = (countryCounts[c] || 0) + 1;
  });

  document.getElementById('uniqueLocations').textContent = Object.keys(countryCounts).length;
  updateLocationChart(countryCounts);

  // 3. Aggregate Browser/Platform Data
  const platformCounts = {};
  visits.forEach(v => {
    const p = v.platform || "Other";
    platformCounts[p] = (platformCounts[p] || 0) + 1;
  });
  updateBrowserChart(platformCounts);
});

// --- STEP 2: Realtime Authenticated Users Listener ---
onSnapshot(collection(db, "users"), (snapshot) => {
  const tableBody = document.getElementById('usersTableBody');
  tableBody.innerHTML = '';
  
  let userCount = 0;

  snapshot.forEach((doc) => {
    userCount++;
    const data = doc.data();
    const network = data.network || {};
    const device = data.device || {};

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${data.email || 'N/A'}</td>
      <td>${network.ip || 'N/A'}</td>
      <td>${network.city || 'N/A'}, ${network.country || 'N/A'}</td>
      <td>${device.platform || 'N/A'}</td>
    `;
    tableBody.appendChild(row);
  });

  document.getElementById('totalUsers').textContent = userCount;
});

// --- STEP 3: Chart.js Rendering Functions ---
function updateLocationChart(countryCounts) {
  const labels = Object.keys(countryCounts);
  const data = Object.values(countryCounts);

  if (locationChart) locationChart.destroy();

  const ctx = document.getElementById('locationChart').getContext('2d');
  locationChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Visits by Location',
        data: data,
        backgroundColor: '#38bdf8'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function updateBrowserChart(platformCounts) {
  const labels = Object.keys(platformCounts);
  const data = Object.values(platformCounts);

  if (browserChart) browserChart.destroy();

  const ctx = document.getElementById('browserChart').getContext('2d');
  browserChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ['#38bdf8', '#818cf8', '#f43f5e', '#4ade80']
      }]
    }
  });
}

// Exit Dashboard link redirect
document.getElementById('logoutAdmin').addEventListener('click', () => {
  window.location.href = "index.html";
});
