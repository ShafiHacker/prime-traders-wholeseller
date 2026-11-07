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

// Settings pehle set hongi taaki Firestore crash na ho
db.settings({ experimentalForceLongPolling: true });

// Offline Cache Enable
db.enablePersistence().catch((err) => {
    if (err.code == 'failed-precondition') {
        // Multiple tabs open hone par ignore karein
    } else if (err.code == 'unimplemented') {
        // Unsupported browser par ignore karein
    }
});

window.db = db; 

const auth = firebase.auth();
window.auth = auth;
