// Sistema de Notificações - Email e WhatsApp
// Usando EmailJS para emails (client-side) e Twilio para WhatsApp (via Firebase Functions)

// ============================================
// CONFIGURAÇÃO EMAILJS
// ============================================
// 1. Crie uma conta em https://www.emailjs.com/
// 2. Crie um serviço de email (Gmail, Outlook, etc.)
// 3. Crie templates para cliente e barbeiro
// 4. Substitua as credenciais abaixo

const EMAILJS_CONFIG = {
  publicKey: "GxvelDMPKwTtGk66W", // Sua Public Key do EmailJS
  serviceId: "service_xvxqplm", // ID do serviço de email
  templateClienteId: "template_l6zbofl", // ID do template para cliente
  templateBarbeiroId: "template_muo86hk", // ID do template para barbeiro
}

// Email do barbeiro para receber notificações
const BARBEIRO_EMAIL = "ytbgugu979@gmail.com"
const BARBEIRO_WHATSAPP = "+5543984994564" // Formato internacional

// ============================================
// INICIALIZAR EMAILJS
// ============================================
function initEmailJS() {
  if (typeof emailjs !== "undefined") {
    emailjs.init(EMAILJS_CONFIG.publicKey)
    console.log("[v0] EmailJS inicializado")
  } else {
    console.error("[v0] EmailJS não carregado. Adicione o script no HTML.")
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
    console.log(`[v0] Enviando email para cliente via ${provedor}: ${dadosAgendamento.email}`)

    const templateParams = {
      to_email: dadosAgendamento.email,
      to_name: dadosAgendamento.nome,
      service: dadosAgendamento.servico,
      barber: dadosAgendamento.barbeiro,
      date: new Date(dadosAgendamento.data).toLocaleDateString("pt-BR"),
      time: dadosAgendamento.hora,
      provedor: provedor,
    }

    const response = await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateClienteId, templateParams)

    console.log("[v0] Email enviado para cliente com sucesso:", response)
    return { success: true, provedor }
  } catch (error) {
    console.error("[v0] Erro ao enviar email para cliente:", error)
    return { success: false, error: error.message }
  }
}

// ============================================
// ENVIAR EMAIL PARA BARBEIRO
// ============================================
async function enviarEmailBarbeiro(dadosAgendamento) {
  try {
    console.log("[v0] Enviando email para barbeiro:", BARBEIRO_EMAIL)

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

    const response = await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateBarbeiroId, templateParams)

    console.log("[v0] Email enviado para barbeiro com sucesso:", response)
    return { success: true }
  } catch (error) {
    console.error("[v0] Erro ao enviar email para barbeiro:", error)
    return { success: false, error: error.message }
  }
}

// ============================================
// ENVIAR WHATSAPP (VIA FIREBASE FUNCTIONS + TWILIO)
// ============================================
// Esta função chama uma Firebase Cloud Function que usa Twilio para enviar WhatsApp
async function enviarWhatsApp(telefone, mensagem) {
  try {
    console.log("[v0] Enviando WhatsApp para:", telefone)

    // Chamar Firebase Cloud Function
      const response = await fetch("https://barbearia-bitencourt.onrender.com/sendWhatsApp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: telefone,
        message: mensagem,
      }),
    })

    const result = await response.json()

    if (result.success) {
      console.log("[v0] WhatsApp enviado com sucesso")
      return { success: true }
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error("[v0] Erro ao enviar WhatsApp:", error)
    return { success: false, error: error.message }
  }
}

// ============================================
// ENVIAR WHATSAPP PARA CLIENTE
// ============================================
async function enviarWhatsAppCliente(dadosAgendamento) {
  const mensagem = `
🎉 *Agendamento Confirmado - Barbearia Bitencourt*

Olá ${dadosAgendamento.nome}!

Seu agendamento foi confirmado com sucesso:

📅 *Data:* ${new Date(dadosAgendamento.data).toLocaleDateString("pt-BR")}
🕐 *Horário:* ${dadosAgendamento.hora}
✂️ *Serviço:* ${dadosAgendamento.servico}
👨 *Barbeiro:* ${dadosAgendamento.barbeiro}

📍 Endereço: Av. Paulista, 1000 - São Paulo, SP

Aguardamos você! 💈
  `.trim()

  return await enviarWhatsApp(dadosAgendamento.telefone, mensagem)
}

// ============================================
// ENVIAR WHATSAPP PARA BARBEIRO
// ============================================
async function enviarWhatsAppBarbeiro(dadosAgendamento) {
  const mensagem = `
🔔 *Novo Agendamento - Barbearia Bitencourt*

📋 *Detalhes do Cliente:*
👤 Nome: ${dadosAgendamento.nome}
📧 Email: ${dadosAgendamento.email}
📱 Telefone: ${dadosAgendamento.telefone || "Não informado"}

📅 *Data:* ${new Date(dadosAgendamento.data).toLocaleDateString("pt-BR")}
🕐 *Horário:* ${dadosAgendamento.hora}
✂️ *Serviço:* ${dadosAgendamento.servico}
👨 *Barbeiro:* ${dadosAgendamento.barbeiro}

Acesse o painel admin para mais detalhes.
  `.trim()

  return await enviarWhatsApp(BARBEIRO_WHATSAPP, mensagem)
}

// ============================================
// FUNÇÃO PRINCIPAL - ENVIAR TODAS AS NOTIFICAÇÕES
// ============================================
async function enviarNotificacoesAgendamento(dadosAgendamento) {
  console.log("[v0] Iniciando envio de notificações para agendamento:", dadosAgendamento)

  const resultados = {
    emailCliente: { success: false },
    emailBarbeiro: { success: false },
    whatsappCliente: { success: false },
    whatsappBarbeiro: { success: false },
  }

  try {
    // Enviar emails em paralelo
    const [emailClienteResult, emailBarbeiroResult] = await Promise.all([
      enviarEmailCliente(dadosAgendamento),
      enviarEmailBarbeiro(dadosAgendamento),
    ])

    resultados.emailCliente = emailClienteResult
    resultados.emailBarbeiro = emailBarbeiroResult

    // Enviar WhatsApp apenas se telefone estiver disponível
    if (dadosAgendamento.telefone) {
      const [whatsappClienteResult, whatsappBarbeiroResult] = await Promise.all([
        enviarWhatsAppCliente(dadosAgendamento),
        enviarWhatsAppBarbeiro(dadosAgendamento),
      ])

      resultados.whatsappCliente = whatsappClienteResult
      resultados.whatsappBarbeiro = whatsappBarbeiroResult
    } else {
      console.warn("[v0] Telefone do cliente não informado, WhatsApp não enviado")
    }

    console.log("[v0] Resultados das notificações:", resultados)
    return resultados
  } catch (error) {
    console.error("[v0] Erro ao enviar notificações:", error)
    return resultados
  }
}

// Exportar funções
export {
  initEmailJS,
  enviarNotificacoesAgendamento,
  enviarEmailCliente,
  enviarEmailBarbeiro,
  enviarWhatsAppCliente,
  enviarWhatsAppBarbeiro,
}
