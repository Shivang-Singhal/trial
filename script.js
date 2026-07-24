// Import Modern Firebase Modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  addDoc, 
  collection, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- STEP 1: Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyBG8kvloJvV0eFjAJDvd5DDNyoGq9yuwt0",
  authDomain: "trial-2-afa59.firebaseapp.com",
  projectId: "trial-2-afa59",
  storageBucket: "trial-2-afa59.firebasestorage.app",
  messagingSenderId: "435311403093",
  appId: "1:435311403093:web:fcb1a249f3bfb6ebba74dc",
  measurementId: "G-FX4VCD11VF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- STEP 2: DOM Elements ---
const loginCard = document.getElementById('loginCard');
const profileCard = document.getElementById('profileCard');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const statusMessage = document.getElementById('statusMessage');

// --- STEP 3: Footprint & Telemetry Gathering Functions ---

// Friendly Browser/OS detector for admin dashboard tables
function getBrowserString() {
  const ua = navigator.userAgent;
  let browser = "Unknown Browser";
  
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("SamsungBrowser")) browser = "Samsung Internet";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
  else if (ua.includes("Edge") || ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";

  const platform = navigator.platform || "Unknown OS";
  return `${browser} (${platform})`;
}

// Collect Client Hardware / OS Footprints
function getSystemFootprints() {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    deviceMemory: navigator.deviceMemory || "Unknown",
    platform: navigator.platform,
    referrer: document.referrer || "Direct Entry",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

// Fetch Network / Geo Location Info via Secure APIs
async function getNetworkFootprints() {
  try {
    // Primary API
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) throw new Error("Primary IP API failed");
    const data = await res.json();
    return {
      ip: data.ip || "Unknown IP",
      city: data.city || "Unknown City",
      region: data.region || "Unknown Region",
      country: data.country_name || "Unknown Country",
      org: data.org || "Unknown ISP"
    };
  } catch (err) {
    try {
      // Secure Fallback API (https://ipwho.is/ avoids mixed content blocks)
      const fallbackRes = await fetch('https://ipwho.is/');
      const fallbackData = await fallbackRes.json();
      return {
        ip: fallbackData.ip || "Unknown IP",
        city: fallbackData.city || "Unknown City",
        region: fallbackData.region || "Unknown Region",
        country: fallbackData.country || "Unknown Country",
        org: fallbackData.connection?.isp || "Unknown ISP"
      };
    } catch (e) {
      // Graceful fallback if adblocker blocks both APIs
      return { 
        ip: "Adblocker/Blocked", 
        city: "N/A", 
        region: "N/A", 
        country: "N/A", 
        org: "N/A" 
      };
    }
  }
}

// Log Telemetry Visit Record to "site_visits"
async function logSiteVisit(user = null) {
  const email = user ? user.email : "Anonymous Visitor";

  // Prevent spamming Firestore with duplicate logs on rapid page refreshes
  const sessionKey = `visit_logged_${email}`;
  if (sessionStorage.getItem(sessionKey)) return;

  const envData = getSystemFootprints();
  const netData = await getNetworkFootprints();

  // Combine city & country for admin dashboard map/location chart
  const locationString = (netData.city !== "N/A" && netData.country !== "N/A") 
    ? `${netData.city}, ${netData.country}` 
    : "Unknown Location";

  try {
    await addDoc(collection(db, "site_visits"), {
      // Fields expected by admin.js dashboard:
      email: email,
      ip: netData.ip,
      location: locationString,
      platform: getBrowserString(),
      page: window.location.pathname || "/",
      timestamp: serverTimestamp(),
      visitedAt: serverTimestamp(),

      // Deep telemetry fields saved for detailed inspection:
      city: netData.city,
      country: netData.country,
      region: netData.region,
      isp: netData.org,
      device: envData
    });

    sessionStorage.setItem(sessionKey, "true");
    console.log(`Telemetry visit logged for: ${email}`);
  } catch (e) {
    console.warn("Analytics recording prevented or blocked:", e);
  }
}

// Save or Update User Profile Footprint in "users" Collection
async function logUserSession(user) {
  const envData = getSystemFootprints();
  const netData = await getNetworkFootprints();

  const locationString = (netData.city !== "N/A" && netData.country !== "N/A") 
    ? `${netData.city}, ${netData.country}` 
    : "Unknown Location";

  try {
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      lastLoginTimestamp: serverTimestamp(),
      network: netData,
      device: envData
    }, { merge: true });
  } catch (err) {
    console.error("Error updating user document:", err);
  }

  // Update Profile Card UI elements safely
  const profileNameEl = document.getElementById('profileName');
  const profileUidEl = document.getElementById('profileUid');
  const profileIpEl = document.getElementById('profileIp');
  const profileLocationEl = document.getElementById('profileLocation');
  const profileDeviceEl = document.getElementById('profileDevice');
  const avatarLetterEl = document.getElementById('avatarLetter');

  if (profileNameEl) profileNameEl.textContent = user.email.split('@')[0];
  if (profileUidEl) profileUidEl.textContent = user.uid.substring(0, 8) + '...';
  if (profileIpEl) profileIpEl.textContent = netData.ip;
  if (profileLocationEl) profileLocationEl.textContent = locationString;
  if (profileDeviceEl) profileDeviceEl.textContent = envData.platform;
  if (avatarLetterEl) avatarLetterEl.textContent = user.email.charAt(0).toUpperCase();
}

// --- STEP 4: Authentication & Event Listeners ---

// Monitor Firebase Auth State & Trigger Telemetry Logging
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (loginCard) loginCard.classList.add('hidden');
    if (profileCard) profileCard.classList.remove('hidden');
    
    // Log user account footprint & session visit
    logUserSession(user);
    logSiteVisit(user);
  } else {
    if (profileCard) profileCard.classList.add('hidden');
    if (loginCard) loginCard.classList.remove('hidden');

    // Log anonymous visitor session
    logSiteVisit(null);
  }
});

// Handle Login or Auto-Registration
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (statusMessage) statusMessage.textContent = "Authenticating...";

    try {
      // Attempt standard Sign In
      await signInWithEmailAndPassword(auth, email, password);
      if (statusMessage) statusMessage.textContent = "";
    } catch (err) {
      // If account doesn't exist, create it automatically
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          if (statusMessage) statusMessage.textContent = "Account created & logged in!";
        } catch (createErr) {
          if (statusMessage) statusMessage.textContent = createErr.message;
        }
      } else {
        if (statusMessage) statusMessage.textContent = err.message;
      }
    }
  });
}

// Log out action
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    // Clear session storage flag so future logins log fresh visits
    sessionStorage.clear();
    signOut(auth);
  });
}
