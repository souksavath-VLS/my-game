import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// Firebase config (ใช้ค่าจริงจาก Firebase Console ของคุณ)
const firebaseConfig = {
  apiKey: "AIzaSyBaHS6xQ_FN_BkEnBq_qndUwAJ6whlnSXg",
  authDomain: "sign-in-c7721.firebaseapp.com",
  projectId: "sign-in-c7721",
  storageBucket: "sign-in-c7721.appspot.com",
  messagingSenderId: "480005661542",
  appId: "1:480005661542:web:ead7b9d90f5e89b6319ea7",
  measurementId: "G-5EBPV3GPWF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const storage = getStorage(app);

// ดึงรูป Banner ล่าสุดจาก Storage
export function loadBanner() {
  const bannerRef = ref(storage, 'banner/banner.jpg'); // path ใน Firebase Storage
  getDownloadURL(bannerRef)
    .then((url) => {
      document.getElementById("bannerImage").src = url;
    })
    .catch((error) => {
      console.error("โหลด Banner ไม่สำเร็จ:", error);
    });
}

// Attach event listener สำหรับปุ่ม Google Login
export function setupGoogleLogin() {
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "googleLoginBtn") {
      signInWithPopup(auth, provider)
        .then((result) => {
          const user = result.user;
          alert("Login สำเร็จ: " + user.email);
          document.getElementById("mainContent").innerHTML = `
            <h2 class="text-center">Welcome, ${user.displayName}</h2>
            <p class="text-center">You are logged in with ${user.email}</p>
          `;
        })
        .catch((error) => {
          console.error(error);
          alert("Login ไม่สำเร็จ: " + error.message);
        });
    }
  });
}
