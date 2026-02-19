// This file contains the JavaScript code for the web application. It handles dynamic interactions, such as showing the login and signup forms, and loading the banner image.

document.addEventListener("DOMContentLoaded", async function() {
  const bannerImage = document.getElementById("bannerImage");
  if (window.getBannerImageUrl) {
    try {
      const url = await window.getBannerImageUrl();
      if (url) {
        bannerImage.src = url;
      }
    } catch (e) {
      // Handle error loading banner image
    }
  }
});

function showLogin() {
  document.getElementById("mainContent").innerHTML = `
    <h2 class="text-center mb-4">Login</h2>
    <div class="form-box">
      <button type="button" class="btn-close btn-close-white float-end mb-3" aria-label="Close" onclick="location.reload()"></button>
      <form id="loginForm">
        <input type="text" class="form-control mb-3" placeholder="Username" required>
        <input type="password" class="form-control mb-3" placeholder="Password" required>
        <button type="submit" class="btn btn-success w-100 mb-2">Login</button>
      </form>
      <div class="d-flex justify-content-between mb-3">
        <button type="button" class="btn btn-danger w-100" id="googleLoginBtn">
          <i class="fa-brands fa-google"></i> Google Login
        </button>
      </div>
    </div>`;
}

function showSignup() {
  document.getElementById("mainContent").innerHTML = `
    <h2 class="text-center mb-4">Sign Up</h2>
    <div class="form-box">
      <button type="button" class="btn-close btn-close-white float-end mb-3" aria-label="Close" onclick="location.reload()"></button>
      <form id="signupForm">
        <input type="text" class="form-control mb-3" placeholder="Username" required>
        <input type="email" class="form-control mb-3" placeholder="Email" required>
        <input type="password" class="form-control mb-3" placeholder="Password" required>
        <button type="submit" class="btn btn-primary w-100">Sign Up</button>
      </form>
    </div>`;
}