# Sugestões de Melhorias — StockTag

## Financeiro (todos os módulos)

- [ ] **Relatórios por período** — faturamento mensal/anual, ticket médio, comparativo entre meses, exportação PDF/CSV
- [ ] **DRE simplificado** — receitas vs despesas vs lucro por período, gerado a partir dos dados do caixa
- [ ] **Metas mensais** — definir meta de faturamento e acompanhar progresso no dashboard

---

## Clientes (todos os módulos)

- [ ] **Ficha completa do cliente** — histórico unificado: compras, OS, reservas, crediário, tudo em um lugar
- [ ] **Cobranças automáticas** — lembrete via WhatsApp para parcelas vencidas do crediário
- [ ] **Programa de fidelidade** — pontos por compra, desconto progressivo para cliente frequente

---

## Operacional (todos os módulos)

- [ ] **Central de notificações** — estoque abaixo do mínimo, parcelas vencidas, check-out do dia, OS atrasada
- [ ] **Múltiplos usuários com perfis** — admin, operador, caixa — cada um com permissões diferentes
- [ ] **Log de atividades** — registro de quem fez o quê e quando

---

## Integração CEPEA — Preços de Commodities

- [ ] **Painel de preços CEPEA** — exibir cotações diárias de commodities agrícolas (soja, milho, boi, café, etc.) integradas ao sistema

### Detalhes técnicos

**Fonte:** [CEPEA/ESALQ – USP](https://cepea.org.br/br) — Centro de Estudos Avançados em Economia Aplicada  
**Licença:** [CC BY-NC 4.0](https://cepea.esalq.usp.br/br/licenca-de-uso-de-dados.aspx) — uso não-comercial com atribuição obrigatória. Para uso comercial, contatar o CEPEA.  
**Frequência de atualização:** Diária (dias úteis, preços divulgados ao final do dia)  
**Método:** Web scraping via `fetch` + parsing HTML (páginas ASP.NET server-side, sem necessidade de browser headless)

#### URLs dos indicadores

| Produto | URL |
|---|---|
| Soja (Paranaguá) | `https://cepea.org.br/br/indicador/soja.aspx` |
| Milho | `https://cepea.org.br/br/indicador/milho.aspx` |
| Boi Gordo | `https://cepea.org.br/br/indicador/boi-gordo.aspx` |
| Café | `https://cepea.org.br/br/indicador/cafe.aspx` |
| Açúcar | `https://cepea.org.br/br/indicador/acucar.aspx` |
| Algodão | `https://cepea.org.br/br/indicador/algodao.aspx` |
| Arroz | `https://cepea.org.br/br/indicador/arroz.aspx` |
| Bezerro | `https://cepea.org.br/br/indicador/bezerro.aspx` |
| Frango | `https://cepea.org.br/br/indicador/frango.aspx` |
| Suínos | `https://cepea.org.br/br/indicador/suino.aspx` |

#### Séries históricas

```
https://cepea.org.br/br/indicador/series/soja.aspx?id=92   → Soja Paranaguá
https://cepea.org.br/br/indicador/series/soja.aspx?id=12   → Soja Paraná
https://cepea.org.br/br/indicador/series/milho.aspx?id=20  → Milho Campinas
```

#### Exemplo de implementação (Edge Function Supabase)

```ts
// supabase/functions/fetch-cepea/index.ts
import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PRODUTOS = [
  { nome: 'soja',     slug: 'soja',      unidade: 'sc 60kg' },
  { nome: 'milho',    slug: 'milho',     unidade: 'sc 60kg' },
  { nome: 'boi',      slug: 'boi-gordo', unidade: '@' },
  { nome: 'cafe',     slug: 'cafe',      unidade: 'sc 60kg' },
];

serve(async () => {
  const resultados = [];

  for (const produto of PRODUTOS) {
    const res = await fetch(`https://cepea.org.br/br/indicador/${produto.slug}.aspx`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const html = await res.text();

    // Extrai primeira linha de dados da tabela (data mais recente)
    const match = html.match(/(\d{2}\/\d{2}\/\d{4})<\/td>\s*<td[^>]*>([\d.,]+)/);
    if (match) {
      resultados.push({
        produto: produto.nome,
        data: match[1],
        preco: parseFloat(match[2].replace('.', '').replace(',', '.')),
        unidade: produto.unidade,
        atualizado_em: new Date().toISOString(),
      });
    }
  }

  // Upsert na tabela cepea_precos
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  await supabase.from('cepea_precos').upsert(resultados, { onConflict: 'produto,data' });

  return new Response(JSON.stringify(resultados), { status: 200 });
});
```

#### Migration SQL necessária

```sql
-- supabase/migrations/YYYYMMDD_cepea_precos.sql
create table if not exists cepea_precos (
  id          bigint generated always as identity primary key,
  produto     text        not null,
  data        date        not null,
  preco       numeric(12,4) not null,
  unidade     text,
  atualizado_em timestamptz default now(),
  unique (produto, data)
);

-- RLS: leitura pública
alter table cepea_precos enable row level security;
create policy "leitura publica" on cepea_precos for select using (true);
```

#### Agendamento (cron via pg_cron ou Supabase Cron)

```sql
-- Executar todo dia útil às 19:00 (horário de Brasília = 22:00 UTC)
select cron.schedule(
  'fetch-cepea-diario',
  '0 22 * * 1-5',
  $$ select net.http_post(
       url := current_setting('app.supabase_url') || '/functions/v1/fetch-cepea',
       headers := '{"Authorization": "Bearer <ANON_KEY>"}'::jsonb
     ) $$
);
```

#### Componente React sugerido — `CepeaPrecos.jsx`

```jsx
// src/components/ui/CepeaPrecos.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function CepeaPrecos() {
  const [precos, setPrecos] = useState([]);

  useEffect(() => {
    supabase
      .from('cepea_precos')
      .select('*')
      .order('data', { ascending: false })
      // pega o preço mais recente de cada produto
      .then(({ data }) => {
        const latest = Object.values(
          (data || []).reduce((acc, row) => {
            if (!acc[row.produto]) acc[row.produto] = row;
            return acc;
          }, {})
        );
        setPrecos(latest);
      });
  }, []);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-sm font-semibold text-gray-600 dark:text-gray-300">
        Cotações CEPEA/ESALQ
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200 dark:border-gray-700">
            <th className="px-4 py-2">Produto</th>
            <th className="px-4 py-2">Preço</th>
            <th className="px-4 py-2">Unidade</th>
            <th className="px-4 py-2">Data</th>
          </tr>
        </thead>
        <tbody>
          {precos.map((p) => (
            <tr key={p.produto} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="px-4 py-2 capitalize font-medium">{p.produto}</td>
              <td className="px-4 py-2">R$ {p.preco.toFixed(2)}</td>
              <td className="px-4 py-2 text-gray-500">{p.unidade}</td>
              <td className="px-4 py-2 text-gray-500">{new Date(p.data).toLocaleDateString('pt-BR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-4 py-2 text-xs text-gray-400">
        Fonte: <a href="https://cepea.org.br" target="_blank" rel="noreferrer" className="underline">CEPEA/ESALQ – USP</a> · Licença CC BY-NC 4.0
      </p>
    </div>
  );
}
```

#### Onde exibir no sistema

- **Dashboard principal** — bloco de cotações ao lado dos StatCards
- **Estoque** — coluna opcional no cadastro de produtos com tipo "commodity" vinculando ao preço de referência CEPEA
- **Configurações** — opção para escolher quais commodities monitorar

#### Checklist de implementação

- [ ] Criar migration `cepea_precos`
- [ ] Criar Edge Function `fetch-cepea`
- [ ] Configurar cron diário (19h BRT)
- [ ] Criar componente `CepeaPrecos.jsx`
- [ ] Adicionar ao Dashboard
- [ ] (Opcional) Vincular produto do estoque à commodity CEPEA para referência de preço de custo
- [ ] (Opcional) Alerta quando preço CEPEA variar mais de X% em relação ao dia anterior

---

## Por módulo específico

### Estoque Geral
- [ ] **Leitor de código de barras** — cadastro e busca de produtos por código
- [ ] **Inventário periódico** — contagem com ajuste de estoque e histórico de diferenças

### Oficina Mecânica
- [ ] **Orçamento antes de OS** — aprovação do cliente antes de abrir a ordem
- [ ] **Galeria de fotos do veículo** — registro fotográfico na entrada e saída

### Hotel / Pousada
- [ ] **Status de limpeza dos quartos** — housekeeping com controle por andar/quarto
- [ ] **Check-in antecipado / Check-out tardio** — com cobrança adicional configurável

### Bar / Restaurante
- [ ] **Comanda por mesa em tempo real** — adição de itens e fechamento direto na mesa
- [ ] **Cardápio com QR Code** — link público gerado automaticamente por mesa

---

## Prioridade sugerida

| Prioridade | Funcionalidade | Motivo |
|---|---|---|
| 🥇 Alta | Central de notificações | Impacto imediato em todos os módulos |
| 🥇 Alta | Relatórios financeiros | Alto valor percebido pelo usuário |
| 🥈 Média | Ficha completa do cliente | Complementa o crediário existente |
| 🥈 Média | Múltiplos usuários | Necessário para equipes |
| 🥉 Baixa | Programa de fidelidade | Diferencial competitivo |
| 🥉 Baixa | QR Code / Cardápio | Específico para bar/restaurante |
