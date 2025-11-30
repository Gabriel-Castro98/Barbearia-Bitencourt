/* BLOCO 1 - BASE E START */
import { auth, db } from "./firebase-config.js"
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js"

// Globals
const tabelaAgendamentos = document.getElementById("bookings-table")
let todosAgendamentos = []
let agendamentoAtual = null
let mapaServicos = {} // nome -> { preco, duracao, descricao, id }

// Chart instances (para destruir antes de recriar)
let chartAgendamentosDia = null
let chartServicosPopulares = null
let chartCancelamentos = null
let chartClientesVIP = null
let chartFaturamento = null
let chartServicosMensal = null

// Inicialização: carrega serviços -> abre listener de agendamentos
async function iniciarSistema() {
  await carregarMapaServicos().catch(err => console.warn("Falha ao carregar serviços inicial:", err))
  carregarAgendamentos()
}
iniciarSistema()

/* BLOCO 2 - CARREGAMENTO DE DADOS */

// Carrega coleção "servicos" em mapa (nome => {preco, duracao, descricao})
async function carregarMapaServicos() {
  try {
    const snap = await getDocs(collection(db, "servicos"))
    mapaServicos = {}
    snap.forEach(docSnap => {
      const d = docSnap.data()
      if (!d || !d.nome) return
      mapaServicos[d.nome] = {
        preco: Number(d.preco ?? 0),
        duracao: Number(d.duracao ?? 0),
        descricao: d.descricao ?? "",
        id: docSnap.id
      }
    })
  } catch (err) {
    console.error("Erro ao carregar servicos:", err)
    mapaServicos = {}
  }
}

// Carrega agendamentos em tempo real e atualiza UI/graficos
function carregarAgendamentos() {
  const q = query(collection(db, "agendamentos"), orderBy("data"))
  onSnapshot(q, async (snapshot) => {
    todosAgendamentos = []
    snapshot.forEach(docSnap => {
      todosAgendamentos.push({ id: docSnap.id, ...docSnap.data() })
    })

    // renderizar tabela e calcular métricas/graficos
    renderizarAgendamentos()
    // garante que mapaServicos existirá para calcular faturamento
    if (!mapaServicos || Object.keys(mapaServicos).length === 0) {
      await carregarMapaServicos().catch(e => console.warn("Erro fallback mapServicos:", e))
    }
    atualizarEstatisticasCompletas()
    atualizarGraficos()
  }, (err) => {
    console.error("Erro no snapshot agendamentos:", err)
  })
}

/* BLOCO 3 - ESTATÍSTICAS */

// Atualiza estatísticas básicas (existentes no HTML)
function atualizarEstatisticasBasicas() {
  document.getElementById("stat-total").innerText = todosAgendamentos.length
  document.getElementById("stat-confirmed").innerText =
    todosAgendamentos.filter(a => (a.status || "").toLowerCase() === "confirmado").length

  const hoje = new Date().toISOString().slice(0, 10)
  document.getElementById("stat-today").innerText =
    todosAgendamentos.filter(a => a.data === hoje).length
}

// Atualiza estatísticas master (faturamento, ticket, clientes unicos, top service, top hour)
function atualizarEstatisticasMaster() {
  if (!todosAgendamentos || todosAgendamentos.length === 0) {
    document.getElementById("stat-revenue").innerText = formatarBRL(0)
    document.getElementById("stat-ticket").innerText = formatarBRL(0)
    document.getElementById("stat-clients").innerText = "0"
    document.getElementById("stat-top-service").innerText = "—"
    document.getElementById("stat-top-hour").innerText = "—"
    return
  }

  const statusValidos = ["concluido", "confirmado"] // ajuste se quiser incluir outros
  const agendamentosValidos = todosAgendamentos.filter(a => statusValidos.includes((a.status || "").toLowerCase()))

  // faturamento
  let faturamento = 0
  agendamentosValidos.forEach(a => {
    const svc = mapaServicos[a.servico]
    if (svc && !isNaN(svc.preco)) faturamento += Number(svc.preco)
    else if (a.preco) faturamento += Number(a.preco)
  })

  const ticketMedio = agendamentosValidos.length > 0 ? (faturamento / agendamentosValidos.length) : 0

  // clientes únicos por telefone
  const telefones = new Set()
  todosAgendamentos.forEach(a => {
    const tel = (a.telefone || "").replace(/\D/g, "")
    if (tel) telefones.add(tel)
  })
  const totalClientes = telefones.size

  // serviço mais agendado
  const contadorServicos = {}
  todosAgendamentos.forEach(a => {
    const nome = a.servico || "—"
    contadorServicos[nome] = (contadorServicos[nome] || 0) + 1
  })
  const servicoTop = Object.entries(contadorServicos).sort((a,b)=>b[1]-a[1])[0]?.[0] || "—"

  // horário mais movimentado
  const contadorHorarios = {}
  todosAgendamentos.forEach(a => {
    const hora = a.horario || "—"
    contadorHorarios[hora] = (contadorHorarios[hora] || 0) + 1
  })
  const horarioTop = Object.entries(contadorHorarios).sort((a,b)=>b[1]-a[1])[0]?.[0] || "—"

  // atualizar DOM
  document.getElementById("stat-revenue").innerText = formatarBRL(faturamento)
  document.getElementById("stat-ticket").innerText = formatarBRL(ticketMedio)
  document.getElementById("stat-clients").innerText = String(totalClientes)
  document.getElementById("stat-top-service").innerText = servicoTop
  document.getElementById("stat-top-hour").innerText = horarioTop
}

function atualizarEstatisticasCompletas() {
  atualizarEstatisticasBasicas()
  atualizarEstatisticasMaster()
}

// helper formatador
function formatarBRL(valor) {
  const numero = Number(valor) || 0
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 })
}

/* BLOCO 4 - TABELA E MODAIS */

// Renderizar agendamentos na tabela
function renderizarAgendamentos() {
  if (!tabelaAgendamentos) return

  if (todosAgendamentos.length === 0) {
    tabelaAgendamentos.innerHTML = `<tr><td colspan="7" class="text-center p-6">Nenhum agendamento encontrado.</td></tr>`
    return
  }

  tabelaAgendamentos.innerHTML = todosAgendamentos.map(ag => `
    <tr class="hover:bg-zinc-800 transition">
      <td class="px-6 py-4">${escapeHtml(ag.nome)}</td>
      <td class="px-6 py-4">${escapeHtml(ag.servico || "-")}</td>
      <td class="px-6 py-4">${escapeHtml(ag.barbeiro || "-")}</td>
      <td class="px-6 py-4">${escapeHtml(ag.data || "-")} ${escapeHtml(ag.horario || "")}</td>
      <td class="px-6 py-4">${escapeHtml(ag.telefone || "-")}</td>
      <td class="px-6 py-4">${escapeHtml(ag.status || "-")}</td>
      <td class="px-6 py-4 space-x-2">
        <button class="px-2 py-1 bg-blue-600 rounded text-xs" data-action="remarcar" data-id="${ag.id}">Remarcar</button>
        <button class="px-2 py-1 bg-teal-600 rounded text-xs" data-action="observacoes" data-id="${ag.id}">Obs</button>
        <button class="px-2 py-1 bg-purple-600 rounded text-xs" data-action="historico" data-id="${ag.id}">Histórico</button>
      </td>
    </tr>
  `).join("")
}

// escape simples
function escapeHtml(str) {
  if (typeof str !== "string") return str || ""
  return str.replaceAll("&","&amp;")
            .replaceAll("<","&lt;")
            .replaceAll(">","&gt;")
            .replaceAll('"',"&quot;")
            .replaceAll("'", "&#039;")
}

// eventos globais de clique (delegation)
document.addEventListener("click", (event) => {
  const botao = event.target.closest("[data-action]")
  if (!botao) return
  const acao = botao.dataset.action
  const id = botao.dataset.id
  if (!id && acao !== "close-modal") return

  if (acao === "remarcar") abrirModalRemarcar(id)
  if (acao === "observacoes") abrirModalObservacoes(id)
  if (acao === "historico") abrirModalHistorico(id)
  if (acao === "close-modal") closeModal()
})

// modais
function abrirModalRemarcar(id) {
  agendamentoAtual = id
  exibirModal("modal-remarcar")
}
function abrirModalObservacoes(id) {
  agendamentoAtual = id
  exibirModal("modal-observacoes")
}
function abrirModalHistorico(id) {
  agendamentoAtual = id
  exibirModal("modal-historico")
}
function exibirModal(idModal) {
  document.getElementById("modal-overlay").classList.remove("hidden")
  document.getElementById(idModal).classList.remove("hidden")
}
window.closeModal = function () {
  document.getElementById("modal-overlay").classList.add("hidden")
  document.querySelectorAll(".modal-card").forEach(m => m.classList.add("hidden"))
}

// salvar remarcar
window.salvarRemarcacao = async function() {
  const novaData = document.getElementById("remarcar-data").value
  const novoHorario = document.getElementById("remarcar-hora").value
  if (!novaData || !novoHorario) {
    alert("Selecione nova data e hora")
    return
  }
  await updateDoc(doc(db, "agendamentos", agendamentoAtual), {
    data: novaData,
    horario: novoHorario,
    status: "Reagendado"
  })
  closeModal()
}

/* BLOCO 5 - GRÁFICOS (construção e montagem) */

// helper: opções padrão Chart.js com cores do tema escuro
function chartOptions({showLegend=true, legendPosition="top", yCurrency=false} = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: legendPosition,
        labels: { color: "#ffffff" }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const v = context.raw
            if (yCurrency) return formatarBRL(v)
            return typeof v === "number" ? String(v) : v
          }
        }
      }
    },
    scales: {
      x: { ticks: { color: "#cccccc" } },
      y: { ticks: { color: "#cccccc" } }
    }
  }
}

/* 1) Agendamentos por dia (ultimos N dias) */
function construirAgendamentosPorDia(agendamentos, dias = 30) {
  const labels = []
  const mapa = {}
  const hoje = new Date()
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoje)
    d.setDate(hoje.getDate() - i)
    const key = d.toISOString().slice(0,10)
    labels.push(key)
    mapa[key] = 0
  }
  agendamentos.forEach(a => { if (a.data && mapa[a.data] !== undefined) mapa[a.data]++ })
  const data = labels.map(l => mapa[l] || 0)
  return { labels, data }
}
function montarChartAgendamentosDia(labels, data) {
  const ctx = document.getElementById("chart-agendamentos-dia")
  if (!ctx) return
  if (chartAgendamentosDia) chartAgendamentosDia.destroy()
  chartAgendamentosDia = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label: "Agendamentos", data, borderWidth: 0 }] },
    options: chartOptions({ showLegend:false })
  })
}

/* 2) Serviços mais populares (pizza) */
function construirServicosPopulares(agendamentos, topN = 8) {
  const contador = {}
  agendamentos.forEach(a => { const n = a.servico || "—"; contador[n] = (contador[n]||0)+1 })
  const entries = Object.entries(contador).sort((a,b)=>b[1]-a[1]).slice(0,topN)
  return { labels: entries.map(e=>e[0]), data: entries.map(e=>e[1]) }
}
function montarChartServicosPopulares(labels, data) {
  const ctx = document.getElementById("chart-servicos-populares")
  if (!ctx) return
  if (chartServicosPopulares) chartServicosPopulares.destroy()
  chartServicosPopulares = new Chart(ctx, {
    type: "pie",
    data: { labels, datasets: [{ label: "Serviços", data, borderWidth: 1 }] },
    options: chartOptions({ showLegend:true, legendPosition:"right" })
  })
}

/* 3) Cancelamentos do mês (colunas) */
function construirCancelamentosMes(agendamentos) {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  const diasNoMes = new Date(ano, mes+1, 0).getDate()
  const labels = []
  const mapa = {}
  for (let d=1; d<=diasNoMes; d++) {
    const key = `${ano}-${String(mes+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`
    labels.push(key); mapa[key]=0
  }
  agendamentos.forEach(a => {
    if (!a.data) return
    if ((a.status||"").toLowerCase() === "cancelado" && mapa[a.data] !== undefined) mapa[a.data]++
  })
  return { labels, data: labels.map(l => mapa[l]||0) }
}
function montarChartCancelamentos(labels, data) {
  const ctx = document.getElementById("chart-cancelamentos")
  if (!ctx) return
  if (chartCancelamentos) chartCancelamentos.destroy()
  chartCancelamentos = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label: "Cancelamentos", data, borderWidth: 0 }] },
    options: chartOptions({ showLegend:false })
  })
}

/* 4) Clientes VIP (linha) - top K clientes, visitas por mês últimos N meses */
function construirClientesVIPSeries(agendamentos, meses = 6, topK = 5) {
  const contador = {}
  agendamentos.forEach(a => {
    const tel = (a.telefone||"").replace(/\D/g,"")
    const key = tel || (a.nome||"Anônimo")
    contador[key] = (contador[key]||0)+1
  })
  const topClientes = Object.entries(contador).sort((a,b)=>b[1]-a[1]).slice(0,topK).map(e=>e[0])
  const labels = []
  const hoje = new Date()
  for (let i=meses-1;i>=0;i--){
    const d = new Date(hoje.getFullYear(), hoje.getMonth()-i,1)
    labels.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`)
  }
  const series = topClientes.map(cliente => {
    const data = labels.map(label=>{
      let c = 0
      agendamentos.forEach(a=>{
        const tel = (a.telefone||"").replace(/\D/g,"")
        const key = tel || (a.nome||"Anônimo")
        if (key !== cliente) return
        if (!a.data) return
        if (a.data.slice(0,7) === label) c++
      })
      return c
    })
    return { label: cliente, data }
  })
  return { labels, series }
}
function montarChartClientesVIP(labels, series) {
  const ctx = document.getElementById("chart-clientes-vip")
  if (!ctx) return
  if (chartClientesVIP) chartClientesVIP.destroy()
  const datasets = series.map(s=>({ label: s.label, data: s.data, fill:false, tension:0.3, borderWidth:2 }))
  chartClientesVIP = new Chart(ctx, { type: "line", data: { labels, datasets }, options: chartOptions({ showLegend:true, legendPosition:"right" }) })
}

/* 5) Faturamento últimos N dias (linha) */
function construirFaturamentoUltimosDias(agendamentos, mapaServicosLocal, dias=30) {
  const labels = []
  const mapa = {}
  const hoje = new Date()
  for (let i=dias-1;i>=0;i--){
    const d = new Date(hoje); d.setDate(hoje.getDate()-i)
    const key = d.toISOString().slice(0,10)
    labels.push(key); mapa[key]=0
  }
  const statusValidos = ["concluido","confirmado"]
  agendamentos.forEach(a=>{
    if (!a.data) return
    if (!statusValidos.includes((a.status||"").toLowerCase())) return
    const preco = (mapaServicosLocal[a.servico] && Number(mapaServicosLocal[a.servico].preco)) || (a.preco?Number(a.preco):0)
    if (mapa[a.data] !== undefined) mapa[a.data] += preco
  })
  return { labels, data: labels.map(l=>mapa[l]||0) }
}
function montarChartFaturamento(labels, data) {
  const ctx = document.getElementById("chart-faturamento")
  if (!ctx) return
  if (chartFaturamento) chartFaturamento.destroy()
  chartFaturamento = new Chart(ctx, {
    type: "line",
    data: { labels, datasets: [{ label: "Faturamento (R$)", data, borderWidth:2, fill:false, tension:0.25 }] },
    options: chartOptions({ showLegend:false, yCurrency:true })
  })
}

/* 6) Comparativo Mês Atual vs Mês Passado (servicos) */
function construirServicosMensal(agendamentos) {
  const hoje = new Date()
  const mesAtualStr = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,"0")}`
  const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth()-1, 1)
  const mesPassadoStr = `${mesPassado.getFullYear()}-${String(mesPassado.getMonth()+1).padStart(2,"0")}`

  const contadorAtual = {}
  const contadorPassado = {}
  agendamentos.forEach(a=>{
    if (!a.data) return
    const ym = a.data.slice(0,7)
    if (ym === mesAtualStr) contadorAtual[a.servico || "—"] = (contadorAtual[a.servico||"—"]||0)+1
    if (ym === mesPassadoStr) contadorPassado[a.servico || "—"] = (contadorPassado[a.servico||"—"]||0)+1
  })

  const servicos = Array.from(new Set([...Object.keys(contadorAtual), ...Object.keys(contadorPassado)])).slice(0,10)
  const atual = servicos.map(s => contadorAtual[s] || 0)
  const passado = servicos.map(s => contadorPassado[s] || 0)

  return { labels: servicos, datasets: [{ label: "Mês Atual", data: atual }, { label: "Mês Passado", data: passado }] }
}
function montarChartServicosMensal(labels, datasets) {
  const ctx = document.getElementById("chart-servicos-mensal")
  if (!ctx) return
  if (chartServicosMensal) chartServicosMensal.destroy()
  chartServicosMensal = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: datasets.map(ds => ({ label: ds.label, data: ds.data })) },
    options: chartOptions({ showLegend:true, legendPosition:"top" })
  })
}

/* BLOCO 6 - ORQUESTRADOR DE GRAFICOS */

function atualizarGraficos() {
  if (!todosAgendamentos) return

  // Agendamentos por dia (30 dias)
  const { labels: labelsDias, data: dataDias } = construirAgendamentosPorDia(todosAgendamentos, 30)
  montarChartAgendamentosDia(labelsDias, dataDias)

  // Serviços mais populares
  const { labels: labelsServicos, data: dataServicos } = construirServicosPopulares(todosAgendamentos, 8)
  montarChartServicosPopulares(labelsServicos, dataServicos)

  // Cancelamentos mes
  const { labels: labelsCancel, data: dataCancel } = construirCancelamentosMes(todosAgendamentos)
  montarChartCancelamentos(labelsCancel, dataCancel)

  // Clientes VIP
  const { labels: labelsVIP, series: seriesClientes } = construirClientesVIPSeries(todosAgendamentos, 6, 5)
  montarChartClientesVIP(labelsVIP, seriesClientes)

  // Faturamento ultimos 30 dias
  const { labels: labelsFat, data: dataFat } = construirFaturamentoUltimosDias(todosAgendamentos, mapaServicos, 30)
  montarChartFaturamento(labelsFat, dataFat)

  // Servicos mensal comparativo
  const { labels: labelsSM, datasets: datasetsSM } = construirServicosMensal(todosAgendamentos)
  montarChartServicosMensal(labelsSM, datasetsSM)
}

/* BLOCO 7 - RELATÓRIOS E UTILITÁRIOS */

// Relatório de clientes (agrupa e renderiza tabela clients-table)
function construirRelatorioClientes() {
  const mapa = {}
  todosAgendamentos.forEach(a => {
    const tel = (a.telefone||"").replace(/\D/g,"")
    const chave = tel || (a.nome||"Anônimo")
    if (!mapa[chave]) mapa[chave] = { nome: a.nome || chave, telefone: tel, visitas: 0, ultimaVisita: null, gasto: 0, servicos: {} }
    mapa[chave].visitas++
    if (!mapa[chave].ultimaVisita || a.data > mapa[chave].ultimaVisita) mapa[chave].ultimaVisita = a.data
    const preco = (mapaServicos[a.servico] && Number(mapaServicos[a.servico].preco)) || (a.preco ? Number(a.preco) : 0)
    mapa[chave].gasto += preco
    mapa[chave].servicos[a.servico || "—"] = (mapa[chave].servicos[a.servico||"—"]||0)+1
  })
  return mapa
}

function renderRelatorioClientes() {
  const mapa = construirRelatorioClientes()
  const tbody = document.getElementById("clients-table")
  if (!tbody) return
  const rows = Object.values(mapa).map(c => `
    <tr>
      <td class="px-6 py-3">${escapeHtml(c.nome)}</td>
      <td class="px-6 py-3">${escapeHtml(c.ultimaVisita || "—")}</td>
      <td class="px-6 py-3">${escapeHtml(String(c.visitas || 0))}</td>
      <td class="px-6 py-3">${escapeHtml(String(c.visitas || 0))}</td>
      <td class="px-6 py-3">${formatarBRL(c.gasto)}</td>
      <td class="px-6 py-3">${escapeHtml(Object.keys(c.servicos).slice(0,3).join(", "))}</td>
      <td class="px-6 py-3"><button class="px-2 py-1 bg-amber-500 text-black rounded text-xs">Ver</button></td>
    </tr>
  `).join("")
  tbody.innerHTML = rows || `<tr><td colspan="7" class="px-6 py-8 text-center text-zinc-500">Sem clientes</td></tr>`
  // ranking
  const ranking = Object.values(mapa).sort((a,b)=>b.visitas-a.visitas).slice(0,5)
  const ol = document.getElementById("ranking-clientes")
  if (ol) ol.innerHTML = ranking.map(r => `<li>${escapeHtml(r.nome)} — ${r.visitas} visitas</li>`).join("") || "<li>Nenhum</li>"
}

// Chamadas auxiliares públicas para botões
window.filterClients = function() {
  renderRelatorioClientes()
}

// Relatório serviços (KPIs)
function construirRelatorioServicos() {
  const contador = {}
  const lucro = {}
  let tempoTotalMes = 0
  const hoje = new Date()
  const anoMes = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,"0")}`
  todosAgendamentos.forEach(a => {
    const nome = a.servico || "—"
    contador[nome] = (contador[nome]||0) + 1
    const preco = (mapaServicos[nome] && Number(mapaServicos[nome].preco)) || (a.preco?Number(a.preco):0)
    lucro[nome] = (lucro[nome]||0) + preco
    // duracao se tiver no serviço
    const dur = (mapaServicos[nome] && Number(mapaServicos[nome].duracao)) || 0
    if (a.data && a.data.slice(0,7) === anoMes) tempoTotalMes += dur
  })
  // kpis
  const servicoMaisLucrativo = Object.entries(lucro).sort((a,b)=>b[1]-a[1])[0]?.[0] || "—"
  const servicoMaisProcurado = Object.entries(contador).sort((a,b)=>b[1]-a[1])[0]?.[0] || "—"
  // ticket médio por serviço (total lucro / contagem)
  const somaTickets = Object.entries(lucro).map(([k,v]) => ({k, lucro:v, count: contador[k]||0}))
  const ticketMedioGeral = somaTickets.reduce((acc,cur)=> acc + (cur.count? cur.lucro/cur.count: 0), 0) / (somaTickets.length || 1)

  return {
    servicoMaisLucrativo,
    servicoMaisProcurado,
    ticketMedioGeral,
    tempoTotalMes
  }
}

function renderRelatorioServicos() {
  const kpis = construirRelatorioServicos()
  document.getElementById("kpi-lucrativo").innerText = kpis.servicoMaisLucrativo || "—"
  document.getElementById("kpi-buscado").innerText = kpis.servicoMaisProcurado || "—"
  document.getElementById("kpi-ticket-medio-servico").innerText = formatarBRL(kpis.ticketMedioGeral || 0)
  document.getElementById("kpi-tempo-total").innerText = `${kpis.tempoTotalMes || 0} min`
}

// Depois de cada snapshot atualize relatórios também
// adicionar chamada nas rotinas que atualizam gráficos/métricas:
function atualizarRelatorios() {
  renderRelatorioClientes()
  renderRelatorioServicos()
}
