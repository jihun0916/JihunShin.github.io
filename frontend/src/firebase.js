// Firebase configuration and Firestore instance
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, onSnapshot, query, orderBy } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBmSw-yZ5DWMl3w_RHyz3HRz7FUqIcbJFM",
    authDomain: "website-questbook.firebaseapp.com",
    projectId: "website-questbook",
    storageBucket: "website-questbook.firebasestorage.app",
    messagingSenderId: "437482839492",
    appId: "1:437482839492:web:0f5b565de38725e17e1891"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Guestbook collection reference
const guestbookCollection = collection(db, "guestbook");

export { db, guestbookCollection, addDoc, getDocs, onSnapshot, query, orderBy };
