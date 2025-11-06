// Firebase Cloud Functions para enviar WhatsApp via Twilio
const functions = require("firebase-functions")
const admin = require("firebase-admin")
const twilio = require("twilio")

admin.initializeApp()

// Configuração do Twilio - adicione estas variáveis no Firebase Console
// firebase functions:config:set twilio.account_sid="SEU_ACCOUNT_SID"
// firebase functions:config:set twilio.auth_token="SEU_AUTH_TOKEN"
// firebase functions:config:set twilio.whatsapp_number="whatsapp:+14155238886"

// ============================================
// FUNÇÃO: Enviar WhatsApp
// ============================================
exports.sendWhatsApp = functions.https.onRequest(async (req, res) => {
  // Configurar CORS
  res.set("Access-Control-Allow-Origin", "*")
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.set("Access-Control-Allow-Headers", "Content-Type")

  // Responder a preflight request
  if (req.method === "OPTIONS") {
    res.status(204).send("")
    return
  }

  // Apenas aceitar POST
  if (req.method !== "POST") {
    res.status(405).send({ error: "Método não permitido" })
    return
  }

  try {
    const { to, message } = req.body

    if (!to || !message) {
      res.status(400).send({ error: 'Parâmetros "to" e "message" são obrigatórios' })
      return
    }

    // Obter credenciais do Twilio
    const accountSid = functions.config().twilio.account_sid
    const authToken = functions.config().twilio.auth_token
    const twilioWhatsAppNumber = functions.config().twilio.whatsapp_number

    if (!accountSid || !authToken || !twilioWhatsAppNumber) {
      console.error("[v0] Credenciais do Twilio não configuradas")
      res.status(500).send({ error: "Configuração do Twilio incompleta" })
      return
    }

    // Inicializar cliente Twilio
    const client = twilio(accountSid, authToken)

    // Formatar número de telefone para WhatsApp
    const toWhatsApp = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`

    // Enviar mensagem
    const messageResponse = await client.messages.create({
      body: message,
      from: twilioWhatsAppNumber,
      to: toWhatsApp,
    })

    console.log("[v0] WhatsApp enviado com sucesso:", messageResponse.sid)

    res.status(200).send({
      success: true,
      messageSid: messageResponse.sid,
    })
  } catch (error) {
    console.error("[v0] Erro ao enviar WhatsApp:", error)
    res.status(500).send({
      success: false,
      error: error.message,
    })
  }
})

// ============================================
// FUNÇÃO: Listener de novos agendamentos (alternativa)
// ============================================
// Esta função é acionada automaticamente quando um novo agendamento é criado
// Não precisa ser chamada manualmente
exports.onNovoAgendamento = functions.firestore
  .document("agendamentos/{agendamentoId}")
  .onCreate(async (snap, context) => {
    const agendamento = snap.data()

    console.log("[v0] Novo agendamento detectado:", context.params.agendamentoId)

    try {
      // Obter credenciais do Twilio
      const accountSid = functions.config().twilio.account_sid
      const authToken = functions.config().twilio.auth_token
      const twilioWhatsAppNumber = functions.config().twilio.whatsapp_number
      const barbeiroWhatsApp = functions.config().barbeiro.whatsapp // Ex: +5511999999999

      if (!accountSid || !authToken || !twilioWhatsAppNumber) {
        console.error("[v0] Credenciais do Twilio não configuradas")
        return
      }

      const client = twilio(accountSid, authToken)

      // Formatar data
      const dataFormatada = new Date(agendamento.data).toLocaleDateString("pt-BR")

      // Mensagem para o cliente
      if (agendamento.telefone) {
        const mensagemCliente = `
🎉 *Agendamento Confirmado - Barbearia Bitencourt*

Olá ${agendamento.nome}!

Seu agendamento foi confirmado com sucesso:

📅 *Data:* ${dataFormatada}
🕐 *Horário:* ${agendamento.hora}
✂️ *Serviço:* ${agendamento.servico}
👨 *Barbeiro:* ${agendamento.barbeiro}

📍 Endereço: Av. Paulista, 1000 - São Paulo, SP

Aguardamos você! 💈
        `.trim()

        await client.messages.create({
          body: mensagemCliente,
          from: twilioWhatsAppNumber,
          to: `whatsapp:${agendamento.telefone}`,
        })

        console.log("[v0] WhatsApp enviado para cliente:", agendamento.telefone)
      }

      // Mensagem para o barbeiro
      if (barbeiroWhatsApp) {
        const mensagemBarbeiro = `
🔔 *Novo Agendamento - Barbearia Bitencourt*

📋 *Detalhes do Cliente:*
👤 Nome: ${agendamento.nome}
📧 Email: ${agendamento.email}
📱 Telefone: ${agendamento.telefone || "Não informado"}

📅 *Data:* ${dataFormatada}
🕐 *Horário:* ${agendamento.hora}
✂️ *Serviço:* ${agendamento.servico}
👨 *Barbeiro:* ${agendamento.barbeiro}

Acesse o painel admin para mais detalhes.
        `.trim()

        await client.messages.create({
          body: mensagemBarbeiro,
          from: twilioWhatsAppNumber,
          to: `whatsapp:${barbeiroWhatsApp}`,
        })

        console.log("[v0] WhatsApp enviado para barbeiro:", barbeiroWhatsApp)
      }

      return null
    } catch (error) {
      console.error("[v0] Erro ao enviar notificações WhatsApp:", error)
      return null
    }
  })
