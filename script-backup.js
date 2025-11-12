import { auth, db } from "./firebase-config.js";
import { addDoc, collection, getDocs, query, where, doc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

window.auth = auth;

const serviceDurations = { "Corte Clássico": 30, "Barba Completa": 30, "Combo: Corte + Barba": 60 };
let currentStep = 1;

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

async function updateSummary() {
  const serviceEl = document.querySelector('input[name="service"]:checked');
  const barberEl = document.querySelector('input[name="barber"]:checked');
  const dateEl = document.getElementById("date");
  const timeEl = document.getElementById("time");
  if (!serviceEl || !barberEl || !dateEl || !timeEl) return;
  const userName = await getUserName();
  document.getElementById("summary-name").textContent = userName;
  document.getElementById("summary-service").textContent = serviceEl.value;
  document.getElementById("summary-barber").textContent = barberEl.value;
  document.getElementById("summary-date").textContent = new Date(dateEl.value).toLocaleDateString("pt-BR");
  document.getElementById("summary-time").textContent = timeEl.value;
}

function showStep(step) {
  document.querySelectorAll(".step").forEach(s => s.classList.add("hidden"));
  document.getElementById(`step-${step}`).classList.remove("hidden");
  currentStep = step;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function nextStep(step) {
  showStep(step);
  if (step === 4) await updateSummary();
}

function prevStep(step) { showStep(step); }

async function updateAvailableTimes() {
  const serviceInput = document.querySelector('input[name="service"]:checked');
  const dateInput = document.getElementById("date");
  const timeSelect = document.getElementById("time");
  if (!serviceInput || !dateInput.value) { timeSelect.innerHTML = `<option value="">Selecione uma data e serviço</option>`; return; }

  const service = serviceInput.value;
  const duration = serviceDurations[service] || 30;
  const selectedDate = new Date(dateInput.value);
  const today = new Date();
  const isToday = selectedDate.toDateString() === today.toDateString();
  const day = selectedDate.getDay();

  if (day === 0) { alert("Não trabalhamos no domingo!"); dateInput.value = ""; timeSelect.innerHTML = `<option value="">Selecione uma data e serviço</option>`; return; }

  const opening = 9, closing = day === 6 ? 18 : 20, lunchStart = 12, lunchEnd = 13.5, interval = 15;
  const slots = [];
  for (let h = opening; h < closing; h++) for (let m = 0; m < 60; m += interval) {
    const startMinutes = h * 60 + m, endMinutes = startMinutes + duration;
    if (endMinutes > closing * 60) continue;
    if (startMinutes < lunchEnd * 60 && endMinutes > lunchStart * 60) continue;
    if (isToday && startMinutes <= today.getHours() * 60 + today.getMinutes()) continue;
    slots.push(startMinutes);
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
      const agEnd = agStart + (serviceDurations[ag.servico] || 30);
      return minutes < agEnd && endMinutes > agStart;
    });
    if (occupied) return;
    const hStr = String(startH).padStart(2, "0"), mStr = String(startM).padStart(2, "0");
    const option = document.createElement("option"); option.value = `${hStr}:${mStr}`; option.textContent = `${hStr}:${mStr}`; timeSelect.appendChild(option);
  });

  const oldWarning = document.getElementById("no-slots-warning"); if (oldWarning) oldWarning.remove();
  if (timeSelect.options.length === 1) {
    timeSelect.innerHTML = `<option value="">Nenhum horário disponível</option>`;
    const warning = document.createElement("div");
    warning.id = "no-slots-warning";
    warning.innerHTML = `<span style="display:inline-block;margin-right:6px;animation:pulse 1.5s infinite;">⚠️</span>
                         <span>Não há mais horários disponíveis neste dia.</span>`;
    warning.style.color = "#eab308"; warning.style.marginTop = "8px"; warning.style.fontWeight = "600"; warning.style.textAlign = "center"; warning.style.opacity = "0"; warning.style.transition = "opacity 0.5s ease-in-out";
    timeSelect.parentElement.appendChild(warning);
    setTimeout(() => warning.style.opacity = "1", 50);
  }
  updateSummary();
}

document.addEventListener("DOMContentLoaded", () => {
  const dateInput = document.getElementById("date");
  // Inicializa o Flatpickr no input de data
if (dateInput) {
  flatpickr.localize(flatpickr.l10ns.pt); // Localização PT-BR

  flatpickr(dateInput, {
    minDate: "today",
    dateFormat: "Y-m-d",
    disable: [
      function(date) { return date.getDay() === 0; } // desabilita domingos
    ],
    locale: "pt",
    onChange: function(selectedDates, dateStr) {
      updateAvailableTimes();
    },
    monthSelectorType: "dropdown", // permite selecionar qualquer mês/ano
  });
}

  const timeSelect = document.getElementById("time");
  const userNameEl = document.getElementById("user-name");
  const bookingForm = document.getElementById("booking-form");
  const submitBtn = document.getElementById("submit-btn");
  const toast = document.getElementById("toast");

  // Nome usuário
  if (auth) {
    const user = auth.currentUser;
    if (user) userNameEl.textContent = `Olá, ${user.displayName || user.email.split("@")[0]}`;
    auth.onAuthStateChanged(user => { if (!user) window.location.href = "login.html"; else userNameEl.textContent = `Olá, ${user.displayName || user.email.split("@")[0]}`; });
  }

  // Logout
  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    try { await auth.signOut(); window.location.href = "login.html"; } catch (err) { console.error(err); }
  });

  // Navegação multi-step
  document.getElementById("next-1").addEventListener("click", () => nextStep(2));
  document.getElementById("next-2").addEventListener("click", () => nextStep(3));
  document.getElementById("next-3").addEventListener("click", () => nextStep(4));
  document.getElementById("prev-2").addEventListener("click", () => prevStep(1));
  document.getElementById("prev-3").addEventListener("click", () => prevStep(2));
  document.getElementById("prev-4").addEventListener("click", () => prevStep(3));

  // Submissão
  bookingForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth?.currentUser;
    if (!user) { alert("Você precisa estar logado para agendar."); return; }

    const service = document.querySelector('input[name="service"]:checked').value;
    const barber = document.querySelector('input[name="barber"]:checked').value;
    const date = dateInput.value;
    const time = timeSelect.value;

    submitBtn.textContent = "Confirmando..."; submitBtn.disabled = true;

    try {
      let telefone = "";
      try { const userDoc = await getDoc(doc(db, "usuarios", user.uid)); if (userDoc.exists()) telefone = userDoc.data().telefone || ""; } catch (err) { console.warn(err); }

      await addDoc(collection(db, "agendamentos"), {
        nome: user.displayName || user.email.split("@")[0],
        email: user.email,
        telefone,
        servico: service,
        barbeiro: barber,
        data: date,
        hora: time,
        userId: user.uid,
        status: "pendente",
        criadoEm: serverTimestamp()
      });

      toast.querySelector("p:first-child").textContent = "Agendamento confirmado!";
      toast.querySelector("p:last-child").textContent = "Você receberá uma confirmação por e-mail.";
      toast.classList.remove("hidden", "bg-red-500"); toast.classList.add("bg-green-500");

      setTimeout(() => { toast.classList.add("hidden"); window.location.href = "index.html"; }, 4000);

    } catch (err) {
      console.error(err);
      toast.querySelector("p:first-child").textContent = "Erro no agendamento!";
      toast.querySelector("p:last-child").textContent = "Não foi possível criar o agendamento. Tente novamente.";
      toast.classList.remove("hidden", "bg-green-500"); toast.classList.add("bg-red-500");
      setTimeout(() => { toast.classList.add("hidden"); toast.classList.remove("bg-red-500"); }, 4000);
    } finally { submitBtn.textContent = "Confirmar Agendamento"; submitBtn.disabled = false; }
  });
});
