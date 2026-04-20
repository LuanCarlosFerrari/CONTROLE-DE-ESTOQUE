import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, Car, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

const EMPTY = { placa: '', marca: '', modelo: '', ano: '', cor: '', km_atual: 0, cliente_id: '' }

const Label = ({ children, required }) => (
  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 7 }}>
    {children}{required && <span style={{ color: 'var(--amber)', marginLeft: 3 }}>*</span>}
  </label>
)

export default function Veiculos() {
  const [veiculos, setVeiculos] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const load = useCallback(async () => {
    const [{ data: v }, { data: c }] = await Promise.all([
      supabase.from('veiculos').select('*, clientes(nome)').order('created_at', { ascending: false }),
      supabase.from('clientes').select('id, nome').order('nome'),
    ])
    setVeiculos(v || [])
    setClientes(c || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(EMPTY); setEditing(null); setModal('form') }
  const openEdit = (v) => { setForm({ ...v, cliente_id: v.cliente_id || '', ano: v.ano || '' }); setEditing(v.id); setModal('form') }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      placa: form.placa.toUpperCase().replace(/\s/g, ''),
      ano: form.ano ? Number(form.ano) : null,
      km_atual: Number(form.km_atual) || 0,
      cliente_id: form.cliente_id || null,
    }
    const { error } = editing
      ? await supabase.from('veiculos').update(payload).eq('id', editing)
      : await supabase.from('veiculos').insert(payload)
    setSaving(false)
    if (error) return setToast({ msg: error.message, type: 'error' })
    setToast({ msg: editing ? 'Veículo atualizado!' : 'Veículo cadastrado!', type: 'success' })
    setModal(null)
    load()
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('veiculos').delete().eq('id', deleteId)
    setDeleteId(null)
    if (error) return setToast({ msg: error.message, type: 'error' })
    setToast({ msg: 'Veículo removido.', type: 'success' })
    load()
  }

  const filtered = veiculos.filter(v =>
    v.placa?.toLowerCase().includes(search.toLowerCase()) ||
    v.marca?.toLowerCase().includes(search.toLowerCase()) ||
    v.modelo?.toLowerCase().includes(search.toLowerCase()) ||
    v.clientes?.nome?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ maxWidth: 1200 }} className="animate-fade-in page-content">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--bg-600)', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{ width: 3, height: 22, background: 'var(--amber)', borderRadius: 2 }} />
            <h1 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Veículos</h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', paddingLeft: 15 }}>
            {veiculos.length} veículo{veiculos.length !== 1 ? 's' : ''} cadastrado{veiculos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={15} /> Novo veículo</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
          <Search size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
          <input className="input-field" placeholder="Buscar por placa, marca, modelo ou cliente..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38, fontSize: 13 }} />
        </div>
        {search && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>}
      </div>

      <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px 20px' }}>
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8, marginBottom: 10, opacity: 1 - i * 0.15 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '72px 32px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--bg-700)', border: '1px solid var(--bg-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Car size={28} color="var(--bg-400)" />
            </div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              {search ? 'Nenhum veículo encontrado' : 'Nenhum veículo cadastrado'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-subtle)' }}>
              {search ? `Sem resultados para "${search}"` : 'Cadastre o primeiro veículo'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Placa</th>
                  <th>Marca / Modelo</th>
                  <th>Ano</th>
                  <th>Cor</th>
                  <th style={{ textAlign: 'right' }}>KM atual</th>
                  <th>Cliente</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id}>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--amber)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 6, padding: '3px 8px' }}>
                        {v.placa}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--bg-600)', border: '1px solid var(--bg-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Car size={14} color="var(--text-subtle)" />
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{v.marca} {v.modelo}</span>
                      </div>
                    </td>
                    <td><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{v.ano || '—'}</span></td>
                    <td><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{v.cor || '—'}</span></td>
                    <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-muted)' }}>
                      {(v.km_atual || 0).toLocaleString('pt-BR')} km
                    </td>
                    <td>
                      {v.clientes?.nome
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}><Users size={12} />{v.clientes.nome}</span>
                        : <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button onClick={() => openEdit(v)} title="Editar" style={{ width: 30, height: 30, background: 'none', border: '1px solid transparent', cursor: 'pointer', color: 'var(--text-subtle)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--amber)'; e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-subtle)'; e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent' }}
                        ><Pencil size={13} /></button>
                        <button onClick={() => setDeleteId(v.id)} title="Excluir" style={{ width: 30, height: 30, background: 'none', border: '1px solid transparent', cursor: 'pointer', color: 'var(--text-subtle)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
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

      {modal === 'form' && (
        <Modal title={editing ? 'Editar veículo' : 'Novo veículo'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <Label required>Placa</Label>
                <input className="input-field" value={form.placa} onChange={e => setForm(f => ({ ...f, placa: e.target.value }))} required placeholder="ABC1D23" autoFocus style={{ textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }} />
              </div>
              <div>
                <Label>Cliente vinculado</Label>
                <select className="input-field" value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
                  <option value="">Sem cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <Label required>Marca</Label>
                <input className="input-field" value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} required placeholder="Toyota" />
              </div>
              <div>
                <Label required>Modelo</Label>
                <input className="input-field" value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} required placeholder="Corolla" />
              </div>
              <div>
                <Label>Ano</Label>
                <input className="input-field" type="number" min="1900" max={new Date().getFullYear() + 1} value={form.ano} onChange={e => setForm(f => ({ ...f, ano: e.target.value }))} placeholder={String(new Date().getFullYear())} />
              </div>
              <div>
                <Label>Cor</Label>
                <input className="input-field" value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))} placeholder="Prata" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label>KM atual</Label>
                <input className="input-field" type="number" min="0" value={form.km_atual} onChange={e => setForm(f => ({ ...f, km_atual: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--bg-600)' }}>
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar veículo'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Excluir veículo" onClose={() => setDeleteId(null)}>
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
