// DOM Elements
const loginCard = document.getElementById('loginCard');
const profileCard = document.getElementById('profileCard');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');

// Profile Displays
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const avatarLetter = document.getElementById('avatarLetter');

// Check Local Storage on page load
window.addEventListener('DOMContentLoaded', () => {
  const savedUser = JSON.parse(localStorage.getItem('userSession'));
  
  if (savedUser) {
    showProfile(savedUser.username, savedUser.email);
  }
});

// Handle Login Submission
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();

  // Save details to LocalStorage
  const userData = { username, email };
  localStorage.setItem('userSession', JSON.stringify(userData));

  // Display Profile Section
  showProfile(username, email);
  loginForm.reset();
});

// Handle Logout Action
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('userSession');
  profileCard.classList.add('hidden');
  loginCard.classList.remove('hidden');
});

// Helper function to update & display the profile card
function showProfile(username, email) {
  profileName.textContent = username;
  profileEmail.textContent = email;
  avatarLetter.textContent = username.charAt(0).toUpperCase();

  loginCard.classList.add('hidden');
  profileCard.classList.remove('hidden');
}
