import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// ===============================
// MENU MOBILE (abrir/fechar)
// ===============================
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const mobileMenu = document.getElementById("mobile-menu");

if (mobileMenuBtn && mobileMenu) {
  mobileMenuBtn.addEventListener("click", () => {
    mobileMenu.classList.toggle("hidden");
  });
}

// ===============================
// AUTH / LOGIN / LOGOUT
// ===============================
onAuthStateChanged(auth, async (user) => {

    const userGreeting = document.getElementById("user-greeting");
    const mobileGreeting = document.getElementById("mobile-user-greeting");

    const logoutDesktop = document.getElementById("logout-btn");
    const logoutMobile = document.getElementById("mobile-logout-btn");
    const mobileLoginBtn = document.getElementById("mobile-login-btn");

    const adminBtn = document.getElementById("admin-btn");
    const mobileAdminBtn = document.getElementById("mobile-admin-btn");

    if (user) {
        const nome = user.displayName || "Cliente";

        userGreeting?.classList.remove("hidden");
        mobileGreeting?.classList.remove("hidden");

        userGreeting.textContent = `Olá, ${nome}`;
        mobileGreeting.textContent = `Olá, ${nome}`;

        logoutDesktop?.classList.remove("hidden");
        logoutMobile?.classList.remove("hidden");

        mobileLoginBtn?.classList.add("hidden");

        // Verifica adm
        try {
            const snap = await getDoc(doc(db, "usuarios", user.uid));

            if (snap.exists() && snap.data().role === "admin") {
                adminBtn?.classList.remove("hidden");
                mobileAdminBtn?.classList.remove("hidden");
            }
        } catch (e) {
            console.log("Erro ao verificar admin:", e);
        }

    } else {
        // Usuário deslogado
        userGreeting?.classList.add("hidden");
        mobileGreeting?.classList.add("hidden");

        logoutDesktop?.classList.add("hidden");
        logoutMobile?.classList.add("hidden");

        mobileLoginBtn?.classList.remove("hidden");

        adminBtn?.classList.add("hidden");
        mobileAdminBtn?.classList.add("hidden");
    }
});
