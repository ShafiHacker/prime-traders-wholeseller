// js/firebase-config.js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  // ... baqi config ...
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

// 👇 Yeh code aapko yahan paste karna hai (db initialize hone ke foran baad)
db.enablePersistence().catch((err) => {
    if (err.code == 'failed-precondition') {
        // Multiple tabs open hon toh ye error aa sakti hai, ignore kar dein
    } else if (err.code == 'unimplemented') {
        // Browser support na kare toh ignore kar dein
    }
});

db.settings({ experimentalForceLongPolling: true });
window.db = db; 
const auth = firebase.auth();
window.auth = auth;
