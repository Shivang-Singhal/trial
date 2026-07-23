// 1. Import Firebase v10 Web SDK Modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 2. Firebase Configuration
// ⚠️ REPLACE THIS with your actual keys from Firebase Console > Project Settings
 const firebaseConfig = {
    apiKey: "AIzaSyBG8kvloJvV0eFjAJDvd5DDNyoGq9yuwt0",
    authDomain: "trial-2-afa59.firebaseapp.com",
    projectId: "trial-2-afa59",
    storageBucket: "trial-2-afa59.firebasestorage.app",
    messagingSenderId: "435311403093",
    appId: "1:435311403093:web:fcb1a249f3bfb6ebba74dc",
    measurementId: "G-FX4VCD11VF"
  };
// 3. Initialize Firebase Services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 4. Admin Configuration
const ADMIN_EMAIL = "admin@yourdomain.com"; // 👈 Set this to match your logged-in email EXACTLY // 👈 Set to your admin login email

// 5. Global State & Unsubscribe Handles
let unsubscribeVisits = null;
let unsubscribeUsers = null;
let locationChartInstance = null;
let browserChartInstance = null;

// 6. DOM Elements (Matched to your HTML IDs)
const totalVisitsEl = document.getElementById("totalVisits");
const totalUsersEl = document.getElementById("totalUsers");
const uniqueLocationsEl = document.getElementById("uniqueLocations");
const usersTableBody = document.getElementById("usersTableBody");
const logoutBtn = document.getElementById("logoutAdmin");

// 7. Auth Listener (Prevents Firestore Permission Errors)
onAuthStateChanged(auth, (user) => {
  if (user) {
    const userEmail = user.email ? user.email.toLowerCase() : "";
    const adminEmail = ADMIN_EMAIL.toLowerCase();

    if (userEmail === adminEmail) {
      console.log("Admin verified:", user.email);
      initDashboardListeners();
    } else {
      console.error(`Access Denied for ${user.email}`);
      showTableMessage(`Access Denied: ${user.email} is not authorized as an admin.`);
      detachListeners();
    }
  } else {
    console.warn("No authenticated session active.");
    showTableMessage("Please log in with admin credentials to view data.");
    detachListeners();
  }
});

// 8. Initialize Firestore Realtime Listeners
function initDashboardListeners() {
  detachListeners();

  // --- Listener 1: Site Visits (Metrics, Charts & Table) ---
  unsubscribeVisits = onSnapshot(
    collection(db, "site_visits"),
    (snapshot) => {
      const visits = snapshot.docs.map(doc => doc.data());
      
      // Update Total Visits Metric
      if (totalVisitsEl) totalVisitsEl.textContent = visits.length;

      // Render Charts & Table
      renderCharts(visits);
      renderTable(visits);
    },
    (error) => {
      console.error("Firestore Site Visits Error:", error);
      showTableMessage("Permission Error: Missing access rights to site_visits.");
    }
  );

  // --- Listener 2: Registered Accounts ---
  unsubscribeUsers = onSnapshot(
    collection(db, "users"),
    (snapshot) => {
      if (totalUsersEl) totalUsersEl.textContent = snapshot.docs.length;
    },
    (error) => {
      console.error("Firestore Users Error:", error);
    }
  );
}

// 9. Chart.js Data Visualizations
function renderCharts(visits) {
  const locationCounts = {};
  const browserCounts = {};

  visits.forEach((item) => {
    const loc = item.location || item.country || "Unknown";
    const platform = item.platform || item.browser || "Unknown";

    locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    browserCounts[platform] = (browserCounts[platform] || 0) + 1;
  });

  // Metric: Count Unique Countries
  if (uniqueLocationsEl) {
    const uniqueCount = Object.keys(locationCounts).filter(k => k !== "Unknown").length;
    uniqueLocationsEl.textContent = uniqueCount || Object.keys(locationCounts).length;
  }

  // --- 1. Location Bar Chart ---
  const locationCanvas = document.getElementById("locationChart");
  if (locationCanvas) {
    if (locationChartInstance) locationChartInstance.destroy(); // Clear old chart state

    locationChartInstance = new Chart(locationCanvas, {
      type: "bar",
      data: {
        labels: Object.keys(locationCounts),
        datasets: [{
          label: "Visits",
          data: Object.values(locationCounts),
          backgroundColor: "#36A2EB"
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } }
      }
    });
  }

  // --- 2. Browser Doughnut Chart ---
  const browserCanvas = document.getElementById("browserChart");
  if (browserCanvas) {
    if (browserChartInstance) browserChartInstance.destroy(); // Clear old chart state

    browserChartInstance = new Chart(browserCanvas, {
      type: "doughnut",
      data: {
        labels: Object.keys(browserCounts),
        datasets: [{
          data: Object.values(browserCounts),
          backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"]
        }]
      },
      options: { responsive: true }
    });
  }
}

// 10. Table Rendering Function
function renderTable(visits) {
  if (!usersTableBody) return;

  if (visits.length === 0) {
    showTableMessage("No activity logs recorded yet.");
    return;
  }

  usersTableBody.innerHTML = visits
    .slice(0, 10) // Display top 10 most recent visits
    .map((data) => `
      <tr>
        <td>${data.email || "Anonymous"}</td>
        <td>${data.ip || data.ipAddress || "—"}</td>
        <td>${data.location || data.country || "Unknown"}</td>
        <td>${data.platform || data.browser || "Unknown"}</td>
      </tr>
    `)
    .join("");
}

function showTableMessage(msg) {
  if (usersTableBody) {
    usersTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">${msg}</td></tr>`;
  }
}

// 11. Cleanup Snapshot Listeners
function detachListeners() {
  if (unsubscribeVisits) { unsubscribeVisits(); unsubscribeVisits = null; }
  if (unsubscribeUsers) { unsubscribeUsers(); unsubscribeUsers = null; }
}

// 12. Handle "Exit Dashboard" Logout Click
if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      detachListeners();
      await signOut(auth);
      console.log("Logged out successfully.");
      window.location.reload();
    } catch (err) {
      console.error("Error signing out:", err);
    }
  });
}
