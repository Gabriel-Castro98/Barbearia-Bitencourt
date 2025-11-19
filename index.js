import express from "express"
import twilio from "twilio"
import dotenv from "dotenv"
import cors from "cors"

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
// (para substituir o onCreate do Firestore)
// ============================================
// Você pode chamar essa rota quando salvar um agendamento no Firestore
// Exemplo: fetch("https://seuservidor.onrender.com/novoAgendamento", {...})
app.post("/novoAgendamento", async (req, res) => {
  const agendamento = req.body

  console.log("📅 Novo agendamento recebido:", agendamento)

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER
    const barbeiroWhatsApp = process.env.BARBEIRO_WHATSAPP // Ex: +5511999999999

    if (!accountSid || !authToken || !twilioWhatsAppNumber) {
      console.error("❌ Credenciais do Twilio ausentes")
      return res.status(500).json({ error: "Configuração do Twilio incompleta" })
    }

    const client = twilio(accountSid, authToken)
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

      console.log("✅ WhatsApp enviado para cliente:", agendamento.telefone)
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

      console.log("✅ WhatsApp enviado para barbeiro:", barbeiroWhatsApp)
    }

    res.status(200).json({ success: true })
  } catch (error) {
    console.error("❌ Erro ao enviar notificações WhatsApp:", error)
    res.status(500).json({ success: false, error: error.message })
  }
})
    // ============================================
    // ROTA KEEP-ALIVE (ANTI-COLD-START)
    // ============================================
    app.get("/ping", (req, res) => {
      res.status(200).send("pong");
    });
    // ===============================
    // ANTI-COLD-START
    // ===============================
    setInterval(() => {
      fetch("https://SEU_RENDER_URL.onrender.com/ping")
        .then(() => console.log("🔥 Mantendo Render acordado..."))
        .catch(() => console.log("⚠ Render dormindo, tentando acordar..."));
    }, 10 * 60 * 1000); // a cada 10 minutos


// ============================================
// Inicialização do servidor
// ============================================
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`))
