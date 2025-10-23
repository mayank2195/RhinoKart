// src/firebase.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  GoogleAuthProvider
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCLzpEWgX8MfrKyVoJ2aZm_7g2J-ZnmLAE",
  authDomain: "mission-rhino-kart-3.firebaseapp.com",
  projectId: "mission-rhino-kart-3",
  storageBucket: "mission-rhino-kart-3.firebasestorage.app",
  messagingSenderId: "938792016315",
  appId: "1:938792016315:web:3746ef066554781738cc9e",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ✅ Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// ✅ Recaptcha setup function
export const setupRecaptcha = (containerId) => {
  return new RecaptchaVerifier(auth, containerId, {
    size: "invisible", // invisible for test
    callback: () => {
      console.log("Recaptcha verified automatically (test mode).");
    },
  });
};

// Export signInWithPhoneNumber for OTP login
export { signInWithPhoneNumber };
