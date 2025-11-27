// meus-agendamentos.js (ATUALIZADO - horarios dinâmicos conforme duracao do servico)
import { auth, db } from "./firebase-config.js";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import {
  enviarNotificacoesCancelamento,
  enviarNotificacoesRemarcacao
} from "./notifications.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";


const agendamentosList = document.getElementById("agendamentos-list");

// mapa de serviços com duração (minutos) e preço — mantenha sincronizado com seu script.js / Firestore
const servicos = [
  { nome: "Corte", preco: 30, duracao: 30 },
  { nome: "Corte e Barba", preco: 60, duracao: 60 },
  { nome: "Barba Completa", preco: 40, duracao: 30 },
  { nome: "Corte + Alisamento", preco: 60, duracao: 30 },
  { nome: "Corte + Barba + Alisamento", preco: 80, duracao: 60 },
  { nome: "Corte + Barba + Pigmentacao", preco: 70, duracao: 60 },
  { nome: "Sobrancelha na Navalha", preco: 5, duracao: 0 },
  { nome: "Bigode na Navalha", preco: 5, duracao: 0 },
  { nome: "Risquinho Simples", preco: 5, duracao: 0 },
  { nome: "Bigode e Cavanhaque", preco: 10, duracao: 10 },
];

// ---------- helpers ----------
function hhmmToMinutes(hhmm) {
  if (!hhmm) return null;
  const [hh, mm] = hhmm.split(":").map(Number);
  return hh * 60 + mm;
}

function minutesToHHMM(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getServiceDurationByName(name) {
  if (!name) return 30;
  const s = servicos.find(x => x.nome === name);
  return s ? (s.duracao || 30) : 30;
}

// Se o campo servico do agendamento for array (multi-serviço), soma as durações
function getBookingDuration(servicoField) {
  if (!servicoField) return 30;
  if (Array.isArray(servicoField)) {
    return servicoField.reduce((acc, s) => acc + (getServiceDurationByName(s) || 0), 0);
  }
  return getServiceDurationByName(servicoField);
}

// retorna array de {start:minutes, end:minutes} dos agendamentos (do mesmo barbeiro) naquele dia
function buildOccupiedRanges(bookings) {
  return bookings.map(b => {
    const start = hhmmToMinutes(b.horario || b.hora || "");
    const duration = getBookingDuration(b.servico);
    const end = start !== null ? start + (duration || 30) : null;
    return { start, end };
  }).filter(r => r.start !== null && r.end !== null);
}

// verifica se [s,e) sobrepõe com qualquer occupied
function overlapsAny(s, e, occupied) {
  return occupied.some(o => !(e <= o.start || s >= o.end)); // se não for totalmente antes ou depois -> overlap
}

// retorna horários disponíveis para a data/barbeiro considerando duração do serviço
async function computeAvailableSlotsFor(dateStr, barbeiroName, serviceDurationMinutes) {
  // 1) determina horário de funcionamento baseado no dia da semana
  const dParts = dateStr.split("-");
  const dateObj = new Date(Number(dParts[0]), Number(dParts[1]) -1, Number(dParts[2]));
  const dow = dateObj.getDay(); // 0 = dom, 1 = seg...

  let opening = 9, closing = 20; // valores em horas
  if (dow === 6) { // sábado
    opening = 9;
    closing = 18;
  } else if (dow === 0) { // domingo fechado
    return [];
  }

  // intervalo e lunch (mesmo comportamento do agendamento principal)
  const lunchStart = 12 * 60; // 12:00
  const lunchEnd = 13.5 * 60; // 13:30
  const interval = 15; // em minutos

  // 2) buscar agendamentos do mesmo barbeiro e mesma data
  const q = query(
    collection(db, "agendamentos"),
    where("data", "==", dateStr),
    where("barbeiro", "==", barbeiroName)
  );
  const snap = await getDocs(q);
  const bookings = snap.docs.map(s => ({ id: s.id, ...s.data() }));

  // 3) gerar occupied ranges
  const occupied = buildOccupiedRanges(bookings);

  // 4) gerar candidatos de horários (em minutos)
  const slots = [];
  const openingMin = opening * 60;
  const closingMin = closing * 60;

  for (let start = openingMin; start + serviceDurationMinutes <= closingMin; start += interval) {
    const end = start + serviceDurationMinutes;

    // pular almoço
    if (start < lunchEnd && end > lunchStart) continue;

    // se hoje, pular horários passados
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    if (dateStr === todayStr) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      if (end <= nowMinutes) continue; // já passou
    }

    // checar overlap com agendamentos ocupados
    if (overlapsAny(start, end, occupied)) continue;

    // tudo certo, incluir
    slots.push(minutesToHHMM(start));
  }

  return slots;
}

// elementos do menu
const greeting = document.getElementById('user-greeting');
const mobileGreeting = document.getElementById('mobile-user-greeting');

const logoutBtns = [
    document.getElementById('logout-btn'),
    document.getElementById('mobile-logout-btn')
];

const loginBtns = [
    document.getElementById('login-btn'),
    document.getElementById('mobile-login-btn')
];

const adminBtn = document.getElementById("admin-btn");
const mobileAdminBtn = document.getElementById("mobile-admin-btn");

// verifica login para o MENU
onAuthStateChanged(auth, async (user) => {

    if (user) {
        const nome = user.displayName || "Cliente";

        if (greeting) greeting.textContent = `Olá, ${nome}`;
        if (mobileGreeting) mobileGreeting.textContent = `Olá, ${nome}`;

        logoutBtns.forEach(btn => btn?.classList.remove("hidden"));
        loginBtns.forEach(btn => btn?.classList.add("hidden"));

        // verifica admin
        try {
            const ref = doc(db, "usuarios", user.uid);
            const snap = await getDoc(ref);

            const isAdmin = snap.exists() && snap.data().role === "admin";

            if (isAdmin) {
                adminBtn?.classList.remove("hidden");
                mobileAdminBtn?.classList.remove("hidden");
            } else {
                adminBtn?.classList.add("hidden");
                mobileAdminBtn?.classList.add("hidden");
            }
        } catch (err) {
            console.error("Erro ao ler admin:", err);
            adminBtn?.classList.add("hidden");
            mobileAdminBtn?.classList.add("hidden");
        }

    } else {
        if (greeting) greeting.textContent = "";
        if (mobileGreeting) mobileGreeting.textContent = "";

        logoutBtns.forEach(btn => btn?.classList.add("hidden"));
        loginBtns.forEach(btn => btn?.classList.remove("hidden"));

        adminBtn?.classList.add("hidden");
        mobileAdminBtn?.classList.add("hidden");
    }
});

// evento logout
logoutBtns.forEach(btn => {
    btn?.addEventListener("click", async () => {
        await signOut(auth);
        window.location.href = "index.html";
    });
});


// ---------- main ----------
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const q = query(
    collection(db, "agendamentos"),
    where("userId", "==", user.uid)
  );

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    agendamentosList.innerHTML = `<p class="text-zinc-400 col-span-full">Você não possui agendamentos.</p>`;
    return;
  }

  agendamentosList.innerHTML = ""; // limpa

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();

    let statusColor;
    switch ((data.status || "").toLowerCase()) {
      case "confirmado": statusColor = "text-green-400"; break;
      case "cancelado": statusColor = "text-red-400"; break;
      default: statusColor = "text-yellow-400";
    }

    const card = document.createElement("div");
    card.className = "bg-zinc-800 p-6 rounded-xl shadow-lg transform transition hover:scale-105 duration-300 relative";

    card.innerHTML = `
      <h2 class="text-xl font-semibold mb-3 text-amber-400">${data.servico}</h2>
      <p class="flex items-center mb-1"><span class="mr-2">💈</span>${data.barbeiro}</p>
      <p class="flex items-center mb-1"><span class="mr-2">📅</span>${data.data}</p>
      <p class="flex items-center mb-1"><span class="mr-2">⏰</span>${data.horario}</p>
      <p class="flex items-center mb-3 ${statusColor} font-semibold"><span class="mr-2">ℹ️</span>${data.status || 'Pendente'}</p>
      <button class="cancel-btn absolute top-4 right-4 bg-red-500 text-zinc-950 px-3 py-1 rounded-lg hover:bg-red-400 transition">Cancelar</button>
    `;

    // ===============================
    // BLOQUEAR ALTERAÇÃO OU CANCELAMENTO
    // ===============================
    const btnCancel = card.querySelector(".cancel-btn");
    const agora = new Date();
    const dataAg = new Date(`${data.data}T${(data.horario||data.hora||"00:00")}`);

    let podeAlterarOuCancelar =
      ( (data.status || "").toLowerCase() === "pendente" || (data.status || "").toLowerCase() === "confirmado") &&
      dataAg > agora;

    // ===============================
    // BOTÃO CANCELAR OU ALTERAR
    
    btnCancel.addEventListener("click", async () => {
  if (!podeAlterarOuCancelar) return;

  await updateDoc(doc(db, "agendamentos", docSnap.id), { status: "cancelado" });

  // dispara notificações (cliente + barbeiro)
  enviarNotificacoesCancelamento({
    nome: data.nome,
    email: data.email,
    telefone: data.telefone,
    servico: data.servico,
    barbeiro: data.barbeiro,
    data: data.data,
    hora: data.horario || data.hora
  });

  card.querySelector("p.flex.items-center.mb-3").className =
    "flex items-center mb-3 text-red-400 font-semibold";
  card.querySelector("p.flex.items-center.mb-3").textContent = "Cancelado";
  btnCancel.remove();
});

   

    // ===============================
    // BOTÃO ALTERAR (IN-LINE)
    // ===============================
    const btnAlterar = document.createElement("button");
    btnAlterar.className =
      "absolute bottom-4 right-4 bg-blue-500 text-zinc-950 px-3 py-1 rounded-lg hover:bg-blue-400 transition";
    btnAlterar.textContent = "Alterar";
    card.appendChild(btnAlterar);

    // aplicar bloqueio visual se não pode alterar/cancelar
    if (!podeAlterarOuCancelar) {
      btnCancel.style.display = "none";
      btnAlterar.style.display = "none";
    }

    // evento do botão alterar
    btnAlterar.addEventListener("click", async () => {
      btnCancel.style.display = "none";
      btnAlterar.style.display = "none";

      const editor = document.createElement("div");
      editor.className =
        "mt-4 p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl";

      editor.innerHTML = `
          <label class="block mb-2 text-zinc-300 font-semibold">Nova Data:</label>
          <input type="date" id="edit-data"
            class="w-full mb-4 p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-200" />

          <label class="block mb-2 text-zinc-300 font-semibold">Novo Horário:</label>
          <select id="edit-horario"
            class="w-full mb-4 p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-200">
            <option>Selecione uma data</option>
          </select>

          <div class="flex justify-end gap-3">
            <button id="cancelar-edicao"
              class="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300">Voltar</button>

            <button id="salvar-edicao"
              class="px-4 py-2 rounded bg-blue-500 hover:bg-blue-400 text-zinc-900 font-semibold">Salvar</button>
          </div>
        `;

      card.appendChild(editor);

      const inputData = editor.querySelector("#edit-data");
      const selectHorario = editor.querySelector("#edit-horario");

      // === FLATPICKR com cálculo dinâmico de horários ===
      flatpickr(inputData, {
        minDate: "today",
        dateFormat: "Y-m-d",
        disable: [d => new Date(d.getTime() + d.getTimezoneOffset() * 60000).getDay() === 0], // domingo off
        onChange: async (selectedDates) => {
          const dataEscolhida = selectedDates[0];
          if (!dataEscolhida) return;

          const dateStr = inputData.value; // YYYY-MM-DD
          // pegar duração do serviço do agendamento atual
          const duration = getBookingDuration(data.servico);

          // calcular slots dinâmicos
          const slots = await computeAvailableSlotsFor(dateStr, data.barbeiro, duration);

          selectHorario.innerHTML = slots.length
            ? slots.map(h => `<option value="${h}">${h}</option>`).join("")
            : `<option>Nenhum horário disponível</option>`;
        }
      });

      // VOLTAR
      editor.querySelector("#cancelar-edicao").onclick = () => {
        editor.remove();
        btnCancel.style.display = "block";
        btnAlterar.style.display = "block";
      };

      // SALVAR
      editor.querySelector("#salvar-edicao").onclick = async () => {
  const novaData = inputData.value;
  const novoHorario = selectHorario.value;

  if (!novaData || !novoHorario) {
    alert("Selecione data e horário.");
    return;
  }

  try {
    // dados antigos
    const antigo = {
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      servico: data.servico,
      barbeiro: data.barbeiro,
      data: data.data,
      hora: data.horario || data.hora
    };

    // dados novos
    const novo = {
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      servico: data.servico,
      barbeiro: data.barbeiro,
      data: novaData,
      hora: novoHorario
    };

    // atualizar Firestore
    await updateDoc(doc(db, "agendamentos", docSnap.id), {
      data: novaData,
      horario: novoHorario,
      status: "reagendado",
      atualizadoEm: new Date()
    });

    // notificação automática
    enviarNotificacoesRemarcacao(antigo, novo);

    alert("Horário alterado com sucesso!");
    location.reload();

  } catch (err) {
    console.error(err);
    alert("Erro ao alterar horário.");
  }
};

    });

    agendamentosList.appendChild(card);
  });
});

