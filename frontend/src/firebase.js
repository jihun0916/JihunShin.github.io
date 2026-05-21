// Firebase configuration and Firestore instance
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, addDoc, getDocs, getDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

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
const auth = getAuth(app);
const storage = getStorage(app);

// Collection references
const guestbookCollection = collection(db, "guestbook");
const postsCollection = collection(db, "posts");
const sketchesCollection = collection(db, "sketches");

export {
    db, auth, storage,
    guestbookCollection, postsCollection, sketchesCollection,
    doc, addDoc, getDocs, getDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, where,
    storageRef, uploadBytes, getDownloadURL, deleteObject
};
