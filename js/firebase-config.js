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

const auth = firebase.auth();
window.auth = auth;

const db = firebase.firestore();
window.db = db;

// Settings pehle set hongi taaki Firestore crash na ho
db.settings({ experimentalForceLongPolling: true });

// Multi-Tab Persistence Configuration with Synchronization
db.enablePersistence({ synchronizeTabs: true })
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn('Firestore Multi-tab persistence failed to lock (multiple tabs open).');
    } else if (err.code == 'unimplemented') {
      console.warn('Firestore persistence not supported in this browser.');
    }
  });
