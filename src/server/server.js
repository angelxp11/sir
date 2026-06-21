// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration, loaded from environment variables
const firebaseConfig = {
  apiKey:
    process.env.REACT_APP_FIREBASE_API_KEY ||
    "AIzaSyAbfqts1-tNb4IF7q4_9e09OI6EAAOiJw0",
  authDomain:
    process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ||
    "sir-k-db528.firebaseapp.com",
  projectId:
    process.env.REACT_APP_FIREBASE_PROJECT_ID ||
    "sir-k-db528",
  storageBucket:
    process.env.REACT_APP_FIREBASE_STORAGE_BUCKET ||
    "sir-k-db528.firebasestorage.app",
  messagingSenderId:
    process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID ||
    "821867405405",
  appId:
    process.env.REACT_APP_FIREBASE_APP_ID ||
    "1:821867405405:web:3d3d61f4882c1f81052db4",
  measurementId:
    process.env.REACT_APP_FIREBASE_MEASUREMENT_ID ||
    "G-FDJ4DL7ZX9",
};

if (!process.env.REACT_APP_FIREBASE_API_KEY) {
  console.warn(
    "No se encontró REACT_APP_FIREBASE_API_KEY en el entorno. Usando valor de respaldo."
  );
}

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);