# Bot Telegram — StockTag

## Setup completo

### 1. Revogar token antigo (IMPORTANTE)
Abra o Telegram, fale com @BotFather e envie:
```
/revoke
```
Selecione o bot e gere um novo token. Use APENAS o novo token.

---

### 2. Aplicar migration no Supabase
No painel do Supabase → SQL Editor, rode:
```
supabase/migrations/20260424_bot_sessions.sql
```

---

### 3. Configurar secrets no Supabase
No painel: Settings → Edge Functions → Secrets

Adicione:
```
TELEGRAM_BOT_TOKEN   =  <novo token do BotFather>
SUPABASE_URL         =  <Project URL — Settings > API>
SUPABASE_SERVICE_ROLE_KEY = <service_role key — Settings > API>
```

---

### 4. Deploy da Edge Function
Com Supabase CLI instalado, rode na raiz do projeto:
```bash
supabase functions deploy telegram-bot --no-verify-jwt
```

A URL da função será:
```
https://<project-ref>.supabase.co/functions/v1/telegram-bot
```

---

### 5. Registrar webhook no Telegram
Abra no navegador (substitua os valores):
```
https://api.telegram.org/bot<SEU_TOKEN>/setWebhook?url=https://<project-ref>.supabase.co/functions/v1/telegram-bot
```

Resposta esperada:
```json
{ "ok": true, "result": true, "description": "Webhook was set" }
```

---

### 6. Testar
1. Abra o Telegram e encontre o bot pelo username
2. Envie qualquer mensagem
3. Bot pedirá o e-mail cadastrado no StockTag
4. Após vincular, os botões de consulta aparecerão

---

## Fluxo da conversa

```
Usuário: "Oi"
Bot: "Informe seu e-mail..."

Usuário: "email@exemplo.com"
Bot: "✅ Conta vinculada! Bem-vindo!"
     [💰 Resumo do caixa]  [📦 Estoque baixo]
     [📋 Parcelas vencidas] [🔧 OS em aberto]
     [🏨 Check-outs hoje]

Usuário: clica em [💰 Resumo do caixa]
Bot: "💰 Resumo do caixa — hoje
      Saldo inicial:  R$ 200,00
      Vendas:         R$ 1.240,00
      Entradas:       R$ 50,00
      Saídas:         R$ 30,00
      Saldo atual:    R$ 1.460,00
      Status: 🟢 Aberto"
     [menu novamente]
```
