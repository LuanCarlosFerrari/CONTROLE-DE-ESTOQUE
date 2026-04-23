# StockTag

Sistema de gestão para pequenos negócios. Suporta 4 tipos de operação:

| Tipo | Módulos |
|------|---------|
| **Estoque Geral** | Estoque, Clientes, Vendas, Fornecedores, Caixa |
| **Oficina Mecânica** | Ordens de Serviço, Veículos, Peças/Estoque, Clientes, Caixa |
| **Hotel / Pousada** | Quartos, Reservas, Fornecedores, Clientes, Caixa |
| **Bar / Restaurante** | Mesas, Cardápio/Estoque, Fornecedores, Clientes, Caixa |

## Stack

- **Frontend**: React 19 + Vite 5
- **Backend/DB**: Supabase (PostgreSQL + Auth + RLS)
- **Pagamentos**: MercadoPago
- **Deploy**: Vercel

## Setup

```bash
npm install
cp .env.example .env   # preencher com credenciais Supabase
npm run dev
```

Rodar o arquivo `supabase_schema.sql` no SQL Editor do Supabase antes de usar.

## Estrutura

```
src/
├── assets/
├── components/
│   ├── layout/      Layout, Sidebar, PrivateRoute, BusinessRoute
│   └── ui/          Modal, Toast, TrialBanner, ErrorBoundary
├── contexts/        AuthContext, ThemeContext
├── hooks/           useToast
├── lib/             supabase.js, mercadopago.js
├── pages/
│   ├── auth/        Landing, Login, Register, TrialExpired
│   ├── dashboard/   Dashboard, DashboardOficina, DashboardHotel
│   ├── estoque/     Estoque, Clientes, Vendas, Caixa, Fornecedores
│   │   └── caixa/   CaixaStats, MovimentacaoLista, ModalVenda, ModalExtra
│   ├── oficina/     Veiculos, OrdensServico
│   ├── hotel/       Quartos, Reservas
│   └── bar/         Mesas
└── utils/           format.js
```

## Variáveis de ambiente

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
VITE_APP_URL=https://SEU_DOMINIO.vercel.app
```
