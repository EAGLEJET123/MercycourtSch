/* ========================= 
   SHARED GLOBAL FUNCTIONS
   Used by both quiz and admin pages
   ========================= */

// Password toggle function
function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  
  if (!input || !button) {
    console.error('togglePassword: Element not found', inputId);
    return;
  }
  
  if (input.type === 'password') {
    input.type = 'text';
    button.textContent = '🔒';
    button.classList.add('showing');
  } else {
    input.type = 'password';
    button.textContent = '👁️';
    button.classList.remove('showing');
  }
}

// Admin redirect function
function goToAdmin() {
  window.location.href = 'admin.html';
}

// Make functions globally available
window.togglePassword = togglePassword;
window.goToAdmin = goToAdmin;

console.log('✅ Shared functions loaded');