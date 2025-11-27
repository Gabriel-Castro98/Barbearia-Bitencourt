import { auth, db } from "./firebase-config.js";
import { addDoc, collection, getDocs, query, where, doc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { initEmailJS, enviarNotificacoesAgendamento } from "./notifications.js";

window.auth = auth;

let selectedServices = []; // array para armazenar serviços selecionados
let subtotalEl;

// ==================================================
// SERVIÇOS
// ==================================================
const servicos = [
  { nome: "Corte", preco: 30, duracao: 30, tag: "", icone: "..." },
  { nome: "Corte e Barba", preco: 60, duracao: 60, tag: "POPULAR", icone: "..." },
  { nome: "Barba Completa", preco: 40, duracao: 30, tag: "", icone: "..." },
  { nome: "Corte + Alisamento", preco: 60, duracao: 30, tag: "", icone: "..." },
  { nome: "Corte + Barba + Alisamento", preco: 80, duracao: 60, tag: "", icone: "..." },
  { nome: "Corte + Barba + Pigmentacao", preco: 70, duracao: 60, tag: "", icone: "..." },
  { nome: "Sobrancelha na Navalha", preco: 5, duracao: 0, tag: "", icone: "..." },
  { nome: "Bigode na Navalha", preco: 5, duracao: 0, tag: "", icone: "..." },
  { nome: "Risquinho Simples", preco: 5, duracao: 0, tag: "", icone: "..." },
  { nome: "Bigode e Cavanhaque", preco: 10, duracao: 10, tag: "", icone: "..." },
];

// transforma os inputs de service em checkbox e atualiza subtotal
document.querySelectorAll('.service-option input[name="service"]').forEach(input => {
  input.type = "checkbox"; // permite múltipla seleção
  input.addEventListener("change", () => {
    const serviceName = input.value;
    const serviceObj = servicos.find(s => s.nome === serviceName);
    if (!serviceObj) return;

    if (input.checked) {
      selectedServices.push(serviceObj);
    } else {
      selectedServices = selectedServices.filter(s => s.nome !== serviceName);
    }

    // Atualiza subtotal
    const total = selectedServices.reduce((acc, s) => acc + s.preco, 0);
    subtotalEl.textContent = `Subtotal: R$ ${total}`;
  });
});

// ==================================================
// FUNÇÕES DE USUÁRIO
// ==================================================
async function getUserName() {
  const user = auth?.currentUser;
  if (!user) return "Cliente";
  if (user.displayName) return user.displayName;
  try {
    const userDoc = await getDoc(doc(db, "usuarios", user.uid));
    if (userDoc.exists()) return userDoc.data().name || user.email.split("@")[0];
  } catch (err) { console.warn(err); }
  return user.email.split("@")[0];
}

function getServiceDuration(serviceName) {
  const serv = servicos.find(s => s.nome === serviceName);
  return serv ? serv.duracao : 30;
}

// ==================================================
// FUNÇÃO: Atualiza o resumo do agendamento
// ==================================================
async function updateSummary() {
  const barberEl = document.querySelector('input[name="barber"]:checked');
  const dateEl = document.getElementById("date");
  const timeEl = document.getElementById("time");

  const userName = await getUserName();
  const total = selectedServices.reduce((acc, s) => acc + s.preco, 0);

  document.getElementById("summary-name").textContent = userName;
  document.getElementById("summary-service").textContent = selectedServices.map(s => s.nome).join(", ");
  document.getElementById("summary-barber").textContent = barberEl ? barberEl.value : "";
  document.getElementById("summary-date").textContent = dateEl ? new Date(dateEl.value).toLocaleDateString("pt-BR") : "";
  document.getElementById("summary-time").textContent = timeEl ? timeEl.value : "";
  document.getElementById("summary-total").textContent = `R$ ${total}`;
}

// ==================================================
// FUNÇÕES DE NAVEGAÇÃO ENTRE ETAPAS
// ==================================================
function showStep(step) {
  document.querySelectorAll(".step").forEach(s => s.classList.add("hidden"));
  document.getElementById(`step-${step}`).classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function nextStep(step) { 
  showStep(step); 
  if (step === 4) await updateSummary(); 
}

function prevStep(step) { showStep(step); }

// ==================================================
// FUNÇÃO: Atualiza horários disponíveis
// ==================================================
async function updateAvailableTimes() {
  const mainServiceInput = document.querySelector('input[name="service"]:checked'); // principal
  const dateInput = document.getElementById("date");
  const timeSelect = document.getElementById("time");

  if (!mainServiceInput || !dateInput.value) {
    timeSelect.innerHTML = `<option value="">Selecione uma data e serviço</option>`;
    return;
  }

  const service = mainServiceInput.value;
  const duration = getServiceDuration(service); // só considera o principal

  const [year, month, day] = dateInput.value.split("-").map(Number);
  const selectedDate = new Date(year, month - 1, day);
  const today = new Date();
  const isToday = selectedDate.toDateString() === today.toDateString();
  const dayOfWeek = selectedDate.getDay();

  if (dayOfWeek === 0) {
    alert("Não trabalhamos no domingo!");
    dateInput.value = "";
    timeSelect.innerHTML = `<option value="">Selecione uma data e serviço</option>`;
    return;
  }

  const opening = 9, closing = dayOfWeek === 6 ? 18 : 20, lunchStart = 12, lunchEnd = 13.5, interval = 15;
  const slots = [];

  for (let h = opening; h < closing; h++) {
    for (let m = 0; m < 60; m += interval) {
      const startMinutes = h * 60 + m;
      const endMinutes = startMinutes + duration;
      if (endMinutes > closing * 60) continue;
      if (startMinutes < lunchEnd * 60 && endMinutes > lunchStart * 60) continue;
      if (isToday && startMinutes <= today.getHours() * 60 + today.getMinutes()) continue;
      slots.push(startMinutes);
    }
  }

  const bookedTimes = [];
  try {
    const snapshot = await getDocs(query(collection(db, "agendamentos"), where("data", "==", dateInput.value)));
    snapshot.forEach(doc => bookedTimes.push(doc.data()));
  } catch (err) { console.error(err); }

  timeSelect.innerHTML = `<option value="">Selecione um horário</option>`;
  slots.forEach(minutes => {
    const startH = Math.floor(minutes / 60), startM = minutes % 60, endMinutes = minutes + duration;
    const occupied = bookedTimes.some(ag => {
      const [h, m] = ag.horario?.split(":").map(Number) || [0, 0];
      const agStart = h * 60 + m;
      const agEnd = agStart + getServiceDuration(ag.servico); // só considera o principal do agendamento existente
      return minutes < agEnd && endMinutes > agStart;
    });
    if (occupied) return;

    const hStr = String(startH).padStart(2, "0"), mStr = String(startM).padStart(2, "0");
    const option = document.createElement("option");
    option.value = `${hStr}:${mStr}`;
    option.textContent = `${hStr}:${mStr}`;
    timeSelect.appendChild(option);
  });

  const oldWarning = document.getElementById("no-slots-warning");
  if (oldWarning) oldWarning.remove();

  if (timeSelect.options.length === 1) {
    timeSelect.innerHTML = `<option value="">Nenhum horário disponível</option>`;
    const warning = document.createElement("div");
    warning.id = "no-slots-warning";
    warning.innerHTML = `<span style="display:inline-block;margin-right:6px;animation:pulse 1.5s infinite;">⚠️</span>
                         <span>Não há mais horários disponíveis neste dia.</span>`;
    warning.style.color = "#eab308";
    warning.style.marginTop = "8px";
    warning.style.fontWeight = "600";
    warning.style.textAlign = "center";
    warning.style.opacity = "0";
    warning.style.transition = "opacity 0.5s ease-in-out";
    timeSelect.parentElement.appendChild(warning);
    setTimeout(() => warning.style.opacity = "1", 50);
  }

  updateSummary();
}

// ==================================================
// WHATSAPP
// ==================================================
async function enviarWhatsApp(telefone, mensagem) {
  try {
    const response = await fetch("https://barbearia-bitencourt.onrender.com/sendWhatsApp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: telefone, message: mensagem }),
    });
    return (await response.json()).success;
  } catch (err) {
    console.error("[WhatsApp] Erro:", err);
    return false;
  }
}

// ==================================================
// INICIALIZAÇÃO
// ==================================================
document.addEventListener("DOMContentLoaded", () => {

  const step1Container = document.getElementById("step-1");

  if (step1Container) {
    // SUBTOTAL → cria o elemento e registra na variável global
    subtotalEl = document.createElement("p");
    subtotalEl.classList.add("text-amber-400", "font-semibold", "mt-2");

    // adiciona na tela
    step1Container.appendChild(subtotalEl);
  }

  initEmailJS();

  // Inputs globais
  const dateInput = document.getElementById("date");
  const timeSelect = document.getElementById("time");

  // Menu mobile
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  mobileMenuBtn?.addEventListener("click", () => mobileMenu?.classList.toggle("hidden"));
  document.querySelectorAll("#mobile-menu a").forEach(link => link.addEventListener("click", () => mobileMenu?.classList.add("hidden")));

  // Logout
  ["logout-btn", "mobile-logout-btn"].forEach(id => document.getElementById(id)?.addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "index.html";
  }));

  // FAQ
  document.querySelectorAll(".faq-item").forEach(item => {
    const q = item.querySelector(".faq-question");
    const a = item.querySelector(".faq-answer");
    const icon = q?.querySelector("svg");
    if (!q || !a) return;
    q.addEventListener("click", () => {
      const open = !a.classList.contains("hidden");
      document.querySelectorAll(".faq-answer").forEach(el => el.classList.add("hidden"));
      document.querySelectorAll(".faq-question svg").forEach(ic => ic.classList.remove("rotate-180"));
      if (!open) { a.classList.remove("hidden"); icon?.classList.add("rotate-180"); }
    });
  });

  // Flatpickr
  if (dateInput) {
    flatpickr.localize(flatpickr.l10ns.pt);
    flatpickr(dateInput, {
      minDate: "today",
      dateFormat: "Y-m-d",
      disable: [d => new Date(d.getTime() + d.getTimezoneOffset() * 60000).getDay() === 0],
      locale: "pt",
      onChange: updateAvailableTimes,
      monthSelectorType: "dropdown",
    });
  }

  // Multi-step
  document.getElementById("next-1")?.addEventListener("click", () => {
    if (selectedServices.length === 0) {
      alert("Selecione pelo menos um serviço.");
      return; // não avança
    }
    nextStep(2); // avança para Step 2
  });

  // Outros botões next
  ["next-2","next-3"].forEach((id,i) => 
    document.getElementById(id)?.addEventListener("click", () => nextStep(i+3))
  );

  // Botões prev
  ["prev-2","prev-3","prev-4"].forEach((id,i)=>document.getElementById(id)?.addEventListener("click",()=>prevStep(i+1)));

  // Submissão agendamento
  const bookingForm = document.getElementById("booking-form");
  const submitBtn = document.getElementById("submit-btn");
  const toast = document.getElementById("toast");

  if (bookingForm) {
    bookingForm.addEventListener("submit", async e => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) return alert("Você precisa estar logado para agendar.");

      const service = document.querySelector('input[name="service"]:checked')?.value;
      const barber = document.querySelector('input[name="barber"]:checked')?.value;
      const date = dateInput?.value;
      const horario = timeSelect?.value;

      submitBtn.textContent = "Confirmando...";
      submitBtn.disabled = true;

      try {
        let telefone = "";
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) telefone = userDoc.data().telefone || "";

        await addDoc(collection(db, "agendamentos"), {
          nome: user.displayName || user.email.split("@")[0],
          email: user.email,
          telefone,
          servico: service,
          barbeiro: barber,
          data: date,
          horario,
          userId: user.uid,
          status: "confirmado",
          criadoEm: serverTimestamp()
        });

        await enviarNotificacoesAgendamento({ nome: user.displayName || user.email.split("@")[0], email: user.email, telefone, servico: service, barbeiro: barber, data: date, horario });

        // WhatsApp
        if (telefone) await enviarWhatsApp(telefone, `💈 Barbearia Bitencourt 💈\nOlá ${user.displayName || user.email.split("@")[0]}!\nSeu agendamento foi confirmado:\n📅 ${new Date(date).toLocaleDateString("pt-BR")}\n🕒 ${horario}\n✂️ ${service}\n👨‍🦱 ${barber}\nAguardamos você! 😎`);
        await enviarWhatsApp("+5543984994564", `📢 Novo agendamento!\nCliente: ${user.displayName || user.email.split("@")[0]}\n📞 ${telefone || "não informado"}\n✂️ ${service}\n👨‍🦱 ${barber}\n📅 ${new Date(date).toLocaleDateString("pt-BR")}\n🕒 ${horario}`);

        toast.querySelector("p:first-child").textContent = "Agendamento confirmado!";
        toast.querySelector("p:last-child").textContent = "Você receberá uma confirmação por e-mail e WhatsApp.";
        toast.classList.remove("hidden","bg-red-500");
        toast.classList.add("bg-green-500");
        setTimeout(()=>{toast.classList.add("hidden");window.location.href="index.html";},4000);

      } catch(err){
        console.error(err);
        toast.querySelector("p:first-child").textContent = "Erro no agendamento!";
        toast.querySelector("p:last-child").textContent = "Tente novamente mais tarde.";
        toast.classList.remove("hidden","bg-green-500");
        toast.classList.add("bg-red-500");
        setTimeout(()=>toast.classList.add("hidden"),4000);
      } finally {
        submitBtn.textContent = "Confirmar Agendamento";
        submitBtn.disabled = false;
      }
    });
  }

  // --- Reset Steps ---
  document.querySelectorAll('.service-option input[name="service"]').forEach(input => input.checked = false);
  selectedServices = [];
  document.querySelectorAll('.barber-option input[name="barber"]').forEach(input => input.checked = false);
  if (dateInput) dateInput.value = "";
  if (timeSelect) timeSelect.value = "";

  // ==================================================
  // CARROSSEL DE SERVIÇOS E ANIMAÇÃO ELEGANTE
  // ==================================================
  const carousel = document.getElementById('carousel-servicos');
  const prevBtn = document.getElementById('prev-servico');
  const nextBtn = document.getElementById('next-servico');

  async function carregarServicos() {
    const carousel = document.getElementById("carousel-servicos");
    if (!carousel) return;

    carousel.innerHTML = "";

    try {
        const snapshot = await getDocs(collection(db, "servicos"));

        snapshot.forEach((docSnap, index) => {
            const servico = docSnap.data();

            const card = document.createElement("div");
            card.className = `
                service-card flex-none w-80 bg-zinc-800 rounded-2xl p-8 border border-zinc-700
                hover:border-amber-500 transition-all snap-start relative
                opacity-0 translate-y-6
                flex flex-col justify-between
                min-h-[480px]
                overflow-visible
            `;
            card.style.transition = `opacity 0.5s ease ${index * 0.12}s, transform 0.5s ease ${index * 0.12}s`;

            const badge = servico.popular
                ? `
                <div class="absolute -top-4 right-4 bg-amber-500 text-zinc-950 px-4 py-1 rounded-full 
                text-sm font-bold shadow-lg z-30">
                    POPULAR
                </div>`
                : "";

            card.innerHTML = `
                ${badge}

                <div>
                    <div class="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                        ${servico.icone || `
                            <svg class="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                d="M12 4v16m8-8H4"></path>
                            </svg>
                        `}
                    </div>

                    <h3 class="text-2xl font-bold text-center mb-2">${servico.nome}</h3>
                    <p class="text-zinc-400 text-center mb-4">${servico.descricao}</p>

                    <div class="text-3xl font-bold text-amber-500 text-center mb-4">
                        R$ ${servico.preco}
                    </div>

                    ${
                        servico.itens?.length
                            ? `
                        <ul class="space-y-2 mb-6">
                            ${servico.itens
                                .map(item => `<li class="text-zinc-300 flex gap-2 items-center">${item}</li>`)
                                .join("")}
                        </ul>
                    `
                            : ""
                    }
                </div>

                <a href="agendamento.html"
                   class="block w-full bg-amber-500 text-zinc-950 text-center py-3 rounded-lg font-semibold 
                   hover:bg-amber-400 transition-colors mt-auto">
                    Agendar
                </a>
            `;

            carousel.appendChild(card);

            setTimeout(() => {
                card.classList.remove("opacity-0", "translate-y-6");
            }, 50);
        });
    } catch (err) {
        console.error("Erro ao carregar serviços:", err);
    }
}

  function setupCarrossel() {
      if (!carousel) return;

      const scrollAmount = 340;
      nextBtn?.addEventListener('click', () => carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' }));
      prevBtn?.addEventListener('click', () => carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' }));

      carousel.style.scrollBehavior = "smooth";
      carousel.style.scrollSnapType = "x mandatory";
      carousel.style.overflowX = "auto";
      carousel.style.scrollPadding = "16px";
      carousel.style.cursor = "grab";

      carousel.addEventListener('mousedown', () => carousel.style.cursor = "grabbing");
      carousel.addEventListener('mouseup', () => carousel.style.cursor = "grab");
  }

  // Inicializa carousel
  if (carousel) carregarServicos().then(setupCarrossel);

});

// ============================
// ELEMENTOS GLOBAIS
// ============================
const greeting = document.getElementById('user-greeting');
const mobileGreeting = document.getElementById('mobile-user-greeting');

const logoutBtns = [document.getElementById('logout-btn'), document.getElementById('mobile-logout-btn')];
const loginBtns = [document.getElementById('login-btn'), document.getElementById('mobile-login-btn')];

const adminBtn = document.getElementById("admin-btn");
const mobileAdminBtn = document.getElementById("mobile-admin-btn");

const btnDesktop = document.getElementById("btn-meus-agendamentos");
const dropdownDesktop = document.getElementById("dropdown-agendamentos");
const containerDesktop = document.getElementById("meus-agendamentos");

const btnMobile = document.getElementById("mobile-btn-meus-agendamentos");
const dropdownMobile = document.getElementById("mobile-dropdown-agendamentos");
const containerMobile = document.getElementById("mobile-meus-agendamentos");

// ============================
// FUNÇÕES AUXILIARES
// ============================
function toggleDropdown(dropdown) {
  dropdown.classList.toggle("hidden");
}

btnDesktop?.addEventListener("click", () => toggleDropdown(dropdownDesktop));
btnMobile?.addEventListener("click", () => toggleDropdown(dropdownMobile));

async function carregarAgendamentos(userId) {
  if (!userId) return;

  const q = query(collection(db, "agendamentos"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  const agendamentos = snapshot.docs.map(doc => doc.data());

  function renderAgendamentos(container) {
    if (!container) return;
    container.innerHTML = "";
    if (agendamentos.length === 0) {
      container.innerHTML = `<p class="text-zinc-400">Você ainda não possui agendamentos.</p>`;
      return;
    }
    agendamentos.forEach(a => {
      const div = document.createElement("div");
      div.className = "bg-zinc-800 p-3 rounded-lg border border-zinc-700 mb-2";
      div.innerHTML = `
        <p><span class="font-semibold text-amber-500">Serviço:</span> ${a.servico}</p>
        <p><span class="font-semibold text-amber-500">Barbeiro:</span> ${a.barbeiro}</p>
        <p><span class="font-semibold text-amber-500">Data:</span> ${a.data}</p>
        <p><span class="font-semibold text-amber-500">Horário:</span> ${a.horario}</p>
      `;
      container.appendChild(div);
    });
  }

  renderAgendamentos(containerDesktop);
  renderAgendamentos(containerMobile);
}

// ============================
// CONTROLE DE AUTENTICAÇÃO
// ============================
onAuthStateChanged(auth, async (user) => {

  if (user) {
    const nome = user.displayName || "Cliente";

    // Saudações
    if (greeting) greeting.textContent = `Olá, ${nome}`;
    if (mobileGreeting) mobileGreeting.textContent = `Olá, ${nome}`;

    // Login/Logout
    logoutBtns.forEach(b => b?.classList.remove("hidden"));
    loginBtns.forEach(b => b?.classList.add("hidden"));

    // Mostrar "Meus Agendamentos"
    btnDesktop?.classList.remove("hidden");
    btnMobile?.classList.remove("hidden");
    carregarAgendamentos(user.uid);

    // Verifica se é admin
    try {
      const ref = doc(db, "usuarios", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().role === "admin") {
        adminBtn?.classList.remove("hidden");
        mobileAdminBtn?.classList.remove("hidden");
      } else {
        adminBtn?.classList.add("hidden");
        mobileAdminBtn?.classList.add("hidden");
      }
    } catch (err) {
      console.error("Erro ao verificar admin:", err);
      adminBtn?.classList.add("hidden");
      mobileAdminBtn?.classList.add("hidden");
    }

  } else {
    // Usuário não logado
    if (greeting) greeting.textContent = "";
    if (mobileGreeting) mobileGreeting.textContent = "";

    logoutBtns.forEach(b => b?.classList.add("hidden"));
    loginBtns.forEach(b => b?.classList.remove("hidden"));

    btnDesktop?.classList.add("hidden");
    btnMobile?.classList.add("hidden");
    adminBtn?.classList.add("hidden");
    mobileAdminBtn?.classList.add("hidden");

    if (containerDesktop) containerDesktop.innerHTML = "";
    if (containerMobile) containerMobile.innerHTML = "";
  }
});