import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js"
import { getAuth } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js"
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js"

// Configuração do Firebase - SUBSTITUA com suas credenciais
const firebaseConfig = {
  apiKey: "AIzaSyDhHNZVXqq3d8cF86apDJcHAKn0G3vuzUE",
    authDomain: "barbearia-bitencourt-d4441.firebaseapp.com",
    projectId: "barbearia-bitencourt-d4441",
    storageBucket: "barbearia-bitencourt-d4441.firebasestorage.app",
    messagingSenderId: "410076281279",
    appId: "1:410076281279:web:7b8793eae654ebbfe0c90a",
    measurementId: "G-VJNLZMNDCD"
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export { auth, db }
