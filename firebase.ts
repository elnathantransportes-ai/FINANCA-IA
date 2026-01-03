import { initializeApp } from "firebase/app";
import { getDatabase, connectDatabaseEmulator, enableLogging } from "firebase/database";
// Note: Realtime Database handles offline persistence automatically via internal caching in web SDKs,
// but explicitly ensuring we handle connection drops gracefully in the hooks is key. 
// For Firestore we would use enableIndexedDbPersistence, but for RTDB standard caching applies.

const firebaseConfig = {
  apiKey: "AIzaSyDdwMI_SQ5ywLVg8T499McNEFKts0Qh6Vo",
  authDomain: "planilha-da83b.firebaseapp.com",
  databaseURL: "https://planilha-da83b-default-rtdb.firebaseio.com",
  projectId: "planilha-da83b",
  storageBucket: "planilha-da83b.firebasestorage.app",
  messagingSenderId: "1026695962568",
  appId: "1:1026695962568:web:edf0d2fb769f7032a52afd",
  measurementId: "G-S02B6RC74D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Optional: Enable logging in development to debug synchronization issues
if (process.env.NODE_ENV === 'development') {
  // enableLogging(true);
}