import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDD0XFwZMZcKCc1CAoQTWkyXn-SpBd8x1M",
  authDomain: "kafilasuci3.firebaseapp.com",
  projectId: "kafilasuci3",
  storageBucket: "kafilasuci3.firebasestorage.app",
  messagingSenderId: "178353487221",
  appId: "1:178353487221:web:cc249260cc2808b313273c"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);