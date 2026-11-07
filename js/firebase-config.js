// js/firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyCRkKoE48FjYIjYfUNFEYzcxNueKUm6YOM",
  authDomain: "prime-traders-f3eec.firebaseapp.com",
  projectId: "prime-traders-f3eec",
  storageBucket: "prime-traders-f3eec.firebasestorage.app",
  messagingSenderId: "499740236001",
  appId: "1:499740236001:web:e623dfe11f6f96df22ffa0",
  measurementId: "G-6CGVKBZFJK"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

// Firestore Offline Persistence Cache (Speed Fast Karne ke liye)
db.enablePersistence().catch((err) => {
    if (err.code == 'failed-precondition') {
        // Multiple tabs open hon toh error aa sakti hai, ignore karein
    } else if (err.code == 'unimplemented') {
        // Browser support na kare toh ignore karein
    }
});

db.settings({ experimentalForceLongPolling: true });
window.db = db; 

const auth = firebase.auth();
window.auth = auth;
