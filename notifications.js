// Sistema de Notificações - Email e WhatsApp
// Usando EmailJS para emails (client-side) e Twilio para WhatsApp (via Firebase Functions)

// ============================================
// CONFIGURAÇÃO EMAILJS
// ============================================
const EMAILJS_CONFIG = {
  publicKey: "GxvelDMPKwTtGk66W",
  serviceId: "service_xvxqplm",
  templateClienteId: "template_l6zbofl",
  templateBarbeiroId: "template_muo86hk",
}

const BARBEIRO_EMAIL = "ytbgugu979@gmail.com"
const BARBEIRO_WHATSAPP = "+5543984994564"

// ============================================
// INICIALIZAR EMAILJS
// ============================================
function initEmailJS() {
  if (typeof emailjs !== "undefined") {
    emailjs.init(EMAILJS_CONFIG.publicKey)
    console.log("[v0] EmailJS inicializado")
  } else {
    console.error("[v0] EmailJS não carregado.")
  }
}

// ============================================
// DETECTAR PROVEDOR DE EMAIL
// ============================================
function detectarProvedorEmail(email) {
  const dominios = {
    "gmail.com": "Gmail",
    "googlemail.com": "Gmail",
    "icloud.com": "iCloud",
    "me.com": "iCloud",
    "mac.com": "iCloud",
    "outlook.com": "Outlook",
    "hotmail.com": "Outlook",
    "live.com": "Outlook",
    "yahoo.com": "Yahoo",
    "yahoo.com.br": "Yahoo",
  }

  const dominio = email.split("@")[1]?.toLowerCase()
  return dominios[dominio] || "Email"
}

// ============================================
// ENVIAR EMAIL PARA CLIENTE
// ============================================
async function enviarEmailCliente(dadosAgendamento) {
  try {
    const provedor = detectarProvedorEmail(dadosAgendamento.email)

    const templateParams = {
      to_email: dadosAgendamento.email,
      to_name: dadosAgendamento.nome,
      service: dadosAgendamento.servico,
      barber: dadosAgendamento.barbeiro,
      date: new Date(dadosAgendamento.data).toLocaleDateString("pt-BR"),
      time: dadosAgendamento.hora,
      provedor: provedor,
    }

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateClienteId,
      templateParams
    )

    return { success: true, provedor }
  } catch (error) {
    console.error("Erro email cliente:", error)
    return { success: false }
  }
}

// ============================================
// ENVIAR EMAIL PARA BARBEIRO
// ============================================
async function enviarEmailBarbeiro(dadosAgendamento) {
  try {
    const templateParams = {
      to_email: BARBEIRO_EMAIL,
      to_name: "Barbeiro",
      client_name: dadosAgendamento.nome,
      client_email: dadosAgendamento.email,
      client_phone: dadosAgendamento.telefone || "Não informado",
      service: dadosAgendamento.servico,
      barber: dadosAgendamento.barbeiro,
      date: new Date(dadosAgendamento.data).toLocaleDateString("pt-BR"),
      time: dadosAgendamento.hora,
    }

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateBarbeiroId,
      templateParams
    )

    return { success: true }
  } catch (error) {
    console.error("Erro email barbeiro:", error)
    return { success: false }
  }
}

// ============================================
// WHATSAPP (via Firebase + Twilio)
// ============================================
async function enviarWhatsApp(telefone, mensagem) {
  try {
    const response = await fetch("https://barbearia-bitencourt-oficial.onrender.com/sendWhatsApp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: telefone, message: mensagem }),
    })

    const result = await response.json()

    if (result.success) return { success: true }
    else throw new Error(result.error)
  } catch (error) {
    console.error("Erro WhatsApp:", error)
    return { success: false, error: error.message }
  }
}

// ============================================
// WHATSAPP CLIENTE (AGENDAMENTO)
// ============================================
async function enviarWhatsAppCliente(dadosAgendamento) {
  const mensagem = `
🎉 *Agendamento Confirmado - Barbearia Bitencourt*

Olá ${dadosAgendamento.nome}!

Seu agendamento foi confirmado:

📅 *Data:* ${new Date(dadosAgendamento.data).toLocaleDateString("pt-BR")}
🕐 *Horário:* ${dadosAgendamento.hora}
✂️ *Serviço:* ${dadosAgendamento.servico}
👨 *Barbeiro:* ${dadosAgendamento.barbeiro}

Aguardamos você! 💈
`.trim()

  return await enviarWhatsApp(dadosAgendamento.telefone, mensagem)
}

// ============================================
// WHATSAPP BARBEIRO (AGENDAMENTO)
// ============================================
async function enviarWhatsAppBarbeiro(dadosAgendamento) {
  const mensagem = `
🔔 *Novo Agendamento*

👤 Cliente: ${dadosAgendamento.nome}
📅 ${new Date(dadosAgendamento.data).toLocaleDateString("pt-BR")}
🕐 ${dadosAgendamento.hora}
✂️ Serviço: ${dadosAgendamento.servico}

Confira no painel admin.
`.trim()

  return await enviarWhatsApp(BARBEIRO_WHATSAPP, mensagem)
}

// ============================================
// NOTIFICAÇÕES DE AGENDAMENTO
// ============================================
async function enviarNotificacoesAgendamento(dadosAgendamento) {
  try {
    await Promise.all([
      enviarEmailCliente(dadosAgendamento),
      enviarEmailBarbeiro(dadosAgendamento),
    ])

    if (dadosAgendamento.telefone) {
      await Promise.all([
        enviarWhatsAppCliente(dadosAgendamento),
        enviarWhatsAppBarbeiro(dadosAgendamento),
      ])
    }
  } catch (error) {
    console.error("Erro notificações agendamento:", error)
  }
}

// ============================================
// 📌 NOVA FUNÇÃO – NOTIFICAÇÕES DE CANCELAMENTO
// ============================================
async function enviarNotificacoesCancelamento(dados) {
  const msgCliente = `
❌ *Agendamento Cancelado*

Olá ${dados.nome},
Seu agendamento foi cancelado.

📅 ${new Date(dados.data).toLocaleDateString("pt-BR")}
🕐 ${dados.hora}
✂️ ${dados.servico}

Se precisar, pode reagendar pelo site.  
`.trim()

  const msgBarbeiro = `
❌ *Agendamento Cancelado pelo Cliente*

Cliente: ${dados.nome}
Serviço: ${dados.servico}
📅 ${new Date(dados.data).toLocaleDateString("pt-BR")}
🕐 ${dados.hora}
`.trim()

  await enviarWhatsApp(dados.telefone, msgCliente)
  await enviarWhatsApp(BARBEIRO_WHATSAPP, msgBarbeiro)

  await enviarEmailCliente(dados)
  await enviarEmailBarbeiro(dados)
}

// ============================================
// 📌 NOVA FUNÇÃO – NOTIFICAÇÕES REMARCAÇÃO
// ============================================
async function enviarNotificacoesRemarcacao(antigo, novo) {
  const msgCliente = `
🔄 *Agendamento Remarcado*

Olá ${novo.nome},

Seu agendamento foi alterado:

❌ *Antes:*  
📅 ${new Date(antigo.data).toLocaleDateString("pt-BR")}  
🕐 ${antigo.hora}

✅ *Agora:*  
📅 ${new Date(novo.data).toLocaleDateString("pt-BR")}  
🕐 ${novo.hora}

Serviço: ${novo.servico}
Barbeiro: ${novo.barbeiro}
`.trim()

  const msgBarbeiro = `
🔄 *Cliente Remarcou o Agendamento*

Cliente: ${novo.nome}

❌ Antes:
${new Date(antigo.data).toLocaleDateString("pt-BR")} às ${antigo.hora}

✅ Agora:
${new Date(novo.data).toLocaleDateString("pt-BR")} às ${novo.hora}

Serviço: ${novo.servico}
`.trim()

  await enviarWhatsApp(novo.telefone, msgCliente)
  await enviarWhatsApp(BARBEIRO_WHATSAPP, msgBarbeiro)

  await enviarEmailCliente(novo)
  await enviarEmailBarbeiro(novo)
}

// ============================================
// EXPORTS
// ============================================
export {
  initEmailJS,
  enviarNotificacoesAgendamento,
  enviarNotificacoesCancelamento,
  enviarNotificacoesRemarcacao,
  enviarEmailCliente,
  enviarEmailBarbeiro,
  enviarWhatsAppCliente,
  enviarWhatsAppBarbeiro,
}
