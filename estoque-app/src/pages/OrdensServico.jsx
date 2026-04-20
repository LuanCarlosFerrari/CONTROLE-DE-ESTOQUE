import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, Wrench, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

const EMPTY_OS = {
  veiculo_id: '', cliente_id: '', status: 'aberta',
  descricao: '', diagnostico: '', observacao: '',
  valor_mao_obra: 0, data_previsao: '',
}
const EMPTY_ITEM = { descricao: '', quantidade: 1, preco_unitario: 0 }

const STATUS_CFG = {
  aberta:       { label: 'Aberta',        color: '#60A5FA', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)' },
  em_andamento: { label: 'Em andamento',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  concluida:    { label: 'Concluída',     color: '#34D399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)' },
  cancelada:    { label: 'Cancelada',     color: '#F87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)' },
}

const StatusBadge = ({ status }) => {
  const c = STATUS_CFG[status] || STATUS_CFG.aberta
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: c.color, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  )
}

const Label = ({ children, required }) => (
  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 7 }}>
    {children}{required && <span style={{ color: 'var(--amber)', marginLeft: 3 }}>*</span>}
  </label>
)

function fmt(v) { return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

export default function OrdensServico() {
  const [ordens, setOrdens] = useState([])
  const [veiculos, setVeiculos] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_OS)
  const [itens, setItens] = useState([{ ...EMPTY_ITEM }])
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const load = useCallback(async () => {
    const [{ data: o }, { data: v }, { data: c }] = await Promise.all([
      supabase.from('ordens_servico')
        .select('*, veiculos(placa, marca, modelo), clientes(nome)')
        .order('created_at', { ascending: false }),
      supabase.from('veiculos').select('id, placa, marca, modelo, cliente_id').order('placa'),
      supabase.from('clientes').select('id, nome').order('nome'),
    ])
    setOrdens(o || [])
    setVeiculos(v || [])
    setClientes(c || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const gerarNumero = async () => {
    const { count } = await supabase.from('ordens_servico').select('*', { count: 'exact', head: true })
    return `OS-${String((count || 0) + 1).padStart(4, '0')}`
  }

  const openCreate = () => {
    setForm(EMPTY_OS)
    setItens([{ ...EMPTY_ITEM }])
    setEditing(null)
    setModal('form')
  }

  const openEdit = async (os) => {
    setEditing(os.id)
    setForm({
      veiculo_id: os.veiculo_id || '',
      cliente_id: os.cliente_id || '',
      status: os.status || 'aberta',
      descricao: os.descricao || '',
      diagnostico: os.diagnostico || '',
      observacao: os.observacao || '',
      valor_mao_obra: os.valor_mao_obra || 0,
      data_previsao: os.data_previsao || '',
    })
    const { data: items } = await supabase.from('os_itens').select('*').eq('os_id', os.id).order('created_at')
    setItens(items?.length ? items : [{ ...EMPTY_ITEM }])
    setModal('form')
  }

  const totalPecas = itens.reduce((s, i) => s + Number(i.quantidade || 0) * Number(i.preco_unitario || 0), 0)
  const totalGeral = Number(form.valor_mao_obra || 0) + totalPecas

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)

    const itensValidos = itens.filter(i => i.descricao?.trim())
    const payload = {
      veiculo_id: form.veiculo_id || null,
      cliente_id: form.cliente_id || null,
      status: form.status,
      descricao: form.descricao,
      diagnostico: form.diagnostico || null,
      observacao: form.observacao || null,
      valor_mao_obra: Number(form.valor_mao_obra) || 0,
      valor_total: totalGeral,
      data_previsao: form.data_previsao || null,
    }

    let osId = editing

    if (!editing) {
      const numero = await gerarNumero()
      const { data, error } = await supabase
        .from('ordens_servico')
        .insert({ ...payload, numero })
        .select('id')
        .single()
      if (error) { setSaving(false); return setToast({ msg: error.message, type: 'error' }) }
      osId = data.id
    } else {
      const { error } = await supabase
        .from('ordens_servico')
        .update({
          ...payload,
          data_conclusao: form.status === 'concluida' ? new Date().toISOString() : null,
        })
        .eq('id', editing)
      if (error) { setSaving(false); return setToast({ msg: error.message, type: 'error' }) }
      await supabase.from('os_itens').delete().eq('os_id', editing)
    }

    if (itensValidos.length > 0) {
      await supabase.from('os_itens').insert(
        itensValidos.map(({ descricao, quantidade, preco_unitario }) => ({
          os_id: osId,
          descricao: descricao.trim(),
          quantidade: Number(quantidade) || 1,
          preco_unitario: Number(preco_unitario) || 0,
        }))
      )
    }

    setSaving(false)
    setToast({ msg: editing ? 'OS atualizada!' : 'OS criada!', type: 'success' })
    setModal(null)
    load()
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('ordens_servico').delete().eq('id', deleteId)
    setDeleteId(null)
    if (error) return setToast({ msg: error.message, type: 'error' })
    setToast({ msg: 'OS removida.', type: 'success' })
    load()
  }

  const addItem = () => setItens(it => [...it, { ...EMPTY_ITEM }])
  const removeItem = (i) => setItens(it => it.length > 1 ? it.filter((_, idx) => idx !== i) : [{ ...EMPTY_ITEM }])
  const updateItem = (i, field, value) => setItens(it => it.map((item, idx) => idx === i ? { ...item, [field]: value } : item))

  const onVeiculoChange = (veiculo_id) => {
    const v = veiculos.find(v => v.id === veiculo_id)
    setForm(f => ({ ...f, veiculo_id, cliente_id: v?.cliente_id || f.cliente_id }))
  }

  const counts = {
    todos: ordens.length,
    aberta: ordens.filter(o => o.status === 'aberta').length,
    em_andamento: ordens.filter(o => o.status === 'em_andamento').length,
    concluida: ordens.filter(o => o.status === 'concluida').length,
    cancelada: ordens.filter(o => o.status === 'cancelada').length,
  }

  const filtered = ordens.filter(o => {
    const matchStatus = filterStatus === 'todos' || o.status === filterStatus
    const q = search.toLowerCase()
    const matchSearch = !q ||
      o.numero?.toLowerCase().includes(q) ||
      o.veiculos?.placa?.toLowerCase().includes(q) ||
      o.clientes?.nome?.toLowerCase().includes(q) ||
      o.descricao?.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  return (
    <div style={{ maxWidth: 1200 }} className="animate-fade-in page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--bg-600)', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{ width: 3, height: 22, background: 'var(--amber)', borderRadius: 2 }} />
            <h1 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Ordens de Serviço</h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', paddingLeft: 15 }}>{ordens.length} ordem{ordens.length !== 1 ? 's' : ''} no total</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={15} /> Nova OS</button>
      </div>

      {/* Filtros por status */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          ['todos', 'Todos'],
          ['aberta', 'Abertas'],
          ['em_andamento', 'Em andamento'],
          ['concluida', 'Concluídas'],
          ['cancelada', 'Canceladas'],
        ].map(([val, lbl]) => (
          <button key={val} onClick={() => setFilterStatus(val)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: filterStatus === val ? 'var(--amber)' : 'var(--bg-700)',
            color: filterStatus === val ? '#000' : 'var(--text-muted)',
            border: filterStatus === val ? '1px solid transparent' : '1px solid var(--bg-500)',
            transition: 'all 0.15s',
          }}>
            {lbl} <span style={{ opacity: 0.65 }}>({counts[val]})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
          <Search size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
          <input className="input-field" placeholder="Buscar por número, placa ou cliente..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38, fontSize: 13 }} />
        </div>
        {search && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>}
      </div>

      {/* Tabela */}
      <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px 20px' }}>
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8, marginBottom: 10, opacity: 1 - i * 0.15 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '72px 32px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--bg-700)', border: '1px solid var(--bg-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Wrench size={28} color="var(--bg-400)" />
            </div>
            <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              {search || filterStatus !== 'todos' ? 'Nenhuma OS encontrada' : 'Nenhuma OS cadastrada'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-subtle)' }}>
              {search || filterStatus !== 'todos' ? 'Tente outros filtros' : 'Crie a primeira ordem de serviço'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nº OS</th>
                  <th>Veículo</th>
                  <th>Cliente</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th>Entrada</th>
                  <th>Previsão</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id}>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{o.numero}</span>
                    </td>
                    <td>
                      {o.veiculos ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: 'var(--amber)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 5, padding: '2px 6px' }}>
                            {o.veiculos.placa}
                          </span>
                          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{o.veiculos.marca} {o.veiculos.modelo}</span>
                        </div>
                      ) : <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>—</span>}
                    </td>
                    <td><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{o.clientes?.nome || '—'}</span></td>
                    <td style={{ textAlign: 'center' }}><StatusBadge status={o.status} /></td>
                    <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                      R$ {fmt(o.valor_total)}
                    </td>
                    <td><span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{new Date(o.data_entrada).toLocaleDateString('pt-BR')}</span></td>
                    <td>
                      {o.data_previsao
                        ? <span style={{ fontSize: 12, color: new Date(o.data_previsao) < new Date() && o.status !== 'concluida' ? '#F87171' : 'var(--text-subtle)' }}>
                            {new Date(o.data_previsao + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        : <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button onClick={() => openEdit(o)} title="Editar" style={{ width: 30, height: 30, background: 'none', border: '1px solid transparent', cursor: 'pointer', color: 'var(--text-subtle)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--amber)'; e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-subtle)'; e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent' }}
                        ><Pencil size={13} /></button>
                        <button onClick={() => setDeleteId(o.id)} title="Excluir" style={{ width: 30, height: 30, background: 'none', border: '1px solid transparent', cursor: 'pointer', color: 'var(--text-subtle)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-subtle)'; e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent' }}
                        ><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de formulário */}
      {modal === 'form' && (
        <Modal title={editing ? 'Editar OS' : 'Nova Ordem de Serviço'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave}>
            {/* Veículo, cliente, status, previsão */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <Label required>Veículo</Label>
                <select className="input-field" value={form.veiculo_id} onChange={e => onVeiculoChange(e.target.value)} required>
                  <option value="">Selecione o veículo</option>
                  {veiculos.map(v => <option key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo}</option>)}
                </select>
              </div>
              <div>
                <Label>Cliente</Label>
                <select className="input-field" value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
                  <option value="">Sem cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select className="input-field" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="aberta">Aberta</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="concluida">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div>
                <Label>Previsão de entrega</Label>
                <input className="input-field" type="date" value={form.data_previsao} onChange={e => setForm(f => ({ ...f, data_previsao: e.target.value }))} />
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--bg-600)', margin: '0 0 16px' }} />

            {/* Descrição e diagnóstico */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <Label required>Problema relatado</Label>
                <textarea className="input-field" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} required placeholder="Descreva o problema..." rows={3} style={{ resize: 'vertical', minHeight: 80 }} />
              </div>
              <div>
                <Label>Diagnóstico</Label>
                <textarea className="input-field" value={form.diagnostico} onChange={e => setForm(f => ({ ...f, diagnostico: e.target.value }))} placeholder="Diagnóstico do mecânico..." rows={3} style={{ resize: 'vertical', minHeight: 80 }} />
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--bg-600)', margin: '0 0 16px' }} />

            {/* Itens / peças */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>Peças / Serviços</p>
                <button type="button" onClick={addItem} style={{ fontSize: 12, color: 'var(--amber)', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Plus size={12} /> Adicionar item
                </button>
              </div>
              <div style={{ background: 'var(--bg-700)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--bg-600)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 110px 90px 28px', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--bg-600)' }}>
                  {['Descrição', 'Qtd.', 'Preço unit.', 'Subtotal', ''].map((h, i) => (
                    <span key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: i >= 1 && i <= 3 ? 'right' : 'left' }}>{h}</span>
                  ))}
                </div>
                {itens.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 72px 110px 90px 28px', gap: 8, padding: '8px 12px', borderBottom: i < itens.length - 1 ? '1px solid var(--bg-600)' : 'none', alignItems: 'center' }}>
                    <input className="input-field" placeholder="Filtro de óleo, troca de óleo..." value={item.descricao} onChange={e => updateItem(i, 'descricao', e.target.value)} style={{ fontSize: 13, padding: '6px 8px' }} />
                    <input className="input-field" type="number" min="1" value={item.quantidade} onChange={e => updateItem(i, 'quantidade', e.target.value)} style={{ fontSize: 13, padding: '6px 8px', textAlign: 'right' }} />
                    <input className="input-field" type="number" min="0" step="0.01" value={item.preco_unitario} onChange={e => updateItem(i, 'preco_unitario', e.target.value)} style={{ fontSize: 13, padding: '6px 8px', textAlign: 'right' }} />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
                      R$ {fmt(Number(item.quantidade) * Number(item.preco_unitario))}
                    </span>
                    <button type="button" onClick={() => removeItem(i)} style={{ width: 24, height: 24, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, transition: 'color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#F87171'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-subtle)'}
                    ><X size={13} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Mão de obra + total */}
            <div style={{ background: 'var(--bg-700)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--bg-600)', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Mão de obra</span>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-subtle)', fontFamily: 'JetBrains Mono, monospace' }}>R$</span>
                  <input className="input-field" type="number" min="0" step="0.01" value={form.valor_mao_obra} onChange={e => setForm(f => ({ ...f, valor_mao_obra: e.target.value }))} style={{ paddingLeft: 34, textAlign: 'right', fontSize: 14, width: 160 }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Peças / Serviços</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-muted)' }}>R$ {fmt(totalPecas)}</span>
              </div>
              <div style={{ height: 1, background: 'var(--bg-600)', marginBottom: 12 }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Total geral</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: 'var(--amber)' }}>R$ {fmt(totalGeral)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 20, borderTop: '1px solid var(--bg-600)' }}>
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar OS'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Excluir OS" onClose={() => setDeleteId(null)}>
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={22} color="#F87171" />
            </div>
            <p style={{ fontSize: 15, color: 'var(--text)', fontWeight: 500, marginBottom: 8 }}>Tem certeza?</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Esta ação não pode ser desfeita.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={() => setDeleteId(null)} style={{ flex: 1 }}>Cancelar</button>
            <button className="btn-danger" onClick={handleDelete} style={{ flex: 1, padding: '10px 20px', justifyContent: 'center' }}>Excluir</button>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
