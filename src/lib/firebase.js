import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAvbUkRdP3NsQd-DWVzLvUwl00ZaEgT5Rk",
    authDomain: "quranapp-cc219.firebaseapp.com",
    projectId: "quranapp-cc219",
    storageBucket: "quranapp-cc219.firebasestorage.app",
    messagingSenderId: "547296517416",
    appId: "1:547296517416:web:a6a0028c6e716bf639841d",
    measurementId: "G-EPGXCZ1K8T"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and enable offline persistence caching
// Using initializeFirestore instead of getFirestore allows configuring offline capabilities
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
