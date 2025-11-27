import express from "express"
import twilio from "twilio"
import dotenv from "dotenv"
import cors from "cors"
import fetch from "node-fetch" // Necessário para o keep-alive no Node

dotenv.config()
const app = express()
app.use(express.json())
app.use(cors())

// ============================================
// Rota: Enviar WhatsApp manualmente (POST /sendWhatsApp)
// ============================================
app.post("/sendWhatsApp", async (req, res) => {
  try {
    const { to, message } = req.body

    if (!to || !message) {
      return res.status(400).json({ error: 'Parâmetros "to" e "message" são obrigatórios' })
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER

    if (!accountSid || !authToken || !twilioWhatsAppNumber) {
      console.error("❌ Credenciais do Twilio ausentes")
      return res.status(500).json({ error: "Configuração do Twilio incompleta" })
    }

    const client = twilio(accountSid, authToken)
    const toWhatsApp = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`

    const messageResponse = await client.messages.create({
      body: message,
      from: twilioWhatsAppNumber,
      to: toWhatsApp,
    })

    console.log("✅ WhatsApp enviado com sucesso:", messageResponse.sid)
    res.status(200).json({ success: true, messageSid: messageResponse.sid })
  } catch (error) {
    console.error("❌ Erro ao enviar WhatsApp:", error)
    res.status(500).json({ success: false, error: error.message })
  }
})


// ============================================
// Rota: Notificação automática de novo agendamento
// ============================================
app.post("/novoAgendamento", async (req, res) => {
  const agendamento = req.body

  console.log("📅 Novo agendamento recebido:", agendamento)

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER
    const barbeiroWhatsApp = process.env.BARBEIRO_WHATSAPP

    if (!accountSid || !authToken || !twilioWhatsAppNumber) {
      console.error("❌ Credenciais do Twilio ausentes")
      return res.status(500).json({ error: "Configuração do Twilio incompleta" })
    }

    const client = twilio(accountSid, authToken)
    const dataFormatada = new Date(agendamento.data).toLocaleDateString("pt-BR")

    // ===== Mensagem para o cliente =====
    if (agendamento.telefone) {
      const mensagemCliente = `
🎉 *Agendamento Confirmado - Barbearia Bitencourt*

Olá ${agendamento.nome}!

Seu agendamento foi confirmado com sucesso:

📅 *Data:* ${dataFormatada}
🕐 *Horário:* ${agendamento.hora}
✂️ *Serviço:* ${agendamento.servico}
👨 *Barbeiro:* ${agendamento.barbeiro}

📍 Endereço: Rua Berilo, 45 - Londrina, PR

Aguardamos você! 💈
      `.trim()

      await client.messages.create({
        body: mensagemCliente,
        from: twilioWhatsAppNumber,
        to: `whatsapp:${agendamento.telefone}`,
      })

      console.log("✅ WhatsApp enviado para cliente:", agendamento.telefone)
    }

    // ===== Mensagem para o barbeiro =====
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

      console.log("✅ WhatsApp enviado para barbeiro:", barbeiroWhatsApp)
    }

    res.status(200).json({ success: true })
  } catch (error) {
    console.error("❌ Erro ao enviar notificações WhatsApp:", error)
    res.status(500).json({ success: false, error: error.message })
  }
})


// ============================================
// Rota KEEP-ALIVE (anti cold-start)
// ============================================
app.get("/ping", (req, res) => {
  res.status(200).send("pong")
})


// ============================================
// Anti cold-start (Render)
// ============================================
setInterval(() => {
  if (!process.env.RENDER_URL) return
  fetch(process.env.RENDER_URL + "/ping")
    .then(() => console.log("🔥 Mantendo Render acordado..."))
    .catch(() => console.log("⚠ Render dormindo, tentando acordar..."))
}, 10 * 60 * 1000) // a cada 10min


// ============================================
// Inicialização do servidor
// ============================================
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`))
