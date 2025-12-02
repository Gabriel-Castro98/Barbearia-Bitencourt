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
let todosAgendamentos = []          // dados brutos (sem filtros)
let mapaServicos = {}               // nome -> { preco, duracao, descricao, id }

// Chart instances (para destruir antes de recriar)
let chartAgendamentosDia = null
let chartServicosPopulares = null
let chartCancelamentos = null
let chartClientesVIP = null
let chartFaturamento = null
let chartFaturamentoY = null;
let chartServicosMensal = null

// Estado de filtros / ordenação / busca
const filtrosAtuais = {
  presetData: "all",    // values: all, today, tomorrow, week, month, null(if custom range used)
  rangeInicio: null,    // "YYYY-MM-DD" or null
  rangeFim: null,       // "YYYY-MM-DD" or null
  ordenacao: "newest",  // newest | oldest
  busca: ""             // texto de busca
}

// Inicialização: carrega serviços -> abre listener de agendamentos -> configura UI
async function iniciarSistema() {
  await carregarMapaServicos().catch(err => console.warn("Falha ao carregar serviços inicial:", err))
  configurarFlatpickr()
  configurarEventosUI()
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

// Carrega agendamentos em tempo real e atualiza UI/graficos e relatórios
function carregarAgendamentos() {
  const q = query(collection(db, "agendamentos"), orderBy("data"))
  onSnapshot(q, async (snapshot) => {
    todosAgendamentos = []
    snapshot.forEach(docSnap => {
      todosAgendamentos.push({ id: docSnap.id, ...docSnap.data() })
    })

    // garante que mapaServicos existirá para calcular faturamento
    if (!mapaServicos || Object.keys(mapaServicos).length === 0) {
      await carregarMapaServicos().catch(e => console.warn("Erro fallback mapServicos:", e))
    }

    // Atualiza tudo com base nos filtros atuais
    atualizarTudo()
  }, (err) => {
    console.error("Erro no snapshot agendamentos:", err)
  })
}

/* BLOCO 3 - FILTROS / BUSCA / ORDENAÇÃO */

// Converte Date para YYYY-MM-DD
function toYMD(date) {
  return date.toISOString().slice(0, 10)
}

// Retorna array filtrado e ordenado conforme filtrosAtuais
function aplicarFiltros() {
  const todos = Array.isArray(todosAgendamentos) ? todosAgendamentos.slice() : []

  // 1) filtro de data (preset ou range)
  let inicioFiltro = null
  let fimFiltro = null
  const hoje = new Date()

  if (filtrosAtuais.presetData && filtrosAtuais.presetData !== "null") {
    switch (filtrosAtuais.presetData) {
      case "all":
        inicioFiltro = null
        fimFiltro = null
        break
      case "today":
        inicioFiltro = toYMD(hoje)
        fimFiltro = inicioFiltro
        break
      case "tomorrow": {
        const t = new Date(hoje); t.setDate(t.getDate() + 1)
        inicioFiltro = toYMD(t); fimFiltro = inicioFiltro
        break
      }
      case "week": {
        const inicio = new Date(hoje); // começo hoje
        const fim = new Date(hoje); fim.setDate(fim.getDate() + 6) // próximos 7 dias (hoje..hoje+6)
        inicioFiltro = toYMD(inicio); fimFiltro = toYMD(fim)
        break
      }
      case "month": {
        const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        const fim = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0)
        inicioFiltro = toYMD(inicio); fimFiltro = toYMD(fim)
        break
      }
      default:
        inicioFiltro = null; fimFiltro = null
    }
  }

  // Se houver range custom definido, ele tem prioridade
  if (filtrosAtuais.rangeInicio && filtrosAtuais.rangeFim) {
    inicioFiltro = filtrosAtuais.rangeInicio
    fimFiltro = filtrosAtuais.rangeFim
  }

  let filtrados = todos.filter(a => {
    // data filter
    if (inicioFiltro && fimFiltro) {
      if (!a.data) return false
      if (a.data < inicioFiltro || a.data > fimFiltro) return false
    }

    // busca (em vários campos)
    const q = (filtrosAtuais.busca || "").trim().toLowerCase()
    if (!q) return true

    // campos pesquisados: nome, data, servico, barbeiro, telefone, horario, status
    const campos = [
      (a.nome || ""),
      (a.data || ""),
      (a.servico || ""),
      (a.barbeiro || ""),
      (a.telefone || ""),
      (a.horario || ""),
      (a.status || "")
    ].map(x => String(x).toLowerCase())

    // busca por tokens (se usuário escreveu várias palavras)
    const tokens = q.split(/\s+/).filter(Boolean)

    return tokens.every(token => campos.some(c => c.includes(token)))
  })

  // ordenação
  filtrados.sort((a, b) => {
    // prioridade: data, horario
    const da = a.data || ""
    const dbb = b.data || ""
    if (da !== dbb) {
      if (filtrosAtuais.ordenacao === "newest") return dbb.localeCompare(da) // desc
      return da.localeCompare(dbb) // asc
    }
    const ha = a.horario || ""
    const hb = b.horario || ""
    if (ha !== hb) {
      if (filtrosAtuais.ordenacao === "newest") return hb.localeCompare(ha)
      return ha.localeCompare(hb)
    }
    return 0
  })

  return filtrados
}

/* BLOCO 4 - ESTATÍSTICAS */

// Atualiza estatísticas básicas com base nos agendamentos filtrados
function atualizarEstatisticasBasicas(agendamentosFiltrados) {
  const total = agendamentosFiltrados.length
  const hoje = new Date().toISOString().slice(0, 10)
  const countHoje = agendamentosFiltrados.filter(ag => ag.data === hoje).length
  const countCancelados = agendamentosFiltrados.filter(ag => (ag.status || "").toLowerCase() === "cancelado").length
  const countReagendados = agendamentosFiltrados.filter(ag => (ag.status || "").toLowerCase() === "reagendado").length

  const elTotal = document.getElementById("stat-total")
  const elToday = document.getElementById("stat-today")
  const elCancel = document.getElementById("stat-cancelados")
  const elReag = document.getElementById("stat-reagendados")
  if (elTotal) elTotal.innerText = String(total)
  if (elToday) elToday.innerText = String(countHoje)
  if (elCancel) elCancel.innerText = String(countCancelados)
  if (elReag) elReag.innerText = String(countReagendados)
}

// Atualiza estatísticas master com base nos agendamentos filtrados
function atualizarEstatisticasMaster(agendamentosFiltrados) {
  if (!agendamentosFiltrados || agendamentosFiltrados.length === 0) {
    const elRevenue = document.getElementById("stat-revenue")
    const elTicket = document.getElementById("stat-ticket")
    const elClients = document.getElementById("stat-clients")
    const elTopService = document.getElementById("stat-top-service")
    const elTopHour = document.getElementById("stat-top-hour")
    if (elRevenue) elRevenue.innerText = formatarBRL(0)
    if (elTicket) elTicket.innerText = formatarBRL(0)
    if (elClients) elClients.innerText = "0"
    if (elTopService) elTopService.innerText = "—"
    if (elTopHour) elTopHour.innerText = "—"
    return
  }

  const statusValidos = ["concluido", "confirmado"]
  const agendamentosValidos = agendamentosFiltrados.filter(a => statusValidos.includes((a.status || "").toLowerCase()))

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
  agendamentosFiltrados.forEach(a => {
    const tel = (a.telefone || "").replace(/\D/g, "")
    if (tel) telefones.add(tel)
  })
  const totalClientes = telefones.size

  // serviço mais agendado (no conjunto filtrado)
  const contadorServicos = {}
  agendamentosFiltrados.forEach(a => {
    const nome = a.servico || "—"
    contadorServicos[nome] = (contadorServicos[nome] || 0) + 1
  })
  const servicoTop = Object.entries(contadorServicos).sort((a,b)=>b[1]-a[1])[0]?.[0] || "—"

  // horário mais movimentado
  const contadorHorarios = {}
  agendamentosFiltrados.forEach(a => {
    const hora = a.horario || "—"
    contadorHorarios[hora] = (contadorHorarios[hora] || 0) + 1
  })
  const horarioTop = Object.entries(contadorHorarios).sort((a,b)=>b[1]-a[1])[0]?.[0] || "—"

  // atualizar DOM
  const elRevenue = document.getElementById("stat-revenue")
  const elTicket = document.getElementById("stat-ticket")
  const elClients = document.getElementById("stat-clients")
  const elTopService = document.getElementById("stat-top-service")
  const elTopHour = document.getElementById("stat-top-hour")
  if (elRevenue) elRevenue.innerText = formatarBRL(faturamento)
  if (elTicket) elTicket.innerText = formatarBRL(ticketMedio)
  if (elClients) elClients.innerText = String(totalClientes)
  if (elTopService) elTopService.innerText = servicoTop
  if (elTopHour) elTopHour.innerText = horarioTop
}

function atualizarEstatisticasCompletas(agendamentosFiltrados) {
  atualizarEstatisticasBasicas(agendamentosFiltrados)
  atualizarEstatisticasMaster(agendamentosFiltrados)
}

// helper formatador
function formatarBRL(valor) {
  const numero = Number(valor) || 0
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 })
}

/* BLOCO 5 - TABELA (sem modais nem ações) */

// Renderizar agendamentos na tabela — recebe array filtrado para renderizar
function renderizarAgendamentos(agendamentosFiltrados) {
  if (!tabelaAgendamentos) return

  if (!agendamentosFiltrados || agendamentosFiltrados.length === 0) {
    tabelaAgendamentos.innerHTML = `<tr><td colspan="6" class="text-center p-6">Nenhum agendamento encontrado.</td></tr>`
    return
  }

  tabelaAgendamentos.innerHTML = agendamentosFiltrados.map(ag => `
    <tr class="hover:bg-zinc-800 transition">
      <td class="px-6 py-4">${escapeHtml(ag.nome)}</td>
      <td class="px-6 py-4">${escapeHtml(ag.servico || "-")}</td>
      <td class="px-6 py-4">${escapeHtml(ag.barbeiro || "-")}</td>
      <td class="px-6 py-4">${escapeHtml(ag.data || "-")} ${escapeHtml(ag.horario || "")}</td>
      <td class="px-6 py-4">${escapeHtml(ag.telefone || "-")}</td>
      <td class="px-6 py-4">${escapeHtml(ag.status || "-")}</td>
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

/* BLOCO 6 - GRÁFICOS (construção e montagem) */

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
    options: chartOptions({ showLegend:false, maintainAspectRatio: false
 })
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
    options: chartOptions({ showLegend:true, legendPosition:"bottom", maintainAspectRatio: false
 })
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
    data: {
      labels,
      datasets: [{
        label: "Cancelamentos",
        data,
        borderWidth: 0
      }]
    },
    options: chartOptions({
      showLegend: false,
      maintainAspectRatio: false
    })
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
  const mainCtx = document.getElementById("chart-faturamento")
  const yCtx = document.getElementById("chart-faturamento-yaxis")

  if (!mainCtx || !yCtx) return

  if (chartFaturamento) chartFaturamento.destroy()
  if (chartFaturamentoY) chartFaturamentoY.destroy()

  /* === Grafico principal (sem eixo Y) === */
  chartFaturamento = new Chart(mainCtx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "",
        data,
        borderWidth: 2,
        fill: false,
        tension: 0.25
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            autoSkip: false,
            color: "#ccc",
            maxRotation: 45,
            minRotation: 0
          },
          grid: { display: false }
        },
        y: {
          display: false   // ← Y removido aqui
        }
      },
      plugins: { legend: { display: false } }
    }
  })

  /* === Eixo Y em gráfico separado === */
  chartFaturamentoY = new Chart(yCtx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        data,
        borderWidth: 0,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { display: false },
        y: {
          ticks: { color: "#ccc" },
          beginAtZero: true
        }
      },
      plugins: { legend: { display: false } }
    }
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

/* BLOCO 7 - ORQUESTRADOR DE GRAFICOS E RELATORIOS */

function atualizarGraficos(agendamentosFiltrados) {
  if (!agendamentosFiltrados) agendamentosFiltrados = []

  // Agendamentos por dia (30 dias)
  const { labels: labelsDias, data: dataDias } = construirAgendamentosPorDia(agendamentosFiltrados, 30)
  montarChartAgendamentosDia(labelsDias, dataDias)

  // Serviços mais populares
  const { labels: labelsServicos, data: dataServicos } = construirServicosPopulares(agendamentosFiltrados, 8)
  montarChartServicosPopulares(labelsServicos, dataServicos)

  // Cancelamentos mes
  const { labels: labelsCancel, data: dataCancel } = construirCancelamentosMes(agendamentosFiltrados)
  montarChartCancelamentos(labelsCancel, dataCancel)

  // Clientes VIP
  const { labels: labelsVIP, series: seriesClientes } = construirClientesVIPSeries(agendamentosFiltrados, 6, 5)
  montarChartClientesVIP(labelsVIP, seriesClientes)

  // Faturamento ultimos 30 dias
  const { labels: labelsFat, data: dataFat } = construirFaturamentoUltimosDias(agendamentosFiltrados, mapaServicos, 30)
  montarChartFaturamento(labelsFat, dataFat)

  // Servicos mensal comparativo
  const { labels: labelsSM, datasets: datasetsSM } = construirServicosMensal(agendamentosFiltrados)
  montarChartServicosMensal(labelsSM, datasetsSM)
}

/* BLOCO 8 - RELATÓRIOS E UTILITÁRIOS */

// Relatório de clientes (agrupa e renderiza tabela clients-table)

// utilitário pequeno: mantem somente dígitos no telefone
function somenteDigitos(str) {
  return String(str || "").replace(/\D/g, "");
}

function construirRelatorioClientes(agendamentosFiltrados) {
  const mapa = {};
  (agendamentosFiltrados || []).forEach(a => {
    const tel = somenteDigitos(a.telefone);
    const chave = tel || (a.nome || "Anônimo");
    if (!mapa[chave]) mapa[chave] = { __key: chave, nome: a.nome || chave, telefone: tel, visitas: 0, ultimaVisita: null, gasto: 0, servicos: {} };
    mapa[chave].visitas++;
    if (!mapa[chave].ultimaVisita || a.data > mapa[chave].ultimaVisita) mapa[chave].ultimaVisita = a.data;
    const preco = (mapaServicos[a.servico] && Number(mapaServicos[a.servico].preco)) || (a.preco ? Number(a.preco) : 0);
    mapa[chave].gasto += preco;
    const servNome = a.servico || "—";
    mapa[chave].servicos[servNome] = (mapa[chave].servicos[servNome] || 0) + 1;
  });
  return mapa;
}

function renderRelatorioClientes(agendamentosFiltrados) {
  const mapa = construirRelatorioClientes(agendamentosFiltrados);
  const tbody = document.getElementById("clients-table");
  if (!tbody) return;

  // transforma em array e ordena por visitas (maiores primeiro) para exibição
  const clientes = Object.values(mapa).sort((a,b)=> (b.visitas||0) - (a.visitas||0));

  const rows = clientes.map(c => `
    <tr>
      <td class="px-6 py-3">${escapeHtml(c.nome)}</td>
      <td class="px-6 py-3">${escapeHtml(c.ultimaVisita || "—")}</td>
      <td class="px-6 py-3">${escapeHtml(String(c.visitas || 0))}</td>
      <td class="px-6 py-3">${escapeHtml(String(c.visitas || 0))}</td>
      <td class="px-6 py-3">${formatarBRL(c.gasto)}</td>
      <td class="px-6 py-3">${escapeHtml(Object.keys(c.servicos).slice(0,3).join(", "))}</td>
      <td class="px-6 py-3">
  <a href="https://wa.me/${c.telefone}" 
     target="_blank"
     class="px-2 py-1 bg-green-500 text-black rounded text-xs font-semibold">
    WhatsApp
  </a>
</td>

    </tr>
  `).join("");

  tbody.innerHTML = rows || `<tr><td colspan="7" class="px-6 py-8 text-center text-zinc-500">Sem clientes</td></tr>`;

  // ranking dos top 5
  const ranking = clientes.slice(0,5);
  const ol = document.getElementById("ranking-clientes");
  if (ol) ol.innerHTML = ranking.map(r => `<li>${escapeHtml(r.nome)} — ${r.visitas} visitas</li>`).join("") || "<li>Nenhum</li>";
}

// Chamadas auxiliares públicas para botões
window.filterClients = function() {
  const filtrados = aplicarFiltros()
  renderRelatorioClientes(filtrados)
}

// Relatório serviços (KPIs)
function construirRelatorioServicos(agendamentosFiltrados) {
  const contador = {}
  const lucro = {}
  let tempoTotalMes = 0
  const hoje = new Date()
  const mesStr = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,"0")}`
  agendamentosFiltrados.forEach(a => {
    const nome = a.servico || "—"
    contador[nome] = (contador[nome]||0) + 1
    const preco = (mapaServicos[nome] && Number(mapaServicos[nome].preco)) || (a.preco?Number(a.preco):0)
    lucro[nome] = (lucro[nome]||0) + preco
    const dur = (mapaServicos[nome] && Number(mapaServicos[nome].duracao)) || 0
    if (a.data && a.data.slice(0,7) === mesStr) tempoTotalMes += dur
  })
  const servicoMaisLucrativo = Object.entries(lucro).sort((a,b)=>b[1]-a[1])[0]?.[0] || "—"
  const servicoMaisProcurado = Object.entries(contador).sort((a,b)=>b[1]-a[1])[0]?.[0] || "—"
  const somaTickets = Object.entries(lucro).map(([k,v]) => ({k, lucro:v, count: contador[k]||0}))
  const ticketMedioGeral = (somaTickets.length > 0) ? (somaTickets.reduce((acc,cur)=> acc + (cur.count? cur.lucro/cur.count: 0), 0) / somaTickets.length) : 0

  return {
    servicoMaisLucrativo,
    servicoMaisProcurado,
    ticketMedioGeral,
    tempoTotalMes
  }
}

function renderRelatorioServicos(agendamentosFiltrados) {
  const kpis = construirRelatorioServicos(agendamentosFiltrados)
  const elLucr = document.getElementById("kpi-lucrativo")
  const elBusc = document.getElementById("kpi-buscado")
  const elTick = document.getElementById("kpi-ticket-medio-servico")
  const elTempo = document.getElementById("kpi-tempo-total")
  if (elLucr) elLucr.innerText = kpis.servicoMaisLucrativo || "—"
  if (elBusc) elBusc.innerText = kpis.servicoMaisProcurado || "—"
  if (elTick) elTick.innerText = formatarBRL(kpis.ticketMedioGeral || 0)
  if (elTempo) elTempo.innerText = `${kpis.tempoTotalMes || 0} min`
}

// atualizar relatórios (com base nos agendamentos filtrados)
function atualizarRelatorios(agendamentosFiltrados) {
  renderRelatorioClientes(agendamentosFiltrados)
  renderRelatorioServicos(agendamentosFiltrados)
}

/* BLOCO 9 - UI: Flatpickr, botões, eventos */

// Configura Flatpickr nos campos start-range / end-range
function configurarFlatpickr() {
  const startEl = document.getElementById("start-range")
  const endEl = document.getElementById("end-range")
  if (!window.flatpickr) return
  // tema dark já carregado via CSS no HTML
  const opts = { dateFormat: "Y-m-d", allowInput: true }
  if (startEl) window.flatpickr(startEl, opts)
  if (endEl) window.flatpickr(endEl, opts)
}

// Configura listeners dos botões de UI
function configurarEventosUI() {
  // data presets
  document.querySelectorAll("[data-date]").forEach(btn => {
    btn.addEventListener("click", () => {
      const preset = btn.dataset.date
      // marcar visual (toggle de classe)
      document.querySelectorAll(".date-btn").forEach(b => b.classList.remove("date-active"))
      btn.classList.add("date-active")

      filtrosAtuais.presetData = preset
      // limpar range custom
      filtrosAtuais.rangeInicio = null
      filtrosAtuais.rangeFim = null
      const startEl = document.getElementById("start-range")
      const endEl = document.getElementById("end-range")
      if (startEl) startEl.value = ""
      if (endEl) endEl.value = ""

      aplicarEAtualizarTudo()
    })
  })

  // aplicar range custom
  const btnApplyRange = document.querySelector("[data-action='apply-range']")
  if (btnApplyRange) btnApplyRange.addEventListener("click", () => {
    const startEl = document.getElementById("start-range")
    const endEl = document.getElementById("end-range")
    const vInicio = startEl && startEl.value ? startEl.value : null
    const vFim = endEl && endEl.value ? endEl.value : null
    if (!vInicio || !vFim) {
      alert("Selecione data de início e fim para aplicar o filtro.")
      return
    }
    // set custom range and clear preset
    filtrosAtuais.presetData = null
    filtrosAtuais.rangeInicio = vInicio
    filtrosAtuais.rangeFim = vFim
    // ajustar visual: remover date-active de presets
    document.querySelectorAll(".date-btn").forEach(b => b.classList.remove("date-active"))
    aplicarEAtualizarTudo()
  })

  // ordenacao
  document.querySelectorAll("[data-sort]").forEach(btn => {
    btn.addEventListener("click", () => {
      const ordem = btn.dataset.sort
      filtrosAtuais.ordenacao = ordem
      // atualizar visual
      document.querySelectorAll(".sort-btn").forEach(b => b.classList.remove("sort-active"))
      btn.classList.add("sort-active")
      aplicarEAtualizarTudo()
    })
  })

  // busca (debounce)
  const inputBusca = document.getElementById("search-input")
  if (inputBusca) {
    let debounceTimer = null
    inputBusca.addEventListener("input", (e) => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        filtrosAtuais.busca = (e.target.value || "").trim()
        aplicarEAtualizarTudo()
      }, 250)
    })
  }
}

// Aplica filtros e atualiza tabela, estatísticas, gráficos e relatórios
function aplicarEAtualizarTudo() {
  const filtrados = aplicarFiltros()
  renderizarAgendamentos(filtrados)
  atualizarEstatisticasCompletas(filtrados)
  atualizarGraficos(filtrados)
  atualizarRelatorios(filtrados)
}

// Atualiza tudo (usado no snapshot)
function atualizarTudo() {
  // preserva qualquer preset visual (se presetData for null, nenhum preset marcado)
  // aplica filtros e atualiza UI
  aplicarEAtualizarTudo()
}

/* BLOCO 10 - UTILITÁRIOS FINAIS */

// Expor função para atualizar manualmente (se quiser)
window.recarregarDashboard = function() {
  carregarMapaServicos().then(() => carregarAgendamentos())
}

// Expor filtrosAtuais para debug
window._filtrosAtuais = filtrosAtuais

/* MENU MOBILE - FUNCIONAMENTO + ANIMAÇÃO + FECHAR AO CLICAR FORA */
document.addEventListener("DOMContentLoaded", () => {
  const btnMenu = document.querySelector("[data-action='menu-toggle']");
  const mobileMenu = document.getElementById("mobile-menu");

  if (!btnMenu || !mobileMenu) return;

  // ANIMAÇÃO: define estado inicial
  mobileMenu.classList.add("transition-all", "duration-300", "ease-out", "opacity-0", "-translate-y-2");

  btnMenu.addEventListener("click", (e) => {
    e.stopPropagation(); // evitar conflito com click fora

    const isHidden = mobileMenu.classList.contains("hidden");

    if (isHidden) {
      // ABRIR
      mobileMenu.classList.remove("hidden");
      setTimeout(() => {
        mobileMenu.classList.remove("opacity-0", "-translate-y-2");
        mobileMenu.classList.add("opacity-100", "translate-y-0");
      }, 10);
    } else {
      // FECHAR
      mobileMenu.classList.remove("opacity-100", "translate-y-0");
      mobileMenu.classList.add("opacity-0", "-translate-y-2");

      setTimeout(() => {
        mobileMenu.classList.add("hidden");
      }, 250);
    }
  });

  // FECHAR AO CLICAR FORA
  document.addEventListener("click", (e) => {
    const isOpen = !mobileMenu.classList.contains("hidden");

    if (!isOpen) return;

    const clickedInsideMenu = mobileMenu.contains(e.target);
    const clickedButton = btnMenu.contains(e.target);

    if (!clickedInsideMenu && !clickedButton) {
      // animação de fechar
      mobileMenu.classList.remove("opacity-100", "translate-y-0");
      mobileMenu.classList.add("opacity-0", "-translate-y-2");

      setTimeout(() => {
        mobileMenu.classList.add("hidden");
      }, 250);
    }
  });
});
