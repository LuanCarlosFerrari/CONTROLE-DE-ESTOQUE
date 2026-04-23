import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString()
}
function dateStr(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().split('T')[0]
}

export default function Seed() {
  const { user } = useAuth()
  const [log, setLog]       = useState([])
  const [running, setRunning] = useState(false)
  const [done, setDone]     = useState(false)

  const push = (msg, ok = true) => setLog(l => [...l, { msg, ok }])

  const run = async () => {
    setRunning(true); setLog([]); setDone(false)
    try {

      // ── Clientes ─────────────────────────────────────────
      push('Inserindo clientes...')
      const { data: clientes, error: ec } = await supabase.from('clientes').insert([
        { nome: 'Carlos Eduardo Silva',     email: 'carlos@email.com',    telefone: '(11) 98765-4321', cidade: 'São Paulo',       endereco: 'Rua das Flores, 123'         },
        { nome: 'Maria Aparecida Santos',   email: 'maria@email.com',     telefone: '(11) 97654-3210', cidade: 'São Paulo',       endereco: 'Av. Paulista, 1500'          },
        { nome: 'João Pedro Oliveira',      email: 'joao@email.com',      telefone: '(21) 98888-7777', cidade: 'Rio de Janeiro',  endereco: 'Rua Copacabana, 45'          },
        { nome: 'Ana Lucia Ferreira',       email: 'ana@email.com',       telefone: '(31) 99999-8888', cidade: 'Belo Horizonte',  endereco: 'Av. Afonso Pena, 200'        },
        { nome: 'Roberto Carlos Mendes',    email: 'roberto@email.com',   telefone: '(41) 98877-6655', cidade: 'Curitiba',        endereco: 'Rua XV de Novembro, 500'     },
        { nome: 'Fernanda Lima Costa',      email: 'fernanda@email.com',  telefone: '(51) 97766-5544', cidade: 'Porto Alegre',    endereco: 'Av. Borges de Medeiros, 10'  },
        { nome: 'Marcos Antonio Pereira',   email: 'marcos@email.com',    telefone: '(71) 98765-1234', cidade: 'Salvador',        endereco: 'Av. Tancredo Neves, 600'     },
        { nome: 'Juliana Souza Alves',      email: 'juliana@email.com',   telefone: '(81) 97654-5678', cidade: 'Recife',          endereco: 'Rua do Bom Jesus, 30'        },
        { nome: 'Paulo Roberto Gomes',      email: 'paulo@email.com',     telefone: '(62) 99988-7766', cidade: 'Goiânia',         endereco: 'Av. Anhanguera, 1200'        },
        { nome: 'Cristina Maria Rodrigues', email: 'cristina@email.com',  telefone: '(61) 98877-5566', cidade: 'Brasília',        endereco: 'SQN 312, Bloco A, 105'       },
      ]).select()
      if (ec) throw new Error(`Clientes: ${ec.message}`)
      push(`✓ ${clientes.length} clientes`)

      // ── Fornecedores ─────────────────────────────────────
      push('Inserindo fornecedores...')
      const { data: forn, error: ef } = await supabase.from('fornecedores').insert([
        { nome: 'Distribuidora ABC Ltda',       cnpj: '11.222.333/0001-44', telefone: '(11) 3333-4444', email: 'contato@abc.com',          categoria: 'Eletrônicos',        cidade: 'São Paulo',       ativo: true },
        { nome: 'Atacado São Paulo',            cnpj: '22.333.444/0001-55', telefone: '(11) 4444-5555', email: 'vendas@atacadosp.com',     categoria: 'Alimentação',        cidade: 'São Paulo',       ativo: true },
        { nome: 'Importadora Nacional',         cnpj: '33.444.555/0001-66', telefone: '(21) 5555-6666', email: 'import@nacional.com',      categoria: 'Vestuário',          cidade: 'Rio de Janeiro',  ativo: true },
        { nome: 'AutoPeças Premier',            cnpj: '44.555.666/0001-77', telefone: '(11) 6666-7777', email: 'vendas@autopecaspremier.com', categoria: 'Peças Automotivas', cidade: 'Santo André',    ativo: true },
        { nome: 'Bebidas & Cia Distribuidora',  cnpj: '55.666.777/0001-88', telefone: '(11) 7777-8888', email: 'pedidos@bebidascia.com',    categoria: 'Bebidas',            cidade: 'Campinas',        ativo: true },
        { nome: 'Limpeza Total Distribuidora',  cnpj: '66.777.888/0001-99', telefone: '(31) 8888-9999', email: 'contato@limpezatotal.com', categoria: 'Limpeza',            cidade: 'Belo Horizonte',  ativo: true },
      ]).select()
      if (ef) throw new Error(`Fornecedores: ${ef.message}`)
      push(`✓ ${forn.length} fornecedores`)

      // ── Produtos ─────────────────────────────────────────
      push('Inserindo produtos...')
      const { data: produtos, error: ep } = await supabase.from('produtos').insert([
        { nome: 'Notebook Dell Inspiron 15',       categoria: 'Eletrônicos', quantidade: 12, preco_custo: 2100, preco_venda: 3200, estoque_minimo: 3  },
        { nome: 'Mouse Logitech MX Master 3',      categoria: 'Eletrônicos', quantidade: 35, preco_custo: 60,   preco_venda: 120,  estoque_minimo: 5  },
        { nome: 'Teclado Mecânico Redragon K552',  categoria: 'Eletrônicos', quantidade: 20, preco_custo: 150,  preco_venda: 280,  estoque_minimo: 5  },
        { nome: 'Monitor LG 24" Full HD',          categoria: 'Eletrônicos', quantidade: 8,  preco_custo: 650,  preco_venda: 1050, estoque_minimo: 2  },
        { nome: 'Headset Sony WH-1000XM5',         categoria: 'Eletrônicos', quantidade: 15, preco_custo: 900,  preco_venda: 1490, estoque_minimo: 3  },
        { nome: 'Cabo USB-C 2m Anker',             categoria: 'Acessórios',  quantidade: 80, preco_custo: 18,   preco_venda: 45,   estoque_minimo: 10 },
        { nome: 'Hub USB 7 Portas Multilaser',     categoria: 'Acessórios',  quantidade: 25, preco_custo: 65,   preco_venda: 130,  estoque_minimo: 5  },
        { nome: 'Suporte Monitor Articulado',       categoria: 'Acessórios',  quantidade: 18, preco_custo: 90,   preco_venda: 180,  estoque_minimo: 3  },
        { nome: 'Webcam Logitech C920 HD',         categoria: 'Eletrônicos', quantidade: 22, preco_custo: 250,  preco_venda: 420,  estoque_minimo: 5  },
        { nome: 'SSD Kingston 500GB',              categoria: 'Eletrônicos', quantidade: 30, preco_custo: 220,  preco_venda: 380,  estoque_minimo: 5  },
        { nome: 'Cerveja Heineken Long Neck',       categoria: 'Bebidas',     quantidade: 120,preco_custo: 6,    preco_venda: 12,   estoque_minimo: 24 },
        { nome: 'Refrigerante Coca-Cola 2L',       categoria: 'Bebidas',     quantidade: 60, preco_custo: 5,    preco_venda: 9,    estoque_minimo: 12 },
        { nome: 'Água Mineral Crystal 500ml',      categoria: 'Bebidas',     quantidade: 200,preco_custo: 1,    preco_venda: 3,    estoque_minimo: 48 },
        { nome: 'Bateria 60Ah Moura',              categoria: 'Automotivo',  quantidade: 10, preco_custo: 320,  preco_venda: 520,  estoque_minimo: 2  },
        { nome: 'Óleo Motor 5W30 Castrol 1L',      categoria: 'Automotivo',  quantidade: 45, preco_custo: 28,   preco_venda: 55,   estoque_minimo: 10 },
      ]).select()
      if (ep) throw new Error(`Produtos: ${ep.message}`)
      push(`✓ ${produtos.length} produtos`)

      // ── Mesas ─────────────────────────────────────────────
      push('Inserindo mesas...')
      const { data: mesas, error: em } = await supabase.from('mesas').insert([
        { numero: '01', tipo: 'salao',     capacidade: 4, descricao: 'Mesa junto à janela',     status: 'disponivel' },
        { numero: '02', tipo: 'salao',     capacidade: 4, descricao: 'Mesa central',             status: 'disponivel' },
        { numero: '03', tipo: 'salao',     capacidade: 6, descricao: 'Mesa familiar',             status: 'disponivel' },
        { numero: '04', tipo: 'salao',     capacidade: 2, descricao: 'Mesa para casal',           status: 'disponivel' },
        { numero: '05', tipo: 'varanda',   capacidade: 4, descricao: 'Varanda com vista para rua',status: 'disponivel' },
        { numero: '06', tipo: 'varanda',   capacidade: 2, descricao: 'Varanda romântica',         status: 'disponivel' },
        { numero: '07', tipo: 'reservado', capacidade: 8, descricao: 'Área privativa VIP',        status: 'disponivel' },
        { numero: '08', tipo: 'bar',       capacidade: 3, descricao: 'Banquetas no balcão',       status: 'disponivel' },
        { numero: '09', tipo: 'salao',     capacidade: 4, descricao: 'Mesa próxima ao bar',       status: 'disponivel' },
        { numero: '10', tipo: 'salao',     capacidade: 6, descricao: 'Mesa grande salão central', status: 'disponivel' },
      ]).select()
      if (em) throw new Error(`Mesas: ${em.message}`)
      push(`✓ ${mesas.length} mesas`)

      // ── Veículos ──────────────────────────────────────────
      push('Inserindo veículos...')
      const { data: veiculos, error: ev } = await supabase.from('veiculos').insert([
        { placa: 'ABC-1D23', marca: 'Honda',      modelo: 'Civic',     ano: '2020', cor: 'Prata',    km_atual: 52000, cliente_id: clientes[0].id },
        { placa: 'DEF-2E34', marca: 'Toyota',     modelo: 'Corolla',   ano: '2019', cor: 'Preto',    km_atual: 74000, cliente_id: clientes[1].id },
        { placa: 'GHI-3F45', marca: 'Volkswagen', modelo: 'Gol',       ano: '2018', cor: 'Branco',   km_atual: 98000, cliente_id: clientes[2].id },
        { placa: 'JKL-4G56', marca: 'Fiat',       modelo: 'Uno',       ano: '2017', cor: 'Vermelho', km_atual: 115000,cliente_id: clientes[3].id },
        { placa: 'MNO-5H67', marca: 'Hyundai',    modelo: 'HB20',      ano: '2021', cor: 'Azul',     km_atual: 38000, cliente_id: clientes[4].id },
        { placa: 'PQR-6I78', marca: 'Ford',       modelo: 'Ka',        ano: '2020', cor: 'Cinza',    km_atual: 61000, cliente_id: clientes[5].id },
        { placa: 'STU-7J89', marca: 'Chevrolet',  modelo: 'Onix',      ano: '2022', cor: 'Branco',   km_atual: 29000, cliente_id: clientes[6].id },
        { placa: 'VWX-8K90', marca: 'Renault',    modelo: 'Kwid',      ano: '2021', cor: 'Laranja',  km_atual: 44000, cliente_id: clientes[7].id },
        { placa: 'YZA-9L01', marca: 'Jeep',       modelo: 'Compass',   ano: '2023', cor: 'Preto',    km_atual: 18000, cliente_id: clientes[8].id },
        { placa: 'BCD-0M12', marca: 'Volkswagen', modelo: 'T-Cross',   ano: '2022', cor: 'Prata',    km_atual: 35000, cliente_id: clientes[9].id },
      ]).select()
      if (ev) throw new Error(`Veículos: ${ev.message}`)
      push(`✓ ${veiculos.length} veículos`)

      // ── Quartos ───────────────────────────────────────────
      push('Inserindo quartos...')
      const { data: quartos, error: eq } = await supabase.from('quartos').insert([
        { numero: '101', tipo: 'solteiro', capacidade: 1, preco_diaria: 120, descricao: 'Quarto individual com banheiro privativo',    status: 'disponivel' },
        { numero: '102', tipo: 'solteiro', capacidade: 1, preco_diaria: 120, descricao: 'Quarto individual vista para o jardim',       status: 'disponivel' },
        { numero: '201', tipo: 'casal',    capacidade: 2, preco_diaria: 200, descricao: 'Quarto de casal cama queen',                  status: 'disponivel' },
        { numero: '202', tipo: 'casal',    capacidade: 2, preco_diaria: 200, descricao: 'Quarto de casal com sacada',                  status: 'disponivel' },
        { numero: '203', tipo: 'duplo',    capacidade: 2, preco_diaria: 180, descricao: 'Quarto com duas camas de solteiro',           status: 'disponivel' },
        { numero: '301', tipo: 'suite',    capacidade: 2, preco_diaria: 380, descricao: 'Suíte luxo com hidromassagem e varanda',      status: 'disponivel' },
        { numero: '302', tipo: 'suite',    capacidade: 3, preco_diaria: 420, descricao: 'Suíte master com sala de estar',              status: 'disponivel' },
        { numero: '401', tipo: 'familia',  capacidade: 4, preco_diaria: 350, descricao: 'Quarto família com dois quartos conectados',  status: 'disponivel' },
      ]).select()
      if (eq) throw new Error(`Quartos: ${eq.message}`)
      push(`✓ ${quartos.length} quartos`)

      // ── Ordens de Serviço ─────────────────────────────────
      push('Inserindo ordens de serviço...')
      const { count: countOS } = await supabase.from('ordens_servico').select('*', { count: 'exact', head: true })
      const base = (countOS || 0) + 1
      const osRows = [
        { numero: `OS-${String(base+0).padStart(4,'0')}`,  veiculo_id: veiculos[0].id, cliente_id: clientes[0].id, status: 'concluida',    descricao: 'Revisão completa 50.000km',              diagnostico: 'Troca de óleo, filtros e velas',            valor_mao_obra: 180, valor_total: 520,  data_previsao: dateStr(-10), data_conclusao: daysAgo(8),  created_at: daysAgo(12) },
        { numero: `OS-${String(base+1).padStart(4,'0')}`,  veiculo_id: veiculos[1].id, cliente_id: clientes[1].id, status: 'concluida',    descricao: 'Troca de pastilhas de freio',            diagnostico: 'Desgaste nas pastilhas dianteiras',         valor_mao_obra: 120, valor_total: 280,  data_previsao: dateStr(-20), data_conclusao: daysAgo(18), created_at: daysAgo(22) },
        { numero: `OS-${String(base+2).padStart(4,'0')}`,  veiculo_id: veiculos[2].id, cliente_id: clientes[2].id, status: 'concluida',    descricao: 'Alinhamento e balanceamento 4 rodas',    diagnostico: 'Veículo puxando para direita',              valor_mao_obra: 80,  valor_total: 150,  data_previsao: dateStr(-30), data_conclusao: daysAgo(28), created_at: daysAgo(32) },
        { numero: `OS-${String(base+3).padStart(4,'0')}`,  veiculo_id: veiculos[3].id, cliente_id: clientes[3].id, status: 'em_andamento', descricao: 'Problema no sistema de arrefecimento',   diagnostico: 'Vazamento identificado no radiador',        valor_mao_obra: 200, valor_total: 650,  data_previsao: dateStr(2),  data_conclusao: null,        created_at: daysAgo(1)  },
        { numero: `OS-${String(base+4).padStart(4,'0')}`,  veiculo_id: veiculos[4].id, cliente_id: clientes[4].id, status: 'em_andamento', descricao: 'Troca de embreagem completa',             diagnostico: 'Embreagem patinando em 3ª e 4ª marcha',    valor_mao_obra: 350, valor_total: 900,  data_previsao: dateStr(3),  data_conclusao: null,        created_at: daysAgo(2)  },
        { numero: `OS-${String(base+5).padStart(4,'0')}`,  veiculo_id: veiculos[5].id, cliente_id: clientes[5].id, status: 'aberta',       descricao: 'Revisão geral preventiva',               diagnostico: null,                                        valor_mao_obra: 150, valor_total: 400,  data_previsao: dateStr(5),  data_conclusao: null,        created_at: daysAgo(0)  },
        { numero: `OS-${String(base+6).padStart(4,'0')}`,  veiculo_id: veiculos[6].id, cliente_id: clientes[6].id, status: 'aberta',       descricao: 'Ruído na suspensão traseira',            diagnostico: null,                                        valor_mao_obra: 200, valor_total: 450,  data_previsao: dateStr(4),  data_conclusao: null,        created_at: daysAgo(0)  },
        { numero: `OS-${String(base+7).padStart(4,'0')}`,  veiculo_id: veiculos[7].id, cliente_id: clientes[7].id, status: 'concluida',    descricao: 'Troca de correia dentada e tensor',      diagnostico: 'Correia próxima do limite de troca',        valor_mao_obra: 250, valor_total: 580,  data_previsao: dateStr(-40), data_conclusao: daysAgo(38), created_at: daysAgo(42) },
        { numero: `OS-${String(base+8).padStart(4,'0')}`,  veiculo_id: veiculos[8].id, cliente_id: clientes[8].id, status: 'concluida',    descricao: 'Limpeza do sistema de injeção',          diagnostico: 'Bicos injetores entupidos, consumo alto',   valor_mao_obra: 180, valor_total: 320,  data_previsao: dateStr(-50), data_conclusao: daysAgo(48), created_at: daysAgo(52) },
        { numero: `OS-${String(base+9).padStart(4,'0')}`,  veiculo_id: veiculos[9].id, cliente_id: clientes[9].id, status: 'cancelada',    descricao: 'Diagnóstico eletrônico (cancelado)',     diagnostico: null,                                        valor_mao_obra: 0,   valor_total: 0,    data_previsao: null,         data_conclusao: null,        created_at: daysAgo(15) },
        { numero: `OS-${String(base+10).padStart(4,'0')}`, veiculo_id: veiculos[0].id, cliente_id: clientes[0].id, status: 'concluida',    descricao: 'Troca de bateria 60Ah',                  diagnostico: 'Bateria não segurando carga',               valor_mao_obra: 60,  valor_total: 580,  data_previsao: dateStr(-60), data_conclusao: daysAgo(58), created_at: daysAgo(62) },
        { numero: `OS-${String(base+11).padStart(4,'0')}`, veiculo_id: veiculos[1].id, cliente_id: clientes[1].id, status: 'aberta',       descricao: 'Ar-condicionado não resfria',            diagnostico: null,                                        valor_mao_obra: 120, valor_total: 350,  data_previsao: dateStr(7),  data_conclusao: null,        created_at: daysAgo(0)  },
      ]
      const { data: ordens, error: eos } = await supabase.from('ordens_servico').insert(osRows).select()
      if (eos) throw new Error(`OS: ${eos.message}`)
      push(`✓ ${ordens.length} ordens de serviço`)

      // ── OS Itens ──────────────────────────────────────────
      push('Inserindo itens de OS...')
      const osItens = [
        { os_id: ordens[0].id, descricao: 'Óleo Motor 5W30 4L',       quantidade: 1, preco_unitario: 180 },
        { os_id: ordens[0].id, descricao: 'Filtro de óleo',            quantidade: 1, preco_unitario: 35  },
        { os_id: ordens[0].id, descricao: 'Filtro de ar',              quantidade: 1, preco_unitario: 40  },
        { os_id: ordens[0].id, descricao: 'Velas NGK (jogo 4)',        quantidade: 1, preco_unitario: 85  },
        { os_id: ordens[1].id, descricao: 'Pastilha freio dianteira',  quantidade: 1, preco_unitario: 120 },
        { os_id: ordens[1].id, descricao: 'Fluido de freio DOT4',      quantidade: 1, preco_unitario: 40  },
        { os_id: ordens[3].id, descricao: 'Radiador completo',         quantidade: 1, preco_unitario: 380 },
        { os_id: ordens[3].id, descricao: 'Mangueira superior',        quantidade: 1, preco_unitario: 70  },
        { os_id: ordens[4].id, descricao: 'Kit embreagem completo',    quantidade: 1, preco_unitario: 550 },
        { os_id: ordens[7].id, descricao: 'Correia dentada',           quantidade: 1, preco_unitario: 180 },
        { os_id: ordens[7].id, descricao: 'Tensor correia',            quantidade: 1, preco_unitario: 150 },
        { os_id: ordens[10].id, descricao: 'Bateria Moura 60Ah',      quantidade: 1, preco_unitario: 520 },
      ]
      const { error: eoi } = await supabase.from('os_itens').insert(osItens)
      if (eoi) throw new Error(`OS Itens: ${eoi.message}`)
      push(`✓ ${osItens.length} itens de OS`)

      // ── Reservas ──────────────────────────────────────────
      push('Inserindo reservas...')
      const reservasRows = [
        { quarto_id: quartos[0].id, cliente_id: clientes[0].id, nome_hospede: clientes[0].nome, telefone_hospede: '(11) 98765-4321', status: 'checkout',   check_in: dateStr(-20), check_out: dateStr(-17), valor_diaria: 120, valor_total: 360,  valor_pago: 360,  forma_pagamento: 'pix'           },
        { quarto_id: quartos[2].id, cliente_id: clientes[1].id, nome_hospede: clientes[1].nome, telefone_hospede: '(11) 97654-3210', status: 'checkout',   check_in: dateStr(-15), check_out: dateStr(-12), valor_diaria: 200, valor_total: 600,  valor_pago: 600,  forma_pagamento: 'cartao_credito' },
        { quarto_id: quartos[5].id, cliente_id: clientes[2].id, nome_hospede: clientes[2].nome, telefone_hospede: '(21) 98888-7777', status: 'checkout',   check_in: dateStr(-10), check_out: dateStr(-7),  valor_diaria: 380, valor_total: 1140, valor_pago: 1140, forma_pagamento: 'dinheiro'       },
        { quarto_id: quartos[3].id, cliente_id: clientes[3].id, nome_hospede: clientes[3].nome, telefone_hospede: '(31) 99999-8888', status: 'checkout',   check_in: dateStr(-8),  check_out: dateStr(-5),  valor_diaria: 200, valor_total: 600,  valor_pago: 600,  forma_pagamento: 'pix'           },
        { quarto_id: quartos[4].id, cliente_id: clientes[4].id, nome_hospede: clientes[4].nome, telefone_hospede: '(41) 98877-6655', status: 'checkout',   check_in: dateStr(-30), check_out: dateStr(-28), valor_diaria: 180, valor_total: 360,  valor_pago: 360,  forma_pagamento: 'cartao_debito'  },
        { quarto_id: quartos[1].id, cliente_id: clientes[5].id, nome_hospede: clientes[5].nome, telefone_hospede: '(51) 97766-5544', status: 'checkin',    check_in: dateStr(-2),  check_out: dateStr(2),   valor_diaria: 120, valor_total: 480,  valor_pago: 0,    forma_pagamento: 'dinheiro'       },
        { quarto_id: quartos[6].id, cliente_id: clientes[6].id, nome_hospede: clientes[6].nome, telefone_hospede: '(71) 98765-1234', status: 'checkin',    check_in: dateStr(-1),  check_out: dateStr(4),   valor_diaria: 420, valor_total: 2100, valor_pago: 1000, forma_pagamento: 'pix'           },
        { quarto_id: quartos[7].id, cliente_id: clientes[7].id, nome_hospede: clientes[7].nome, telefone_hospede: '(81) 97654-5678', status: 'checkin',    check_in: dateStr(0),   check_out: dateStr(3),   valor_diaria: 350, valor_total: 1050, valor_pago: 0,    forma_pagamento: 'cartao_credito' },
        { quarto_id: quartos[0].id, cliente_id: clientes[8].id, nome_hospede: clientes[8].nome, telefone_hospede: '(62) 99988-7766', status: 'confirmada', check_in: dateStr(5),   check_out: dateStr(8),   valor_diaria: 120, valor_total: 360,  valor_pago: 0,    forma_pagamento: 'pix'           },
        { quarto_id: quartos[2].id, cliente_id: clientes[9].id, nome_hospede: clientes[9].nome, telefone_hospede: '(61) 98877-5566', status: 'confirmada', check_in: dateStr(7),   check_out: dateStr(12),  valor_diaria: 200, valor_total: 1000, valor_pago: 300,  forma_pagamento: 'cartao_credito' },
        { quarto_id: quartos[5].id, cliente_id: clientes[0].id, nome_hospede: clientes[0].nome, telefone_hospede: '(11) 98765-4321', status: 'confirmada', check_in: dateStr(10),  check_out: dateStr(14),  valor_diaria: 380, valor_total: 1520, valor_pago: 760,  forma_pagamento: 'pix'           },
        { quarto_id: quartos[4].id, cliente_id: clientes[1].id, nome_hospede: clientes[1].nome, telefone_hospede: '(11) 97654-3210', status: 'confirmada', check_in: dateStr(15),  check_out: dateStr(18),  valor_diaria: 180, valor_total: 540,  valor_pago: 0,    forma_pagamento: 'dinheiro'       },
        { quarto_id: quartos[6].id, cliente_id: clientes[2].id, nome_hospede: clientes[2].nome, telefone_hospede: '(21) 98888-7777', status: 'confirmada', check_in: dateStr(20),  check_out: dateStr(25),  valor_diaria: 420, valor_total: 2100, valor_pago: 0,    forma_pagamento: 'cartao_credito' },
      ]
      const { data: reservas, error: er } = await supabase.from('reservas').insert(reservasRows).select()
      if (er) throw new Error(`Reservas: ${er.message}`)
      push(`✓ ${reservas.length} reservas`)

      // ── Vendas ────────────────────────────────────────────
      push('Inserindo vendas...')
      const vendasRows = [
        { cliente_id: clientes[0].id, total: 3200,  forma_pagamento: 'cartao_credito', created_at: daysAgo(1),  observacao: null                  },
        { cliente_id: clientes[1].id, total: 280,   forma_pagamento: 'pix',            created_at: daysAgo(1),  observacao: null                  },
        { cliente_id: clientes[2].id, total: 1050,  forma_pagamento: 'dinheiro',       created_at: daysAgo(2),  observacao: null                  },
        { cliente_id: clientes[3].id, total: 420,   forma_pagamento: 'pix',            created_at: daysAgo(3),  observacao: null                  },
        { cliente_id: clientes[4].id, total: 1490,  forma_pagamento: 'cartao_credito', created_at: daysAgo(4),  observacao: null                  },
        { cliente_id: clientes[5].id, total: 580,   forma_pagamento: 'pix',            created_at: daysAgo(5),  observacao: null                  },
        { cliente_id: clientes[6].id, total: 180,   forma_pagamento: 'dinheiro',       created_at: daysAgo(7),  observacao: 'Promoção relâmpago'  },
        { cliente_id: clientes[7].id, total: 760,   forma_pagamento: 'cartao_debito',  created_at: daysAgo(8),  observacao: null                  },
        { cliente_id: clientes[8].id, total: 3580,  forma_pagamento: 'crediario',      created_at: daysAgo(10), observacao: 'Crediário 3x'        },
        { cliente_id: clientes[9].id, total: 380,   forma_pagamento: 'pix',            created_at: daysAgo(12), observacao: null                  },
        { cliente_id: clientes[0].id, total: 560,   forma_pagamento: 'dinheiro',       created_at: daysAgo(15), observacao: null                  },
        { cliente_id: clientes[1].id, total: 1890,  forma_pagamento: 'cartao_credito', created_at: daysAgo(18), observacao: null                  },
        { cliente_id: clientes[2].id, total: 2500,  forma_pagamento: 'crediario',      created_at: daysAgo(20), observacao: 'Crediário 4x'        },
        { cliente_id: clientes[3].id, total: 130,   forma_pagamento: 'pix',            created_at: daysAgo(22), observacao: null                  },
        { cliente_id: clientes[4].id, total: 430,   forma_pagamento: 'dinheiro',       created_at: daysAgo(25), observacao: null                  },
        { cliente_id: clientes[5].id, total: 280,   forma_pagamento: 'pix',            created_at: daysAgo(28), observacao: null                  },
        { cliente_id: clientes[6].id, total: 920,   forma_pagamento: 'cartao_credito', created_at: daysAgo(32), observacao: null                  },
        { cliente_id: clientes[7].id, total: 1760,  forma_pagamento: 'crediario',      created_at: daysAgo(35), observacao: 'Crediário 6x'        },
        { cliente_id: clientes[8].id, total: 450,   forma_pagamento: 'pix',            created_at: daysAgo(40), observacao: null                  },
        { cliente_id: clientes[9].id, total: 3200,  forma_pagamento: 'cartao_credito', created_at: daysAgo(45), observacao: null                  },
      ]
      const { data: vendas, error: ev2 } = await supabase.from('vendas').insert(vendasRows).select()
      if (ev2) throw new Error(`Vendas: ${ev2.message}`)
      push(`✓ ${vendas.length} vendas`)

      // ── Venda Itens ───────────────────────────────────────
      push('Inserindo itens de venda...')
      const vendaItens = []
      vendas.forEach((v, i) => {
        const p1 = produtos[i % produtos.length]
        const p2 = produtos[(i + 3) % produtos.length]
        vendaItens.push({ venda_id: v.id, produto_id: p1.id, quantidade: 1, preco_unitario: p1.preco_venda })
        if (i % 3 === 0) vendaItens.push({ venda_id: v.id, produto_id: p2.id, quantidade: 2, preco_unitario: p2.preco_venda })
      })
      const { error: evi } = await supabase.from('venda_itens').insert(vendaItens)
      if (evi) throw new Error(`Venda Itens: ${evi.message}`)
      push(`✓ ${vendaItens.length} itens de venda`)

      // ── Parcelas Crediário ────────────────────────────────
      push('Inserindo parcelas de crediário...')
      const parcelasRows = []
      // Venda índice 8: R$3.580 — 3x
      ;[[vendas[8], clientes[8], 3], [vendas[12], clientes[2], 4], [vendas[17], clientes[7], 6]].forEach(([venda, cliente, nParcelas]) => {
        if (!venda) return
        const daysBack = venda === vendas[8] ? 10 : venda === vendas[12] ? 20 : 35
        for (let i = 0; i < nParcelas; i++) {
          const d = new Date(); d.setDate(d.getDate() - daysBack + (i + 1) * 30)
          const isPago = i < Math.floor(nParcelas / 3)
          parcelasRows.push({
            venda_id: venda.id, cliente_id: cliente.id, cliente_nome: cliente.nome,
            numero: i + 1, total_parcelas: nParcelas,
            valor: Number((venda.total / nParcelas).toFixed(2)),
            data_vencimento: d.toISOString().split('T')[0],
            status: isPago ? 'pago' : 'pendente',
            data_pagamento: isPago ? d.toISOString().split('T')[0] : null,
          })
        }
      })
      const { error: epc } = await supabase.from('parcelas_crediario').insert(parcelasRows)
      if (epc) throw new Error(`Parcelas: ${epc.message}`)
      push(`✓ ${parcelasRows.length} parcelas de crediário`)

      // ── Caixa ─────────────────────────────────────────────
      push('Inserindo caixa do dia...')
      const hoje = new Date().toISOString().split('T')[0]
      const { error: ecx } = await supabase.from('caixas').insert({ data: hoje, saldo_inicial: 500, status: 'aberto' })
      if (ecx && !ecx.message?.includes('duplicate') && !ecx.message?.includes('unique')) throw new Error(`Caixa: ${ecx.message}`)
      push('✓ Caixa aberto hoje (R$ 500,00 saldo inicial)')

      // ── Movimentações extras ──────────────────────────────
      push('Inserindo movimentações extras...')
      const movsRows = [
        { tipo: 'entrada', valor: 200,  descricao: 'Adiantamento de cliente',        forma_pagamento: 'dinheiro', created_at: daysAgo(1) },
        { tipo: 'saida',   valor: 150,  descricao: 'Compra de material de limpeza',  forma_pagamento: 'dinheiro', created_at: daysAgo(1) },
        { tipo: 'entrada', valor: 500,  descricao: 'Recebimento de parcela crediário',forma_pagamento: 'pix',    created_at: daysAgo(2) },
        { tipo: 'saida',   valor: 80,   descricao: 'Conta de água',                  forma_pagamento: 'dinheiro', created_at: daysAgo(3) },
        { tipo: 'saida',   valor: 350,  descricao: 'Conta de energia elétrica',      forma_pagamento: 'dinheiro', created_at: daysAgo(5) },
        { tipo: 'entrada', valor: 1200, descricao: 'Pagamento de OS concluída',       forma_pagamento: 'pix',     created_at: daysAgo(6) },
        { tipo: 'saida',   valor: 200,  descricao: 'Almoço equipe',                  forma_pagamento: 'dinheiro', created_at: daysAgo(7) },
        { tipo: 'entrada', valor: 300,  descricao: 'Recebimento pendente anterior',  forma_pagamento: 'dinheiro', created_at: daysAgo(8) },
      ]
      const { error: emov } = await supabase.from('movimentacoes_extras').insert(movsRows)
      if (emov) throw new Error(`Movimentações: ${emov.message}`)
      push(`✓ ${movsRows.length} movimentações extras`)

      push('')
      push('Banco populado com sucesso! Você pode excluir a rota /app/seed agora.')
      setDone(true)

    } catch (err) {
      push(`Erro: ${err.message}`, false)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 600, margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
        Seed de dados
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
        Logado como <strong style={{ color: 'var(--amber)' }}>{user?.email}</strong>
      </p>

      {!running && !done && (
        <button
          onClick={run}
          style={{
            background: 'var(--amber)', border: 'none', borderRadius: 10,
            padding: '12px 28px', fontSize: 14, fontWeight: 700,
            color: '#fff', cursor: 'pointer', marginBottom: 24,
          }}
        >
          Iniciar seed
        </button>
      )}

      {(running || log.length > 0) && (
        <div style={{ background: 'var(--bg-700)', border: '1px solid var(--bg-500)', borderRadius: 12, padding: '16px 20px', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
          {log.map((l, i) => (
            <div key={i} style={{ color: l.ok ? (l.msg.startsWith('✓') ? '#34D399' : l.msg === '' ? 'transparent' : 'var(--text-muted)') : '#F87171', marginBottom: 4 }}>
              {l.msg || ' '}
            </div>
          ))}
          {running && <div style={{ color: 'var(--amber)', marginTop: 4 }}>Aguarde...</div>}
        </div>
      )}

      {done && (
        <p style={{ fontSize: 13, color: '#34D399', marginTop: 16, fontWeight: 600 }}>
          Pronto! Navegue pelas abas para ver os dados.
        </p>
      )}
    </div>
  )
}
