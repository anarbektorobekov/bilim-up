import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDIvKKrLitU0lI96ArD20CDNegNJvVqPhk",
  authDomain: "bilim-up.firebaseapp.com",
  projectId: "bilim-up",
  storageBucket: "bilim-up.firebasestorage.app",
  messagingSenderId: "604106714402",
  appId: "1:604106714402:web:9e4168df7d7e320f55897b",
  measurementId: "G-2NGFW19FC1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);