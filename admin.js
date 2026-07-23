// 1. Firebase SDK Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  query, 
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 2. Firebase Project Configuration
// ⚠️ REPLACE THIS with your actual Firebase project credentials from the Firebase Console
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// 3. Initialize Firebase Services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 4. Configuration & State Variables
const ADMIN_EMAIL = "your-admin-email@example.com"; // 👈 Must match your Firestore rules exact email

let unsubscribeVisits = null;
let unsubscribeUsers = null;

// 5. DOM Container Elements
const visitsCountEl = document.getElementById("visits-count");
const visitsListEl = document.getElementById("visits-list");
const usersListEl = document.getElementById("users-list");
const errorMessageEl = document.getElementById("error-message");
const logoutBtn = document.getElementById("logout-btn");

// 6. Listen for Authentication Changes (Prevents Firestore Race Condition)
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Sanitize and check user email against Admin email
    const currentUserEmail = user.email ? user.email.toLowerCase() : "";
    const targetAdminEmail = ADMIN_EMAIL.toLowerCase();

    if (currentUserEmail === targetAdminEmail) {
      console.log("Admin authenticated successfully:", user.email);
      clearErrorMessage();
      
      // Start listening to Firestore Collections
      initDashboardListeners();
    } else {
      console.error(`Unauthorized access attempt by: ${user.email}`);
      showError(`Access denied. ${user.email} is not authorized as an admin.`);
      detachListeners();
    }
  } else {
    console.warn("No user logged in. Cleaning up listeners.");
    showError("Please log in to access the Admin Dashboard.");
    detachListeners();
    
    // Optional: Auto-redirect to login page if unauthenticated
    // window.location.href = "login.html";
  }
});

// 7. Initialize Real-Time Firestore Snapshot Listeners
function initDashboardListeners() {
  // Prevent duplicate listeners if re-authenticating
  detachListeners();

  // --- Listener 1: Site Visits ---
  const visitsRef = collection(db, "site_visits");
  // Optional: Order visits by timestamp if you have a 'timestamp' field
  // const visitsQuery = query(visitsRef, orderBy("timestamp", "desc"));

  unsubscribeVisits = onSnapshot(
    visitsRef,
    (snapshot) => {
      console.log(`Site Visits updated (${snapshot.docs.length} total)`);
      renderVisits(snapshot.docs);
    },
    (error) => {
      console.error("Site Visits Listener Error:", error);
      showError("Failed to load site visits. Check Firestore rules or permissions.");
    }
  );

  // --- Listener 2: Users Collection ---
  const usersRef = collection(db, "users");

  unsubscribeUsers = onSnapshot(
    usersRef,
    (snapshot) => {
      console.log(`Users updated (${snapshot.docs.length} total)`);
      renderUsers(snapshot.docs);
    },
    (error) => {
      console.error("Users Listener Error:", error);
      showError("Failed to load user accounts. Check Firestore rules or permissions.");
    }
  );
}

// 8. Safely Unsubscribe from Snapshot Listeners
function detachListeners() {
  if (unsubscribeVisits) {
    unsubscribeVisits();
    unsubscribeVisits = null;
  }
  if (unsubscribeUsers) {
    unsubscribeUsers();
    unsubscribeUsers = null;
  }
}

// 9. UI Rendering Helper Functions
function renderVisits(docs) {
  if (visitsCountEl) visitsCountEl.textContent = docs.length;

  if (visitsListEl) {
    if (docs.length === 0) {
      visitsListEl.innerHTML = "<p>No site visits recorded yet.</p>";
      return;
    }
    
    visitsListEl.innerHTML = docs
      .map((doc) => {
        const data = doc.data();
        return `
          <div class="visit-card">
            <span><strong>ID:</strong> ${doc.id}</span>
            <span><strong>Page:</strong> ${data.page || "N/A"}</span>
            <span><strong>Date:</strong> ${data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString() : "N/A"}</span>
          </div>
        `;
      })
      .join("");
  }
}

function renderUsers(docs) {
  if (usersListEl) {
    if (docs.length === 0) {
      usersListEl.innerHTML = "<p>No registered users found.</p>";
      return;
    }

    usersListEl.innerHTML = docs
      .map((doc) => {
        const data = doc.data();
        return `
          <div class="user-card">
            <p><strong>Email:</strong> ${data.email || "N/A"}</p>
            <p><strong>Role:</strong> ${data.role || "User"}</p>
          </div>
        `;
      })
      .join("");
  }
}

function showError(message) {
  if (errorMessageEl) {
    errorMessageEl.textContent = message;
    errorMessageEl.style.display = "block";
  }
}

function clearErrorMessage() {
  if (errorMessageEl) {
    errorMessageEl.textContent = "";
    errorMessageEl.style.display = "none";
  }
}

// 10. Logout Button Listener
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      detachListeners();
      await signOut(auth);
      console.log("Logged out successfully.");
    } catch (err) {
      console.error("Error logging out:", err);
    }
  });
}
