import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";

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

export const analyticsPromise = isSupported().then((ok) =>
  ok ? getAnalytics(app) : null
);

export default app;
