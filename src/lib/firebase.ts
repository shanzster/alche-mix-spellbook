import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyB3waPbnSaS0tKQqwmCkhMGZlsdpPc4dvw",
  authDomain:        "alchemix-grimoire.firebaseapp.com",
  projectId:         "alchemix-grimoire",
  storageBucket:     "alchemix-grimoire.firebasestorage.app",
  messagingSenderId: "994956990674",
  appId:             "1:994956990674:web:e34139b7011415e91d350b",
  measurementId:     "G-FRY33QTGXJ",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Keep the session alive across reloads and browser restarts — the user stays
// signed in until they explicitly sign out. (Local persistence is the web
// default, but we set it explicitly to guarantee it.)
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.error("Failed to set auth persistence:", err);
  });
}

export const analyticsPromise = isSupported().then((ok) =>
  ok ? getAnalytics(app) : null
);

export default app;
