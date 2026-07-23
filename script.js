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
// (Replace these with your actual details from Firebase Console)
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

// --- STEP 3: Footprint Gathering Functions ---

// Collect Client Environment Info
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

// Fetch Network/Location Info via Free Geolocation API
async function getNetworkFootprints() {
  try {
    // Try primary API
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) throw new Error("Primary API failed");
    const data = await res.json();
    return {
      ip: data.ip || "Unknown",
      city: data.city || "Unknown",
      region: data.region || "Unknown",
      country: data.country_name || "Unknown",
      org: data.org || "Unknown"
    };
  } catch (err) {
    try {
      // Fallback API if primary is blocked or 404s
      const fallbackRes = await fetch('http://ip-api.com/json/');
      const fallbackData = await fallbackRes.json();
      return {
        ip: fallbackData.query || "Unknown",
        city: fallbackData.city || "Unknown",
        region: fallbackData.regionName || "Unknown",
        country: fallbackData.country || "Unknown",
        org: fallbackData.isp || "Unknown"
      };
    } catch (e) {
      // Return local defaults without breaking execution
      return { ip: "Blocked by Adblocker", city: "N/A", region: "N/A", country: "N/A", org: "N/A" };
    }
  }
}
// Log "Anonymous Page Visit" when anyone opens the site
async function logAnonymousVisit() {
  const envData = getSystemFootprints();
  const netData = await getNetworkFootprints();

  try {
    await addDoc(collection(db, "site_visits"), {
      ...envData,
      ...netData,
      visitedAt: serverTimestamp()
    });
  } catch (e) {
    console.warn("Analytics recording prevented:", e);
  }
}

// Log "User Login Footprint" to Firestore under their specific user ID
async function logUserSession(user) {
  const envData = getSystemFootprints();
  const netData = await getNetworkFootprints();

  // Save footprint record into "users" database collection
  await setDoc(doc(db, "users", user.uid), {
    email: user.email,
    lastLoginTimestamp: serverTimestamp(),
    network: netData,
    device: envData
  }, { merge: true });

  // Update Profile Card UI
  document.getElementById('profileName').textContent = user.email.split('@')[0];
  document.getElementById('profileUid').textContent = user.uid.substring(0, 8) + '...';
  document.getElementById('profileIp').textContent = netData.ip;
  document.getElementById('profileLocation').textContent = `${netData.city}, ${netData.country}`;
  document.getElementById('profileDevice').textContent = envData.platform;
  document.getElementById('avatarLetter').textContent = user.email.charAt(0).toUpperCase();
}

// --- STEP 4: Authentication & Event Listeners ---

// Automatically log every page load
logAnonymousVisit();

// Monitor Firebase Auth State
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginCard.classList.add('hidden');
    profileCard.classList.remove('hidden');
    logUserSession(user);
  } else {
    profileCard.classList.add('hidden');
    loginCard.classList.remove('hidden');
  }
});

// Handle Login or Auto-Registration
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  statusMessage.textContent = "Authenticating...";

  try {
    // Attempt standard Sign In
    await signInWithEmailAndPassword(auth, email, password);
    statusMessage.textContent = "";
  } catch (err) {
    // If account doesn't exist, create it automatically
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        statusMessage.textContent = "Account created & logged in!";
      } catch (createErr) {
        statusMessage.textContent = createErr.message;
      }
    } else {
      statusMessage.textContent = err.message;
    }
  }
});

// Log out action
logoutBtn.addEventListener('click', () => {
  signOut(auth);
});
