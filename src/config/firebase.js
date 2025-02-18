// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCPhz0mpDjDPu7Ze7tdD8kOTimwEnW8SP4",
    authDomain: "innsight-c575d.firebaseapp.com",
    projectId: "innsight-c575d",
    storageBucket: "innsight-c575d.firebasestorage.app",
    messagingSenderId: "148100251084",
    appId: "1:148100251084:web:69ee2bbdb95543be82b169",
    measurementId: "G-V1FK8H84H2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };