# Análise de Arquitetura — Controle de Estoque

> Criado em: 2026-04-21

---

## Diagnóstico geral

O projeto tem **boas práticas de UI** aplicadas, mas **não tem uma arquitetura de dados definida**. A lógica de negócio está misturada dentro dos componentes de página.

---

## O que está bem

| Prática | Onde |
|---|---|
| Separação de UI reutilizável | `components/ui/` |
| Code splitting por rota | `App.jsx` com `lazy()` |
| Contextos para estado global | `AuthContext`, `ThemeContext` |
| Guards de acesso por tipo de negócio | `BusinessRoute` |
| Design system com CSS custom properties | `index.css` |
| Hook de toast centralizado | `hooks/useToast.js` |
| Utilitários de formatação | `utils/format.js` |

---

## Estrutura atual

```
src/
├── components/
│   ├── layout/        [PrivateRoute, BusinessRoute, Layout, Sidebar]
│   └── ui/            [Modal, Toast, ConfirmModal, EmptyState, ErrorBoundary,
│                        FormLabel, PageHeader, SearchBar, StatCard, TrialBanner]
├── contexts/          [AuthContext, ThemeContext]
├── hooks/             [useToast.js]
├── lib/               [supabase.js, mercadopago.js]
├── pages/
│   ├── auth/          [Landing, Login, Register, TrialExpired]
│   ├── dashboard/     [Dashboard, DashboardHotel, DashboardOficina]
│   ├── estoque/       [Estoque, Clientes, Vendas, Caixa, Fornecedores]
│   ├── hotel/         [Quartos, Reservas]
│   ├── oficina/       [Veiculos, OrdensServico]
│   └── bar/           [Mesas]
├── utils/             [format.js]
└── assets/
```

---

## Problema central

Cada página chama o Supabase diretamente, valida, filtra e gerencia estado — tudo no mesmo componente. Isso cria código duplicado e dificulta manutenção.

```
Estoque.jsx      → supabase.from('produtos').select()   ← acoplado ao BD
Clientes.jsx     → supabase.from('clientes').select()   ← mesma coisa
Fornecedores.jsx → supabase.from('fornecedores')...     ← mesma coisa
```

Padrões duplicados em quase todas as páginas:
- `useState` para lista, form, loading, modal, deleteId
- `useEffect` + `useCallback` para carregar dados
- Validação inline antes do `supabase.insert/update`
- `if (error) return showToast(error.message, 'error')` repetido

---

## Arquitetura recomendada: 3 camadas

```
components/ui/   →  só renderiza, recebe props
hooks/           →  estado + lógica de negócio
services/        →  acesso ao banco (Supabase)
```

### Camada 1 — Services (`src/services/`)

Isola todas as queries Supabase. Se o banco mudar, só o service muda.

```js
// services/produtosService.js
export const getProdutos = (businessId) =>
  supabase.from('produtos').select('*').eq('business_id', businessId)

export const saveProduto = (data) =>
  data.id
    ? supabase.from('produtos').update(data).eq('id', data.id)
    : supabase.from('produtos').insert(data)

export const deleteProduto = (id) =>
  supabase.from('produtos').delete().eq('id', id)
```

### Camada 2 — Hooks de dados (`src/hooks/`)

Encapsula estado, loading, e chamadas ao service. O componente não sabe de onde vêm os dados.

```js
// hooks/useProdutos.js
export function useProdutos() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  const { business } = useAuth()

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await getProdutos(business.id)
    if (error) showToast(error.message, 'error')
    else setProdutos(data)
    setLoading(false)
  }, [business.id])

  const save = async (form) => {
    const { error } = await saveProduto({ ...form, business_id: business.id })
    if (error) { showToast(error.message, 'error'); return false }
    showToast(form.id ? 'Produto atualizado!' : 'Produto cadastrado!')
    await load()
    return true
  }

  const remove = async (id) => {
    const { error } = await deleteProduto(id)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Produto removido.')
    setProdutos(prev => prev.filter(p => p.id !== id))
  }

  useEffect(() => { load() }, [load])

  return { produtos, loading, save, remove, reload: load }
}
```

### Camada 3 — Página (`src/pages/`)

Fica responsável apenas por JSX e eventos de UI — sem lógica de negócio.

```jsx
// pages/estoque/Estoque.jsx  — ~50% menos código
function Estoque() {
  const { produtos, loading, save, remove } = useProdutos()
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(EMPTY)

  const filtered = useMemo(
    () => produtos.filter(p => p.nome.toLowerCase().includes(search.toLowerCase())),
    [produtos, search]
  )

  return (
    <>
      <PageHeader title="Estoque" />
      <SearchBar value={search} onChange={setSearch} />
      {/* tabela com filtered */}
    </>
  )
}
```

---

## Plano de migração gradual

A migração pode ser feita **um módulo por vez**, sem quebrar nada em produção.

### Prioridade sugerida (maior ganho primeiro)

| Módulo | Complexidade | Impacto |
|---|---|---|
| `Caixa` | Alta | Alto — lógica financeira complexa |
| `Mesas` | Alta | Alto — comanda + status em tempo real |
| `Quartos` + `Reservas` | Média | Médio |
| `OrdensServico` | Média | Médio |
| `Estoque` + `Clientes` | Baixa | Baixo — CRUD simples |
| `Fornecedores` + `Veiculos` | Baixa | Baixo |

### Passos por módulo

1. Criar `src/services/xService.js` com as queries extraídas do componente
2. Criar `src/hooks/useX.js` com estado + chamadas ao service
3. Substituir a lógica no componente pelo hook
4. Testar

---

## Decisão

- **Desenvolvimento ativo com mudanças frequentes** → migrar gradualmente, começar pelos módulos mais complexos
- **Sistema estável** → custo/benefício baixo no curto prazo; priorizar só antes de adicionar features grandes

---

## Outras melhorias pontuais (independentes da arquitetura)

- **React Query ou SWR** — cache automático, revalidação, estados de loading/error padronizados
- **React Hook Form** — substituir controlled inputs inline por uma lib de forms (reduz re-renders e código)
- **Zod** — validação de schemas em vez de ifs inline
- **Error boundary por rota** — hoje só tem um global; erros numa página não deveriam derrubar todo o app
