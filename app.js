const btn = document.getElementById('interactiveBtn');
const counterText = document.getElementById('counterText');
let count = 0;

// Track mouse position over the button for hover glow effect
btn.addEventListener('mousemove', (e) => {
  const rect = btn.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  btn.style.setProperty('--x', `${x}px`);
  btn.style.setProperty('--y', `${y}px`);
});

// Click counter functionality
btn.addEventListener('click', () => {
  count++;
  counterText.textContent = `Clicks: ${count}`;
});
