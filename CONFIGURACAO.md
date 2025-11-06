# 📋 Guia de Configuração - Barbearia Bitencourt

Este guia contém todas as instruções necessárias para configurar o sistema completo de notificações por email e WhatsApp.

---

## 🔥 1. Configuração do Firebase

### 1.1 Criar Projeto Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Nomeie o projeto como "Barbearia Bitencourt"
4. Siga os passos de criação

### 1.2 Ativar Authentication

1. No menu lateral, clique em "Authentication"
2. Clique em "Começar"
3. Ative o método "E-mail/senha"

### 1.3 Criar Firestore Database

1. No menu lateral, clique em "Firestore Database"
2. Clique em "Criar banco de dados"
3. Escolha "Modo de produção"
4. Selecione a localização (southamerica-east1 para Brasil)

### 1.4 Configurar Regras de Segurança

No Firestore, vá em "Regras" e adicione:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuários podem ler e escrever apenas seus próprios dados
    match /usuarios/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Agendamentos - usuários podem criar, ler apenas os seus
    match /agendamentos/{agendamentoId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && 
                     (resource.data.userId == request.auth.uid || 
                      get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.isAdmin == true);
      allow update, delete: if request.auth != null && 
                               get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
\`\`\`

### 1.5 Obter Credenciais do Firebase

1. Vá em "Configurações do projeto" (ícone de engrenagem)
2. Role até "Seus aplicativos"
3. Clique no ícone `</>`  (Web)
4. Registre o app como "Barbearia Bitencourt Web"
5. Copie as credenciais do `firebaseConfig`
6. Cole no arquivo `firebaseConfig.js`

---

## 📧 2. Configuração do EmailJS

### 2.1 Criar Conta

1. Acesse [EmailJS](https://www.emailjs.com/)
2. Crie uma conta gratuita (até 200 emails/mês)

### 2.2 Adicionar Serviço de Email

1. Vá em "Email Services"
2. Clique em "Add New Service"
3. Escolha seu provedor (Gmail, Outlook, etc.)
4. Siga as instruções de autenticação
5. Anote o **Service ID**

### 2.3 Criar Template para Cliente

1. Vá em "Email Templates"
2. Clique em "Create New Template"
3. Nomeie como "Confirmação de Agendamento - Cliente"
4. Use este template:

**Subject:** ✂️ Agendamento Confirmado - Barbearia Bitencourt

**Content:**
\`\`\`html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #18181b; color: #fafafa; border-radius: 10px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #f59e0b; margin: 0;">Barbearia Bitencourt</h1>
  </div>
  
  <h2 style="color: #f59e0b;">🎉 Agendamento Confirmado!</h2>
  
  <p>Olá <strong>{{to_name}}</strong>,</p>
  
  <p>Seu agendamento foi confirmado com sucesso. Confira os detalhes:</p>
  
  <div style="background-color: #27272a; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p><strong>📅 Data:</strong> {{date}}</p>
    <p><strong>🕐 Horário:</strong> {{time}}</p>
    <p><strong>✂️ Serviço:</strong> {{service}}</p>
    <p><strong>👨 Barbeiro:</strong> {{barber}}</p>
  </div>
  
  <p><strong>📍 Endereço:</strong><br>
  Rua Berilo, 45 - Jardim Ideal<br>
  Londrina - PR, 86020-121</p>
  
  <p><strong>📞 Contato:</strong> (43) 98499-4564</p>
  
  <p style="margin-top: 30px;">Aguardamos você! 💈</p>
  
  <hr style="border: none; border-top: 1px solid #3f3f46; margin: 30px 0;">
  
  <p style="font-size: 12px; color: #a1a1aa; text-align: center;">
    Esta confirmação foi enviada via {{provedor}}<br>
    Barbearia Bitencourt - Estilo e Tradição desde 2016
  </p>
</div>
\`\`\`

4. Anote o **Template ID** (ex: `template_cliente`)

### 2.4 Criar Template para Barbeiro

1. Crie outro template
2. Nomeie como "Novo Agendamento - Barbeiro"
3. Use este template:

**Subject:** 🔔 Novo Agendamento - {{client_name}}

**Content:**
\`\`\`html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #18181b; color: #fafafa; border-radius: 10px;">
  <h2 style="color: #f59e0b;">🔔 Novo Agendamento Recebido</h2>
  
  <div style="background-color: #27272a; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #f59e0b; margin-top: 0;">📋 Dados do Cliente</h3>
    <p><strong>👤 Nome:</strong> {{client_name}}</p>
    <p><strong>📧 Email:</strong> {{client_email}}</p>
    <p><strong>📱 Telefone:</strong> {{client_phone}}</p>
  </div>
  
  <div style="background-color: #27272a; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #f59e0b; margin-top: 0;">📅 Detalhes do Agendamento</h3>
    <p><strong>Data:</strong> {{date}}</p>
    <p><strong>Horário:</strong> {{time}}</p>
    <p><strong>Serviço:</strong> {{service}}</p>
    <p><strong>Barbeiro:</strong> {{barber}}</p>
  </div>
  
  <p style="margin-top: 30px;">
    <a href="https://seu-site.com/admin.html" style="background-color: #f59e0b; color: #18181b; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
      Acessar Painel Admin
    </a>
  </p>
</div>
\`\`\`

4. Anote o **Template ID** (ex: `template_barbeiro`)

### 2.5 Obter Public Key

1. Vá em "Account" → "General"
2. Copie a **Public Key**

### 2.6 Configurar no Código

Abra o arquivo `notifications.js` e atualize:

\`\`\`javascript
const EMAILJS_CONFIG = {
  publicKey: 'SUA_PUBLIC_KEY_AQUI', // Cole sua Public Key
  serviceId: 'SEU_SERVICE_ID', // Cole seu Service ID
  templateClienteId: 'template_cliente', // Cole o Template ID do cliente
  templateBarbeiroId: 'template_barbeiro' // Cole o Template ID do barbeiro
};

const BARBEIRO_EMAIL = 'seu-email@gmail.com'; // Email do barbeiro
\`\`\`

---

## 📱 3. Configuração do WhatsApp (Twilio)

### 3.1 Criar Conta Twilio

1. Acesse [Twilio](https://www.twilio.com/)
2. Crie uma conta gratuita (trial)
3. Verifique seu número de telefone

### 3.2 Configurar WhatsApp Sandbox

1. No console Twilio, vá em "Messaging" → "Try it out" → "Send a WhatsApp message"
2. Siga as instruções para ativar o sandbox
3. Envie a mensagem de ativação do seu WhatsApp para o número Twilio
4. Anote o **WhatsApp Sandbox Number** (ex: `whatsapp:+14155238886`)

### 3.3 Obter Credenciais

1. No Dashboard do Twilio, copie:
   - **Account SID**
   - **Auth Token**

### 3.4 Instalar Firebase CLI

\`\`\`bash
npm install -g firebase-tools
\`\`\`

### 3.5 Fazer Login no Firebase

\`\`\`bash
firebase login
\`\`\`

### 3.6 Inicializar Functions

\`\`\`bash
firebase init functions
\`\`\`

- Selecione seu projeto
- Escolha JavaScript
- Instale dependências

### 3.7 Configurar Variáveis de Ambiente

\`\`\`bash
firebase functions:config:set twilio.account_sid="SEU_ACCOUNT_SID"
firebase functions:config:set twilio.auth_token="SEU_AUTH_TOKEN"
firebase functions:config:set twilio.whatsapp_number="whatsapp:+14155238886"
firebase functions:config:set barbeiro.whatsapp="+5511999999999"
\`\`\`

Substitua pelos seus valores reais.

### 3.8 Deploy das Functions

\`\`\`bash
cd functions
npm install
cd ..
firebase deploy --only functions
\`\`\`

### 3.9 Atualizar URL no Código

Após o deploy, copie a URL da função `sendWhatsApp` e atualize em `notifications.js`:

\`\`\`javascript
const response = await fetch('https://southamerica-east1-SEU-PROJETO.cloudfunctions.net/sendWhatsApp', {
  // ...
});
\`\`\`

---

## 🎯 4. Criar Usuário Barbeiro (Admin)

### 4.1 Cadastrar Barbeiro

1. Acesse a página de cadastro do site
2. Crie uma conta com email do barbeiro
3. Anote o **User ID** (UID) no Firebase Console → Authentication

### 4.2 Marcar como Admin

No Firestore, vá em `usuarios/{UID_DO_BARBEIRO}` e adicione o campo:

\`\`\`javascript
{
  isAdmin: true
}
\`\`\`

---

## ✅ 5. Testar o Sistema

### 5.1 Testar Cadastro

1. Acesse `cadastro.html`
2. Crie uma conta de teste
3. Verifique se o usuário aparece no Firebase Authentication
4. Verifique se os dados foram salvos no Firestore

### 5.2 Testar Agendamento

1. Faça login com a conta criada
2. Acesse `agendamento.html`
3. Preencha o formulário e confirme
4. Verifique:
   - ✅ Agendamento salvo no Firestore
   - ✅ Email recebido pelo cliente
   - ✅ Email recebido pelo barbeiro
   - ✅ WhatsApp recebido pelo cliente (se telefone informado)
   - ✅ WhatsApp recebido pelo barbeiro

### 5.3 Testar Painel Admin

1. Faça login com a conta do barbeiro (admin)
2. Acesse `admin.html`
3. Verifique se os agendamentos aparecem em tempo real
4. Teste alterar status dos agendamentos

---

## 🔧 6. Solução de Problemas

### Emails não estão sendo enviados

- Verifique se as credenciais do EmailJS estão corretas
- Verifique o console do navegador para erros
- Confirme que os Template IDs estão corretos
- Verifique se não excedeu o limite de 200 emails/mês (plano gratuito)

### WhatsApp não está sendo enviado

- Verifique se as Firebase Functions foram deployadas com sucesso
- Confirme que as variáveis de ambiente do Twilio estão configuradas
- Verifique se o número do cliente está no formato internacional (+5511999999999)
- No Twilio trial, apenas números verificados podem receber mensagens
- Verifique os logs: `firebase functions:log`

### Usuário não consegue acessar painel admin

- Verifique se o campo `isAdmin: true` foi adicionado no Firestore
- Confirme que as regras de segurança do Firestore estão corretas

---

## 💰 7. Custos e Limites

### EmailJS (Gratuito)
- ✅ 200 emails/mês grátis
- Upgrade: $15/mês para 1.000 emails

### Twilio (Trial)
- ✅ $15 de crédito grátis
- Apenas números verificados podem receber mensagens
- Upgrade: Pay-as-you-go (~$0.005 por mensagem WhatsApp)

### Firebase
- ✅ Plano Spark (gratuito) suficiente para começar
- Cloud Functions: 2M invocações/mês grátis
- Firestore: 50k leituras/dia grátis

---

## 📞 8. Suporte

Para dúvidas ou problemas:
- Documentação Firebase: https://firebase.google.com/docs
- Documentação EmailJS: https://www.emailjs.com/docs
- Documentação Twilio: https://www.twilio.com/docs

---

**Desenvolvido para Barbearia Bitencourt** 💈
