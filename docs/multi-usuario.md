# Plano de Implementação — Múltiplos Usuários por Subscription

> Permite que o dono de uma subscription convide funcionários com roles distintos
> (gerente ou funcionário), cada um com sua conta Supabase Auth própria,
> todos operando sobre os dados do dono.

---

## Visão geral da arquitetura

```
subscription (owner_id = user.id do dono)
    │
    ├── membros [ { owner_id, user_id, role, status } ]
    │       ├── gerente  → acesso quase total, sem configurações de cobrança
    │       └── funcionario → registra vendas/OS/reservas, sem relatórios nem config
    │
    └── convites [ { owner_id, email, role, token, status } ]
            ├── pendente  → e-mail enviado, aguardando aceite
            └── aceito    → virou registro em `membros`
```

Regra central: **todas as queries usam `ownerId` como filtro**, não `user.id`.
- Para o dono: `ownerId === user.id`
- Para um membro: `ownerId === membros.owner_id` (id do dono)

---

## Fase 1 — Banco de dados

### 1.1 Novas tabelas

```sql
-- Membros ativos de uma subscription
CREATE TABLE membros (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('gerente', 'funcionario')),
  status     text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'removido')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (owner_id, user_id)
);

-- Convites pendentes
CREATE TABLE convites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  role       text NOT NULL CHECK (role IN ('gerente', 'funcionario')),
  token      text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status     text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'cancelado')),
  expires_at timestamptz DEFAULT now() + interval '7 days',
  created_at timestamptz DEFAULT now()
);
```

### 1.2 RLS nas novas tabelas

```sql
-- membros: owner vê e gerencia; membro vê apenas o próprio registro
ALTER TABLE membros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_gerencia_membros" ON membros
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "membro_ve_proprio" ON membros
  FOR SELECT USING (user_id = auth.uid());

-- convites: somente owner manipula
ALTER TABLE convites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_gerencia_convites" ON convites
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
```

### 1.3 Atualização das RLS nas tabelas existentes

Para cada tabela de negócio (vendas, produtos, clientes, caixas, etc.) a política
atual `user_id = auth.uid()` precisa ser expandida para também aceitar membros:

```sql
-- Função auxiliar reutilizável
CREATE OR REPLACE FUNCTION owner_id_for(uid uuid) RETURNS uuid AS $$
  SELECT COALESCE(
    (SELECT owner_id FROM membros WHERE user_id = uid AND status = 'ativo' LIMIT 1),
    uid
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Exemplo para `vendas` (repetir para todas as tabelas):
DROP POLICY IF EXISTS "user_vendas" ON vendas;
CREATE POLICY "user_vendas" ON vendas
  USING  (user_id = owner_id_for(auth.uid()))
  WITH CHECK (user_id = owner_id_for(auth.uid()));
```

**Tabelas que precisam de atualização:**
- `vendas`, `venda_itens`
- `produtos`, `categorias`
- `clientes`
- `caixas`, `movimentacoes_extras`
- `parcelas_crediario`
- `ordens_servico`
- `reservas`, `quartos`
- `veiculos`
- `subscriptions` (somente leitura para membros)

### 1.4 Coluna `created_by` para auditoria (opcional mas recomendado)

```sql
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
-- repetir para caixas, movimentacoes_extras
```

`created_by` recebe `user.id` (quem logou), enquanto `user_id` continua sendo o `ownerId`.

---

## Fase 2 — Edge Function: `invite-member`

Arquivo: `supabase/functions/invite-member/index.ts`

**Fluxo:**
1. Recebe `{ owner_id, email, role }` + header de autenticação do owner
2. Verifica que o chamador é de fato o owner
3. Verifica limite de membros da subscription (ex.: plano mensal = 2 membros, anual = 5)
4. Cria registro em `convites`
5. Envia e-mail via Resend (ou Telegram como fallback) com link:
   `https://app.stocktag.com.br/aceitar-convite?token=<token>`

```ts
// supabase/functions/invite-member/index.ts
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const APP_URL        = Deno.env.get('APP_URL') ?? ''

Deno.serve(async (req) => {
  const { owner_id, email, role } = await req.json()
  // ... validação, insert em convites, envio de e-mail
})
```

---

## Fase 3 — AuthContext (`src/contexts/AuthContext.jsx`)

### Novos campos expostos pelo contexto

```js
{
  user,           // usuário autenticado (Supabase Auth)
  ownerId,        // user.id se dono; membros.owner_id se funcionário/gerente
  userRole,       // 'owner' | 'gerente' | 'funcionario'
  isMember,       // true se é membro (não dono)
  subscription,   // assinatura do dono
  // ... campos existentes
}
```

### Lógica no `loadSubscription` / inicialização

```js
// Após login:
// 1. Tenta carregar subscription própria
const { data: sub } = await supabase
  .from('subscriptions').select('*').eq('user_id', user.id).maybeSingle()

if (sub) {
  // É o dono
  setOwnerId(user.id)
  setUserRole('owner')
  setSubscription(sub)
} else {
  // Verifica se é membro de outra subscription
  const { data: membro } = await supabase
    .from('membros').select('owner_id, role')
    .eq('user_id', user.id).eq('status', 'ativo').maybeSingle()

  if (membro) {
    const { data: ownerSub } = await supabase
      .from('subscriptions').select('*').eq('user_id', membro.owner_id).maybeSingle()
    setOwnerId(membro.owner_id)
    setUserRole(membro.role)       // 'gerente' | 'funcionario'
    setSubscription(ownerSub)
    setIsMember(true)
  }
}
```

---

## Fase 4 — Camada de dados (todas as páginas)

### Substituições necessárias

Buscar todas as ocorrências de `.eq('user_id', user.id)` e trocar por `.eq('user_id', ownerId)`.

**Arquivos afetados** (buscar com grep `user\.id`):
- `src/pages/estoque/Vendas.jsx`
- `src/pages/estoque/Produtos.jsx`
- `src/pages/estoque/Clientes.jsx`
- `src/pages/estoque/Caixa.jsx`
- `src/pages/Calendario.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/oficina/*.jsx`
- `src/pages/hotel/*.jsx`
- `src/pages/bar/*.jsx`

### Padrão para novos registros (inserts)

```js
// ANTES
await supabase.from('vendas').insert({ ..., user_id: user.id })

// DEPOIS
await supabase.from('vendas').insert({
  ...,
  user_id: ownerId,      // dados ficam sob o dono
  created_by: user.id,   // auditoria: quem criou
})
```

---

## Fase 5 — Guards de permissão

### Componente `RoleGuard`

Arquivo: `src/components/guards/RoleGuard.jsx`

```jsx
export default function RoleGuard({ allow, children, fallback = null }) {
  const { userRole } = useAuth()
  if (!allow.includes(userRole)) return fallback
  return children
}

// Uso:
<RoleGuard allow={['owner', 'gerente']}>
  <RelatoriosFinanceiros />
</RoleGuard>

<RoleGuard allow={['owner']} fallback={<p>Apenas o dono pode alterar configurações.</p>}>
  <SecaoConfiguracoesPIX />
</RoleGuard>
```

### Matriz de permissões

| Funcionalidade                  | owner | gerente | funcionario |
|---------------------------------|-------|---------|-------------|
| Registrar venda / OS / reserva  | ✓     | ✓       | ✓           |
| Ver relatórios / caixa          | ✓     | ✓       | ✗           |
| Fechar caixa                    | ✓     | ✓       | ✗           |
| Gerenciar produtos / clientes   | ✓     | ✓       | ✓ (leitura+add) |
| Deletar registros               | ✓     | ✓       | ✗           |
| Configurações gerais            | ✓     | ✗       | ✗           |
| Configuração PIX / assinatura   | ✓     | ✗       | ✗           |
| Convidar / remover membros      | ✓     | ✗       | ✗           |

---

## Fase 6 — UI: Seção "Equipe" em Configurações

Adicionar nova seção em `src/pages/Configuracoes.jsx` visível apenas para `owner`.

### Subseções

**6.1 Convidar membro**
```
[ Campo e-mail ] [ Role: Gerente / Funcionário ] [ Convidar ]
```
- Chama a Edge Function `invite-member`
- Mostra confirmação de e-mail enviado

**6.2 Convites pendentes**
```
luana@email.com  |  Funcionário  |  Expira em 5 dias  |  [ Cancelar ]
```

**6.3 Membros ativos**
```
pedro@email.com  |  Gerente  |  Membro desde 10/04/2025  |  [ Remover ]
```
- Remover seta `status = 'removido'` em `membros`

---

## Fase 7 — Página de aceite de convite

Arquivo: `src/pages/auth/AceitarConvite.jsx`

**Fluxo:**
1. URL: `/aceitar-convite?token=<token>`
2. Busca o convite pelo token: valida se `status = 'pendente'` e não expirado
3. Se usuário não tem conta → mostra form de cadastro
4. Se tem conta → mostra botão "Aceitar convite e entrar"
5. Ao aceitar:
   - Cria registro em `membros`
   - Atualiza `convites.status = 'aceito'`
   - Redireciona para `/app`

```jsx
// src/pages/auth/AceitarConvite.jsx
export default function AceitarConvite() {
  const [token] = useSearchParams()
  const [convite, setConvite] = useState(null)
  // buscar convite, mostrar form de registro ou botão de aceite
}
```

Adicionar rota em `App.jsx`:
```jsx
<Route path="/aceitar-convite" element={<AceitarConvite />} />
```

---

## Fase 8 — Log de atividades (opcional, pós-MVP)

Tabela `activity_log`:
```sql
CREATE TABLE activity_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   uuid NOT NULL,
  actor_id   uuid NOT NULL,          -- quem fez
  actor_role text NOT NULL,
  action     text NOT NULL,          -- 'venda_criada', 'produto_editado', etc.
  entity     text,                   -- 'vendas', 'produtos'
  entity_id  uuid,
  meta       jsonb,
  created_at timestamptz DEFAULT now()
);
```
Inserido programaticamente via helper `logActivity(action, entity, entityId, meta)` chamado após cada operação crítica.

---

## Ordem de execução recomendada

| # | Fase | Esforço | Dependências |
|---|------|---------|--------------|
| 1 | Banco de dados (tabelas + RLS) | Médio | — |
| 2 | AuthContext + `ownerId` | Médio | Fase 1 |
| 3 | Substituir `user.id` → `ownerId` nas queries | Alto (muitos arquivos) | Fase 2 |
| 4 | RoleGuard + ocultar seções restritas | Baixo | Fase 2 |
| 5 | UI "Equipe" em Configurações | Médio | Fases 1–4 |
| 6 | Edge Function `invite-member` + e-mail | Médio | Fase 5 |
| 7 | Página `AceitarConvite` | Médio | Fase 6 |
| 8 | Coluna `created_by` + log de atividades | Baixo/Médio | Fases 1–7 |

**Estimativa total:** 3–5 dias de desenvolvimento focado.

---

## Considerações de segurança

- Token de convite deve ter expiração (7 dias padrão) e ser de uso único
- A Edge Function `invite-member` deve validar o JWT do chamador antes de criar o convite
- RLS na tabela `membros` garante que um membro não pode se promover nem ver outros membros
- A função `owner_id_for()` usa `SECURITY DEFINER` — revisar com cuidado para evitar escalada de privilégio
- Ao remover um membro, invalidar a sessão ativa (via `supabase.auth.admin.signOut(userId)` se necessário)
