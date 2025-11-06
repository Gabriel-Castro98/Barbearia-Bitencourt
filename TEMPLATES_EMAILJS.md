# 📧 Templates EmailJS - Guia Completo

Este arquivo contém os templates completos para configurar no EmailJS.

---

## 📋 Template 1: Confirmação para Cliente

### Configurações Básicas
- **Nome:** Confirmação de Agendamento - Cliente
- **Template ID:** `template_cliente` (você pode escolher outro)

### Subject (Assunto)
\`\`\`
✂️ Agendamento Confirmado - Barbearia Bitencourt
\`\`\`

### Content (Corpo do Email)

\`\`\`html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #18181b; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #18181b; font-size: 32px; font-weight: bold;">
                                Barbearia Bitencourt
                            </h1>
                            <p style="margin: 10px 0 0 0; color: #27272a; font-size: 14px; font-weight: 500;">
                                Estilo e Tradição
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px; color: #fafafa;">
                            <h2 style="margin: 0 0 20px 0; color: #f59e0b; font-size: 24px;">
                                🎉 Agendamento Confirmado!
                            </h2>
                            
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                                Olá <strong style="color: #f59e0b;">{{to_name}}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #d4d4d8;">
                                Seu agendamento foi confirmado com sucesso! Estamos ansiosos para atendê-lo.
                            </p>
                            
                            <!-- Detalhes do Agendamento -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #27272a; border-radius: 12px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <table width="100%" cellpadding="8" cellspacing="0">
                                            <tr>
                                                <td style="color: #a1a1aa; font-size: 14px; padding: 8px 0;">📅 Data:</td>
                                                <td style="color: #fafafa; font-size: 16px; font-weight: 600; text-align: right; padding: 8px 0;">{{date}}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #a1a1aa; font-size: 14px; padding: 8px 0;">🕐 Horário:</td>
                                                <td style="color: #fafafa; font-size: 16px; font-weight: 600; text-align: right; padding: 8px 0;">{{time}}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #a1a1aa; font-size: 14px; padding: 8px 0;">✂️ Serviço:</td>
                                                <td style="color: #fafafa; font-size: 16px; font-weight: 600; text-align: right; padding: 8px 0;">{{service}}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #a1a1aa; font-size: 14px; padding: 8px 0;">👨 Barbeiro:</td>
                                                <td style="color: #fafafa; font-size: 16px; font-weight: 600; text-align: right; padding: 8px 0;">{{barber}}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Localização -->
                            <div style="background-color: #27272a; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                                <h3 style="margin: 0 0 15px 0; color: #f59e0b; font-size: 18px;">📍 Localização</h3>
                                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #d4d4d8;">
                                    <strong>Av. Paulista, 1000</strong><br>
                                    Bela Vista - São Paulo, SP<br>
                                    CEP: 01310-100
                                </p>
                            </div>
                            
                            <!-- Contato -->
                            <div style="background-color: #27272a; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                                <h3 style="margin: 0 0 15px 0; color: #f59e0b; font-size: 18px;">📞 Contato</h3>
                                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #d4d4d8;">
                                    Telefone: <strong>(11) 98765-4321</strong><br>
                                    WhatsApp: <strong>(11) 98765-4321</strong><br>
                                    Email: <strong>contato@barbearia-bitencourt.com.br</strong>
                                </p>
                            </div>
                            
                            <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #d4d4d8;">
                                Aguardamos você! 💈
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #09090b; padding: 30px; text-align: center; border-top: 1px solid #27272a;">
                            <p style="margin: 0 0 10px 0; font-size: 12px; color: #71717a;">
                                Esta confirmação foi enviada via <strong>{{provedor}}</strong>
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #52525b;">
                                © 2025 Barbearia Bitencourt - Todos os direitos reservados
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
\`\`\`

### Variáveis do Template
- `{{to_name}}` - Nome do cliente
- `{{to_email}}` - Email do cliente
- `{{date}}` - Data do agendamento
- `{{time}}` - Horário do agendamento
- `{{service}}` - Serviço escolhido
- `{{barber}}` - Nome do barbeiro
- `{{provedor}}` - Provedor de email (Gmail, iCloud, etc.)

---

## 📋 Template 2: Notificação para Barbeiro

### Configurações Básicas
- **Nome:** Novo Agendamento - Barbeiro
- **Template ID:** `template_barbeiro` (você pode escolher outro)

### Subject (Assunto)
\`\`\`
🔔 Novo Agendamento - {{client_name}}
\`\`\`

### Content (Corpo do Email)

\`\`\`html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #18181b; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #18181b; font-size: 32px; font-weight: bold;">
                                Barbearia Bitencourt
                            </h1>
                            <p style="margin: 10px 0 0 0; color: #27272a; font-size: 14px; font-weight: 500;">
                                Painel Administrativo
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px; color: #fafafa;">
                            <h2 style="margin: 0 0 20px 0; color: #f59e0b; font-size: 24px;">
                                🔔 Novo Agendamento Recebido
                            </h2>
                            
                            <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #d4d4d8;">
                                Um novo cliente agendou um horário. Confira os detalhes abaixo:
                            </p>
                            
                            <!-- Dados do Cliente -->
                            <div style="background-color: #27272a; border-radius: 12px; padding: 25px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
                                <h3 style="margin: 0 0 20px 0; color: #f59e0b; font-size: 18px;">📋 Dados do Cliente</h3>
                                <table width="100%" cellpadding="8" cellspacing="0">
                                    <tr>
                                        <td style="color: #a1a1aa; font-size: 14px; padding: 8px 0;">👤 Nome:</td>
                                        <td style="color: #fafafa; font-size: 16px; font-weight: 600; text-align: right; padding: 8px 0;">{{client_name}}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #a1a1aa; font-size: 14px; padding: 8px 0;">📧 Email:</td>
                                        <td style="color: #fafafa; font-size: 16px; font-weight: 600; text-align: right; padding: 8px 0;">{{client_email}}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #a1a1aa; font-size: 14px; padding: 8px 0;">📱 Telefone:</td>
                                        <td style="color: #fafafa; font-size: 16px; font-weight: 600; text-align: right; padding: 8px 0;">{{client_phone}}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Detalhes do Agendamento -->
                            <div style="background-color: #27272a; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
                                <h3 style="margin: 0 0 20px 0; color: #f59e0b; font-size: 18px;">📅 Detalhes do Agendamento</h3>
                                <table width="100%" cellpadding="8" cellspacing="0">
                                    <tr>
                                        <td style="color: #a1a1aa; font-size: 14px; padding: 8px 0;">Data:</td>
                                        <td style="color: #fafafa; font-size: 16px; font-weight: 600; text-align: right; padding: 8px 0;">{{date}}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #a1a1aa; font-size: 14px; padding: 8px 0;">Horário:</td>
                                        <td style="color: #fafafa; font-size: 16px; font-weight: 600; text-align: right; padding: 8px 0;">{{time}}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #a1a1aa; font-size: 14px; padding: 8px 0;">Serviço:</td>
                                        <td style="color: #fafafa; font-size: 16px; font-weight: 600; text-align: right; padding: 8px 0;">{{service}}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #a1a1aa; font-size: 14px; padding: 8px 0;">Barbeiro:</td>
                                        <td style="color: #fafafa; font-size: 16px; font-weight: 600; text-align: right; padding: 8px 0;">{{barber}}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Botão de Ação -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="https://seu-site.com/admin.html" style="display: inline-block; background-color: #f59e0b; color: #18181b; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                            Acessar Painel Admin
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #09090b; padding: 30px; text-align: center; border-top: 1px solid #27272a;">
                            <p style="margin: 0 0 10px 0; font-size: 12px; color: #71717a;">
                                Notificação automática do sistema de agendamentos
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #52525b;">
                                © 2025 Barbearia Bitencourt - Painel Administrativo
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
\`\`\`

### Variáveis do Template
- `{{to_name}}` - Nome do barbeiro (geralmente "Barbeiro" ou "Admin")
- `{{to_email}}` - Email do barbeiro
- `{{client_name}}` - Nome do cliente
- `{{client_email}}` - Email do cliente
- `{{client_phone}}` - Telefone do cliente
- `{{date}}` - Data do agendamento
- `{{time}}` - Horário do agendamento
- `{{service}}` - Serviço escolhido
- `{{barber}}` - Nome do barbeiro escolhido

---

## 🎨 Personalização

Você pode personalizar os templates alterando:
- **Cores:** Substitua `#f59e0b` (dourado) por outra cor
- **Logo:** Adicione uma imagem no header
- **Endereço:** Atualize o endereço da barbearia
- **Link do botão:** Substitua `https://seu-site.com/admin.html` pela URL real

---

## ✅ Checklist de Configuração

- [ ] Template do cliente criado no EmailJS
- [ ] Template do barbeiro criado no EmailJS
- [ ] Template IDs anotados
- [ ] Variáveis testadas (envie um email de teste)
- [ ] Cores e textos personalizados
- [ ] Link do painel admin atualizado

---

**Pronto!** Seus templates estão configurados e prontos para uso. 🎉
