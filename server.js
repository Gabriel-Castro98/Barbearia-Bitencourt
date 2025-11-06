// server.js
const express = require("express");
const cors = require("cors");
const twilio = require("twilio");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// ============================================
// ROTA: Enviar WhatsApp
// ============================================
app.post("/sendWhatsApp", async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'Parâmetros "to" e "message" são obrigatórios' });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    const client = twilio(accountSid, authToken);

    const toWhatsApp = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

    const messageResponse = await client.messages.create({
      body: message,
      from: whatsappNumber,
      to: toWhatsApp,
    });

    console.log("WhatsApp enviado:", messageResponse.sid);
    res.json({ success: true, sid: messageResponse.sid });
  } catch (error) {
    console.error("Erro ao enviar WhatsApp:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INICIAR SERVIDOR
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));